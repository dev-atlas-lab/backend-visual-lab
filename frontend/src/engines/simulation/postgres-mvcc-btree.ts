import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type PostgresScanType = "IndexScan" | "IndexOnlyScan" | "SeqScan";
export type PostgresIsolationLevel = "READ COMMITTED" | "REPEATABLE READ";

export interface PostgresHeapTuple {
  ctid: string;
  blockNumber: number;
  offsetNumber: number;
  accountId: number;
  balanceUsd: number;
  xmin: number;
  xmax: number | null;
  xmaxCommitted: boolean;
  isVisibleToReader: boolean;
  visibilityReasonVi: string;
}

export interface PostgresBtreeNode {
  pageNumber: number;
  level: "ROOT" | "LEAF";
  keyRangeLabel: string;
  entries: { key: number; targetCtid: string }[];
  visitedInCurrentScan: boolean;
}

export interface PostgresMvccBtreeState {
  isolationLevel: PostgresIsolationLevel;
  scanType: PostgresScanType;
  readerTxId: number;
  readerSnapshotMinTx: number;
  readerSnapshotMaxTx: number;
  concurrentWriterTxId: number;
  writerCommitted: boolean;
  visibilityMapAllVisible: boolean;
  targetAccountId: number;
  btreeNodes: PostgresBtreeNode[];
  heapTuples: PostgresHeapTuple[];
  sharedBuffersHit: number;
  heapFetchesCount: number;
  returnedBalanceUsd: number | null;
}

export interface PostgresSimulationConfig {
  isolationLevel: PostgresIsolationLevel;
  scanType: PostgresScanType;
  targetAccountId: number;
}

export type PostgresSimulationCommand =
  | { type: "EXECUTE_READER_SELECT" }
  | { type: "WRITER_UPDATE_ACCOUNT_BALANCE"; newBalanceUsd: number }
  | { type: "WRITER_COMMIT_TRANSACTION" }
  | { type: "RUN_VACUUM_UPDATE_VISIBILITY_MAP" }
  | { type: "SWITCH_ISOLATION_OR_SCAN"; isolationLevel: PostgresIsolationLevel; scanType: PostgresScanType };

function evaluateTupleVisibility(
  tuple: Omit<PostgresHeapTuple, "isVisibleToReader" | "visibilityReasonVi">,
  isolationLevel: PostgresIsolationLevel,
  writerCommitted: boolean,
  readerSnapshotMaxTx: number,
): { visible: boolean; reasonVi: string } {
  // Tuple created by uncommitted concurrent writer (tx 202)
  if (tuple.xmin === 202 && !writerCommitted) {
    return {
      visible: false,
      reasonVi: "VÔ HÌNH (Dirty Write): xmin=202 chưa COMMIT nên không giao dịch nào khác được phép đọc.",
    };
  }

  // Tuple created by tx 202 after it committed
  if (tuple.xmin === 202 && writerCommitted) {
    if (isolationLevel === "READ COMMITTED") {
      return {
        visible: true,
        reasonVi:
          "HIỂN THỊ (READ COMMITTED): Câu lệnh SELECT mới chụp Snapshot mới sau khi Tx 202 đã COMMIT.",
      };
    }
    if (tuple.xmin >= readerSnapshotMaxTx) {
      return {
        visible: false,
        reasonVi:
          "VÔ HÌNH (REPEATABLE READ Snapshot): Dù Tx 202 đã COMMIT, xmin=202 >= xmax của Snapshot đầu giao dịch (201) nên bị ẩn để chống Non-Repeatable Read.",
      };
    }
  }

  // Original tuple (xmin=100) that was updated by tx 202 (xmax=202)
  if (tuple.xmax === 202) {
    if (!writerCommitted) {
      return {
        visible: true,
        reasonVi:
          "HIỂN THỊ: Dù xmax=202 đang cập nhật dòng này, Tx 202 chưa COMMIT nên bản ghi gốc (xmin=100) vẫn hiển thị.",
      };
    }
    if (isolationLevel === "READ COMMITTED") {
      return {
        visible: false,
        reasonVi:
          "VÔ HÌNH (Dead Tuple): Tx 202 đã COMMIT việc xóa/cập nhật dòng này (xmax=202 committed) trước Snapshot của câu lệnh hiện tại.",
      };
    }
    return {
      visible: true,
      reasonVi:
        "HIỂN THỊ (REPEATABLE READ Snapshot): Bản ghi cũ (xmin=100) vẫn hiển thị vì giao dịch cập nhật xmax=202 hoàn tất sau thời điểm chụp Snapshot đầu giao dịch.",
    };
  }

  return {
    visible: true,
    reasonVi: "HIỂN THỊ: xmin=100 đã COMMIT trước khi giao dịch đọc bắt đầu và xmax=NULL.",
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
      visibilityReasonVi: res.reasonVi,
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
        ? `Tại mọi thời điểm, chỉ duy nhất 1 phiên bản Tuple của account_id=${state.targetAccountId} hiển thị với Snapshot hiện tại.`
        : `Phát hiện ${visibleMatchesForTarget.length} phiên bản hiển thị cùng lúc!`,
    },
    {
      id: "mvcc-no-dirty-reads",
      label: "Zero Dirty Reads (Uncommitted xmin Never Visible)",
      passed: noDirtyReads,
      detail: "PostgreSQL không bao giờ cho phép đọc phiên bản Tuple có xmin chưa COMMIT.",
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
      title: "1. UPDATE tạo CTID mới & Sự khác biệt READ COMMITTED vs REPEATABLE READ",
      badge: "MVCC Internals",
      descriptionVi:
        "Quan sát cách lệnh UPDATE tạo ra phiên bản Tuple mới tại CTID (0,3), đánh dấu xmax=202 lên CTID (0,1), và cách Snapshot kiểm soát tính hiển thị trước/sau khi COMMIT.",
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
      title: "2. REPEATABLE READ — Giữ nguyên Snapshot đầu giao dịch sau khi Writer COMMIT",
      badge: "Snapshot Isolation",
      descriptionVi:
        "Ở mức cô lập REPEATABLE READ, ngay cả khi Tx 202 đã COMMIT số dư mới $950, giao dịch đọc Tx 201 vẫn nhìn thấy phiên bản cũ $500 tại CTID (0,1) để đảm bảo tính lặp lại.",
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
      ],
    },
  ],

  createInitialFrame(config: PostgresSimulationConfig): SimulationStepFrame<PostgresMvccBtreeState> {
    const initialTuplesRaw: PostgresHeapTuple[] = [
      {
        ctid: "(0,1)",
        blockNumber: 0,
        offsetNumber: 1,
        accountId: 42,
        balanceUsd: 500,
        xmin: 100,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReasonVi: "",
      },
      {
        ctid: "(0,2)",
        blockNumber: 0,
        offsetNumber: 2,
        accountId: 43,
        balanceUsd: 1200,
        xmin: 100,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReasonVi: "",
      },
      {
        ctid: "(1,1)",
        blockNumber: 1,
        offsetNumber: 1,
        accountId: 88,
        balanceUsd: 340,
        xmin: 100,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: true,
        visibilityReasonVi: "",
      },
    ];

    const tuples = recomputeTuples(initialTuplesRaw, config.isolationLevel, false, 201);

    const btreeNodes: PostgresBtreeNode[] = [
      {
        pageNumber: 1,
        level: "ROOT",
        keyRangeLabel: "Root Page (Keys 1..100)",
        entries: [
          { key: 42, targetCtid: "Leaf Page #2" },
          { key: 88, targetCtid: "Leaf Page #3" },
        ],
        visitedInCurrentScan: false,
      },
      {
        pageNumber: 2,
        level: "LEAF",
        keyRangeLabel: "Leaf Page #2 (Keys 1..50)",
        entries: [
          { key: 42, targetCtid: "(0,1)" },
          { key: 43, targetCtid: "(0,2)" },
        ],
        visitedInCurrentScan: false,
      },
      {
        pageNumber: 3,
        level: "LEAF",
        keyRangeLabel: "Leaf Page #3 (Keys 51..100)",
        entries: [{ key: 88, targetCtid: "(1,1)" }],
        visitedInCurrentScan: false,
      },
    ];

    const state: PostgresMvccBtreeState = {
      isolationLevel: config.isolationLevel,
      scanType: config.scanType,
      readerTxId: 201,
      readerSnapshotMinTx: 100,
      readerSnapshotMaxTx: 201,
      concurrentWriterTxId: 202,
      writerCommitted: false,
      visibilityMapAllVisible: true,
      targetAccountId: config.targetAccountId,
      btreeNodes,
      heapTuples: tuples,
      sharedBuffersHit: 0,
      heapFetchesCount: 0,
      returnedBalanceUsd: 500,
    };

    return {
      tick: 0,
      phase: "Initial Clean Heap & B-Tree",
      title: `Khởi tạo bảng accounts (8 KB Heap Pages + B-Tree Index pk_accounts)`,
      state,
      events: [
        {
          tick: 0,
          actor: "PostgreSQL Engine",
          action: "INIT_SNAPSHOT",
          detail: `Giao dịch đọc Tx 201 khởi tạo ở mức cô lập ${config.isolationLevel}. Visibility Map = ALL_VISIBLE.`,
          tone: "ok",
        },
      ],
      invariants: evaluatePostgresInvariants(state),
      narration: {
        summaryVi: `Bảng "accounts" đang chứa bản ghi account_id = 42 tại vị trí vật lý CTID (0,1) với xmin = 100 (đã commit), xmax = NULL và số dư $500. B-Tree Leaf Page #2 trỏ trực tiếp khóa 42 -> CTID (0,1).`,
        internalsNoteVi: `Trong PostgreSQL, mỗi bảng và chỉ mục được chia thành các trang 8 KB (8192 bytes). CTID (0,1) có nghĩa là Block số 0, con trỏ dòng (Line Pointer) số 1.`,
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
    const btreeNodes = prev.btreeNodes.map((n) => ({
      ...n,
      entries: n.entries.map((e) => ({ ...e })),
    }));

    if (command.type === "EXECUTE_READER_SELECT") {
      const tuples = recomputeTuples(
        prev.heapTuples,
        prev.isolationLevel,
        prev.writerCommitted,
        prev.readerSnapshotMaxTx,
      );

      const visibleTarget = tuples.find(
        (t) => t.accountId === prev.targetAccountId && t.isVisibleToReader,
      );

      let buffersRead = 0;
      let heapFetches = 0;

      if (prev.scanType === "SeqScan") {
        btreeNodes.forEach((n) => {
          n.visitedInCurrentScan = false;
        });
        buffersRead = 2; // Reads Heap Block 0 and Block 1
        heapFetches = tuples.length;
      } else if (prev.scanType === "IndexOnlyScan" && prev.visibilityMapAllVisible) {
        btreeNodes.forEach((n) => {
          n.visitedInCurrentScan = n.pageNumber === 1 || n.pageNumber === 2;
        });
        buffersRead = 2; // Root + Leaf #2 only; skips Heap because VM is ALL_VISIBLE!
        heapFetches = 0;
      } else {
        // IndexScan (or IndexOnlyScan when VM is dirty)
        btreeNodes.forEach((n) => {
          n.visitedInCurrentScan = n.pageNumber === 1 || n.pageNumber === 2;
        });
        const candidateVersions = tuples.filter((t) => t.accountId === prev.targetAccountId).length;
        buffersRead = 2 + 1; // B-Tree Root + Leaf #2 + Heap Block 0
        heapFetches = candidateVersions;
      }

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        btreeNodes,
        heapTuples: tuples,
        sharedBuffersHit: buffersRead,
        heapFetchesCount: heapFetches,
        returnedBalanceUsd: visibleTarget?.balanceUsd ?? null,
      };

      return {
        tick: nextTick,
        phase: `SELECT (${prev.scanType}) -> $${visibleTarget?.balanceUsd ?? "null"}`,
        title: `Tx 201 chạy SELECT: trả về $${visibleTarget?.balanceUsd ?? "null"} từ CTID ${visibleTarget?.ctid ?? "N/A"} (${buffersRead} buffers hit)`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Reader Tx 201",
            action: `EXECUTE_${prev.scanType.toUpperCase()}`,
            detail: `Đọc ${buffersRead} trang 8 KB (Heap Fetches = ${heapFetches}). Phiên bản hiển thị: CTID ${visibleTarget?.ctid} ($${visibleTarget?.balanceUsd}).`,
            tone: "info",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summaryVi: `Giao dịch đọc Tx 201 thực thi câu lệnh SELECT với phương thức ${prev.scanType}. Kết quả trả về số dư $${visibleTarget?.balanceUsd} từ phiên bản Tuple tại CTID ${visibleTarget?.ctid}.`,
          internalsNoteVi:
            prev.scanType === "IndexOnlyScan" && !prev.visibilityMapAllVisible
              ? `LƯU Ý QUAN TRỌNG: Dù chọn IndexOnlyScan, vì trang Heap Block 0 vừa có UPDATE nên bit all_visible trong Visibility Map = 0. PostgreSQL BẮT BUỘC phải đọc xuống Heap Block 0 (Heap Fetches = ${heapFetches}) để kiểm tra xmin/xmax!`
              : `B-Tree Index bản thân nó không lưu thông tin giao dịch xmin/xmax. Do đó Index Scan luôn phải đối chiếu xuống Heap Tuple (trừ khi Visibility Map xác nhận toàn bộ trang đã hiển thị với mọi giao dịch).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "WRITER_UPDATE_ACCOUNT_BALANCE") {
      const updatedRaw = prev.heapTuples
        .filter((t) => t.ctid !== "(0,3)")
        .map((t) => {
          if (t.ctid === "(0,1)") {
            return {
              ...t,
              xmax: 202,
            };
          }
          return { ...t };
        });

      updatedRaw.push({
        ctid: "(0,3)",
        blockNumber: 0,
        offsetNumber: 3,
        accountId: 42,
        balanceUsd: command.newBalanceUsd,
        xmin: 202,
        xmax: null,
        xmaxCommitted: false,
        isVisibleToReader: false,
        visibilityReasonVi: "",
      });

      // Leaf page #2 now also points to the new tuple version (0,3)
      for (const node of btreeNodes) {
        if (node.pageNumber === 2) {
          const has03 = node.entries.some((e) => e.targetCtid === "(0,3)");
          if (!has03) {
            node.entries.push({ key: 42, targetCtid: "(0,3)" });
          }
        }
      }

      const tuples = recomputeTuples(
        updatedRaw,
        prev.isolationLevel,
        false,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        writerCommitted: false,
        visibilityMapAllVisible: false, // Page 0 is now modified, VM bit cleared!
        btreeNodes,
        heapTuples: tuples,
      };

      return {
        tick: nextTick,
        phase: "Concurrent UPDATE (Uncommitted Tx 202)",
        title: `Writer Tx 202 chạy UPDATE balance = $${command.newBalanceUsd} -> ghi Tuple mới tại CTID (0,3)`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Writer Tx 202",
            action: "HEAP_UPDATE_APPEND_TUPLE",
            detail: `Đánh dấu xmax=202 trên CTID (0,1), chèn bản ghi mới CTID (0,3) với xmin=202 ($${command.newBalanceUsd}) và xóa bit Visibility Map của Block 0.`,
            tone: "warn",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summaryVi: `Giao dịch ghi Tx 202 thực hiện UPDATE account_id = 42 lên $${command.newBalanceUsd} (chưa COMMIT). PostgreSQL KHÔNG ghi đè lên CTID (0,1); thay vào đó nó gán xmax = 202 vào CTID (0,1) và ghi thêm một Tuple vật lý mới tại CTID (0,3) với xmin = 202!`,
          internalsNoteVi: `Vì Tx 202 chưa COMMIT, đối với Tx 201 thì CTID (0,3) là vô hình (Dirty Write), còn CTID (0,1) vẫn hiển thị bình thường với giá trị $500 mà không hề bị khóa chặn lệnh đọc (Readers do not block Writers, Writers do not block Readers).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "WRITER_COMMIT_TRANSACTION") {
      const nextSnapshotMax = prev.isolationLevel === "READ COMMITTED" ? 203 : prev.readerSnapshotMaxTx;
      const tuples = recomputeTuples(
        prev.heapTuples,
        prev.isolationLevel,
        true,
        nextSnapshotMax,
      );
      const visibleTarget = tuples.find(
        (t) => t.accountId === prev.targetAccountId && t.isVisibleToReader,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        writerCommitted: true,
        readerSnapshotMaxTx: nextSnapshotMax,
        heapTuples: tuples,
        returnedBalanceUsd: visibleTarget?.balanceUsd ?? prev.returnedBalanceUsd,
      };

      return {
        tick: nextTick,
        phase: `Writer Tx 202 COMMITTED (${prev.isolationLevel})`,
        title: `Writer Tx 202 COMMIT vào WAL -> Kiểm tra tính hiển thị dưới ${prev.isolationLevel}`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Writer Tx 202",
            action: "XACT_COMMIT_WAL_FLUSH",
            detail:
              prev.isolationLevel === "READ COMMITTED"
                ? "Tx 202 đã COMMIT. Dưới READ COMMITTED, câu lệnh tiếp theo của Tx 201 sẽ nhìn thấy CTID (0,3) = $950."
                : "Tx 202 đã COMMIT. Nhưng dưới REPEATABLE READ, Tx 201 giữ Snapshot cũ (xmax=201) nên tiếp tục nhìn thấy CTID (0,1) = $500!",
            tone: "ok",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summaryVi:
            prev.isolationLevel === "READ COMMITTED"
              ? `Tx 202 đã COMMIT thành công. Vì Tx 201 đang ở mức READ COMMITTED, câu lệnh SELECT tiếp theo sẽ lấy một Snapshot mới và nhìn thấy phiên bản mới CTID (0,3) với số dư $950 (trong khi CTID (0,1) trở thành Dead Tuple).`
              : `Tx 202 đã COMMIT thành công. Tuy nhiên, vì Tx 201 đang ở mức REPEATABLE READ, nó vẫn giữ nguyên Snapshot được chụp từ đầu giao dịch (chỉ thấy các XID < 201). Do đó CTID (0,3) (xmin=202) bị ẩn và Tx 201 vẫn đọc được $500 từ CTID (0,1)!`,
          internalsNoteVi: `Đây chính là bản chất của Multi-Version Concurrency Control (MVCC): cùng một thời điểm trên cùng một trang 8 KB, hai giao dịch ở hai mức cô lập khác nhau có thể đọc hai phiên bản vật lý khác nhau của cùng một dòng dữ liệu mà không cần đặt khóa đọc!`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "RUN_VACUUM_UPDATE_VISIBILITY_MAP") {
      // If writer committed, VACUUM reclaims dead tuple (0,1) and sets VM bit all_visible = true
      const cleanedRaw = prev.writerCommitted
        ? prev.heapTuples.filter((t) => t.ctid !== "(0,1)")
        : prev.heapTuples.map((t) => ({ ...t }));

      for (const node of btreeNodes) {
        if (node.pageNumber === 2 && prev.writerCommitted) {
          node.entries = node.entries.filter((e) => e.targetCtid !== "(0,1)");
        }
      }

      const tuples = recomputeTuples(
        cleanedRaw,
        prev.isolationLevel,
        prev.writerCommitted,
        prev.readerSnapshotMaxTx,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        visibilityMapAllVisible: true,
        btreeNodes,
        heapTuples: tuples,
      };

      return {
        tick: nextTick,
        phase: "VACUUM Reclaimed Dead Tuple & Set VM=1",
        title: `VACUUM thu hồi Dead Tuple CTID (0,1) và bật bit ALL_VISIBLE trong Visibility Map`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Autovacuum Worker",
            action: "VACUUM_AND_SET_VM",
            detail:
              "Đã dọn dẹp Dead Tuple (0,1), gỡ con trỏ khỏi B-Tree Leaf #2 và bật bit Visibility Map = ALL_VISIBLE.",
            tone: "ok",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summaryVi: `Tiến trình VACUUM đã dọn dẹp phiên bản cũ không còn giao dịch nào tham chiếu (Dead Tuple tại CTID (0,1)) và bật lại bit ALL_VISIBLE = 1 trên Visibility Map cho Heap Block 0.`,
          internalsNoteVi: `Sau khi VACUUM cập nhật Visibility Map, các truy vấn Index-Only Scan tiếp theo có thể trả kết quả trực tiếp từ trang lá B-Tree (Heap Fetches = 0) mà không cần đọc xuống Heap Block 0.`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    if (command.type === "SWITCH_ISOLATION_OR_SCAN") {
      const nextSnapshotMax =
        command.isolationLevel === "READ COMMITTED" && prev.writerCommitted ? 203 : 201;
      const tuples = recomputeTuples(
        prev.heapTuples,
        command.isolationLevel,
        prev.writerCommitted,
        nextSnapshotMax,
      );
      const visibleTarget = tuples.find(
        (t) => t.accountId === prev.targetAccountId && t.isVisibleToReader,
      );

      const nextState: PostgresMvccBtreeState = {
        ...prev,
        isolationLevel: command.isolationLevel,
        scanType: command.scanType,
        readerSnapshotMaxTx: nextSnapshotMax,
        heapTuples: tuples,
        returnedBalanceUsd: visibleTarget?.balanceUsd ?? prev.returnedBalanceUsd,
      };

      return {
        tick: nextTick,
        phase: `${command.isolationLevel} | ${command.scanType}`,
        title: `Đổi cấu hình sang ${command.isolationLevel} và ${command.scanType}`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Playground",
            action: "CHANGE_SCAN_OR_ISOLATION",
            detail: `Cấu hình hiện tại: ${command.isolationLevel}, Access Path = ${command.scanType}.`,
            tone: "info",
          },
        ],
        invariants: evaluatePostgresInvariants(nextState),
        narration: {
          summaryVi: `Đã chuyển cấu hình phiên đọc sang mức cô lập "${command.isolationLevel}" và chiến lược quét "${command.scanType}". Hãy bấm "Execute Reader SELECT" để quan sát số trang 8 KB được đọc và phiên bản Tuple trả về.`,
          internalsNoteVi: `Hãy thử chuyển qua lại giữa READ COMMITTED và REPEATABLE READ sau khi Writer Tx 202 đã COMMIT để thấy hiệu ứng dịch chuyển hiển thị giữa CTID (0,1) và CTID (0,3).`,
        },
        metrics: computePostgresMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
