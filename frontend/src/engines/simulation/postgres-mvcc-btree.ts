import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type PostgresIsolationLevel = "READ COMMITTED" | "REPEATABLE READ";
export type PostgresScanType = "IndexScan" | "IndexOnlyScan" | "SeqScan";

export interface PostgresHeapTuple {
  ctid: string; // e.g., "(0, 1)" -> block 0, line pointer 1
  accountId: number;
  balanceUsd: number;
  xmin: number; // inserting transaction id
  xmax: number | null; // deleting/updating transaction id
  xmaxCommitted: boolean;
  isVisibleToReader: boolean;
  visibilityReason: string;
}

export interface PostgresBtreeEntry {
  key: number;
  targetCtid: string;
}

export interface PostgresBtreeNode {
  pageNumber: number;
  level: "Root" | "Internal" | "Leaf";
  entries: PostgresBtreeEntry[];
  keyRangeLabel: string;
  visitedInCurrentScan: boolean;
}

export interface PostgresSimulationConfig {
  isolationLevel: PostgresIsolationLevel;
  scanType: PostgresScanType;
  targetAccountId: number;
}

export interface PostgresMvccBtreeState {
  isolationLevel: PostgresIsolationLevel;
  scanType: PostgresScanType;
  targetAccountId: number;
  readerTxId: number;
  readerSnapshotMaxTx: number; // for Repeatable Read, snapshots tx id ceiling
  writerTxId: number;
  writerCommitted: boolean;
  visibilityMapAllVisible: boolean; // VM bit for block 0
  btreeNodes: PostgresBtreeNode[];
  heapTuples: PostgresHeapTuple[];
  sharedBuffersHit: number;
  heapFetchesCount: number;
  returnedBalanceUsd: number | null;
}

export type PostgresSimulationCommand =
  | { type: "EXECUTE_READER_SELECT" }
  | { type: "WRITER_UPDATE_ACCOUNT_BALANCE"; newBalanceUsd: number }
  | { type: "WRITER_COMMIT_TRANSACTION" }
  | { type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" }
  | { type: "SWITCH_ISOLATION_OR_SCAN"; isolationLevel: PostgresIsolationLevel; scanType: PostgresScanType };

function evaluateTupleVisibility(
  tuple: Omit<PostgresHeapTuple, "isVisibleToReader" | "visibilityReason">,
  isolationLevel: PostgresIsolationLevel,
  writerCommitted: boolean,
  readerSnapshotMaxTx: number,
): { visible: boolean; reason: string } {
  // Tuple created by uncommitted concurrent writer (tx 202)
  if (tuple.xmin === 202 && !writerCommitted) {
    return {
      visible: false,
      reason: "INVISIBLE (Dirty Write): xmin=202 is uncommitted; concurrent transactions cannot read it.",
    };
  }

  // Tuple created by tx 202 after it committed
  if (tuple.xmin === 202 && writerCommitted) {
    if (isolationLevel === "READ COMMITTED") {
      return {
        visible: true,
        reason:
          "VISIBLE (READ COMMITTED): Query captured a fresh statement Snapshot after Tx 202 committed.",
      };
    }
    if (tuple.xmin >= readerSnapshotMaxTx) {
      return {
        visible: false,
        reason:
          "INVISIBLE (REPEATABLE READ): Tx 202 committed, but xmin=202 >= transaction snapshot xmax (201); hidden to prevent Non-Repeatable Reads.",
      };
    }
  }

  // Original tuple (xmin=100) that was updated by tx 202 (xmax=202)
  if (tuple.xmax === 202) {
    if (!writerCommitted) {
      return {
        visible: true,
        reason:
          "VISIBLE: Although xmax=202 is updating this row, Tx 202 is uncommitted. The original tuple (xmin=100) remains visible.",
      };
    }
    if (isolationLevel === "READ COMMITTED") {
      return {
        visible: false,
        reason:
          "INVISIBLE (Dead Tuple): Tx 202 committed its update (xmax=202 committed) prior to this query's statement snapshot.",
      };
    }
    return {
      visible: true,
      reason:
        "VISIBLE (REPEATABLE READ): The original tuple (xmin=100) remains visible because xmax=202 committed after this transaction's initial snapshot.",
    };
  }

  return {
    visible: true,
    reason: "VISIBLE: xmin=100 committed prior to reader transaction start and xmax=NULL.",
  };
}

function recomputeTuples(
  rawTuples: PostgresHeapTuple[],
  isolationLevel: PostgresIsolationLevel,
  writerCommitted: boolean,
  readerSnapshotMaxTx: number,
): PostgresHeapTuple[] {
  return rawTuples.map((t) => {
    const res = evaluateTupleVisibility(t, isolationLevel, writerCommitted, readerSnapshotMaxTx);
    return {
      ...t,
      xmaxCommitted: writerCommitted && t.xmax === 202,
      isVisibleToReader: res.visible,
      visibilityReason: res.reason,
    };
  });
}

function evaluatePostgresInvariants(state: PostgresMvccBtreeState): SimulationInvariantCheck[] {
  const visibleMatchesForTarget = state.heapTuples.filter(
    (t) => t.accountId === state.targetAccountId && t.isVisibleToReader,
  );

  const uniqueVisibleVersion = visibleMatchesForTarget.length === 1;
  const noDirtyReads = !state.heapTuples.some(
    (t) => t.xmin === 202 && !state.writerCommitted && t.isVisibleToReader,
  );

  return [
    {
      id: "mvcc-single-visible-tuple-version",
      label: "Exactly One Visible Tuple Version per Primary Key in Snapshot",
      passed: uniqueVisibleVersion,
      detail: uniqueVisibleVersion
        ? `At all times, exactly 1 Tuple version for account_id=${state.targetAccountId} is visible in the active Snapshot.`
        : `VIOLATION: ${visibleMatchesForTarget.length} visible tuple versions observed simultaneously!`,
    },
    {
      id: "mvcc-no-dirty-reads",
      label: "Zero Dirty Reads (Uncommitted xmin Never Visible)",
      passed: noDirtyReads,
      detail: "PostgreSQL never permits reading a tuple version whose xmin has not committed.",
    },
  ];
}

function computePostgresMetrics(state: PostgresMvccBtreeState): Record<string, string | number> {
  return {
    "Isolation Level": state.isolationLevel,
    "Access Path": state.scanType,
    "Shared Buffers Hit": `${state.sharedBuffersHit} pages (8 KB)`,
    "Heap Tuple Fetches": state.heapFetchesCount,
    "Visibility Map (VM)": state.visibilityMapAllVisible ? "ALL_VISIBLE (1)" : "DIRTY / UNSET (0)",
    "Returned Balance": state.returnedBalanceUsd !== null ? `$${state.returnedBalanceUsd}` : "N/A",
  };
}

export const postgresMvccBtreeSimulation: SimulationEngineSpec<
  PostgresSimulationConfig,
  PostgresMvccBtreeState,
  PostgresSimulationCommand
> = {
  id: "postgres-mvcc-btree",
  title: "PostgreSQL B-Tree Index Scan, Visibility Map & MVCC Tuple Visibility",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "PostgreSQL 17 nbtree Access Method, 8 KB Slotted Heap Page (CTID), and MVCC Snapshot Visibility Rules",
    accurateBehaviors: [
      "PostgreSQL UPDATE appends a new physical Heap Tuple version with a new CTID (block, offset) and sets t_xmax on the old version instead of overwriting in place",
      "Difference between READ COMMITTED (new snapshot per statement) and REPEATABLE READ (single snapshot kept from first statement of transaction)",
      "Index-Only Scan skipping Heap Page fetches ONLY when the Visibility Map (VM) all_visible bit is set by VACUUM",
      "Comparison of 8 KB shared buffer page reads between B-Tree Index Scan and full-table Sequential Scan",
    ],
    simplifications: [
      "Displays 3 representative 8 KB Heap Pages (Block 0..2) and a 2-level B-Tree instead of thousands of disk blocks",
      "Transaction IDs (XID) are small readable integers (100, 201, 202) rather than 32-bit wraparound-protected counters",
    ],
    assumptions: [
      "Query searches on primary key account_id = 42 (SELECT balance_usd FROM accounts WHERE account_id = 42)",
      "All accessed pages reside in PostgreSQL shared_buffers (shared hit)",
    ],
    unsupportedEdgeCases: [
      "Subtransaction XID overflow to pg_subtrans",
      "B-Tree page split concurrent Lehman-Yao right-link traversal during an active scan",
    ],
  },
  presets: [
    {
      id: "mvcc-update-read-committed-vs-repeatable",
      title: "1. UPDATE Appends New CTID & READ COMMITTED vs REPEATABLE READ",
      badge: "MVCC Internals",
      description:
        "Observe how UPDATE appends a new Tuple version at CTID (0,3), sets xmax=202 on CTID (0,1), and how Snapshot timing controls visibility before and after COMMIT.",
      config: {
        isolationLevel: "READ COMMITTED",
        scanType: "IndexScan",
        targetAccountId: 42,
      },
      scriptedCommands: [
        { type: "EXECUTE_READER_SELECT" },
        { type: "WRITER_UPDATE_ACCOUNT_BALANCE", newBalanceUsd: 950 },
        { type: "EXECUTE_READER_SELECT" },
        { type: "WRITER_COMMIT_TRANSACTION" },
        { type: "EXECUTE_READER_SELECT" },
        { type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" },
      ],
    },
    {
      id: "repeatable-read-snapshot-isolation",
      title: "2. REPEATABLE READ — Snapshot Preserved Post-Writer COMMIT",
      badge: "Snapshot Isolation",
      description:
        "Under REPEATABLE READ, even after Tx 202 commits a new balance of $950, reader Tx 201 continues seeing the original $500 balance at CTID (0,1) for repeatable consistency.",
      config: {
        isolationLevel: "REPEATABLE READ",
        scanType: "IndexScan",
        targetAccountId: 42,
      },
      scriptedCommands: [
        { type: "EXECUTE_READER_SELECT" },
        { type: "WRITER_UPDATE_ACCOUNT_BALANCE", newBalanceUsd: 950 },
        { type: "WRITER_COMMIT_TRANSACTION" },
        { type: "EXECUTE_READER_SELECT" },
        { type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" },
      ],
    },
    {
      id: "index-only-scan-visibility-map",
      title: "3. Index-Only Scan & Visibility Map (Heap Fetches = 0)",
      badge: "Visibility Map (VM)",
      description:
        "Compare heap fetches when all_visible = 1 (Heap Fetches = 0) versus after an update clears the bit (Index-Only Scan forced to fetch heap pages).",
      config: {
        isolationLevel: "READ COMMITTED",
        scanType: "IndexOnlyScan",
        targetAccountId: 42,
      },
      scriptedCommands: [
        { type: "EXECUTE_READER_SELECT" },
        { type: "WRITER_UPDATE_ACCOUNT_BALANCE", newBalanceUsd: 1200 },
        { type: "WRITER_COMMIT_TRANSACTION" },
        { type: "EXECUTE_READER_SELECT" },
        { type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" },
        { type: "EXECUTE_READER_SELECT" },
      ],
    },
  ],

  createInitialFrame(config: PostgresSimulationConfig): SimulationStepFrame<PostgresMvccBtreeState> {
    const rawTuples: PostgresHeapTuple[] = [
      {
        ctid: "(0,1)",
        accountId: 42,
        balanceUsd: 500,
        xmin: 100, // committed in past
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReason: "VISIBLE: xmin=100 committed prior to reader transaction start.",
      },
      {
        ctid: "(0,2)",
        accountId: 18,
        balanceUsd: 120,
        xmin: 90,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReason: "VISIBLE: xmin=90 committed prior to reader transaction start.",
      },
      {
        ctid: "(1,1)",
        accountId: 85,
        balanceUsd: 3400,
        xmin: 95,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReason: "VISIBLE: xmin=95 committed prior to reader transaction start.",
      },
    ];

    const btreeNodes: PostgresBtreeNode[] = [
      {
        pageNumber: 0,
        level: "Root",
        entries: [
          { key: 1, targetCtid: "Page 1 (Leaf)" },
          { key: 50, targetCtid: "Page 2 (Leaf)" },
        ],
        keyRangeLabel: "Root Page (B-Tree Metapage -> Level 1)",
        visitedInCurrentScan: false,
      },
      {
        pageNumber: 1,
        level: "Leaf",
        entries: [
          { key: 18, targetCtid: "(0,2)" },
          { key: 42, targetCtid: "(0,1)" },
        ],
        keyRangeLabel: "Leaf Page #1 [Keys 1..49]",
        visitedInCurrentScan: false,
      },
      {
        pageNumber: 2,
        level: "Leaf",
        entries: [{ key: 85, targetCtid: "(1,1)" }],
        keyRangeLabel: "Leaf Page #2 [Keys 50..100]",
        visitedInCurrentScan: false,
      },
    ];

    const state: PostgresMvccBtreeState = {
      isolationLevel: config.isolationLevel,
      scanType: config.scanType,
      targetAccountId: config.targetAccountId,
      readerTxId: 201,
      readerSnapshotMaxTx: 201,
      writerTxId: 202,
      writerCommitted: false,
      visibilityMapAllVisible: true,
      btreeNodes,
      heapTuples: rawTuples,
      sharedBuffersHit: 0,
      heapFetchesCount: 0,
      returnedBalanceUsd: 500,
    };

    return {
      tick: 0,
      phase: "Initial State (accounts table + pk_accounts index)",
      title: "Initialized accounts Table (8 KB Heap Pages + B-Tree Index pk_accounts)",
      state,
      events: [
        {
          tick: 0,
          actor: "PostgresStorage",
          action: "PAGE_INIT",
          detail: `Reader Tx 201 initialized under ${config.isolationLevel}. Visibility Map = ALL_VISIBLE.`,
          tone: "info",
        },
      ],
      invariants: evaluatePostgresInvariants(state),
      narration: {
        summary: `Table "accounts" contains record account_id = 42 at physical CTID (0,1) with xmin = 100 (committed), xmax = NULL, and balance $500. B-Tree Leaf Page #1 points directly: Key 42 -> CTID (0,1).`,
        internalsNote: `In PostgreSQL, tables and indexes are divided into 8 KB (8192 bytes) slotted pages. CTID (0,1) indicates Block 0, Line Pointer 1.`,
      },
      metrics: computePostgresMetrics(state),
    };
  },

  applyCommand(
    currentFrame: SimulationStepFrame<PostgresMvccBtreeState>,
    command: PostgresSimulationCommand,
  ): SimulationStepFrame<PostgresMvccBtreeState> {
    const nextTick = currentFrame.tick + 1;
    const prev = currentFrame.state;
    const clonedTuples: PostgresHeapTuple[] = prev.heapTuples.map((t) => ({ ...t }));
    const clonedBtree: PostgresBtreeNode[] = prev.btreeNodes.map((n) => ({
      ...n,
      entries: [...n.entries],
    }));

    if (command.type === "EXECUTE_READER_SELECT") {
      const tuplesWithVis = recomputeTuples(
        clonedTuples,
        prev.isolationLevel,
        prev.writerCommitted,
        prev.readerSnapshotMaxTx,
      );

      const visibleTarget = tuplesWithVis.find(
        (t) => t.accountId === prev.targetAccountId && t.isVisibleToReader,
      );

      let buffersRead = 0;
      let heapFetches = 0;

      if (prev.scanType === "SeqScan") {
        buffersRead = 2; // Reads Block 0 and Block 1
        heapFetches = 2;
        clonedBtree.forEach((n) => (n.visitedInCurrentScan = false));
      } else if (prev.scanType === "IndexScan") {
        buffersRead = 3; // B-Tree Root (Page 0) + B-Tree Leaf (Page 1) + Heap Block 0
        heapFetches = 1;
        clonedBtree[0].visitedInCurrentScan = true;
        clonedBtree[1].visitedInCurrentScan = true;
        clonedBtree[2].visitedInCurrentScan = false;
      } else if (prev.scanType === "IndexOnlyScan") {
        clonedBtree[0].visitedInCurrentScan = true;
        clonedBtree[1].visitedInCurrentScan = true;
        clonedBtree[2].visitedInCurrentScan = false;

        if (prev.visibilityMapAllVisible) {
          buffersRead = 2; // Root + Leaf only! 0 Heap Reads
          heapFetches = 0;
        } else {
          buffersRead = 3; // Forced to fetch Heap Block 0 to check xmin/xmax
          heapFetches = 1;
        }
      }

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        heapTuples: tuplesWithVis,
        btreeNodes: clonedBtree,
        sharedBuffersHit: buffersRead,
        heapFetchesCount: heapFetches,
        returnedBalanceUsd: visibleTarget?.balanceUsd ?? null,
      };

      return {
        tick: nextTick,
        phase: `Executed SELECT via ${prev.scanType}`,
        title: `Tx 201 SELECT: returned $${visibleTarget?.balanceUsd ?? "null"} from CTID ${visibleTarget?.ctid ?? "N/A"} (${buffersRead} buffers hit)`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "QueryExecutor",
            action: `${prev.scanType.toUpperCase()}_SCAN`,
            detail: `Read ${buffersRead} 8 KB page(s) (Heap Fetches = ${heapFetches}). Visible version: CTID ${visibleTarget?.ctid} ($${visibleTarget?.balanceUsd}).`,
            tone: "ok",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summary: `Reader Tx 201 executed SELECT via ${prev.scanType}. Result returned balance $${visibleTarget?.balanceUsd} from Tuple version at CTID ${visibleTarget?.ctid}.`,
          internalsNote:
            prev.scanType === "IndexOnlyScan" && !prev.visibilityMapAllVisible
              ? `CRITICAL FIDELITY NOTE: Despite IndexOnlyScan, recent updates on Block 0 cleared the Visibility Map all_visible bit to 0. PostgreSQL WAS FORCED to fetch Heap Block 0 (Heap Fetches = ${heapFetches}) to evaluate xmin/xmax visibility!`
              : `B-Tree indexes do not store transaction xmin/xmax metadata. Index scans must verify tuple visibility against heap pages (unless the Visibility Map confirms all tuples are universally visible).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "WRITER_UPDATE_ACCOUNT_BALANCE") {
      const oldTuple = clonedTuples.find(
        (t) => t.accountId === prev.targetAccountId && t.xmax === null,
      );

      if (oldTuple) {
        oldTuple.xmax = prev.writerTxId;
      }

      const newTuple: PostgresHeapTuple = {
        ctid: "(0,3)",
        accountId: prev.targetAccountId,
        balanceUsd: command.newBalanceUsd,
        xmin: prev.writerTxId,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: false,
        visibilityReason: "",
      };
      clonedTuples.push(newTuple);

      const leaf1 = clonedBtree[1];
      const entryIdx = leaf1.entries.findIndex((e) => e.key === prev.targetAccountId);
      if (entryIdx !== -1) {
        leaf1.entries[entryIdx].targetCtid = "(0,3)";
      }

      const tuplesWithVis = recomputeTuples(
        clonedTuples,
        prev.isolationLevel,
        false,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        writerCommitted: false,
        visibilityMapAllVisible: false,
        heapTuples: tuplesWithVis,
        btreeNodes: clonedBtree,
      };

      return {
        tick: nextTick,
        phase: `Writer Tx 202 UPDATE balance=$${command.newBalanceUsd} (Uncommitted)`,
        title: `Writer Tx 202 executed UPDATE balance = $${command.newBalanceUsd} -> appended Tuple at CTID (0,3)`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "WriterTx202",
            action: "HEAP_INSERT_TUPLE_VERSION",
            detail: `Stamped xmax=202 on CTID (0,1), appended new version CTID (0,3) with xmin=202 ($${command.newBalanceUsd}), and cleared Visibility Map bit for Block 0.`,
            tone: "warn",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summary: `Writer Tx 202 executed UPDATE account_id = 42 to $${command.newBalanceUsd} (uncommitted). PostgreSQL DID NOT overwrite CTID (0,1); it stamped xmax = 202 on CTID (0,1) and appended a physical tuple version at CTID (0,3) with xmin = 202!`,
          internalsNote: `Because Tx 202 has not committed, CTID (0,3) is invisible to Tx 201 (Dirty Write), while CTID (0,1) remains visible with value $500 without reader locking (Readers do not block Writers, Writers do not block Readers).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "WRITER_COMMIT_TRANSACTION") {
      const tuplesWithVis = recomputeTuples(
        clonedTuples,
        prev.isolationLevel,
        true,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        writerCommitted: true,
        heapTuples: tuplesWithVis,
      };

      const outcomeNote =
        prev.isolationLevel === "READ COMMITTED"
          ? "Tx 202 committed. Under READ COMMITTED, the next statement from Tx 201 will see CTID (0,3) = $950."
          : "Tx 202 committed. But under REPEATABLE READ, Tx 201 retains its initial Snapshot (xmax=201) and continues seeing CTID (0,1) = $500!";

      return {
        tick: nextTick,
        phase: `Writer Tx 202 Committed to WAL`,
        title: `Writer Tx 202 Committed to WAL -> Visibility Evaluated under ${prev.isolationLevel}`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "WALWriter",
            action: "TX_COMMIT_FLUSH",
            detail: outcomeNote,
            tone: "ok",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summary:
            prev.isolationLevel === "READ COMMITTED"
              ? `Tx 202 committed successfully. Because Tx 201 operates under READ COMMITTED, its subsequent SELECT statement takes a fresh Snapshot and reads the new CTID (0,3) version with balance $950 (CTID (0,1) becomes a Dead Tuple).`
              : `Tx 202 committed successfully. However, because Tx 201 operates under REPEATABLE READ, it retains the Snapshot captured at transaction start (visible XIDs < 201). Thus CTID (0,3) (xmin=202) is invisible, and Tx 201 still reads $500 from CTID (0,1)!`,
          internalsNote: `This illustrates Multi-Version Concurrency Control (MVCC): concurrently on the same 8 KB page, two transactions under different isolation levels read two distinct physical versions of the same logical row without read locks!`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "RUN_VACUUM_UPDATE_VISIBILITY_MAP") {
      const cleanedTuples = clonedTuples.filter((t) => !(t.ctid === "(0,1)" && prev.writerCommitted));

      const tuplesWithVis = recomputeTuples(
        cleanedTuples,
        prev.isolationLevel,
        prev.writerCommitted,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        visibilityMapAllVisible: true,
        heapTuples: tuplesWithVis,
      };

      return {
        tick: nextTick,
        phase: `Autovacuum Completed (all_visible = 1)`,
        title: `VACUUM Reclaimed Dead Tuple CTID (0,1) & Enabled ALL_VISIBLE Bit in Visibility Map`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "AutovacuumWorker",
            action: "VACUUM_PRUNE_AND_UPDATE_VM",
            detail:
              "Cleaned Dead Tuple (0,1), pruned B-Tree index pointers, and set Visibility Map = ALL_VISIBLE.",
            tone: "ok",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summary: `VACUUM pruned unreferenced historical versions (Dead Tuple at CTID (0,1)) and set the ALL_VISIBLE = 1 bit on the Visibility Map for Heap Block 0.`,
          internalsNote: `With the Visibility Map updated, subsequent Index-Only Scans return data directly from B-Tree leaf pages (Heap Fetches = 0) without accessing Heap Block 0.`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "SWITCH_ISOLATION_OR_SCAN") {
      const tuplesWithVis = recomputeTuples(
        clonedTuples,
        command.isolationLevel,
        prev.writerCommitted,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        isolationLevel: command.isolationLevel,
        scanType: command.scanType,
        heapTuples: tuplesWithVis,
      };

      return {
        tick: nextTick,
        phase: `Configuration Switched (${command.isolationLevel}, ${command.scanType})`,
        title: `Switched Configuration to ${command.isolationLevel} & ${command.scanType}`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "SessionConfig",
            action: "SET_ISOLATION_LEVEL",
            detail: `Active configuration: ${command.isolationLevel}, Access Path = ${command.scanType}.`,
            tone: "info",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summary: `Switched reader configuration to isolation level "${command.isolationLevel}" and access path "${command.scanType}". Click "Execute Reader SELECT" to observe 8 KB page reads and returned tuple versions.`,
          internalsNote: `Toggle between READ COMMITTED and REPEATABLE READ after Writer Tx 202 commits to observe the visibility shift between CTID (0,1) and CTID (0,3).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
