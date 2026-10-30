import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
} from "./types";

export interface JavaVirtualThread {
  id: string;
  name: string;
  status:
    | "QUEUED_RUNNABLE"
    | "MOUNTED_RUNNING"
    | "YIELDED_PARKED_IO"
    | "PINNED_BLOCKED"
    | "COMPLETED";
  mountedCarrierId: string | null;
  ioWaitMsRemaining: number;
  isPinned: boolean;
  pinningReason?: string;
  stackSizeKb: number;
}

export interface JavaCarrierThread {
  id: string;
  name: string;
  status: "IDLE" | "BUSY" | "PINNED";
  currentVirtualThreadId: string | null;
  totalTasksProcessed: number;
}

export interface JavaVirtualThreadsConfig {
  carrierPoolSize: number; // typically equals Runtime.getRuntime().availableProcessors()
  initialSpawnCount: number;
}

export interface JavaVirtualThreadsState {
  carrierPoolSize: number;
  carrierThreads: JavaCarrierThread[];
  virtualThreads: JavaVirtualThread[];
  totalSpawned: number;
  completedCount: number;
  virtualThreadStackKb: number;
  platformThreadStackKb: number;
  hasPinnedCarrierAlert: boolean;
}

export type JavaVirtualThreadsCommand =
  | { type: "SPAWN_TASKS"; count: number }
  | { type: "STEP_EXECUTION" }
  | { type: "TRIGGER_BLOCKING_IO" }
  | { type: "TRIGGER_SYNCHRONIZED_PINNING" }
  | { type: "RESOLVE_IO_COMPLETION" };

const defaultConfig: JavaVirtualThreadsConfig = {
  carrierPoolSize: 2,
  initialSpawnCount: 8,
};

function evaluateInvariants(state: JavaVirtualThreadsState): SimulationInvariantCheck[] {
  const runnableCount = state.virtualThreads.filter((vt) => vt.status === "QUEUED_RUNNABLE").length;
  const idleCarriers = state.carrierThreads.filter((c) => c.status === "IDLE").length;

  const noIdleCarriersWhenWorkAvailable = !(runnableCount > 0 && idleCarriers > 0);
  const pinnedCarriers = state.carrierThreads.filter((c) => c.status === "PINNED").length;

  const totalVirtualMemoryMb =
    (state.virtualThreads.length * state.virtualThreadStackKb) / 1024;
  const equivalentPlatformMemoryMb =
    (state.virtualThreads.length * state.platformThreadStackKb) / 1024;

  return [
    {
      id: "carrier-work-stealing-efficiency",
      label: "Carrier Thread Pool Saturation (ForkJoinPool)",
      passed: noIdleCarriersWhenWorkAvailable,
      detail: noIdleCarriersWhenWorkAvailable
        ? `All Carrier Threads are fully saturated or run queue is empty (${runnableCount} runnable).`
        : `CPU Inefficiency: ${idleCarriers} Carrier Thread(s) idle while ${runnableCount} Virtual Threads are waiting in queue!`,
    },
    {
      id: "thread-pinning-safety",
      label: "Thread Pinning Absence (No Synchronized / JNI Hold)",
      passed: pinnedCarriers === 0,
      detail: pinnedCarriers === 0
        ? "No Carrier Threads are pinned. All blocking I/O calls yield continuations safely."
        : `PINNING ALERT: ${pinnedCarriers} Carrier Thread(s) locked by synchronized blocks, paralyzing scheduler throughput!`,
    },
    {
      id: "memory-footprint-advantage",
      label: "Memory Footprint Scale (Virtual vs Platform Threads)",
      passed: true,
      detail: `With ${state.virtualThreads.length} threads: Virtual Threads consume ~${totalVirtualMemoryMb.toFixed(1)} MB (heap-allocated stack), whereas Platform Threads would consume ~${equivalentPlatformMemoryMb.toFixed(1)} MB of OS virtual memory!`,
    },
  ];
}

export const javaVirtualThreadsSimulation: SimulationEngineSpec<
  JavaVirtualThreadsConfig,
  JavaVirtualThreadsState,
  JavaVirtualThreadsCommand
> = {
  id: "java-virtual-threads",
  title: "Java 21 Virtual Threads (Project Loom) & Carrier Scheduling Simulator",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "JEP 444: Virtual Threads (Java 21 LTS) & OpenJDK HotSpot Continuation Architecture",
    accurateBehaviors: [
      "Virtual Threads are M:N user-mode threads scheduled across a small pool of OS Carrier Threads (ForkJoinPool).",
      "Upon encountering blocking I/O (Socket read/write, LockSupport.park), the Continuation yields and unmounts immediately from the Carrier Thread.",
      "The Carrier Thread is instantly freed to mount and execute the next runnable Virtual Thread from the queue.",
      "Inside synchronized blocks or native JNI frames, Virtual Threads pin the Carrier Thread, preventing unmounting and exhausting worker pool capacity.",
      "Virtual Thread stack frames scale dynamically on the JVM Heap (few KB), compared to the fixed 1MB OS stack of Platform Threads.",
    ],
    simplifications: [
      "I/O blocking duration is modeled via discrete logical simulation ticks.",
      "ForkJoinPool work-stealing across per-carrier deques is visualized via a centralized global run queue.",
    ],
    assumptions: [
      "Workloads are primarily I/O-bound (external HTTP REST calls, database queries).",
      "The host OS provides non-blocking epoll/kqueue facilities managed by the JVM poller thread.",
    ],
    unsupportedEdgeCases: [
      "Intensive CPU-bound computation loops (where Virtual Threads offer no throughput benefit over Platform Threads).",
      "Scoped Values and StructuredTaskScope deadline cascading.",
    ],
  },
  presets: [
    {
      id: "continuation-yield-high-throughput",
      title: "1. I/O Concurrency Scaling & Continuation Yield",
      badge: "Non-blocking Yield",
      description:
        "Observe 8 Virtual Threads executing Database I/O. When blocking occurs, the Virtual Thread unmounts, freeing the Carrier Thread immediately for the next task.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "STEP_EXECUTION" },
        { type: "TRIGGER_BLOCKING_IO" },
        { type: "STEP_EXECUTION" },
        { type: "TRIGGER_BLOCKING_IO" },
        { type: "RESOLVE_IO_COMPLETION" },
        { type: "STEP_EXECUTION" },
      ],
    },
    {
      id: "thread-pinning-synchronized-hazard",
      title: "2. Thread Pinning Hazard with synchronized Blocks",
      badge: "Carrier Pinning",
      description:
        "When a Virtual Thread executes blocking I/O inside a synchronized block, the Carrier Thread is pinned and cannot unmount, starving the pool.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "STEP_EXECUTION" },
        { type: "TRIGGER_SYNCHRONIZED_PINNING" },
        { type: "STEP_EXECUTION" },
        { type: "RESOLVE_IO_COMPLETION" },
      ],
    },
  ],

  createInitialFrame(config = defaultConfig) {
    const carrierThreads: JavaCarrierThread[] = [];
    for (let i = 1; i <= config.carrierPoolSize; i++) {
      carrierThreads.push({
        id: `carrier-${i}`,
        name: `ForkJoinPool-worker-${i}`,
        status: "IDLE",
        currentVirtualThreadId: null,
        totalTasksProcessed: 0,
      });
    }

    const virtualThreads: JavaVirtualThread[] = [];
    for (let i = 1; i <= config.initialSpawnCount; i++) {
      virtualThreads.push({
        id: `vt-${i}`,
        name: `VirtualThread[#${i}]`,
        status: "QUEUED_RUNNABLE",
        mountedCarrierId: null,
        ioWaitMsRemaining: 0,
        isPinned: false,
        stackSizeKb: 2,
      });
    }

    const initialState: JavaVirtualThreadsState = {
      carrierPoolSize: config.carrierPoolSize,
      carrierThreads,
      virtualThreads,
      totalSpawned: config.initialSpawnCount,
      completedCount: 0,
      virtualThreadStackKb: 2, // 2 KB heap continuation
      platformThreadStackKb: 1024, // 1024 KB = 1 MB OS stack
      hasPinnedCarrierAlert: false,
    };

    return {
      tick: 0,
      phase: "INITIALIZED",
      title: "Java 21 Virtual Threads Runtime Initialized",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "LoomRuntime",
          action: "BOOTSTRAP",
          detail: `Initialized ${config.carrierPoolSize} OS Carrier Threads and queued ${config.initialSpawnCount} Virtual Threads.`,
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summary:
          "JVM initialized the Carrier Thread Pool with 2 physical OS worker threads. 8 Virtual Threads are queued in the Run Queue.",
        internalsNote:
          "Unlike Platform Threads which consume 1MB of fixed OS virtual memory for stack frames, each Virtual Thread initially occupies only 1-2 KB of heap memory for its Continuation frame.",
      },
      metrics: {
        "Carrier Threads": `${config.carrierPoolSize} OS Workers`,
        "Virtual Threads": `${config.initialSpawnCount} Tasks`,
        "Runnable Queue": config.initialSpawnCount,
        "Blocked I/O": 0,
        Completed: 0,
        "Pinning Status": "CLEAR",
      },
    };
  },

  applyCommand(currentFrame, command) {
    const state: JavaVirtualThreadsState = JSON.parse(JSON.stringify(currentFrame.state));
    const nextTick = currentFrame.tick + 1;
    const events = [...currentFrame.events];
    let phase = "MUTATING";
    let title = "";
    let summary = "";
    let internalsNote = "";
    let productionWarning: string | undefined;

    switch (command.type) {
      case "SPAWN_TASKS": {
        for (let i = 1; i <= command.count; i++) {
          const newId = state.totalSpawned + i;
          state.virtualThreads.push({
            id: `vt-${newId}`,
            name: `VirtualThread[#${newId}]`,
            status: "QUEUED_RUNNABLE",
            mountedCarrierId: null,
            ioWaitMsRemaining: 0,
            isPinned: false,
            stackSizeKb: 2,
          });
        }
        state.totalSpawned += command.count;

        phase = "TASKS_SPAWNED";
        title = `Spawned +${command.count} Virtual Threads`;
        summary = `Added ${command.count} Virtual Threads to the run queue. Total tasks created: ${state.totalSpawned}.`;
        internalsNote =
          "Thread.ofVirtual().start(runnable) creates threads with near-zero overhead. Traditional thread pooling (ExecutorService fixed pools) is an anti-pattern for Virtual Threads.";
        events.push({
          tick: nextTick,
          actor: "ThreadFactory",
          action: "SPAWN_VT",
          detail: `Spawned ${command.count} new virtual threads to runnable queue`,
          tone: "info",
        });
        break;
      }

      case "STEP_EXECUTION": {
        // Schedule runnable tasks onto idle carriers
        let scheduledCount = 0;
        for (const carrier of state.carrierThreads) {
          if (carrier.status === "IDLE") {
            const nextTask = state.virtualThreads.find((vt) => vt.status === "QUEUED_RUNNABLE");
            if (nextTask) {
              nextTask.status = "MOUNTED_RUNNING";
              nextTask.mountedCarrierId = carrier.id;
              carrier.status = "BUSY";
              carrier.currentVirtualThreadId = nextTask.id;
              carrier.totalTasksProcessed += 1;
              scheduledCount += 1;
              events.push({
                tick: nextTick,
                actor: carrier.name,
                action: "MOUNT_VT",
                detail: `Mounted ${nextTask.name} onto carrier thread ${carrier.name}`,
                tone: "ok",
              });
            }
          }
        }

        phase = "EXECUTION_STEP";
        title = `Carrier Scheduling Step (Mounted ${scheduledCount} Tasks)`;
        summary = `Carrier Thread Pool mounted runnable Virtual Threads from the queue onto physical CPU cores.`;
        internalsNote =
          "Mounting copies frame pointers from the Heap Continuation stack into real CPU registers on the Carrier Thread. Mounting and unmounting take only tens of nanoseconds.";
        break;
      }

      case "TRIGGER_BLOCKING_IO": {
        const runningTask = state.virtualThreads.find(
          (vt) => vt.status === "MOUNTED_RUNNING" && !vt.isPinned,
        );

        if (runningTask && runningTask.mountedCarrierId) {
          const carrier = state.carrierThreads.find((c) => c.id === runningTask.mountedCarrierId);
          runningTask.status = "YIELDED_PARKED_IO";
          runningTask.ioWaitMsRemaining = 50; // Simulate 50ms I/O latency
          runningTask.mountedCarrierId = null;

          if (carrier) {
            carrier.status = "IDLE";
            carrier.currentVirtualThreadId = null;
          }

          phase = "CONTINUATION_YIELD";
          title = `${runningTask.name} Encounted Blocking I/O -> Unmount & Yield Carrier!`;
          summary = `${runningTask.name} executed a blocking Socket/DB call. The JVM Continuation unmounted the thread from ${carrier?.name}. Carrier Thread freed IMMEDIATELY to serve another task!`;
          internalsNote =
            "Under JEP 444, standard I/O calls (InputStream.read, Socket.connect, JDBC executeQuery) were refactored to invoke Continuation.yield() automatically, delegating socket descriptors to the JVM epoll poller.";
          events.push({
            tick: nextTick,
            actor: runningTask.name,
            action: "YIELD_UNMOUNT",
            detail: `Blocking I/O encountered. Unmounted from carrier ${carrier?.name}, continuation frame saved to heap.`,
            tone: "ok",
          });
        } else {
          summary = "No unpinned Virtual Thread currently running to yield on I/O.";
          internalsNote = "Click Step Execution first to mount runnable tasks.";
        }
        break;
      }

      case "TRIGGER_SYNCHRONIZED_PINNING": {
        const runningTask = state.virtualThreads.find((vt) => vt.status === "MOUNTED_RUNNING");
        if (runningTask && runningTask.mountedCarrierId) {
          const carrier = state.carrierThreads.find((c) => c.id === runningTask.mountedCarrierId);
          runningTask.status = "PINNED_BLOCKED";
          runningTask.isPinned = true;
          runningTask.pinningReason = "synchronized(lockObject) with blocking I/O";

          if (carrier) {
            carrier.status = "PINNED";
          }
          state.hasPinnedCarrierAlert = true;

          phase = "CARRIER_PINNED";
          title = `CRITICAL HAZARD: Thread Pinning Occurred on ${carrier?.name}!`;
          summary = `${runningTask.name} invoked blocking I/O inside a 'synchronized' block. The JVM CANNOT unmount the Continuation and is forced to pin Carrier Thread ${carrier?.name}!`;
          internalsNote =
            "Inside synchronized blocks or native JNI calls, HotSpot cannot cleanly decouple call frames from the OS thread. The Carrier Thread is held hostage, starving other tasks. FIX: Replace synchronized with java.util.concurrent.locks.ReentrantLock.";
          productionWarning =
            "PRODUCTION HAZARD: Thread Pinning disables Virtual Thread concurrency benefits and exhausts carrier pools. Use -Djdk.tracePinnedThreads=full in production to detect pinned frames.";
          events.push({
            tick: nextTick,
            actor: carrier?.name ?? "Carrier",
            action: "THREAD_PINNED",
            detail: `PINNED! VirtualThread entered synchronized block during blocking call. Carrier cannot unmount!`,
            tone: "danger",
          });
        }
        break;
      }

      case "RESOLVE_IO_COMPLETION": {
        let resolvedCount = 0;
        for (const vt of state.virtualThreads) {
          if (vt.status === "YIELDED_PARKED_IO") {
            vt.status = "QUEUED_RUNNABLE";
            vt.ioWaitMsRemaining = 0;
            resolvedCount += 1;
            events.push({
              tick: nextTick,
              actor: "JVM Poller",
              action: "IO_CALLBACK",
              detail: `${vt.name} received socket epoll callback -> unparked back to Runnable Queue`,
              tone: "info",
            });
          } else if (vt.status === "PINNED_BLOCKED") {
            vt.status = "COMPLETED";
            vt.isPinned = false;
            state.completedCount += 1;
            const carrier = state.carrierThreads.find((c) => c.id === vt.mountedCarrierId);
            if (carrier) {
              carrier.status = "IDLE";
              carrier.currentVirtualThreadId = null;
            }
            resolvedCount += 1;
          } else if (vt.status === "MOUNTED_RUNNING") {
            vt.status = "COMPLETED";
            state.completedCount += 1;
            const carrier = state.carrierThreads.find((c) => c.id === vt.mountedCarrierId);
            if (carrier) {
              carrier.status = "IDLE";
              carrier.currentVirtualThreadId = null;
            }
            resolvedCount += 1;
          }
        }

        state.hasPinnedCarrierAlert = state.carrierThreads.some((c) => c.status === "PINNED");
        phase = "IO_RESOLVED";
        title = `Completed I/O Callbacks (${resolvedCount} Tasks Resolved)`;
        summary = `I/O data ready. Virtual Threads were unparked and queued back into Run Queue for available Carrier Threads.`;
        internalsNote =
          "Virtual Threads have no thread affinity to specific Carrier Threads. Once unparked, execution can resume on ANY idle carrier worker in the pool.";
        break;
      }
    }

    const invariants = evaluateInvariants(state);
    const runnableCount = state.virtualThreads.filter((vt) => vt.status === "QUEUED_RUNNABLE").length;
    const blockedIoCount = state.virtualThreads.filter((vt) => vt.status === "YIELDED_PARKED_IO").length;

    return {
      tick: nextTick,
      phase,
      title,
      state,
      events,
      invariants,
      narration: {
        summary,
        internalsNote,
        productionWarning,
      },
      metrics: {
        "Carrier Threads": `${state.carrierPoolSize} OS Workers`,
        "Virtual Threads": `${state.virtualThreads.length} Tasks`,
        "Runnable Queue": runnableCount,
        "Blocked I/O": blockedIoCount,
        Completed: state.completedCount,
        "Pinning Status": state.hasPinnedCarrierAlert ? "WARNING (PINNED)" : "CLEAR",
      },
    };
  },
};
