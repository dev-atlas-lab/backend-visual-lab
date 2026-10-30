import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface ThreadLocalEntry {
  slotIndex: number;
  threadLocalKeyName: string;
  hasStrongRefToKey: boolean;
  isKeyCleared: boolean; // WeakReference key collected (key == null)
  valuePayload: string;
  valueSizeMb: number;
}

export interface WorkerThreadContext {
  id: string;
  name: string;
  isPooled: boolean;
  currentRequestId: string | null;
  threadLocalsTable: ThreadLocalEntry[];
}

export interface ReferenceTypeItem {
  id: string;
  name: string;
  type: "STRONG" | "SOFT" | "WEAK" | "PHANTOM";
  targetObject: string;
  sizeMb: number;
  hasStrongRef: boolean;
  isCollected: boolean;
  isEnqueuedInRefQueue: boolean;
}

export type ThreadLocalSimulationMode =
  | "THREAD_POOL_LEAK"
  | "CLEAN_REMOVE_LIFECYCLE"
  | "REFERENCE_TYPES_SWEEP";

export interface JavaThreadLocalConfig {
  mode: ThreadLocalSimulationMode;
  workerCount: number;
  payloadSizeMb: number;
}

export interface JavaThreadLocalState {
  mode: ThreadLocalSimulationMode;
  workers: WorkerThreadContext[];
  references: ReferenceTypeItem[];
  gcRunsCount: number;
  totalLeakedMb: number;
  staleEntriesCount: number;
  requestsProcessed: number;
  memoryLeakAlert: boolean;
}

export type JavaThreadLocalCommand =
  | { type: "SUBMIT_HTTP_REQUEST"; payloadName: string }
  | { type: "RELEASE_STRONG_KEY_REF" }
  | { type: "TRIGGER_GARBAGE_COLLECTION" }
  | { type: "EXECUTE_FINALLY_REMOVE" }
  | { type: "TRIGGER_LOW_HEAP_PRESSURE" };

export const defaultThreadLocalConfig: JavaThreadLocalConfig = {
  mode: "THREAD_POOL_LEAK",
  workerCount: 2,
  payloadSizeMb: 50,
};

function evaluateInvariants(state: JavaThreadLocalState): SimulationInvariantCheck[] {
  const noMemoryLeak = !state.memoryLeakAlert && state.staleEntriesCount === 0;
  const properCleanup =
    state.mode === "CLEAN_REMOVE_LIFECYCLE"
      ? state.totalLeakedMb === 0
      : true;
  const weakReferenceKeyHonored = state.references.every(
    (r) => !(r.type === "WEAK" && !r.hasStrongRef && state.gcRunsCount > 0 && !r.isCollected),
  );

  return [
    {
      id: "threadlocal-pool-leak-hazard",
      label: "ThreadPool ThreadLocal Leak Invariance (Zero Stale (key == null) Entries)",
      passed: noMemoryLeak,
      detail:
        state.staleEntriesCount > 0
          ? `CRITICAL MEMORY LEAK: ${state.staleEntriesCount} stale ThreadLocalMap entries with (key == null) detected! ${state.totalLeakedMb} MB strongly referenced by permanent worker threads.`
          : "Clean ThreadLocalMap state. No orphan stale entries retained across pooled workers.",
    },
    {
      id: "try-finally-remove-discipline",
      label: "Mandatory try-finally { threadLocal.remove(); } Protocol",
      passed: properCleanup,
      detail:
        state.mode === "CLEAN_REMOVE_LIFECYCLE"
          ? "Compliant lifecycle: remove() explicitly expunged the map entry upon request completion."
          : `Requests executed without remove(): Heap accumulation reached ${state.totalLeakedMb} MB!`,
    },
    {
      id: "reference-type-reachability",
      label: "Java Reference Reachability (WeakReference Collected on Next GC)",
      passed: weakReferenceKeyHonored,
      detail: "WeakReference keys cleared as soon as strong referents were released, while SoftReferences survive until memory pressure.",
    },
  ];
}

export const javaThreadLocalEngine: SimulationEngineSpec<
  JavaThreadLocalConfig,
  JavaThreadLocalState,
  JavaThreadLocalCommand
> = {
  id: "java-threadlocal-leak",
  title: "ThreadLocal & Java Reference Types: Memory Leaks in Thread Pools",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.lang.ThreadLocal, ThreadLocal.ThreadLocalMap, java.lang.ref.WeakReference, SoftReference, PhantomReference",
    accurateBehaviors: [
      "ThreadLocalMap Entry Structure: Entry extends WeakReference<ThreadLocal<?>>, holding key as WeakReference and value as StrongReference.",
      "Thread Pool Leak Mechanism: When strong ThreadLocal variable is cleared, GC nulls the key (key == null). However, Entry.value remains reachable from Thread.threadLocals.",
      "Expunge Stale Entry: ThreadLocalMap cleans slots with key == null only during collisions or resize, meaning idle threads keep values leaked forever.",
      "Reference Types Hierarchy: Strong (never collected if reachable), Soft (collected on memory pressure), Weak (collected on next GC), Phantom (enqueued in ReferenceQueue).",
    ],
    simplifications: [
      "Payload simulated as 50 MB user security context / classloader byte buffer.",
      "Fixed 2 worker threads in pool to visually spotlight memory leakage across HTTP requests.",
    ],
    assumptions: [
      "Worker threads originate from Tomcat/Jetty pool and survive indefinitely (never terminate after request).",
      "Garbage Collection evaluates reachability deterministically when triggered.",
    ],
    unsupportedEdgeCases: [
      "InheritableThreadLocal child thread map cloning.",
      "Reflection tampering with private final Thread.threadLocals field.",
    ],
  },

  presets: [
    {
      id: "preset-threadpool-leak",
      title: "1. The Thread Pool Memory Leak (Missing remove() in Worker)",
      badge: "MEMORY LEAK HAZARD",
      description:
        "Tomcat worker handles requests setting ThreadLocal<SecurityContext>. Strong ref is lost; GC clears the weak key, but the 50 MB value is retained by the permanent worker thread!",
      config: {
        mode: "THREAD_POOL_LEAK",
        workerCount: 2,
        payloadSizeMb: 50,
      },
      scriptedCommands: [
        { type: "SUBMIT_HTTP_REQUEST", payloadName: "TenantAdminContext#101" },
        { type: "RELEASE_STRONG_KEY_REF" },
        { type: "TRIGGER_GARBAGE_COLLECTION" },
        { type: "SUBMIT_HTTP_REQUEST", payloadName: "TenantAdminContext#102" },
      ],
    },
    {
      id: "preset-clean-remove",
      title: "2. The Bulletproof Pattern: try-finally { threadLocal.remove(); }",
      badge: "ZERO LEAK",
      description:
        "Worker thread sets context in try block and explicitly invokes threadLocal.remove() in finally. ThreadLocalMap entry is completely scrubbed: 0 MB leaked!",
      config: {
        mode: "CLEAN_REMOVE_LIFECYCLE",
        workerCount: 2,
        payloadSizeMb: 50,
      },
      scriptedCommands: [
        { type: "SUBMIT_HTTP_REQUEST", payloadName: "TenantAdminContext#201" },
        { type: "EXECUTE_FINALLY_REMOVE" },
        { type: "SUBMIT_HTTP_REQUEST", payloadName: "TenantAdminContext#202" },
        { type: "EXECUTE_FINALLY_REMOVE" },
      ],
    },
    {
      id: "preset-reference-types-comparison",
      title: "3. Java Reference Types: Strong vs Soft vs Weak vs Phantom",
      badge: "REFERENCE TYPES",
      description:
        "Demonstrates how GC treats Strong, Soft (memory pressure), Weak (cleared immediately), and Phantom (ReferenceQueue post-mortem cleanup) references.",
      config: {
        mode: "REFERENCE_TYPES_SWEEP",
        workerCount: 1,
        payloadSizeMb: 20,
      },
      scriptedCommands: [
        { type: "RELEASE_STRONG_KEY_REF" },
        { type: "TRIGGER_GARBAGE_COLLECTION" },
        { type: "TRIGGER_LOW_HEAP_PRESSURE" },
      ],
    },
  ],

  createInitialFrame(config = defaultThreadLocalConfig): SimulationStepFrame<JavaThreadLocalState> {
    const activeConfig = config ?? defaultThreadLocalConfig;
    const workers: WorkerThreadContext[] = Array.from({ length: activeConfig.workerCount }, (_, i) => ({
      id: `tomcat-worker-${i + 1}`,
      name: `http-nio-8080-exec-${i + 1} (Permanent Pool Thread)`,
      isPooled: true,
      currentRequestId: null,
      threadLocalsTable: [],
    }));

    const references: ReferenceTypeItem[] = [
      {
        id: "ref-strong",
        name: "StrongReference",
        type: "STRONG",
        targetObject: "CachedSession[id=1]",
        sizeMb: 10,
        hasStrongRef: true,
        isCollected: false,
        isEnqueuedInRefQueue: false,
      },
      {
        id: "ref-soft",
        name: "SoftReference",
        type: "SOFT",
        targetObject: "ImageThumbnailCache[size=50MB]",
        sizeMb: 50,
        hasStrongRef: false,
        isCollected: false,
        isEnqueuedInRefQueue: false,
      },
      {
        id: "ref-weak",
        name: "WeakReference (ThreadLocal Key)",
        type: "WEAK",
        targetObject: "ThreadLocal[SecurityContext]",
        sizeMb: 2,
        hasStrongRef: true,
        isCollected: false,
        isEnqueuedInRefQueue: false,
      },
      {
        id: "ref-phantom",
        name: "PhantomReference",
        type: "PHANTOM",
        targetObject: "DirectByteBuffer[NativeMemory=64MB]",
        sizeMb: 64,
        hasStrongRef: false,
        isCollected: false,
        isEnqueuedInRefQueue: false,
      },
    ];

    const state: JavaThreadLocalState = {
      mode: activeConfig.mode,
      workers,
      references,
      gcRunsCount: 0,
      totalLeakedMb: 0,
      staleEntriesCount: 0,
      requestsProcessed: 0,
      memoryLeakAlert: false,
    };

    return {
      tick: 1,
      phase: "INITIAL_STEADY",
      title: "ThreadPool & ThreadLocalMap Initialized",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "TomcatThreadPool",
          action: "WORKER_POOL_INITIALIZED",
          detail: `Initialized ${workers.length} pooled worker threads. Each thread contains an internal ThreadLocal.ThreadLocalMap table.`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "In Java, every Thread object has an internal field: ThreadLocal.ThreadLocalMap threadLocals. Because web servers (Tomcat, Netty) reuse worker threads for months, failing to clean ThreadLocal values causes catastrophic memory leaks.",
        summaryEn:
          "In Java, every Thread object has an internal field: ThreadLocal.ThreadLocalMap threadLocals. Because web servers (Tomcat, Netty) reuse worker threads for months, failing to clean ThreadLocal values causes catastrophic memory leaks.",
        productionWarning:
          "Golden Rule: Any code calling threadLocal.set(...) MUST be enclosed in try { ... } finally { threadLocal.remove(); }!",
        productionWarningEn:
          "Golden Rule: Any code calling threadLocal.set(...) MUST be enclosed in try { ... } finally { threadLocal.remove(); }!",
      },
      metrics: {
        "Pooled Workers": workers.length,
        "Leaked Memory": "0 MB",
        "Stale Entries": 0,
        "Requests Done": 0,
        "Memory Leak": "NONE",
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaThreadLocalState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaThreadLocalState;
    const events = [...frame.events];
    let narrationEn = "";
    let prodWarningEn: string | undefined = undefined;

    switch (command.type) {
      case "SUBMIT_HTTP_REQUEST": {
        state.requestsProcessed++;
        const worker = state.workers[0]; // focus on worker 1
        const reqId = `REQ-${state.requestsProcessed}`;
        worker.currentRequestId = reqId;

        const newEntry: ThreadLocalEntry = {
          slotIndex: worker.threadLocalsTable.length,
          threadLocalKeyName: `ThreadLocal<SecurityContext>[${reqId}]`,
          hasStrongRefToKey: true,
          isKeyCleared: false,
          valuePayload: `${command.payloadName} (Large Security / ClassLoader Payload)`,
          valueSizeMb: 50,
        };

        worker.threadLocalsTable.push(newEntry);

        events.push({
          tick: frame.tick + 1,
          actor: worker.name,
          action: "THREADLOCAL_SET",
          detail: `Worker accepted ${reqId}. Called threadLocal.set(50MB SecurityContext). Stored in ThreadLocalMap Entry.`,
          tone: "info",
        });

        narrationEn = `Worker thread accepted ${reqId} and called threadLocal.set(...). An Entry was added to Thread.currentThread().threadLocals with a WeakReference key and StrongReference value.`;
        break;
      }

      case "RELEASE_STRONG_KEY_REF": {
        // Strong reference on thread stack (local variable) goes out of scope
        state.workers.forEach((w) => {
          w.threadLocalsTable.forEach((e) => {
            e.hasStrongRefToKey = false;
          });
        });

        state.references.forEach((r) => {
          if (r.type === "WEAK") {
            r.hasStrongRef = false;
          }
        });

        events.push({
          tick: frame.tick + 1,
          actor: "StackFrameScope",
          action: "LOCAL_VAR_OUT_OF_SCOPE",
          detail: "The ThreadLocal local variable went out of scope (stack frame popped). Only WeakReference in ThreadLocalMap points to it!",
          tone: "warn",
        });

        narrationEn =
          "The method ended and the local ThreadLocal variable on the stack was popped. Now the only reference to the ThreadLocal object is the WeakReference key in ThreadLocalMap!";
        break;
      }

      case "TRIGGER_GARBAGE_COLLECTION": {
        state.gcRunsCount++;
        let newlyStaleCount = 0;

        // GC clears WeakReference keys that have no strong references
        state.workers.forEach((w) => {
          w.threadLocalsTable.forEach((e) => {
            if (!e.hasStrongRefToKey && !e.isKeyCleared) {
              e.isKeyCleared = true; // key becomes null!
              newlyStaleCount++;
            }
          });
        });

        // Update reference items
        state.references.forEach((r) => {
          if (r.type === "WEAK" && !r.hasStrongRef) {
            r.isCollected = true;
          }
        });

        state.staleEntriesCount = state.workers.reduce(
          (acc, w) => acc + w.threadLocalsTable.filter((e) => e.isKeyCleared).length,
          0,
        );

        state.totalLeakedMb = state.workers.reduce(
          (acc, w) =>
            acc +
            w.threadLocalsTable
              .filter((e) => e.isKeyCleared)
              .reduce((sub, e) => sub + e.valueSizeMb, 0),
          0,
        );

        if (state.totalLeakedMb > 0) {
          state.memoryLeakAlert = true;
        }

        events.push({
          tick: frame.tick + 1,
          actor: "HotSpotGC",
          action: "WEAK_REFERENCES_CLEARED",
          detail: `GC cycle executed! Cleared ${newlyStaleCount} WeakReference keys (key == null). BUT Entry.value (50MB) remains strongly reachable from permanent Thread!`,
          tone: state.totalLeakedMb > 0 ? "danger" : "ok",
        });

        narrationEn =
          "CRITICAL MEMORY LEAK EXPOSED: During GC, because the key was a WeakReference with no strong roots, the key was collected (key == null). HOWEVER, Entry.value is still strongly reachable through Thread -> ThreadLocalMap -> Entry -> Value. Since worker threads never die, this 50 MB payload can NEVER be garbage collected!";
        prodWarningEn =
          "In enterprise web applications, leaking ThreadLocal values holds onto application ClassLoaders, quickly resulting in java.lang.OutOfMemoryError: Metaspace during application redeployments!";
        break;
      }

      case "EXECUTE_FINALLY_REMOVE": {
        const worker = state.workers[0];
        const removedCount = worker.threadLocalsTable.length;
        worker.threadLocalsTable = [];
        worker.currentRequestId = null;
        state.staleEntriesCount = 0;
        state.totalLeakedMb = 0;
        state.memoryLeakAlert = false;

        events.push({
          tick: frame.tick + 1,
          actor: worker.name,
          action: "THREADLOCAL_REMOVE_FINALLY",
          detail: `Executed threadLocal.remove() in finally block! Scrubbed ${removedCount} entries completely from ThreadLocalMap. 0 MB leaked.`,
          tone: "ok",
        });

        narrationEn =
          "BULLETPROOF DISCIPLINE: Calling threadLocal.remove() inside a finally block explicitly removes both key and value from ThreadLocalMap. The permanent worker thread is clean and ready for the next request!";
        break;
      }

      case "TRIGGER_LOW_HEAP_PRESSURE": {
        // SoftReferences collected under low memory pressure
        state.references.forEach((r) => {
          if (r.type === "SOFT") {
            r.isCollected = true;
          }
          if (r.type === "PHANTOM") {
            r.isEnqueuedInRefQueue = true;
          }
        });

        events.push({
          tick: frame.tick + 1,
          actor: "LowMemoryHandler",
          action: "SOFT_REFERENCES_PURGED",
          detail: "JVM Heap pressure exceeded 95%! HotSpot purged all SoftReferences before throwing OutOfMemoryError. PhantomReferences enqueued to ReferenceQueue.",
          tone: "warn",
        });

        narrationEn =
          "SoftReference Semantics: SoftReferences are retained as long as memory is sufficient, but guaranteed to be collected before an OutOfMemoryError is thrown (ideal for LRU caches). PhantomReferences are enqueued on ReferenceQueue for native cleanup.";
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.memoryLeakAlert ? "MEMORY_LEAK_WARNING" : "HEALTHY_DISPATCH",
      title: state.memoryLeakAlert
        ? "CRITICAL: ThreadPool ThreadLocal Memory Leak Detected"
        : "ThreadLocal Lifecycle Execution",
      state,
      invariants: evaluateInvariants(state),
      events,
      narration: {
        summary: narrationEn || frame.narration.summary,
        summaryEn: narrationEn || frame.narration.summaryEn,
        productionWarning: prodWarningEn || frame.narration.productionWarning,
        productionWarningEn: prodWarningEn || frame.narration.productionWarningEn,
      },
      metrics: {
        "Leaked Heap": `${state.totalLeakedMb} MB`,
        "Stale Entries": state.staleEntriesCount,
        "GC Sweeps": state.gcRunsCount,
        "Requests Processed": state.requestsProcessed,
        "Leak Status": state.memoryLeakAlert ? "CRITICAL ALERT" : "CLEAN",
      },
    };
  },
};
