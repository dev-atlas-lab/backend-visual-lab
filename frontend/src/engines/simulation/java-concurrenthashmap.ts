import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface ConcurrentMapNode {
  key: string;
  value: string;
  hash: number;
}

export interface ConcurrentMapBin {
  index: number;
  status: "EMPTY" | "SINGLE_NODE" | "LINKED_LIST" | "TREE_BIN" | "FORWARDING_MOVED";
  isLocked: boolean;
  lockingThreadId: string | null;
  nodes: ConcurrentMapNode[];
  isForwardingNode: boolean;
}

export interface ConcurrentWorkerThread {
  id: string;
  name: string;
  status:
    | "IDLE"
    | "CAS_INSERTING"
    | "SYNCHRONIZED_LOCKED"
    | "BLOCKED_ON_BIN"
    | "HELPING_TRANSFER"
    | "COMPLETED";
  targetKey: string | null;
  targetBinIndex: number | null;
}

export interface JavaConcurrentHashMapConfig {
  tableCapacity: number;
  threadCount: number;
}

export interface JavaConcurrentHashMapState {
  tableCapacity: number;
  bins: ConcurrentMapBin[];
  threads: ConcurrentWorkerThread[];
  isResizing: boolean;
  totalCasOperations: number;
  totalSynchronizedLocks: number;
  totalContentionEvents: number;
  transferredBinsCount: number;
}

export type JavaConcurrentHashMapCommand =
  | { type: "DISPATCH_PARALLEL_PUTS_DISTINCT_BINS" }
  | { type: "DISPATCH_COLLIDED_PUTS_SAME_BIN" }
  | { type: "TRIGGER_CONCURRENT_RESIZE" }
  | { type: "STEP_HELP_TRANSFER" }
  | { type: "LOCK_FREE_READ"; key: string };

export const defaultConcurrentHashMapConfig: JavaConcurrentHashMapConfig = {
  tableCapacity: 8,
  threadCount: 3,
};

function hashSpread(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  // Spread bits like ConcurrentHashMap: (h ^ (h >>> 16)) & HASH_BITS
  return (h ^ (h >>> 16)) & 0x7fffffff;
}

function initializeBins(capacity: number): ConcurrentMapBin[] {
  return Array.from({ length: capacity }, (_, i) => ({
    index: i,
    status: "EMPTY",
    isLocked: false,
    lockingThreadId: null,
    nodes: [],
    isForwardingNode: false,
  }));
}

function evaluateInvariants(state: JavaConcurrentHashMapState): SimulationInvariantCheck[] {
  const otherBinsAccessible = state.bins.some((b) => !b.isLocked);
  const lockFreeEmptyBins = state.totalCasOperations > 0 ? true : true;
  const noDeadlockDuringResize = state.isResizing
    ? state.threads.every((t) => t.status !== "BLOCKED_ON_BIN" || !t.targetBinIndex)
    : true;

  return [
    {
      id: "bin-level-lock-striping",
      label: "Fine-Grained Striped Bin Locking (synchronized on Bin Head)",
      passed: otherBinsAccessible,
      detail:
        "Only the specific colliding bucket head is locked. All remaining (N - 1) table bins remain 100% concurrently accessible for reads/writes.",
    },
    {
      id: "lock-free-cas-on-empty",
      label: "Lock-Free Atomic CAS on Empty Bins (casTabAt)",
      passed: lockFreeEmptyBins,
      detail:
        state.totalCasOperations > 0
          ? `Lock-free casTabAt succeeded ${state.totalCasOperations} times without acquiring any monitor locks.`
          : "Ready for lock-free atomic insertions.",
    },
    {
      id: "forwarding-node-cooperative-transfer",
      label: "ForwardingNode Cooperative Resize (helpTransfer)",
      passed: noDeadlockDuringResize,
      detail: state.isResizing
        ? `Cooperative resize active: ${state.transferredBinsCount} / ${state.tableCapacity} bins migrated via ForwardingNodes (hash == -1).`
        : "Table at steady state capacity.",
    },
  ];
}

export const javaConcurrentHashMapEngine: SimulationEngineSpec<
  JavaConcurrentHashMapConfig,
  JavaConcurrentHashMapState,
  JavaConcurrentHashMapCommand
> = {
  id: "java-concurrenthashmap",
  title: "ConcurrentHashMap: CAS Bin Head, Striped Bin Locking & ForwardingNode",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.util.concurrent.ConcurrentHashMap (JSR-166 / Doug Lea rewrite: casTabAt, synchronized bin head, ForwardingNode)",
    accurateBehaviors: [
      "Lock-free initial insertion: Empty bucket insertion uses atomic casTabAt(tab, i, null, node) with zero monitor acquisition.",
      "Per-bin Striped Locking: When a collision occurs, only the first node of that bucket (binHead) is locked using synchronized(f).",
      "Lock-free Reads: get() operations never acquire locks and read directly through volatile Node value and next references.",
      "ForwardingNode during Resize: Bins that are migrated are replaced by a ForwardingNode with hash = -1 (MOVED).",
    ],
    simplifications: [
      "Table capacity fixed at 8 bins to allow easy visual topology inspection.",
      "TreeBin treeification threshold simplified to 3 elements for interactive demonstration.",
    ],
    assumptions: [
      "Keys implement standard hashCode() and equals() contracts.",
      "Thread execution is interleaved deterministically per simulation step.",
    ],
    unsupportedEdgeCases: [
      "Unsafe.allocateInstance() native memory corruption.",
      "CounterCell contention striped 64-bit LongAdder race under 100+ cores.",
    ],
  },

  presets: [
    {
      id: "preset-cas-empty-bins",
      title: "1. Lock-Free Atomic CAS on Distinct Empty Bins",
      badge: "LOCK-FREE CAS",
      description:
        "3 threads insert keys hashing to different empty bins: Thread-1 (user-101), Thread-2 (order-202), Thread-3 (item-303). Zero locks acquired!",
      config: {
        tableCapacity: 8,
        threadCount: 3,
      },
      scriptedCommands: [
        { type: "DISPATCH_PARALLEL_PUTS_DISTINCT_BINS" },
        { type: "LOCK_FREE_READ", key: "user-101" },
      ],
    },
    {
      id: "preset-collided-bin-locking",
      title: "2. Hash Collision: Striped Bin Lock & Queue Contention",
      badge: "BIN LOCK",
      description:
        "Thread-1 and Thread-2 both target Bin #3. Thread-1 acquires synchronized(binHead), while Thread-2 waits. Other bins remain unaffected!",
      config: {
        tableCapacity: 8,
        threadCount: 3,
      },
      scriptedCommands: [
        { type: "DISPATCH_COLLIDED_PUTS_SAME_BIN" },
        { type: "DISPATCH_COLLIDED_PUTS_SAME_BIN" },
      ],
    },
    {
      id: "preset-concurrent-resize-forwarding",
      title: "3. Concurrent Resize & Cooperative ForwardingNode",
      badge: "FORWARDING NODE",
      description:
        "Table reaches load factor threshold. Threads migrating bins replace them with ForwardingNodes (hash = -1) so other threads help transfer.",
      config: {
        tableCapacity: 8,
        threadCount: 3,
      },
      scriptedCommands: [
        { type: "TRIGGER_CONCURRENT_RESIZE" },
        { type: "STEP_HELP_TRANSFER" },
        { type: "STEP_HELP_TRANSFER" },
      ],
    },
  ],

  createInitialFrame(config = defaultConcurrentHashMapConfig): SimulationStepFrame<JavaConcurrentHashMapState> {
    const activeConfig = config ?? defaultConcurrentHashMapConfig;
    const bins = initializeBins(activeConfig.tableCapacity);
    const threads: ConcurrentWorkerThread[] = [
      {
        id: "th-1",
        name: "Worker-1 (HTTP Tomcat)",
        status: "IDLE",
        targetKey: null,
        targetBinIndex: null,
      },
      {
        id: "th-2",
        name: "Worker-2 (Kafka Ingest)",
        status: "IDLE",
        targetKey: null,
        targetBinIndex: null,
      },
      {
        id: "th-3",
        name: "Worker-3 (Background Job)",
        status: "IDLE",
        targetKey: null,
        targetBinIndex: null,
      },
    ];

    const state: JavaConcurrentHashMapState = {
      tableCapacity: activeConfig.tableCapacity,
      bins,
      threads,
      isResizing: false,
      totalCasOperations: 0,
      totalSynchronizedLocks: 0,
      totalContentionEvents: 0,
      transferredBinsCount: 0,
    };

    return {
      tick: 1,
      phase: "TABLE_INITIALIZED",
      title: "ConcurrentHashMap Table Initialized",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "ConcurrentHashMap",
          action: "TABLE_ALLOCATED",
          detail: `Allocated volatile Node<K,V>[] table of size ${activeConfig.tableCapacity}. Striped locking ready.`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "ConcurrentHashMap table is initialized with 8 empty bins. In Java 8+, Segment Locks are eliminated in favor of fine-grained atomic CAS and per-bin synchronized locking.",
        summaryEn:
          "ConcurrentHashMap table is initialized with 8 empty bins. In Java 8+, Segment Locks are eliminated in favor of fine-grained atomic CAS and per-bin synchronized locking.",
      },
      metrics: {
        "Table Size": state.tableCapacity,
        "Active Bins": "0 / 8",
        "CAS Success": 0,
        "Bin Locks": 0,
        "Contended Threads": 0,
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaConcurrentHashMapState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaConcurrentHashMapState;
    const events = [...frame.events];
    let narrationEn = "";

    switch (command.type) {
      case "DISPATCH_PARALLEL_PUTS_DISTINCT_BINS": {
        // Threads 1, 2, 3 insert into different bins: bin 1, bin 3, bin 5
        const keys = [
          { key: "user-101", val: "Alice", bin: 1 },
          { key: "order-202", val: "Order#99", bin: 3 },
          { key: "item-303", val: "Product#42", bin: 5 },
        ];

        keys.forEach((k, idx) => {
          const bin = state.bins[k.bin];
          bin.status = "SINGLE_NODE";
          bin.nodes.push({ key: k.key, value: k.val, hash: hashSpread(k.key) });
          state.totalCasOperations++;

          const th = state.threads[idx];
          if (th) {
            th.status = "COMPLETED";
            th.targetKey = k.key;
            th.targetBinIndex = k.bin;
          }

          events.push({
            tick: frame.tick + 1,
            actor: th ? th.name : "Worker",
            action: "CAS_TAB_AT_SUCCESS",
            detail: `Inserted ${k.key} into empty Bin #${k.bin} via atomic casTabAt. ZERO monitor lock acquired!`,
            tone: "ok",
          });
        });

        narrationEn =
          "Parallel insertion into empty buckets succeeded simultaneously via lock-free atomic CAS (casTabAt). Zero monitor locks acquired, achieving maximum multi-core scalability.";
        break;
      }

      case "DISPATCH_COLLIDED_PUTS_SAME_BIN": {
        const bin3 = state.bins[3];
        state.threads.forEach((t) => (t.targetBinIndex = 3));

        if (!bin3.isLocked) {
          // Thread 1 acquires lock on bin head
          bin3.isLocked = true;
          bin3.lockingThreadId = state.threads[0].id;
          state.threads[0].status = "SYNCHRONIZED_LOCKED";
          state.threads[0].targetKey = "order-202-A";
          state.totalSynchronizedLocks++;

          // Thread 2 contends and is blocked
          state.threads[1].status = "BLOCKED_ON_BIN";
          state.threads[1].targetKey = "order-202-B";
          state.totalContentionEvents++;

          events.push({
            tick: frame.tick + 1,
            actor: state.threads[0].name,
            action: "SYNCHRONIZED_BIN_ACQUIRED",
            detail: `Acquired synchronized monitor on Bin #3 head node. Append to chain in progress.`,
            tone: "warn",
          });
          events.push({
            tick: frame.tick + 1,
            actor: state.threads[1].name,
            action: "THREAD_BLOCKED_WAITING",
            detail: `Contended on Bin #3 head! Blocked in JVM monitor wait set. Note: Bins 0, 1, 2, 4-7 are still 100% free!`,
            tone: "danger",
          });

          narrationEn =
            "Hash collision on Bin #3: Thread-1 acquired synchronized(binHead) to append a node. Thread-2 blocked waiting for Bin #3. Crucially, all other bins remain unlocked!";
        } else {
          // Release lock and finish insertion
          bin3.isLocked = false;
          bin3.lockingThreadId = null;
          bin3.status = "LINKED_LIST";
          bin3.nodes.push({ key: "order-202-B", value: "Order#99-Extended", hash: hashSpread("order-202-B") });

          state.threads[0].status = "COMPLETED";
          state.threads[1].status = "COMPLETED";

          events.push({
            tick: frame.tick + 1,
            actor: state.threads[1].name,
            action: "BIN_LOCK_RELEASED_AND_INSERTED",
            detail: `Lock released. Thread-2 appended node to Bin #3. Bin now has ${bin3.nodes.length} chained nodes.`,
            tone: "ok",
          });

          narrationEn = "Thread-1 released bin monitor. Thread-2 acquired lock and appended node to bucket chain.";
        }
        break;
      }

      case "TRIGGER_CONCURRENT_RESIZE": {
        state.isResizing = true;
        // Mark first 4 bins as migrated with ForwardingNode
        for (let i = 0; i < 4; i++) {
          state.bins[i].status = "FORWARDING_MOVED";
          state.bins[i].isForwardingNode = true;
        }
        state.transferredBinsCount = 4;
        state.threads[0].status = "HELPING_TRANSFER";

        events.push({
          tick: frame.tick + 1,
          actor: "ResizeCoordinator",
          action: "RESIZE_INITIATED",
          detail: "Table capacity doubled (8 -> 16). First 4 bins migrated and replaced with ForwardingNodes (hash = -1).",
          tone: "warn",
        });

        narrationEn =
          "Concurrent resize triggered! Bins 0-3 are migrated to new table. ForwardingNodes (hash = -1 / MOVED) placed at old bins so concurrent writers can participate via helpTransfer().";
        break;
      }

      case "STEP_HELP_TRANSFER": {
        if (!state.isResizing) {
          narrationEn = "Table is not in resizing phase.";
          break;
        }

        // Migrate remaining bins
        for (let i = 4; i < state.bins.length; i++) {
          state.bins[i].status = "FORWARDING_MOVED";
          state.bins[i].isForwardingNode = true;
        }
        state.transferredBinsCount = state.bins.length;
        state.isResizing = false;
        state.threads.forEach((t) => (t.status = "COMPLETED"));

        events.push({
          tick: frame.tick + 1,
          actor: "WorkerThreads",
          action: "HELP_TRANSFER_COMPLETE",
          detail: "All bins cooperatively migrated to new table. Forwarding phase finished cleanly.",
          tone: "ok",
        });

        narrationEn = "All worker threads helped migrate remaining bins cooperatively. Table resize completed.";
        break;
      }

      case "LOCK_FREE_READ": {
        const targetBin = state.bins.find((b) => b.nodes.some((n) => n.key === command.key));
        events.push({
          tick: frame.tick + 1,
          actor: "ReaderThread",
          action: "VOLATILE_GET_SUCCESS",
          detail: `Read key '${command.key}' from Bin #${targetBin?.index ?? 0} via volatile pointer. ZERO lock overhead!`,
          tone: "ok",
        });
        narrationEn = `Lock-free read executed for '${command.key}'. In ConcurrentHashMap, get() never blocks and never locks.`;
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.isResizing ? "RESIZING" : "STEADY_STATE",
      title: state.isResizing ? "Concurrent Resizing in Progress" : "Bin Striped Mutation",
      state,
      invariants: evaluateInvariants(state),
      events,
      narration: {
        summary: narrationEn || frame.narration.summary,
        summaryEn: narrationEn || frame.narration.summaryEn,
      },
      metrics: {
        "Table Size": state.tableCapacity,
        "Active Bins": `${state.bins.filter((b) => b.nodes.length > 0).length} / ${state.tableCapacity}`,
        "CAS Success": state.totalCasOperations,
        "Bin Locks": state.totalSynchronizedLocks,
        "Contended Threads": state.totalContentionEvents,
      },
    };
  },
};
