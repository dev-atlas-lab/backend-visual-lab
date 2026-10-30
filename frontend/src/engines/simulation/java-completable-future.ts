import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface AsyncStage {
  id: string;
  name: string;
  methodSignature: string;
  poolType: "ForkJoinPool.commonPool" | "CustomThreadPool" | "CallerThread";
  status:
    | "PENDING"
    | "DISPATCHED"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "BLOCKED_STARVATION";
  workerThreadId: string | null;
  result: string | null;
  errorMessage: string | null;
  isBlockingJoinCalled: boolean;
}

export interface ThreadPoolWorker {
  id: string;
  name: string;
  poolType: "ForkJoinPool.commonPool" | "CustomThreadPool";
  status: "IDLE" | "EXECUTING" | "DEADLOCKED_STARVED";
  assignedStageId: string | null;
}

export type CompletableFuturePipelineMode =
  | "NON_BLOCKING_ASYNC_CHAIN"
  | "BLOCKING_JOIN_STARVATION"
  | "ERROR_RECOVERY_EXCEPTIONALLY";

export interface JavaCompletableFutureConfig {
  mode: CompletableFuturePipelineMode;
  workerCount: number;
}

export interface JavaCompletableFutureState {
  mode: CompletableFuturePipelineMode;
  stages: AsyncStage[];
  commonPoolWorkers: ThreadPoolWorker[];
  customPoolWorkers: ThreadPoolWorker[];
  callerThreadBlocked: boolean;
  threadStarvationDetected: boolean;
  completedStageCount: number;
  pipelineFinished: boolean;
  recoveredFromError: boolean;
  currentStepIndex: number;
}

export type JavaCompletableFutureCommand =
  | { type: "STEP_ASYNC_DISPATCH" }
  | { type: "INJECT_BLOCKING_JOIN" }
  | { type: "INJECT_STAGE_EXCEPTION" }
  | { type: "TRIGGER_ALL_OF_BARRIER" };

export const defaultCompletableFutureConfig: JavaCompletableFutureConfig = {
  mode: "NON_BLOCKING_ASYNC_CHAIN",
  workerCount: 2,
};

function buildDefaultStages(mode: CompletableFuturePipelineMode): AsyncStage[] {
  if (mode === "ERROR_RECOVERY_EXCEPTIONALLY") {
    return [
      {
        id: "stage-1",
        name: "Stage 1: supplyAsync(fetchUser)",
        methodSignature: "CompletableFuture.supplyAsync(() -> userService.find(42), commonPool)",
        poolType: "ForkJoinPool.commonPool",
        status: "PENDING",
        workerThreadId: null,
        result: null,
        errorMessage: null,
        isBlockingJoinCalled: false,
      },
      {
        id: "stage-2",
        name: "Stage 2: thenApplyAsync(callRemotePayment)",
        methodSignature: ".thenApplyAsync(user -> paymentGateway.authorize(user), customPool)",
        poolType: "CustomThreadPool",
        status: "PENDING",
        workerThreadId: null,
        result: null,
        errorMessage: null,
        isBlockingJoinCalled: false,
      },
      {
        id: "stage-3",
        name: "Stage 3: exceptionally(fallbackGraceful)",
        methodSignature: ".exceptionally(ex -> PaymentResult.fallbackCircuitBreaker(ex))",
        poolType: "CallerThread",
        status: "PENDING",
        workerThreadId: null,
        result: null,
        errorMessage: null,
        isBlockingJoinCalled: false,
      },
      {
        id: "stage-4",
        name: "Stage 4: thenAccept(notifyClient)",
        methodSignature: ".thenAccept(result -> responseEmitter.complete(result))",
        poolType: "ForkJoinPool.commonPool",
        status: "PENDING",
        workerThreadId: null,
        result: null,
        errorMessage: null,
        isBlockingJoinCalled: false,
      },
    ];
  }

  return [
    {
      id: "stage-1",
      name: "Stage 1: supplyAsync(fetchOrder)",
      methodSignature: "CompletableFuture.supplyAsync(() -> orderService.getOrder(101), commonPool)",
      poolType: "ForkJoinPool.commonPool",
      status: "PENDING",
      workerThreadId: null,
      result: null,
      errorMessage: null,
      isBlockingJoinCalled: false,
    },
    {
      id: "stage-2",
      name: "Stage 2: thenApplyAsync(enrichPricing)",
      methodSignature: ".thenApplyAsync(order -> pricingService.calculateTax(order), customPool)",
      poolType: "CustomThreadPool",
      status: "PENDING",
      workerThreadId: null,
      result: null,
      errorMessage: null,
      isBlockingJoinCalled: false,
    },
    {
      id: "stage-3",
      name: "Stage 3: thenCompose(fetchInventory)",
      methodSignature: ".thenCompose(order -> inventoryService.reserveItemsAsync(order))",
      poolType: "ForkJoinPool.commonPool",
      status: "PENDING",
      workerThreadId: null,
      result: null,
      errorMessage: null,
      isBlockingJoinCalled: false,
    },
    {
      id: "stage-4",
      name: "Stage 4: thenAccept(renderCheckout)",
      methodSignature: ".thenAccept(confirmedOrder -> webSocket.push(confirmedOrder))",
      poolType: "CallerThread",
      status: "PENDING",
      workerThreadId: null,
      result: null,
      errorMessage: null,
      isBlockingJoinCalled: false,
    },
  ];
}

function evaluateInvariants(state: JavaCompletableFutureState): SimulationInvariantCheck[] {
  const starvationFree = !state.threadStarvationDetected;
  const callerThreadNonBlocking = !state.callerThreadBlocked;
  const resilientErrorHandling =
    state.mode === "ERROR_RECOVERY_EXCEPTIONALLY"
      ? state.recoveredFromError || state.completedStageCount < 3
      : true;

  return [
    {
      id: "no-thread-starvation",
      label: "Thread Pool Starvation Safety (Zero .join() Blocking in Workers)",
      passed: starvationFree,
      detail: starvationFree
        ? "All pool worker threads operating asynchronously without blocking .join() or .get() calls."
        : "CRITICAL: Worker thread in pool invoked blocking .join()! Thread capacity starved; risk of pool deadlock.",
    },
    {
      id: "caller-thread-non-blocking",
      label: "Caller / Event Loop Non-Blocking Invariance",
      passed: callerThreadNonBlocking,
      detail: callerThreadNonBlocking
        ? "Main caller thread dispatched async future DAG and remained 100% responsive for user requests."
        : "Main thread blocked on future.join()! Latency amplified; Web server thread pool tied up.",
    },
    {
      id: "exceptionally-circuit-resilience",
      label: "Async Exception Containment (.exceptionally / handle)",
      passed: resilientErrorHandling,
      detail:
        state.mode === "ERROR_RECOVERY_EXCEPTIONALLY"
          ? state.recoveredFromError
            ? "Remote exception gracefully intercepted by .exceptionally() fallback without pipeline disruption."
            : "Exception interceptor armed."
          : "Pipeline operating on normal non-fault path.",
    },
  ];
}

export const javaCompletableFutureEngine: SimulationEngineSpec<
  JavaCompletableFutureConfig,
  JavaCompletableFutureState,
  JavaCompletableFutureCommand
> = {
  id: "java-completable-future",
  title: "CompletableFuture: Non-blocking Orchestration & Thread Handoff",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.util.concurrent.CompletableFuture, CompletionStage, ForkJoinPool.commonPool",
    accurateBehaviors: [
      "Asynchronous Stage Chaining: supplyAsync -> thenApplyAsync -> thenCompose executes without blocking caller threads.",
      "Executor Handoff Semantics: Methods without Async suffix run on completing thread; methods with Async suffix dispatch to specified Executor.",
      "Exception Propagation: Unhandled runtime exceptions bypass intermediate stages until caught by .exceptionally() or .handle().",
      "ThreadPool Starvation Risk: Simulates blocking .join() inside worker threads, exhausting thread capacity.",
    ],
    simplifications: [
      "Logical clock ticks rather than OS thread context switch nanoseconds.",
      "Fixed 2-worker simulation pool to visually highlight thread saturation.",
    ],
    assumptions: [
      "Tasks in stages are independent and communicate purely via immutable message payloads.",
      "Pool rejected execution handler not triggered under normal load.",
    ],
    unsupportedEdgeCases: [
      "Cascading ClassLoader thread leak when using custom ThreadPoolExecutor without shutdown().",
      "Java 9 copy() and minimalCompletionStage() defensive proxies.",
    ],
  },

  presets: [
    {
      id: "preset-non-blocking-pipeline",
      title: "1. Clean Non-Blocking Pipeline (Reactive Handoff)",
      badge: "REACTIVE DAG",
      description:
        "supplyAsync -> thenApplyAsync -> thenCompose -> thenAccept across thread pools without a single blocking .join() or .get() call.",
      config: {
        mode: "NON_BLOCKING_ASYNC_CHAIN",
        workerCount: 2,
      },
      scriptedCommands: [
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
      ],
    },
    {
      id: "preset-join-starvation-antipattern",
      title: "2. Anti-Pattern: Worker Thread Starvation via .join()",
      badge: "DEADLOCK RISK",
      description:
        "Simulates calling .join() from inside a worker task to wait for another task in the same pool, causing worker thread exhaustion and potential deadlock.",
      config: {
        mode: "BLOCKING_JOIN_STARVATION",
        workerCount: 2,
      },
      scriptedCommands: [
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "INJECT_BLOCKING_JOIN" },
      ],
    },
    {
      id: "preset-exceptionally-fallback",
      title: "3. Resilient Error Recovery (.exceptionally Fallback)",
      badge: "CIRCUIT BREAKER",
      description:
        "Demonstrates remote service failure in stage 2 and seamless fallback recovery via .exceptionally() without terminating the pipeline.",
      config: {
        mode: "ERROR_RECOVERY_EXCEPTIONALLY",
        workerCount: 2,
      },
      scriptedCommands: [
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
        { type: "STEP_ASYNC_DISPATCH" },
      ],
    },
  ],

  createInitialFrame(config = defaultCompletableFutureConfig): SimulationStepFrame<JavaCompletableFutureState> {
    const activeConfig = config ?? defaultCompletableFutureConfig;
    const stages = buildDefaultStages(activeConfig.mode);

    const commonPoolWorkers: ThreadPoolWorker[] = [
      {
        id: "fjp-worker-1",
        name: "ForkJoinPool-worker-1",
        poolType: "ForkJoinPool.commonPool",
        status: "IDLE",
        assignedStageId: null,
      },
      {
        id: "fjp-worker-2",
        name: "ForkJoinPool-worker-2",
        poolType: "ForkJoinPool.commonPool",
        status: "IDLE",
        assignedStageId: null,
      },
    ];

    const customPoolWorkers: ThreadPoolWorker[] = [
      {
        id: "custom-pool-worker-1",
        name: "OrderExecutor-worker-1",
        poolType: "CustomThreadPool",
        status: "IDLE",
        assignedStageId: null,
      },
      {
        id: "custom-pool-worker-2",
        name: "OrderExecutor-worker-2",
        poolType: "CustomThreadPool",
        status: "IDLE",
        assignedStageId: null,
      },
    ];

    const state: JavaCompletableFutureState = {
      mode: activeConfig.mode,
      stages,
      commonPoolWorkers,
      customPoolWorkers,
      callerThreadBlocked: false,
      threadStarvationDetected: false,
      completedStageCount: 0,
      pipelineFinished: false,
      recoveredFromError: false,
      currentStepIndex: 0,
    };

    return {
      tick: 1,
      phase: "DAG_CONSTRUCTED",
      title: "CompletableFuture Pipeline Initialized",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "MainThread",
          action: "PIPELINE_CONSTRUCTED",
          detail: `Constructed CompletableFuture DAG with ${stages.length} stages. Main thread released immediately!`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "The CompletableFuture pipeline DAG has been assembled. Notice the Main Thread does NOT block: execution will be orchestrated asynchronously across thread pools.",
        summaryEn:
          "The CompletableFuture pipeline DAG has been assembled. Notice the Main Thread does NOT block: execution will be orchestrated asynchronously across thread pools.",
        summaryVi:
          "Đồ thị pipeline CompletableFuture đã được thiết lập. Lưu ý luồng chính (Main/HTTP Thread) HOÀN TOÀN KHÔNG bị chặn (non-blocking), các tác vụ sẽ được điều phối bất đồng bộ.",
        productionWarningVi:
          "Tránh gọi .get() hoặc .join() trên luồng xử lý HTTP request của Tomcat/Jetty vì sẽ làm khóa luồng, làm giảm nghiêm trọng thông lượng hệ thống.",
      },
      metrics: {
        Mode: state.mode,
        "Completed Stages": "0 / 4",
        "CommonPool Workers": "2 IDLE",
        "CustomPool Workers": "2 IDLE",
        "Thread Starvation": "NONE",
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaCompletableFutureState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaCompletableFutureState;
    const events = [...frame.events];
    let narrationEn = "";
    let narrationVi = "";
    let prodWarningVi: string | undefined = undefined;

    switch (command.type) {
      case "STEP_ASYNC_DISPATCH": {
        if (state.pipelineFinished) {
          narrationEn = "Async pipeline has completed all orchestration stages.";
          narrationVi = "Pipeline bất đồng bộ đã hoàn thành tất cả các giai đoạn điều phối.";
          break;
        }

        const stageIdx = state.currentStepIndex;
        if (stageIdx >= state.stages.length) {
          state.pipelineFinished = true;
          narrationEn = "All CompletableFuture stages completed successfully.";
          narrationVi = "Tất cả các chặng CompletableFuture đã hoàn tất thành công.";
          break;
        }

        const stage = state.stages[stageIdx];

        if (stage.status === "PENDING" || stage.status === "DISPATCHED") {
          if (stage.poolType === "ForkJoinPool.commonPool") {
            const idleWorker = state.commonPoolWorkers.find((w) => w.status === "IDLE");
            if (idleWorker) {
              idleWorker.status = "EXECUTING";
              idleWorker.assignedStageId = stage.id;
              stage.workerThreadId = idleWorker.id;
            }
          } else if (stage.poolType === "CustomThreadPool") {
            const idleWorker = state.customPoolWorkers.find((w) => w.status === "IDLE");
            if (idleWorker) {
              idleWorker.status = "EXECUTING";
              idleWorker.assignedStageId = stage.id;
              stage.workerThreadId = idleWorker.id;
            }
          } else {
            stage.workerThreadId = "Caller-or-Completion-Thread";
          }

          stage.status = "RUNNING";

          if (state.mode === "ERROR_RECOVERY_EXCEPTIONALLY" && stageIdx === 1) {
            stage.status = "FAILED";
            stage.errorMessage = "RemotePaymentTimeoutException: Gateway did not respond within 300ms";
            events.push({
              tick: frame.tick + 1,
              actor: stage.workerThreadId || "Worker",
              action: "STAGE_FAILED_EXCEPTION",
              detail: `${stage.name} threw ${stage.errorMessage}! Propagating downstream.`,
              tone: "danger",
            });
            narrationEn = `Stage 2 threw an exception! CompletableFuture captures the failure without crashing the JVM and looks for an exceptionally handler.`;
            narrationVi = `Chặng 2 ném ngoại lệ timeout! CompletableFuture đóng gói lỗi và tìm kiếm bước .exceptionally() để xử lý dự phòng.`;
            prodWarningVi =
              "Nếu không có .exceptionally() hoặc .handle(), ngoại lệ sẽ bị nuốt chìm âm thầm cho đến khi ai đó gọi .join(), gây khó khăn cho việc debug!";
          } else if (state.mode === "ERROR_RECOVERY_EXCEPTIONALLY" && stageIdx === 2) {
            stage.status = "COMPLETED";
            stage.result = "FallbackResult[CircuitBreakerActive, cachedData]";
            state.recoveredFromError = true;
            state.completedStageCount++;
            events.push({
              tick: frame.tick + 1,
              actor: "ExceptionallyFallback",
              action: "EXCEPTION_RECOVERED",
              detail: "Intercepted upstream exception; returned graceful fallback cached response.",
              tone: "ok",
            });
            narrationEn =
              "The .exceptionally() stage intercepted the upstream failure and supplied a degraded fallback result smoothly.";
            narrationVi =
              "Tầng .exceptionally() đã chặn bắt lỗi upstream thành công và cung cấp dữ liệu dự phòng mềm mại mà không ngắt quãng pipeline.";
          } else {
            stage.status = "COMPLETED";
            stage.result = `Payload-Result-From-${stage.name}`;
            state.completedStageCount++;

            state.commonPoolWorkers.forEach((w) => {
              if (w.assignedStageId === stage.id) {
                w.status = "IDLE";
                w.assignedStageId = null;
              }
            });
            state.customPoolWorkers.forEach((w) => {
              if (w.assignedStageId === stage.id) {
                w.status = "IDLE";
                w.assignedStageId = null;
              }
            });

            events.push({
              tick: frame.tick + 1,
              actor: stage.workerThreadId || "ExecutorPool",
              action: "STAGE_COMPLETED",
              detail: `${stage.name} finished. Result dispatched down the CompletionStage DAG.`,
              tone: "ok",
            });
            narrationEn = `${stage.name} completed successfully on ${stage.poolType}. Result handed off to next stage.`;
            narrationVi = `${stage.name} hoàn thành xuất sắc trên ${stage.poolType}. Kết quả được bàn giao cho chặng tiếp theo.`;
          }

          state.currentStepIndex++;
          if (state.currentStepIndex >= state.stages.length) {
            state.pipelineFinished = true;
          }
        }
        break;
      }

      case "INJECT_BLOCKING_JOIN": {
        state.threadStarvationDetected = true;
        state.callerThreadBlocked = true;

        if (state.commonPoolWorkers.length > 0) {
          state.commonPoolWorkers[0].status = "DEADLOCKED_STARVED";
        }
        if (state.stages[state.currentStepIndex]) {
          state.stages[state.currentStepIndex].status = "BLOCKED_STARVATION";
          state.stages[state.currentStepIndex].isBlockingJoinCalled = true;
        }

        events.push({
          tick: frame.tick + 1,
          actor: "AntiPatternInject",
          action: "THREAD_STARVATION_JOIN",
          detail:
            "CRITICAL: .join() invoked inside worker thread! Worker pinned waiting on subordinate future.",
          tone: "danger",
        });

        narrationEn =
          "ANTI-PATTERN TRIGGERED: Calling .join() inside a thread pool worker blocks the carrier thread. Under high concurrency, all workers become starved, causing complete service freeze.";
        narrationVi =
          "CẢNH BÁO PHẢN MẪU: Gọi .join() hoặc .get() bên trong thread pool worker làm chiếm giữ luồng. Dưới tải cao, toàn bộ worker bị cạn kiệt, dẫn đến tê liệt hệ thống (Thread Starvation Deadlock).";
        prodWarningVi =
          "Quy tắc vàng: Luôn dùng .thenCompose() thay vì lồng .join() để liên kết 2 CompletableFuture với nhau!";
        break;
      }

      case "INJECT_STAGE_EXCEPTION": {
        const activeStage = state.stages[state.currentStepIndex] || state.stages[1];
        activeStage.status = "FAILED";
        activeStage.errorMessage = "SimulatedExternalServiceException: 503 Service Unavailable";

        events.push({
          tick: frame.tick + 1,
          actor: "FaultInjector",
          action: "INJECT_REMOTE_FAILURE",
          detail: `Injected external service failure into ${activeStage.name}.`,
          tone: "danger",
        });

        narrationEn = `Injected external fault into ${activeStage.name}. If no .exceptionally() is configured, the entire future DAG will complete exceptionally.`;
        narrationVi = `Đã bơm lỗi vào ${activeStage.name}. Nếu không cấu hình .exceptionally(), toàn bộ tương lai tiếp theo sẽ bị hủy bỏ với ngoại lệ này.`;
        break;
      }

      case "TRIGGER_ALL_OF_BARRIER": {
        state.completedStageCount = state.stages.length;
        state.pipelineFinished = true;
        state.stages.forEach((s) => {
          s.status = "COMPLETED";
          s.result = "Coordinated-AllOf-Result";
        });
        state.commonPoolWorkers.forEach((w) => {
          w.status = "IDLE";
          w.assignedStageId = null;
        });

        events.push({
          tick: frame.tick + 1,
          actor: "CompletableFutureBarrier",
          action: "ALL_OF_BARRIER_RELEASED",
          detail: "CompletableFuture.allOf(...) barrier resolved! All parallel branches joined non-blockingly.",
          tone: "ok",
        });

        narrationEn =
          "CompletableFuture.allOf() synchronized all branches. The composite future completed without burning CPU polling cycles.";
        narrationVi =
          "CompletableFuture.allOf() đồng bộ hóa toàn bộ các nhánh song song. Future tổng hoàn thành mà không hề tốn chu kỳ CPU thăm dò.";
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.pipelineFinished ? "COMPLETED" : "RUNNING",
      title: state.threadStarvationDetected
        ? "CRITICAL: Thread Starvation Detected"
        : state.pipelineFinished
          ? "Async Pipeline Execution Complete"
          : "Orchestrating Next Stage",
      state,
      invariants: evaluateInvariants(state),
      events,
      narration: {
        summary: narrationEn || frame.narration.summary,
        summaryEn: narrationEn || frame.narration.summaryEn,
        summaryVi: narrationVi || frame.narration.summaryVi,
        productionWarningVi: prodWarningVi || frame.narration.productionWarningVi,
      },
      metrics: {
        Mode: state.mode,
        "Completed Stages": `${state.completedStageCount} / ${state.stages.length}`,
        "CommonPool Workers": `${state.commonPoolWorkers.filter((w) => w.status === "IDLE").length} IDLE`,
        "CustomPool Workers": `${state.customPoolWorkers.filter((w) => w.status === "IDLE").length} IDLE`,
        "Thread Starvation": state.threadStarvationDetected ? "CRITICAL ALERT" : "NONE",
      },
    };
  },
};
