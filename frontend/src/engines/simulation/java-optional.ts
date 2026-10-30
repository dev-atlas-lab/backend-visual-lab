import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface OptionalStage {
  id: string;
  name: string;
  operationType: "OF" | "MAP" | "FILTER" | "FLAT_MAP" | "TERMINAL_FALLBACK";
  currentValue: string | null;
  status: "PENDING" | "PASSED" | "FILTERED_EMPTY" | "COMPLETED";
}

export type OptionalEvaluationMode =
  | "OR_ELSE_EAGER_HAZARD"
  | "OR_ELSE_GET_LAZY_OPTIMAL"
  | "MONADIC_PIPELINE";

export interface JavaOptionalConfig {
  mode: OptionalEvaluationMode;
  initialValue: string | null;
}

export interface JavaOptionalState {
  mode: OptionalEvaluationMode;
  wrappedValue: string | null;
  isPresent: boolean;
  stages: OptionalStage[];
  activeStageIndex: number;
  dbQueryExecuted: boolean;
  cpuCyclesBurned: number;
  heapBytesAllocated: number;
  antiPatternDetected: boolean;
  pipelineCompleted: boolean;
  resultOutput: string | null;
}

export type JavaOptionalCommand =
  | { type: "RUN_OR_ELSE_EAGER" }
  | { type: "RUN_OR_ELSE_GET_LAZY" }
  | { type: "STEP_MONADIC_PIPELINE" }
  | { type: "TRIGGER_GET_ANTIPATTERN" }
  | { type: "CLEAR_VALUE_TO_EMPTY" };

export const defaultOptionalConfig: JavaOptionalConfig = {
  mode: "OR_ELSE_EAGER_HAZARD",
  initialValue: "CachedUser(id=42, role=ADMIN)",
};

function evaluateInvariants(state: JavaOptionalState): SimulationInvariantCheck[] {
  const lazyHonored =
    state.mode === "OR_ELSE_GET_LAZY_OPTIMAL"
      ? state.isPresent
        ? !state.dbQueryExecuted
        : state.dbQueryExecuted
      : true;

  const noGetWithoutCheck = !state.antiPatternDetected;

  return [
    {
      id: "lazy-supplier-evaluation",
      label: "Lazy Evaluation Guarantee (orElseGet Supplier vs orElse Eager)",
      passed: lazyHonored,
      detail:
        state.mode === "OR_ELSE_EAGER_HAZARD"
          ? "CRITICAL HAZARD: orElse() evaluated its argument eagerly before checking emptiness! Costly DB RPC executed unconditionally on cache hit!"
          : "Optimal Lazy Behavior: orElseGet(() -> queryDb()) only invoked Supplier because the Optional was empty.",
    },
    {
      id: "no-raw-get-antipattern",
      label: "Monadic Idiomatic Safety (Avoid opt.isPresent() + opt.get())",
      passed: noGetWithoutCheck,
      detail: state.antiPatternDetected
        ? "ANTI-PATTERN DETECTED: Code called opt.get() directly. Defeats the functional purpose of Optional and risks NoSuchElementException!"
        : "Code employs idiomatic functional combinators (.map, .flatMap, .orElseGet).",
    },
    {
      id: "memory-footprint-overhead",
      label: "Memory Footprint & Boxing Overhead (16-24 bytes Heap Box)",
      passed: true,
      detail: `Optional box allocation overhead: ${state.heapBytesAllocated} bytes on JVM Heap. Never use Optional as Entity/DTO fields!`,
    },
  ];
}

export const javaOptionalEngine: SimulationEngineSpec<
  JavaOptionalConfig,
  JavaOptionalState,
  JavaOptionalCommand
> = {
  id: "java-optional-patterns",
  title: "Java Optional: Functional Null-Safety & Eager orElse Anti-Patterns",

  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java SE 8+ java.util.Optional (JSR-335 API specification, Brian Goetz design rationale on value-based classes)",
    accurateBehaviors: [
      "Eager Evaluation Pitfall: orElse(expensive()) evaluates its parameter immediately during Java method invocation regardless of presence.",
      "Lazy Evaluation Remedy: orElseGet(Supplier) evaluates its lambda only when Optional.empty() is encountered.",
      "Monadic Composition: map() transforms present values; filter() drops non-matching values into Optional.empty().",
      "Heap Allocation Boxing: Each Optional instance wraps a reference, consuming 16 bytes (compressed oops) on 64-bit JVM.",
    ],
    simplifications: [
      "Simulated microsecond DB query metrics for visual clarity.",
      "Fixed 3-stage user verification pipeline.",
    ],
    assumptions: [
      "Optional.of(null) throws NullPointerException (use Optional.ofNullable for nullable inputs).",
      "Optional is non-serializable and should not be used in JPA entity fields.",
    ],
    unsupportedEdgeCases: [
      "Reflection-based field access mutating private final Optional.value field.",
      "Nested Optional<Optional<T>> serialization via custom Jackson modules.",
    ],
  },

  presets: [
    {
      id: "preset-eager-orelse-trap",
      title: "1. The Eager orElse() Pitfall (Redundant DB Queries)",
      badge: "EAGER HAZARD",
      description:
        "Optional contains 'CachedUser(42)'. Calling .orElse(expensiveDbQuery()) executes the database query anyway, wasting CPU and network bandwidth!",
      config: {
        mode: "OR_ELSE_EAGER_HAZARD",
        initialValue: "CachedUser(id=42, role=ADMIN)",
      },
      scriptedCommands: [{ type: "RUN_OR_ELSE_EAGER" }],
    },
    {
      id: "preset-lazy-orelseget-remedy",
      title: "2. The Lazy orElseGet() Remedy (Zero Waste)",
      badge: "LAZY OPTIMAL",
      description:
        "Optional contains 'CachedUser(42)'. Calling .orElseGet(() -> expensiveDbQuery()) defers execution via Supplier: zero DB queries executed!",
      config: {
        mode: "OR_ELSE_GET_LAZY_OPTIMAL",
        initialValue: "CachedUser(id=42, role=ADMIN)",
      },
      scriptedCommands: [{ type: "RUN_OR_ELSE_GET_LAZY" }],
    },
    {
      id: "preset-monadic-pipeline",
      title: "3. Idiomatic Monadic Chaining (.map, .filter, .ifPresentOrElse)",
      badge: "FUNCTIONAL MONAD",
      description:
        "Transforms Optional<User> through role validation and status mapping without a single 'if (opt != null)' or 'opt.get()' call.",
      config: {
        mode: "MONADIC_PIPELINE",
        initialValue: "RawUser(id=99, verified=true, role=BILLING_OPERATOR)",
      },
      scriptedCommands: [
        { type: "STEP_MONADIC_PIPELINE" },
        { type: "STEP_MONADIC_PIPELINE" },
        { type: "STEP_MONADIC_PIPELINE" },
      ],
    },
  ],

  createInitialFrame(config = defaultOptionalConfig): SimulationStepFrame<JavaOptionalState> {
    const activeConfig = config ?? defaultOptionalConfig;
    const stages: OptionalStage[] = [
      {
        id: "stage-of",
        name: "Optional.ofNullable(input)",
        operationType: "OF",
        currentValue: activeConfig.initialValue,
        status: "COMPLETED",
      },
      {
        id: "stage-filter",
        name: ".filter(user -> user.contains('verified=true'))",
        operationType: "FILTER",
        currentValue: null,
        status: "PENDING",
      },
      {
        id: "stage-map",
        name: ".map(user -> user.getRole())",
        operationType: "MAP",
        currentValue: null,
        status: "PENDING",
      },
      {
        id: "stage-fallback",
        name: ".orElseGet(() -> fallbackGuestRole())",
        operationType: "TERMINAL_FALLBACK",
        currentValue: null,
        status: "PENDING",
      },
    ];

    const state: JavaOptionalState = {
      mode: activeConfig.mode,
      wrappedValue: activeConfig.initialValue,
      isPresent: Boolean(activeConfig.initialValue),
      stages,
      activeStageIndex: 0,
      dbQueryExecuted: false,
      cpuCyclesBurned: 10,
      heapBytesAllocated: 24, // Optional box object header + reference
      antiPatternDetected: false,
      pipelineCompleted: false,
      resultOutput: null,
    };

    return {
      tick: 1,
      phase: "OPTIONAL_BOX_CREATED",
      title: "Optional Box Initialized on Heap",
      state,
      invariants: evaluateInvariants(state),
      events: [
        {
          tick: 1,
          actor: "JavaOptional",
          action: "BOX_ALLOCATED",
          detail: `Allocated java.util.Optional holding ${state.wrappedValue ? `'${state.wrappedValue}'` : 'EMPTY'}. Heap box cost: 24 bytes.`,
          tone: "info",
        },
      ],
      narration: {
        summary:
          "An Optional box is allocated on the Heap. Remember: Optional is intended as a library method return type to represent absent values, NOT for method arguments or serializable domain entities.",
        summaryEn:
          "An Optional box is allocated on the Heap. Remember: Optional is intended as a library method return type to represent absent values, NOT for method arguments or serializable domain entities.",
        summaryVi:
          "Đối tượng Optional được cấp phát trên Heap (tốn 16-24 bytes). Lưu ý: Optional được thiết kế làm kiểu trả về của method để báo hiệu giá trị có thể vắng mặt, KHÔNG dùng làm field của Entity hoặc tham số đầu vào.",
        productionWarningVi:
          "Tuyệt đối không dùng Optional làm field của JPA Entity hoặc DTO vì Optional KHÔNG implement Serializable, sẽ làm sập Jackson hoặc cache Redis phân tán!",
      },
      metrics: {
        "Is Present": state.isPresent ? "YES" : "EMPTY",
        "DB Queries": 0,
        "CPU Cycles": state.cpuCyclesBurned,
        "Heap Box Size": "24 bytes",
        "Anti-Pattern": "NONE",
      },
    };
  },

  applyCommand(frame, command): SimulationStepFrame<JavaOptionalState> {
    const state = JSON.parse(JSON.stringify(frame.state)) as JavaOptionalState;
    const events = [...frame.events];
    let narrationEn = "";
    let narrationVi = "";
    let prodWarningVi: string | undefined = undefined;

    switch (command.type) {
      case "RUN_OR_ELSE_EAGER": {
        // Eager evaluation: argument inside orElse(...) evaluates unconditionally!
        state.dbQueryExecuted = true;
        state.cpuCyclesBurned += 5000; // expensive DB latency
        state.resultOutput = state.wrappedValue ?? "DatabaseUser(id=42, role=FRESH_PULLED)";
        state.pipelineCompleted = true;

        events.push({
          tick: frame.tick + 1,
          actor: "JavaRuntimeEvaluation",
          action: "EAGER_METHOD_ARGUMENT_EVALUATION",
          detail:
            "CRITICAL: Parameter 'expensiveDbQuery()' evaluated BEFORE calling orElse! Executed SELECT * FROM users WHERE id=42!",
          tone: "danger",
        });

        events.push({
          tick: frame.tick + 1,
          actor: "Optional.orElse",
          action: "OR_ELSE_RETURNED_CACHED",
          detail: `Optional was present! Returned cached value '${state.wrappedValue}'. The DB query result was thrown away into garbage collector!`,
          tone: "warn",
        });

        narrationEn =
          "THE EAGER orElse() PITFALL: In Java, method arguments evaluate eagerly before the method body runs. Therefore, orElse(expensiveDbQuery()) executed the database query even though the cached value was present! Resulting in wasted I/O and GC churn.";
        narrationVi =
          "CẠM BẪY EAGER orElse(): Trong Java, tham số của phương thức luôn được tính toán trước khi hàm được gọi. Do đó, orElse(expensiveDbQuery()) đã bắn truy vấn DB xuống cơ sở dữ liệu dù trong cache ĐÃ CÓ SẴN dữ liệu! Kết quả trả về của DB bị vứt bỏ vào thùng rác GC.";
        prodWarningVi =
          "Quy tắc vàng: Luôn dùng .orElseGet(() -> expensiveCall()) thay vì .orElse(expensiveCall()) khi giá trị fallback đòi hỏi tính toán hoặc I/O!";
        break;
      }

      case "RUN_OR_ELSE_GET_LAZY": {
        state.pipelineCompleted = true;
        if (state.isPresent) {
          // Lazy Supplier: NOT executed!
          state.dbQueryExecuted = false;
          state.cpuCyclesBurned += 5;
          state.resultOutput = state.wrappedValue;

          events.push({
            tick: frame.tick + 1,
            actor: "Optional.orElseGet",
            action: "LAZY_SUPPLIER_SKIPPED",
            detail: `Optional is present ('${state.wrappedValue}'). Supplier lambda was NEVER invoked! Zero DB queries executed.`,
            tone: "ok",
          });

          narrationEn =
            "OPTIMAL LAZY EVALUATION: orElseGet(() -> queryDb()) accepts a Supplier lambda. Because the Optional contained a cached value, the Supplier was never evaluated. 100% CPU and network I/O saved!";
          narrationVi =
            "TỐI ƯU HÓA LAZY: orElseGet(() -> queryDb()) nhận vào một Supplier. Do Optional đã có sẵn giá trị, lambda không bao giờ bị thực thi. Tiết kiệm 100% tài nguyên CPU và network I/O!";
        } else {
          state.dbQueryExecuted = true;
          state.cpuCyclesBurned += 5000;
          state.resultOutput = "DatabaseUser(id=42, role=LAZY_FETCHED)";

          events.push({
            tick: frame.tick + 1,
            actor: "Optional.orElseGet",
            action: "LAZY_SUPPLIER_TRIGGERED_ON_EMPTY",
            detail: "Optional is empty! Invoked Supplier lambda to fetch fallback from database.",
            tone: "ok",
          });

          narrationEn = "Optional was empty. orElseGet executed the fallback Supplier lambda on demand.";
          narrationVi = "Optional rỗng. orElseGet chỉ kích hoạt Supplier đúng lúc cần thiết.";
        }
        break;
      }

      case "STEP_MONADIC_PIPELINE": {
        const nextIdx = state.activeStageIndex + 1;
        if (nextIdx >= state.stages.length) {
          state.pipelineCompleted = true;
          narrationEn = "Monadic functional pipeline finished all transformations.";
          narrationVi = "Pipeline Monad hoàn thành toàn bộ các bước biến đổi dữ liệu.";
          break;
        }

        const stage = state.stages[nextIdx];
        if (stage.operationType === "FILTER") {
          const matched = Boolean(state.wrappedValue && state.wrappedValue.includes("verified=true"));
          if (matched) {
            stage.status = "PASSED";
            stage.currentValue = state.wrappedValue;
            events.push({
              tick: frame.tick + 1,
              actor: "Optional.filter",
              action: "PREDICATE_TRUE",
              detail: "Predicate matched! Value retained in Optional pipeline.",
              tone: "ok",
            });
          } else {
            stage.status = "FILTERED_EMPTY";
            state.wrappedValue = null;
            state.isPresent = false;
            events.push({
              tick: frame.tick + 1,
              actor: "Optional.filter",
              action: "PREDICATE_FALSE_EMPTIED",
              detail: "Predicate rejected! Optional safely transitioned to Optional.empty().",
              tone: "warn",
            });
          }
        } else if (stage.operationType === "MAP") {
          if (state.isPresent) {
            state.wrappedValue = "ROLE: BILLING_OPERATOR";
            stage.status = "COMPLETED";
            stage.currentValue = state.wrappedValue;
            events.push({
              tick: frame.tick + 1,
              actor: "Optional.map",
              action: "FUNCTION_APPLIED",
              detail: `Transformed User into '${state.wrappedValue}' safely without null checks.`,
              tone: "ok",
            });
          } else {
            stage.status = "FILTERED_EMPTY";
            events.push({
              tick: frame.tick + 1,
              actor: "Optional.map",
              action: "SKIPPED_ON_EMPTY",
              detail: "Optional is empty: map() bypassed transformation safely without throwing NPE.",
              tone: "info",
            });
          }
        } else if (stage.operationType === "TERMINAL_FALLBACK") {
          state.resultOutput = state.wrappedValue ?? "GUEST_ROLE";
          stage.status = "COMPLETED";
          state.pipelineCompleted = true;
          events.push({
            tick: frame.tick + 1,
            actor: "Optional.orElseGet",
            action: "PIPELINE_RESOLVED",
            detail: `Resolved final output: '${state.resultOutput}'.`,
            tone: "ok",
          });
        }

        state.activeStageIndex = nextIdx;
        narrationEn = `Executed stage: ${stage.name}. Functional chaining eliminates nested null-checks.`;
        narrationVi = `Thực thi bước: ${stage.name}. Chaining hàm giúp loại bỏ hoàn toàn các cấu trúc if (x != null) lồng nhau.`;
        break;
      }

      case "TRIGGER_GET_ANTIPATTERN": {
        state.antiPatternDetected = true;
        events.push({
          tick: frame.tick + 1,
          actor: "CodeSmellDetector",
          action: "ANTI_PATTERN_GET_INVOKED",
          detail:
            "CRITICAL CODE SMELL: 'if (opt.isPresent()) return opt.get();' detected! Defeats functional safety.",
          tone: "danger",
        });

        narrationEn =
          "ANTI-PATTERN: Using 'if (opt.isPresent()) opt.get()' is equivalent to old-school 'if (obj != null)'. It adds 24 bytes of heap overhead without leveraging functional composition!";
        narrationVi =
          "CẢNH BÁO CODE SMELL: Dùng 'if (opt.isPresent()) opt.get()' chẳng khác gì 'if (obj != null)' kiểu cũ. Nó vừa tốn 24 bytes cấp phát trên Heap mà lại làm mất đi sự thanh thoát của Functional Programming!";
        prodWarningVi =
          "Thay vì opt.isPresent() + opt.get(), hãy chuyển sang dùng .map(), .orElseGet(), hoặc .ifPresentOrElse()!";
        break;
      }

      case "CLEAR_VALUE_TO_EMPTY": {
        state.wrappedValue = null;
        state.isPresent = false;
        events.push({
          tick: frame.tick + 1,
          actor: "OptionalFactory",
          action: "SET_TO_EMPTY",
          detail: "Optional switched to Optional.empty(). Ready to test fallback branches.",
          tone: "info",
        });
        narrationEn = "Optional set to empty state.";
        narrationVi = "Optional đã được chuyển sang trạng thái rỗng (Optional.empty).";
        break;
      }
    }

    return {
      tick: frame.tick + 1,
      phase: state.pipelineCompleted ? "COMPLETED" : "IN_FLIGHT",
      title: state.antiPatternDetected
        ? "Anti-Pattern Code Smell Detected"
        : state.pipelineCompleted
          ? "Optional Pipeline Finished"
          : "Evaluating Optional Expression",
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
        "Is Present": state.isPresent ? "YES" : "EMPTY",
        "DB Queries": state.dbQueryExecuted ? "1 (EXECUTED)" : "0 (SAVED)",
        "CPU Cycles": state.cpuCyclesBurned,
        "Heap Box Size": "24 bytes",
        "Anti-Pattern": state.antiPatternDetected ? "ALERT (.get())" : "NONE",
      },
    };
  },
};
