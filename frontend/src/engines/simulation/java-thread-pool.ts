import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface PoolWorkerThread {
  id: string;
  name: string;
  isCore: boolean;
  status: "IDLE" | "BUSY" | "EXPIRED";
  currentTaskId: string | null;
  tasksCompletedCount: number;
}

export interface QueuedTask {
  id: string;
  name: string;
  submittedAtTick: number;
}

export type ThreadPoolRejectionPolicy =
  | "AbortPolicy"
  | "CallerRunsPolicy"
  | "DiscardPolicy"
  | "DiscardOldestPolicy";

export interface JavaThreadPoolConfig {
  corePoolSize: number;
  maximumPoolSize: number;
  queueCapacity: number;
  rejectionPolicy: ThreadPoolRejectionPolicy;
}

export interface JavaThreadPoolState {
  corePoolSize: number;
  maximumPoolSize: number;
  queueCapacity: number;
  rejectionPolicy: ThreadPoolRejectionPolicy;
  workers: PoolWorkerThread[];
  queue: QueuedTask[];
  totalTasksSubmitted: number;
  totalTasksCompleted: number;
  totalTasksRejected: number;
  callerRunsActive: boolean;
  saturationEventTriggered: boolean;
}

export type JavaThreadPoolCommand =
  | { type: "SUBMIT_SINGLE_TASK" }
  | { type: "BURST_SUBMIT_TASKS"; count: number }
  | { type: "WORKER_TICK_EXECUTE" }
  | { type: "SET_REJECTION_POLICY"; policy: ThreadPoolRejectionPolicy }
  | { type: "EXPIRE_IDLE_NON_CORE_WORKERS" };

export const defaultThreadPoolConfig: JavaThreadPoolConfig = {
  corePoolSize: 2,
  maximumPoolSize: 4,
  queueCapacity: 4,
  rejectionPolicy: "CallerRunsPolicy",
};

function evaluateInvariants(state: JavaThreadPoolState): SimulationInvariantCheck[] {
  const maxPoolHonored = state.workers.length <= state.maximumPoolSize;
  const queueBounded = state.queue.length <= state.queueCapacity;
  const coreBeforeQueue =
    state.queue.length > 0
      ? state.workers.filter((w) => w.isCore).length >= state.corePoolSize
      : true;

  return [
    {
      id: "four-step-dispatch-algorithm",
      label: "4-Step Task Submission Dispatch Algorithm Invariance",
      passed: coreBeforeQueue,
      detail:
        state.queue.length > 0
          ? `Core pool full (${state.corePoolSize}/${state.corePoolSize} workers). Tasks queued in BlockingQueue before creating non-core workers.`
          : `Core pool absorbs incoming load (${state.workers.filter((w) => w.isCore).length}/${state.corePoolSize} active).`,
    },
    {
      id: "maximum-pool-size-boundary",
      label: "Worker Pool Upper Bound (maximumPoolSize)",
      passed: maxPoolHonored,
      detail: `Active workers: ${state.workers.length} / max capacity ${state.maximumPoolSize}. Safe from thread exhaustion OOM.`,
    },
    {
      id: "bounded-work-queue-safety",
      label: "Bounded Work Queue Constraint (Zero Unbounded OOM)",
      passed: queueBounded,
      detail: `BlockingQueue capacity: ${state.queue.length} / ${state.queueCapacity}. Never use unbounded LinkedBlockingQueue in production!`,
    },
  ];
}

export const javaThreadPoolEngine: SimulationEngineSpec<
  JavaThreadPoolConfig,
  JavaThreadPoolState,
  JavaThreadPoolCommand
> = {
  id: "java-thread-pool-executor",
  title: "ThreadPoolExecutor: Worker Lifecycle, Bounded Queues & Saturation Policies",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.util.concurrent.ThreadPoolExecutor (JSR-166 / Doug Lea specification: execute(), addWorker(), getTask(), reject())",
    accurateBehaviors: [
      "4-Step Dispatching: 1) Below corePoolSize -> addWorker(core=true); 2) Below queueCapacity -> workQueue.offer(); 3) Below maxPoolSize -> addWorker(core=false); 4) Saturated -> handler.rejectedExecution().",
      "Saturation Policies: Accurately models AbortPolicy (throws), CallerRunsPolicy (caller backpressure), DiscardPolicy (silent drop), and DiscardOldestPolicy (poll head).",
      "Worker Thread KeepAlive: Non-core workers poll queue with keepAlive timeout and terminate when idle.",
    ],
    simplifications: [
      "Queue bounded at 4 tasks and maxPoolSize at 4 workers to visually depict all 4 dispatching phases.",
      "Tasks represented by discrete logical IDs rather than Runnable bytecodes.",
    ],
    assumptions: [
      "ThreadPool is in RUNNING state (not SHUTDOWN or STOP).",
      "ThreadFactory creates standard platform threads with consecutive naming.",
    ],
    unsupportedEdgeCases: [
      "allowCoreThreadTimeOut(true) expiring core workers down to zero.",
      "Uncaught exception terminating worker thread abruptly (re-created via addWorker).",
    ],
  },

  presets: [
    {
      id: "preset-normal-capacity",
      title: "1. Steady Traffic: Core Pool Execution (Zero Queue Buffer)",
      badge: "STEADY LOAD",
      description:
        "Normal load under 2 concurrent requests. Handled immediately by Core Workers 1 and 2 with zero queuing delay.",
      config: {
        corePoolSize: 2,
        maximumPoolSize: 4,
        queueCapacity: 4,
        rejectionPolicy: "CallerRunsPolicy",
      },
      scriptedCommands: [
        { type: "SUBMIT_SINGLE_TASK" },
        { type: "SUBMIT_SINGLE_TASK" },
        { type: "WORKER_TICK_EXECUTE" },
      ],
    },
    {
      id: "preset-burst-saturation-caller-runs",
      title: "2. Traffic Spike: Queue Saturation & CallerRunsPolicy (Backpressure)",
      badge: "BACKPRESSURE",
      description:
        "Burst of 10 tasks overwhelms queue and spawns non-core workers up to maximumPoolSize. Excess task executes on Main Caller Thread!",
      config: {
        corePoolSize: 2,
        maximumPoolSize: 4,
        queueCapacity: 4,
        rejectionPolicy: "CallerRunsPolicy",
      },
      scriptedCommands: [
        { type: "BURST_SUBMIT_TASKS", count: 9 },
        { type: "WORKER_TICK_EXECUTE" },
      ],
    },
    {
      id: "preset-burst-saturation-abort-policy",
      title: "3. Traffic Spike: Saturated Pool & AbortPolicy (Rejection Exception)",
      badge: "ABORT POLICY",
      description:
        "Surge of tasks hits full queue and max workers. AbortPolicy immediately throws RejectedExecutionException to fail fast.",
      config: {
        corePoolSize: 2,
        maximumPoolSize: 4,
        queueCapacity: 4,
        rejectionPolicy: "AbortPolicy",
      },
      scriptedCommands: [
        { type: "BURST_SUBMIT_TASKS", count: 9 },
      ],
    },
  ],

  createInitialFrame(config = defaultThreadPoolConfig): SimulationStepFrame<JavaThreadPoolState> {
    const activeConfig = config ?? defaultThreadPoolConfig;
    const state: JavaThreadPoolState = {
      corePoolSize: activeConfig.corePoolSize,
      maximumPoolSize: activeConfig.maximumPoolSize,
      queueCapacity: activeConfig.queueCapacity,
      rejectionPolicy: activeConfig.rejectionPolicy,
      workers: [
        {
          id: "worker-core-1",
          name: "pool-1-thread-1 (Core)",
          isCore: true,
          status: "IDLE",
          currentTaskId: null,
          tasksCompletedCount: 0,
        },
        {
          id: "worker-core-2",
          name: "pool-1-thread-2 (Core)",
          isCore: true,
          status: "IDLE",
          currentTaskId: null,
          tasksCompletedCount: 0,
        },
      ],
      queue: [],
      totalTasksSubmitted: 0,
      totalTasksCompleted: 0,
      totalTasksRejected: 0,
      callerRunsActive: false,
      saturationEventTriggered: false,
    };

    return {
      tick: 1,
      phase: "POOL_INITIALIZED",
      title: "ThreadPoolExecutor Instantiated",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "ThreadPoolExecutor",
          action: "POOL_CONFIGURED",
          detail: `Configured corePoolSize=${state.corePoolSize}, maxPoolSize=${state.maximumPoolSize}, queueCapacity=${state.queueCapacity}, policy=${state.rejectionPolicy}.`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "ThreadPoolExecutor is initialized. Remember the Golden Rule: when a task arrives, it only goes to the workQueue AFTER the core pool is full; and non-core workers are only created AFTER the queue is completely full!",
        summaryEn:
          "ThreadPoolExecutor is initialized. Remember the Golden Rule: when a task arrives, it only goes to the workQueue AFTER the core pool is full; and non-core workers are only created AFTER the queue is completely full!",
      },
      metrics: {
        "Active Workers": `${state.workers.length} / ${state.maximumPoolSize}`,
        "Queue Buffer": `${state.queue.length} / ${state.queueCapacity}`,
        "Submitted Tasks": 0,
        "Rejected Tasks": 0,
        "Rejection Policy": state.rejectionPolicy,
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaThreadPoolState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaThreadPoolState;
    const events = [...frame.events];
    let narrationEn = "";

    const dispatchTask = (taskId: string) => {
      state.totalTasksSubmitted++;

      // Step 1: Check Core Pool Size
      const idleCore = state.workers.find((w) => w.isCore && w.status === "IDLE");
      if (idleCore) {
        idleCore.status = "BUSY";
        idleCore.currentTaskId = taskId;
        events.push({
          tick: frame.tick + 1,
          actor: idleCore.name,
          action: "CORE_WORKER_DISPATCH",
          detail: `Task ${taskId} assigned directly to core worker. Zero queueing delay.`,
          tone: "ok",
        });
        return;
      }

      // Step 2: Check WorkQueue Capacity
      if (state.queue.length < state.queueCapacity) {
        state.queue.push({
          id: taskId,
          name: `Task-${taskId}`,
          submittedAtTick: frame.tick + 1,
        });
        events.push({
          tick: frame.tick + 1,
          actor: "BlockingQueue",
          action: "TASK_ENQUEUED",
          detail: `Core pool busy. Task ${taskId} buffered into BlockingQueue (${state.queue.length}/${state.queueCapacity}).`,
          tone: "info",
        });
        return;
      }

      // Step 3: Check Maximum Pool Size -> Spawn Non-Core Worker
      if (state.workers.length < state.maximumPoolSize) {
        const nonCoreWorker: PoolWorkerThread = {
          id: `worker-noncore-${state.workers.length + 1}`,
          name: `pool-1-thread-${state.workers.length + 1} (Non-Core)`,
          isCore: false,
          status: "BUSY",
          currentTaskId: taskId,
          tasksCompletedCount: 0,
        };
        state.workers.push(nonCoreWorker);
        events.push({
          tick: frame.tick + 1,
          actor: "WorkerFactory",
          action: "NON_CORE_WORKER_SPAWNED",
          detail: `Queue full! Spawned emergency non-core worker ${nonCoreWorker.name} for task ${taskId}.`,
          tone: "warn",
        });
        return;
      }

      // Step 4: Saturation! Invoke RejectedExecutionHandler
      state.totalTasksRejected++;
      state.saturationEventTriggered = true;

      switch (state.rejectionPolicy) {
        case "AbortPolicy":
          events.push({
            tick: frame.tick + 1,
            actor: "AbortPolicy",
            action: "REJECTED_EXECUTION_EXCEPTION",
            detail: `CRITICAL: Queue and MaxPool saturated! Threw RejectedExecutionException for task ${taskId}!`,
            tone: "danger",
          });
          break;
        case "CallerRunsPolicy":
          state.callerRunsActive = true;
          state.totalTasksCompleted++;
          events.push({
            tick: frame.tick + 1,
            actor: "CallerRunsPolicy",
            action: "CALLER_SYNCHRONOUS_EXECUTION",
            detail: `Queue saturated! Task ${taskId} forced to run on Main/HTTP Caller Thread. Natural backpressure applied!`,
            tone: "warn",
          });
          break;
        case "DiscardPolicy":
          events.push({
            tick: frame.tick + 1,
            actor: "DiscardPolicy",
            action: "SILENT_TASK_DISCARD",
            detail: `Task ${taskId} silently dropped into void without throwing any error.`,
            tone: "danger",
          });
          break;
        case "DiscardOldestPolicy":
          if (state.queue.length > 0) {
            const evicted = state.queue.shift();
            state.queue.push({
              id: taskId,
              name: `Task-${taskId}`,
              submittedAtTick: frame.tick + 1,
            });
            events.push({
              tick: frame.tick + 1,
              actor: "DiscardOldestPolicy",
              action: "EVICT_HEAD_AND_ENQUEUE",
              detail: `Evicted stale task ${evicted?.id} from queue head to accommodate new task ${taskId}.`,
              tone: "warn",
            });
          }
          break;
      }
    };

    switch (command.type) {
      case "SUBMIT_SINGLE_TASK": {
        const taskId = `T-${state.totalTasksSubmitted + 1}`;
        dispatchTask(taskId);
        narrationEn = `Submitted ${taskId}. Observed ThreadPoolExecutor 4-step dispatching algorithm.`;
        break;
      }

      case "BURST_SUBMIT_TASKS": {
        for (let i = 1; i <= command.count; i++) {
          dispatchTask(`Burst-${i}`);
        }
        narrationEn = `Burst traffic: submitted ${command.count} tasks concurrently, pushing the pool through core -> queue -> maxPool -> ${state.rejectionPolicy}!`;
        break;
      }

      case "WORKER_TICK_EXECUTE": {
        // Complete current tasks on workers
        state.workers.forEach((w) => {
          if (w.status === "BUSY") {
            w.tasksCompletedCount++;
            state.totalTasksCompleted++;
            w.currentTaskId = null;
            // Pull next task from queue
            if (state.queue.length > 0) {
              const nextTask = state.queue.shift()!;
              w.currentTaskId = nextTask.id;
              events.push({
                tick: frame.tick + 1,
                actor: w.name,
                action: "PULL_NEXT_FROM_QUEUE",
                detail: `Completed previous task; pulled ${nextTask.name} from BlockingQueue.`,
                tone: "ok",
              });
            } else {
              w.status = "IDLE";
            }
          }
        });
        state.callerRunsActive = false;
        narrationEn = "Worker threads completed execution cycle and polled next tasks from workQueue.";
        break;
      }

      case "SET_REJECTION_POLICY": {
        state.rejectionPolicy = command.policy;
        events.push({
          tick: frame.tick + 1,
          actor: "ThreadPoolConfig",
          action: "POLICY_SWITCHED",
          detail: `Rejection policy changed to ${command.policy}.`,
          tone: "info",
        });
        narrationEn = `Rejection policy changed to ${command.policy}.`;
        break;
      }

      case "EXPIRE_IDLE_NON_CORE_WORKERS": {
        const coreCount = state.corePoolSize;
        const expiredNonCore = state.workers.filter((w) => !w.isCore);
        state.workers = state.workers.filter((w) => w.isCore);
        events.push({
          tick: frame.tick + 1,
          actor: "KeepAliveReaper",
          action: "EXPIRED_NON_CORE_WORKERS",
          detail: `keepAliveTime elapsed. Terminated ${expiredNonCore.length} idle non-core worker threads. Pool returned to corePoolSize (${coreCount}).`,
          tone: "ok",
        });
        narrationEn = "Non-core workers were terminated after keepAliveTime expired without work.";
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.saturationEventTriggered ? "SATURATED_REJECTION" : "ACTIVE_PROCESSING",
      title: state.saturationEventTriggered
        ? `Saturation: ${state.rejectionPolicy} Active`
        : "ThreadPool Workload Dispatching",
      state,
      invariants: evaluateInvariants(state),
      events,
      narration: {
        summary: narrationEn || frame.narration.summary,
        summaryEn: narrationEn || frame.narration.summaryEn,
      },
      metrics: {
        "Active Workers": `${state.workers.length} / ${state.maximumPoolSize}`,
        "Queue Buffer": `${state.queue.length} / ${state.queueCapacity}`,
        "Submitted Tasks": state.totalTasksSubmitted,
        "Rejected Tasks": state.totalTasksRejected,
        "Rejection Policy": state.rejectionPolicy,
      },
    };
  },
};
