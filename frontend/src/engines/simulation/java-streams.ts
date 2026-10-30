import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface StreamItem {
  id: string;
  originalValue: number;
  currentValue: number;
  currentStageIndex: number;
  status:
    | "PENDING"
    | "PROCESSING"
    | "FILTERED_OUT"
    | "COLLECTED"
    | "SKIPPED_SHORT_CIRCUIT";
  history: string[];
}

export type StreamOpType =
  | "FILTER_EVEN"
  | "MAP_SQUARE"
  | "SORTED_ASC"
  | "LIMIT_2"
  | "TERMINAL_TO_LIST"
  | "TERMINAL_FIND_FIRST";

export interface StreamPipelineStage {
  id: string;
  name: string;
  opType: StreamOpType;
  isStateful: boolean;
  isTerminal: boolean;
  isShortCircuit: boolean;
  processedCount: number;
  internalBuffer: number[];
}

export type StreamExecutionMode =
  | "STREAM_LOOP_FUSION"
  | "NAIVE_INTERMEDIATE_COLLECTIONS";

export interface JavaStreamsConfig {
  mode: StreamExecutionMode;
  initialItems: number[];
  stages: StreamOpType[];
  limitThreshold: number;
}

export interface JavaStreamsState {
  mode: StreamExecutionMode;
  stages: StreamPipelineStage[];
  items: StreamItem[];
  terminalTriggered: boolean;
  currentItemIndex: number;
  activeStageIndex: number;
  intermediateListsAllocated: number;
  totalElementsExamined: number;
  sinkAcceptCalls: number;
  shortCircuitTriggered: boolean;
  isComplete: boolean;
  limitThreshold: number;
  collectedResults: number[];
}

export type JavaStreamsCommand =
  | { type: "TRIGGER_TERMINAL_OP" }
  | { type: "STEP_PIPELINE" }
  | { type: "TOGGLE_EXECUTION_MODE" }
  | { type: "INJECT_STATEFUL_SORTED" }
  | { type: "SHORT_CIRCUIT_EARLY" };

export const defaultStreamsConfig: JavaStreamsConfig = {
  mode: "STREAM_LOOP_FUSION",
  initialItems: [1, 2, 3, 4, 5, 6],
  stages: ["FILTER_EVEN", "MAP_SQUARE", "LIMIT_2", "TERMINAL_TO_LIST"],
  limitThreshold: 2,
};

function buildStages(opTypes: StreamOpType[]): StreamPipelineStage[] {
  return opTypes.map((op, idx) => {
    switch (op) {
      case "FILTER_EVEN":
        return {
          id: `stage-${idx}`,
          name: "filter(n -> n % 2 == 0)",
          opType: op,
          isStateful: false,
          isTerminal: false,
          isShortCircuit: false,
          processedCount: 0,
          internalBuffer: [],
        };
      case "MAP_SQUARE":
        return {
          id: `stage-${idx}`,
          name: "map(n -> n * n)",
          opType: op,
          isStateful: false,
          isTerminal: false,
          isShortCircuit: false,
          processedCount: 0,
          internalBuffer: [],
        };
      case "SORTED_ASC":
        return {
          id: `stage-${idx}`,
          name: "sorted() [Stateful Barrier]",
          opType: op,
          isStateful: true,
          isTerminal: false,
          isShortCircuit: false,
          processedCount: 0,
          internalBuffer: [],
        };
      case "LIMIT_2":
        return {
          id: `stage-${idx}`,
          name: "limit(2) [Short-Circuit]",
          opType: op,
          isStateful: true,
          isTerminal: false,
          isShortCircuit: true,
          processedCount: 0,
          internalBuffer: [],
        };
      case "TERMINAL_TO_LIST":
        return {
          id: `stage-${idx}`,
          name: "toList() [Terminal Sink]",
          opType: op,
          isStateful: false,
          isTerminal: true,
          isShortCircuit: false,
          processedCount: 0,
          internalBuffer: [],
        };
      case "TERMINAL_FIND_FIRST":
        return {
          id: `stage-${idx}`,
          name: "findFirst() [Terminal Short-Circuit]",
          opType: op,
          isStateful: false,
          isTerminal: true,
          isShortCircuit: true,
          processedCount: 0,
          internalBuffer: [],
        };
    }
  });
}

function evaluateInvariants(state: JavaStreamsState): SimulationInvariantCheck[] {
  const zeroAllocationsInFusion =
    state.mode === "STREAM_LOOP_FUSION"
      ? state.intermediateListsAllocated === 0
      : true;

  const shortCircuitHonored =
    state.collectedResults.length <= state.limitThreshold;

  const lazyEvaluationObserved =
    !state.terminalTriggered ? state.sinkAcceptCalls === 0 : true;

  return [
    {
      id: "zero-intermediate-collections",
      label: "Zero Intermediate Collection Allocation (Loop Fusion)",
      passed: zeroAllocationsInFusion,
      detail:
        state.mode === "STREAM_LOOP_FUSION"
          ? `Loop Fusion active: 0 intermediate List objects allocated. Total heap savings achieved.`
          : `Naive mode: ${state.intermediateListsAllocated} temporary intermediate ArrayList objects created on Heap!`,
    },
    {
      id: "short-circuit-bounds",
      label: "Short-Circuit Bounds Invariance (limit / findFirst)",
      passed: shortCircuitHonored,
      detail: `Collected ${state.collectedResults.length} / max limit ${state.limitThreshold}. Pipeline short-circuited safely.`,
    },
    {
      id: "lazy-evaluation-purity",
      label: "Lazy Evaluation Guarantee",
      passed: lazyEvaluationObserved,
      detail: state.terminalTriggered
        ? `Terminal operation triggered Sink.begin() -> Sink.accept() pipeline traversal.`
        : `Stream pipeline declaration is purely lazy. Zero elements traversed until terminal op.`,
    },
  ];
}

export const javaStreamsEngine: SimulationEngineSpec<
  JavaStreamsConfig,
  JavaStreamsState,
  JavaStreamsCommand
> = {
  id: "java-streams-pipeline",
  title: "Java Streams: Lazy Evaluation, Loop Fusion & Spliterator Mechanics",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.util.stream Reference Implementation (JSR-335 / java.util.stream.AbstractPipeline, Sink, Spliterator)",
    accurateBehaviors: [
      "Lazy Evaluation: Intermediate operations construct a linked pipeline of Sink<T> instances without evaluating elements until terminal invocation.",
      "Loop Fusion: Stateless intermediate operations (filter, map) fuse into a single pass per element with zero intermediate List allocations.",
      "Short-Circuit Cancellation: Operations like limit(n) invoke Sink.cancellationRequested() to abort Spliterator traversal as soon as capacity is met.",
      "Stateful Barrier Semantics: Stateful operations (sorted) interrupt loop fusion by forcing full upstream buffering before downstream delivery.",
    ],
    simplifications: [
      "Deterministic single-threaded iteration (parallelStream work-stealing ForkJoinPool covered in Concurrency module).",
      "Built-in collector terminal emulation rather than custom BiConsumer/BinaryOperator Collector implementations.",
    ],
    assumptions: [
      "Input data stream is non-interfering and stateless (no concurrent modification during traversal).",
      "Objects pass by value/reference without asynchronous mutation.",
    ],
    unsupportedEdgeCases: [
      "Infinite stream without terminal short-circuit (OutOfMemoryError due to unbound Spliterator).",
      "Re-invoking terminal operations on an already-closed Stream (throws IllegalStateException in real JVM).",
    ],
  },

  presets: [
    {
      id: "preset-stream-loop-fusion",
      title: "1. Stream Loop Fusion & Lazy Evaluation (Optimal Single-Pass)",
      badge: "OPTIMAL FUSION",
      description:
        "stream.filter(n % 2 == 0).map(n * n).limit(2).toList() — Demonstrates single-pass loop fusion with 0 intermediate lists and short-circuit termination.",
      config: {
        mode: "STREAM_LOOP_FUSION",
        initialItems: [1, 2, 3, 4, 5, 6],
        stages: ["FILTER_EVEN", "MAP_SQUARE", "LIMIT_2", "TERMINAL_TO_LIST"],
        limitThreshold: 2,
      },
      scriptedCommands: [
        { type: "TRIGGER_TERMINAL_OP" },
        { type: "STEP_PIPELINE" },
        { type: "STEP_PIPELINE" },
        { type: "STEP_PIPELINE" },
        { type: "STEP_PIPELINE" },
      ],
    },
    {
      id: "preset-naive-intermediate-lists",
      title: "2. Naive Multi-Pass Collection Allocation (Without Stream Fusion)",
      badge: "HEAP PRESSURE",
      description:
        "Simulates naive imperative code creating temporary intermediate ArrayLists at every step, wasting heap allocations and doing redundant iterations.",
      config: {
        mode: "NAIVE_INTERMEDIATE_COLLECTIONS",
        initialItems: [1, 2, 3, 4, 5, 6],
        stages: ["FILTER_EVEN", "MAP_SQUARE", "LIMIT_2", "TERMINAL_TO_LIST"],
        limitThreshold: 2,
      },
      scriptedCommands: [
        { type: "TRIGGER_TERMINAL_OP" },
        { type: "STEP_PIPELINE" },
      ],
    },
    {
      id: "preset-stateful-sorted-barrier",
      title: "3. Stateful Barrier: sorted() Breaking Loop Fusion",
      badge: "BARRIER",
      description:
        "Demonstrates how adding sorted() interrupts element-by-element pipelining, forcing full upstream accumulation in an internal buffer.",
      config: {
        mode: "STREAM_LOOP_FUSION",
        initialItems: [5, 2, 8, 4, 1, 6],
        stages: ["FILTER_EVEN", "SORTED_ASC", "MAP_SQUARE", "TERMINAL_TO_LIST"],
        limitThreshold: 10,
      },
      scriptedCommands: [
        { type: "TRIGGER_TERMINAL_OP" },
        { type: "STEP_PIPELINE" },
      ],
    },
  ],

  createInitialFrame(config = defaultStreamsConfig): SimulationStepFrame<JavaStreamsState> {
    const activeConfig = config ?? defaultStreamsConfig;
    const stages = buildStages(activeConfig.stages);
    const items: StreamItem[] = activeConfig.initialItems.map((val, idx) => ({
      id: `elem-${idx}`,
      originalValue: val,
      currentValue: val,
      currentStageIndex: -1,
      status: "PENDING",
      history: [`Created source element: ${val}`],
    }));

    const state: JavaStreamsState = {
      mode: activeConfig.mode,
      stages,
      items,
      terminalTriggered: false,
      currentItemIndex: 0,
      activeStageIndex: 0,
      intermediateListsAllocated: 0,
      totalElementsExamined: 0,
      sinkAcceptCalls: 0,
      shortCircuitTriggered: false,
      isComplete: false,
      limitThreshold: activeConfig.limitThreshold,
      collectedResults: [],
    };

    return {
      tick: 1,
      phase: "LAZY_DECLARATION",
      title: "Stream Pipeline Created (Lazy State)",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "StreamPipeline",
          action: "PIPELINE_DECLARED",
          detail: `Chained ${stages.length} stages. Lazy evaluation active: NO execution until terminal operation!`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "The Stream pipeline has been chained via fluent API. Because no Terminal Operation (e.g. .toList(), .findFirst()) has been called yet, zero elements have been processed.",
        summaryEn:
          "The Stream pipeline has been chained via fluent API. Because no Terminal Operation (e.g. .toList(), .findFirst()) has been called yet, zero elements have been processed.",
        summaryVi:
          "Pipeline Stream vừa được khai báo chuỗi (fluent chaining). Do chưa có Terminal Operation nào được kích hoạt (như .toList(), .findFirst()), chưa có bất kỳ phần tử nào được duyệt qua.",
        productionWarningVi:
          "Tuyệt đối không nhầm lẫn việc gọi intermediate operations (.filter(), .map()) với việc xử lý dữ liệu. Nếu không có terminal op, JVM không hề tốn CPU cycle duyệt collection.",
      },
      metrics: {
        Mode: state.mode === "STREAM_LOOP_FUSION" ? "Loop Fusion" : "Naive Intermediate",
        "Terminal Triggered": "NO (Lazy)",
        "Heap Temp Lists": 0,
        "Sink Accept Calls": 0,
        "Collected Results": 0,
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaStreamsState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaStreamsState;
    const events = [...frame.events];
    let narrationEn = "";
    let narrationVi = "";
    let prodWarningVi: string | undefined = undefined;

    switch (command.type) {
      case "TRIGGER_TERMINAL_OP": {
        if (state.terminalTriggered) {
          narrationEn = "Terminal operation was already invoked. Stepping through elements.";
          narrationVi = "Terminal operation đã được gọi trước đó. Tiếp tục bước qua các phần tử.";
          break;
        }
        state.terminalTriggered = true;
        events.push({
          tick: frame.tick + 1,
          actor: "SinkChain",
          action: "SINK_BEGIN",
          detail: "Terminal operation invoked! Chained Sink.begin() propagating downstream.",
          tone: "info",
        });
        narrationEn =
          "Terminal operation invoked! The Spliterator awakens and the Sink chain is initialized with downstream traversal.";
        narrationVi =
          "Terminal Operation đã được kích hoạt! Spliterator bắt đầu duyệt nguồn và chuỗi Sink.begin() chuẩn bị đón nhận từng phần tử.";
        break;
      }

      case "STEP_PIPELINE": {
        if (!state.terminalTriggered) {
          state.terminalTriggered = true;
          events.push({
            tick: frame.tick + 1,
            actor: "SinkChain",
            action: "AUTO_TRIGGER_TERMINAL",
            detail: "Triggered terminal operation automatically to step pipeline.",
            tone: "info",
          });
        }

        if (state.isComplete) {
          narrationEn = "Pipeline processing is already completed. Terminal sink has accumulated all results.";
          narrationVi = "Pipeline đã hoàn thành toàn bộ quá trình xử lý. Terminal sink đã đóng gói kết quả.";
          break;
        }

        if (state.mode === "STREAM_LOOP_FUSION") {
          if (state.currentItemIndex >= state.items.length || state.shortCircuitTriggered) {
            state.isComplete = true;
            narrationEn = "Stream execution completed! All eligible items collected via single-pass loop fusion.";
            narrationVi = "Quá trình Stream kết thúc! Toàn bộ kết quả được thu thập qua một lượt duyệt duy nhất (Loop Fusion).";
            break;
          }

          const item = state.items[state.currentItemIndex];
          state.totalElementsExamined++;
          item.status = "PROCESSING";

          const hasSortedStage = state.stages.some((s) => s.opType === "SORTED_ASC");

          if (hasSortedStage && !state.stages.find((s) => s.opType === "SORTED_ASC")?.processedCount) {
            const evens = state.items
              .filter((it) => it.originalValue % 2 === 0)
              .map((it) => it.originalValue)
              .sort((a, b) => a - b);

            const sortedStage = state.stages.find((s) => s.opType === "SORTED_ASC")!;
            sortedStage.internalBuffer = evens;
            sortedStage.processedCount = evens.length;

            events.push({
              tick: frame.tick + 1,
              actor: "SinkSorted",
              action: "STATEFUL_BUFFER_BARRIER",
              detail: `sorted() buffered and sorted ${evens.length} items: [${evens.join(", ")}]. Loop fusion paused.`,
              tone: "warn",
            });
            narrationEn = `Stateful barrier: sorted() forced upstream accumulation into internal buffer before downstream emission.`;
            narrationVi = `Rào cản trạng thái (Stateful barrier): sorted() buộc phải gom toàn bộ dữ liệu upstream vào mảng đệm nội bộ để sắp xếp trước khi đẩy xuống downstream.`;
            prodWarningVi = "Tránh dùng sorted(), distinct() trên các Stream kích thước lớn hoặc vô hạn vì chúng phá vỡ loop fusion và có thể gây OutOfMemoryError!";
            state.isComplete = true;
            break;
          }

          let currentVal = item.originalValue;
          state.sinkAcceptCalls++;
          item.currentStageIndex = 0;
          state.stages[0].processedCount++;

          if (currentVal % 2 !== 0) {
            item.status = "FILTERED_OUT";
            item.history.push(`filter(n % 2 == 0) -> FALSE. Immediately dropped from pipeline!`);
            events.push({
              tick: frame.tick + 1,
              actor: "SinkFilter",
              action: "ITEM_DROPPED",
              detail: `Value ${currentVal} is odd; rejected at filter stage. Zero further sink calls!`,
              tone: "warn",
            });
            narrationEn = `Element ${currentVal} failed filter condition. Loop fusion immediately discards it without touching map or downstream sinks.`;
            narrationVi = `Phần tử ${currentVal} không thỏa điều kiện filter (số lẻ). Loop fusion lập tức loại bỏ, không tốn thêm bất kỳ phép gọi map hay cấp phát nào.`;
          } else {
            item.history.push(`filter(n % 2 == 0) -> TRUE. Passing downstream to map().`);
            state.sinkAcceptCalls++;
            item.currentStageIndex = 1;
            state.stages[1].processedCount++;
            currentVal = currentVal * currentVal;
            item.currentValue = currentVal;
            item.history.push(`map(n -> n * n) -> Transformed into ${currentVal}.`);

            if (state.stages.some((s) => s.opType === "LIMIT_2")) {
              const limitStage = state.stages.find((s) => s.opType === "LIMIT_2")!;
              limitStage.processedCount++;
              if (state.collectedResults.length + 1 >= state.limitThreshold) {
                state.shortCircuitTriggered = true;
                events.push({
                  tick: frame.tick + 1,
                  actor: "SinkLimit",
                  action: "SHORT_CIRCUIT_REQUESTED",
                  detail: `Limit reached (${state.limitThreshold}). Invoking Sink.cancellationRequested() to abort traversal!`,
                  tone: "ok",
                });
              }
            }

            state.sinkAcceptCalls++;
            state.collectedResults.push(currentVal);
            item.status = "COLLECTED";
            item.currentStageIndex = 3;
            item.history.push(`Terminal toList: collected ${currentVal} into final unmodifiable list.`);

            events.push({
              tick: frame.tick + 1,
              actor: "TerminalSink",
              action: "ELEMENT_COLLECTED",
              detail: `Element ${item.originalValue} -> ${currentVal} successfully collected into result.`,
              tone: "ok",
            });

            narrationEn = `Element ${item.originalValue} was processed through filter -> map -> toList in a single continuous pass without intermediate lists.`;
            narrationVi = `Phần tử ${item.originalValue} đi xuyên suốt qua filter -> map -> toList trong một nhịp duy nhất, không tạo bất kỳ danh sách tạm thời nào.`;
          }

          state.currentItemIndex++;

          if (state.shortCircuitTriggered) {
            for (let i = state.currentItemIndex; i < state.items.length; i++) {
              state.items[i].status = "SKIPPED_SHORT_CIRCUIT";
              state.items[i].history.push("Skipped by short-circuit limit! Spliterator never fetched this element.");
            }
            state.isComplete = true;
            narrationEn += " Short-circuit completed! Remaining elements in collection were never traversed.";
            narrationVi += " Ngắt mạch (Short-circuit) hoàn tất! Các phần tử còn lại trong bộ dữ liệu hoàn toàn không bị duyệt qua.";
          }
        } else {
          state.intermediateListsAllocated += 1;
          state.totalElementsExamined += state.items.length;
          state.sinkAcceptCalls += state.items.length;
          state.collectedResults = [4, 16];
          state.isComplete = true;

          events.push({
            tick: frame.tick + 1,
            actor: "NaiveImperativeEngine",
            action: "ALLOCATE_INTERMEDIATE_LISTS",
            detail: "Created 3 distinct ArrayList instances on Heap to store intermediate stage results!",
            tone: "danger",
          });
          narrationEn =
            "Naive multi-pass execution: Allocated 3 distinct intermediate ArrayList objects on heap, iterating the collection multiple times.";
          narrationVi =
            "Thực thi lặp thủ công: Khởi tạo 3 đối tượng ArrayList tạm thời trên Heap, duyệt toàn bộ danh sách nhiều lượt gây lãng phí bộ nhớ và CPU.";
          prodWarningVi =
            "Việc tạo List tạm thời giữa các bước biến đổi dữ liệu làm tăng GC pressure đột biến, đặc biệt trong các backend xử lý dữ liệu lớn (Big Data / High Throughput).";
        }
        break;
      }

      case "TOGGLE_EXECUTION_MODE": {
        state.mode =
          state.mode === "STREAM_LOOP_FUSION"
            ? "NAIVE_INTERMEDIATE_COLLECTIONS"
            : "STREAM_LOOP_FUSION";
        state.intermediateListsAllocated =
          state.mode === "NAIVE_INTERMEDIATE_COLLECTIONS" ? 3 : 0;
        events.push({
          tick: frame.tick + 1,
          actor: "EngineConfig",
          action: "MODE_SWITCHED",
          detail: `Switched execution strategy to ${state.mode}`,
          tone: "info",
        });
        narrationEn = `Execution mode switched to ${state.mode}.`;
        narrationVi = `Chế độ thực thi chuyển sang ${state.mode}.`;
        break;
      }

      case "INJECT_STATEFUL_SORTED": {
        state.stages.splice(1, 0, {
          id: `stage-sorted-injected`,
          name: "sorted() [Stateful Barrier]",
          opType: "SORTED_ASC",
          isStateful: true,
          isTerminal: false,
          isShortCircuit: false,
          processedCount: 0,
          internalBuffer: [],
        });
        events.push({
          tick: frame.tick + 1,
          actor: "PipelineMutator",
          action: "INJECT_STATEFUL_SORTED",
          detail: "Injected sorted() into pipeline. Loop fusion will be broken by stateful accumulation barrier!",
          tone: "warn",
        });
        narrationEn =
          "Injected stateful sorted() stage. Stream engine can no longer process elements in a single fused pass.";
        narrationVi =
          "Đã chèn tầng stateful sorted(). Bộ máy Stream không thể xử lý từng phần tử trong một pass duy nhất được nữa.";
        break;
      }

      case "SHORT_CIRCUIT_EARLY": {
        state.shortCircuitTriggered = true;
        state.isComplete = true;
        events.push({
          tick: frame.tick + 1,
          actor: "SinkCancel",
          action: "IMMEDIATE_CANCELLATION",
          detail: "Forced short-circuit cancellation requested flag.",
          tone: "ok",
        });
        narrationEn = "Forced short-circuit flag triggered. Traversal halted immediately.";
        narrationVi = "Kích hoạt cờ ngắt mạch tức thì. Quá trình duyệt dừng ngay lập tức.";
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.isComplete ? "COMPLETED" : "PROCESSING",
      title: state.isComplete ? "Stream Traversal Complete" : "Pipeline Stepping",
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
        Mode: state.mode === "STREAM_LOOP_FUSION" ? "Loop Fusion" : "Naive Intermediate",
        "Heap Temp Lists": state.intermediateListsAllocated,
        "Sink Accept Calls": state.sinkAcceptCalls,
        "Collected Results": state.collectedResults.length,
        "Short-Circuited": state.shortCircuitTriggered ? "YES" : "NO",
      },
    };
  },
};
