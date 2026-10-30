import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
} from "./types";

/**
 * Exception category in Java Throwable hierarchy:
 * - Throwable: Root of all exceptions and errors
 * - Error: Serious VM issues (OutOfMemoryError, StackOverflowError) - unchecked
 * - Exception: General application exceptions
 * - RuntimeException: Unchecked exceptions (NullPointerException, IllegalArgumentException)
 * - CheckedException: Compile-time enforced exceptions (IOException, SQLException)
 */
export type ThrowableCategory =
  | "Error"
  | "CheckedException"
  | "UncheckedException";

export interface ExceptionTableEntry {
  fromPc: number;
  toPc: number;
  targetPc: number;
  catchType: string; // e.g. "PaymentTimeoutException", "IOException", "any" (finally)
}

export interface ResourceState {
  id: string;
  name: string;
  isClosed: boolean;
  failOnClose: boolean;
}

export interface StackFrameItem {
  id: string;
  methodName: string;
  className: string;
  currentPc: number;
  exceptionTable: ExceptionTableEntry[];
  hasCatchBlock: boolean;
  hasFinallyBlock: boolean;
  openedResources: ResourceState[];
}

export interface ActiveThrowable {
  id: string;
  className: string;
  category: ThrowableCategory;
  message: string;
  stackTraceDepth: number;
  isSuppressed: boolean;
  suppressedBy?: string;
  causeId?: string;
}

export interface JavaExceptionsConfig {
  maxStackDepth: number;
  trackSuppressed: boolean;
}

export interface JavaExceptionsState {
  callStack: StackFrameItem[];
  activeThrowable: ActiveThrowable | null;
  handledThrowable: ActiveThrowable | null;
  suppressedThrowables: ActiveThrowable[];
  unhandledEscaped: boolean;
  stackUnwindingPhase:
    | "NORMAL_EXECUTION"
    | "THROW_TRIGGERED"
    | "EXCEPTION_TABLE_LOOKUP"
    | "TRY_WITH_RESOURCES_CLEANUP"
    | "FINALLY_EXECUTING"
    | "FRAME_POPPED"
    | "CAUGHT_AND_HANDLED"
    | "FATAL_UNCAUGHT_TERMINATION";
  framesUnwoundCount: number;
  resourcesAutoClosedCount: number;
  lastExecutionNote: string;
}

export type JavaExceptionsCommand =
  | { type: "INVOKE_METHOD"; className: string; methodName: string; hasCatch: boolean; catchType?: string; hasFinally?: boolean; withResource?: string; failOnClose?: boolean }
  | { type: "THROW_EXCEPTION"; category: ThrowableCategory; className: string; message: string }
  | { type: "STEP_UNWIND" }
  | { type: "CLOSE_RESOURCE_SUCCESS" }
  | { type: "RESET_TO_STEADY_STATE" };

const defaultExceptionsConfig: JavaExceptionsConfig = {
  maxStackDepth: 6,
  trackSuppressed: true,
};

export const javaExceptionsSimulation: SimulationEngineSpec<
  JavaExceptionsConfig,
  JavaExceptionsState,
  JavaExceptionsCommand
> = {
  id: "java-exceptions-stack-unwinding",
  title: "Java Exceptions, Throwable Hierarchy & Stack Unwinding Engine",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java Virtual Machine Specification (JVMS SE 21) §2.6 (Frames), §2.10 (Exceptions), §3.12 (Compiling Exceptions), §6.5 (athrow), and JLS §14.20 (The try Statement)",
    accurateBehaviors: [
      "Throwable hierarchy differentiation: Error (fatal unchecked), RuntimeException (unchecked), and Exception (checked)",
      "JVM Exception Table from/to/target range resolution upon bytecode athrow",
      "Stack unwinding: discarding caller frames until a matching catch handler is located",
      "Try-with-Resources LIFO reverse-order AutoCloseable cleanup",
      "Suppressed Exception chaining via Throwable.addSuppressed() when resource close() throws",
      "Guaranteed finally block execution before stack unwinding continues to parent frames",
    ],
    simplifications: [
      "Bytecode instruction pointer (PC) represented as logical offsets rather than raw method byte array indices",
      "fillInStackTrace() depth modeled as stack frame hop count",
      "Thread termination modeled as unhandled fatal crash state",
    ],
    assumptions: [
      "Single-threaded call stack execution (Thread Stack isolated)",
      "Exception matching follows exact or subclass hierarchy rules",
    ],
    unsupportedEdgeCases: [
      "Asynchronous exceptions (Thread.stop() deprecated)",
      "JNI native frame stack unwinding crossing C/C++ boundaries",
      "Custom classloader exception class mismatch (ClassCastException during catching)",
    ],
  },
  presets: [
    {
      id: "preset-checked-propagation",
      title: "Checked Exception Propagation & Call Stack Unwinding",
      badge: "Checked vs Handler",
      description:
        "PaymentClient throws PaymentGatewayTimeoutException (Checked Exception). Observe JVM unwinding frames until OrderController handles it via Exception Table.",
      config: { maxStackDepth: 6, trackSuppressed: true },
      scriptedCommands: [
        {
          type: "INVOKE_METHOD",
          className: "OrderController",
          methodName: "checkout()",
          hasCatch: true,
          catchType: "PaymentGatewayException",
          hasFinally: true,
        },
        {
          type: "INVOKE_METHOD",
          className: "OrderService",
          methodName: "processOrder()",
          hasCatch: false,
        },
        {
          type: "INVOKE_METHOD",
          className: "PaymentClient",
          methodName: "chargeCreditCard()",
          hasCatch: false,
        },
        {
          type: "THROW_EXCEPTION",
          category: "CheckedException",
          className: "PaymentGatewayTimeoutException",
          message: "Socket read timeout connecting to Visa Gateway after 5000ms",
        },
        { type: "STEP_UNWIND" }, // PaymentClient frame popped
        { type: "STEP_UNWIND" }, // OrderService frame popped
        { type: "STEP_UNWIND" }, // OrderController catch matched!
      ],
    },
    {
      id: "preset-try-with-resources-suppressed",
      title: "Try-with-Resources & Suppressed Exception Chaining",
      badge: "AutoCloseable + Suppressed",
      description:
        "A database query throws SQLException in try block, and Connection.close() throws second SQLException during auto-close. Observe Throwable.addSuppressed().",
      config: { maxStackDepth: 6, trackSuppressed: true },
      scriptedCommands: [
        {
          type: "INVOKE_METHOD",
          className: "OrderRepository",
          methodName: "queryBalance()",
          hasCatch: true,
          catchType: "SQLException",
          withResource: "DbConnection",
          failOnClose: true,
        },
        {
          type: "THROW_EXCEPTION",
          category: "CheckedException",
          className: "SQLException",
          message: "Deadlock detected reading account ledger row (lock timeout)",
        },
        { type: "STEP_UNWIND" }, // Trigger resource cleanup
        { type: "STEP_UNWIND" }, // Resource close throws, added as suppressed
        { type: "STEP_UNWIND" }, // Catch block handles primary + suppressed
      ],
    },
    {
      id: "preset-unchecked-runtime-error",
      title: "Unchecked RuntimeException & Uncaught Thread Crash",
      badge: "NullPointer & Fatal Escape",
      description:
        "NullPointerException occurs in deep domain logic with no catch handlers. Stack fully unwinds to root and terminates thread.",
      config: { maxStackDepth: 6, trackSuppressed: true },
      scriptedCommands: [
        {
          type: "INVOKE_METHOD",
          className: "JobWorker",
          methodName: "run()",
          hasCatch: false,
        },
        {
          type: "INVOKE_METHOD",
          className: "InventorySync",
          methodName: "syncSku()",
          hasCatch: false,
        },
        {
          type: "THROW_EXCEPTION",
          category: "UncheckedException",
          className: "NullPointerException",
          message: "Cannot invoke SkuItem.getPriceUsd() because sku is null",
        },
        { type: "STEP_UNWIND" },
        { type: "STEP_UNWIND" },
      ],
    },
  ],

  createInitialFrame(config) {
    const initialCallStack: StackFrameItem[] = [
      {
        id: "frame-1",
        className: "ApplicationRoot",
        methodName: "main()",
        currentPc: 0,
        exceptionTable: [],
        hasCatchBlock: false,
        hasFinallyBlock: false,
        openedResources: [],
      },
    ];

    const state: JavaExceptionsState = {
      callStack: initialCallStack,
      activeThrowable: null,
      handledThrowable: null,
      suppressedThrowables: [],
      unhandledEscaped: false,
      stackUnwindingPhase: "NORMAL_EXECUTION",
      framesUnwoundCount: 0,
      resourcesAutoClosedCount: 0,
      lastExecutionNote: "Thread call stack initialized at ApplicationRoot.main(). Ready for execution.",
    };

    return {
      tick: 1,
      phase: "STEADY_STATE",
      title: "JVM Call Stack Initialized",
      state,
      events: [
        {
          tick: 1,
          actor: "JVM Thread",
          action: "PUSH_STACK_FRAME",
          detail: "Thread main initialized with ApplicationRoot.main() at frame 0",
          tone: "info",
        },
      ],
      invariants: buildInvariants(state, config),
      narration: {
        summary:
          "The JVM call stack is active. Methods can be pushed to simulate calling down the call chain, and exceptions (Checked, Unchecked, or Error) can be thrown to witness stack unwinding.",
        summaryEn:
          "The JVM call stack is active. Methods can be pushed to simulate calling down the call chain, and exceptions (Checked, Unchecked, or Error) can be thrown to witness stack unwinding.",
        internalsNote:
          "In the HotSpot JVM, each thread possesses a private Call Stack containing Stack Frames. Unlike regular method returns via ireturn/areturn, an exception triggers the athrow bytecode opcode.",
        internalsNoteEn:
          "In the HotSpot JVM, each thread possesses a private Call Stack containing Stack Frames. Unlike regular method returns via ireturn/areturn, an exception triggers the athrow bytecode opcode.",
      },
      metrics: {
        stackDepth: state.callStack.length,
        unwoundFrames: state.framesUnwoundCount,
        suppressedExceptions: state.suppressedThrowables.length,
        activeThrowable: "None",
        unwindingPhase: state.stackUnwindingPhase,
      },
    };
  },

  applyCommand(prevFrame, cmd, config) {
    const activeConfig: JavaExceptionsConfig = config ?? defaultExceptionsConfig;
    const nextTick = prevFrame.tick + 1;
    const s: JavaExceptionsState = JSON.parse(JSON.stringify(prevFrame.state));
    const events = [...prevFrame.events];
    let title = prevFrame.title;
    let phase = prevFrame.phase;
    let summary = "";
    let internals = "";
    let warning: string | undefined = undefined;

    switch (cmd.type) {
      case "INVOKE_METHOD": {
        const frameId = `frame-${s.callStack.length + 1}`;
        const newFrame: StackFrameItem = {
          id: frameId,
          className: cmd.className,
          methodName: cmd.methodName,
          currentPc: 0,
          exceptionTable: cmd.hasCatch && cmd.catchType
            ? [
                {
                  fromPc: 0,
                  toPc: 16,
                  targetPc: 24,
                  catchType: cmd.catchType,
                },
              ]
            : [],
          hasCatchBlock: cmd.hasCatch,
          hasFinallyBlock: cmd.hasFinally ?? false,
          openedResources: cmd.withResource
            ? [
                {
                  id: `res-${Date.now()}`,
                  name: cmd.withResource,
                  isClosed: false,
                  failOnClose: cmd.failOnClose ?? false,
                },
              ]
            : [],
        };

        s.callStack.push(newFrame);
        s.lastExecutionNote = `Invoked ${cmd.className}.${cmd.methodName} (Stack depth: ${s.callStack.length})`;
        title = `Invoked ${cmd.className}.${cmd.methodName}`;
        phase = "METHOD_INVOCATION";

        events.push({
          tick: nextTick,
          actor: cmd.className,
          action: "invokevirtual",
          detail: `Pushed new stack frame for ${cmd.methodName}. ExceptionTable entries: ${newFrame.exceptionTable.length}`,
          tone: "info",
        });

        summary = `Pushed stack frame for ${cmd.className}.${cmd.methodName}. Current stack depth is ${s.callStack.length}.`;
        internals =
          "The JVM allocates a new stack frame containing the Local Variable Array, Operand Stack, and reference to the Runtime Constant Pool. If declared, the compiler populates the method's Exception Table.";
        break;
      }

      case "THROW_EXCEPTION": {
        const topFrame = s.callStack[s.callStack.length - 1];
        s.activeThrowable = {
          id: `throwable-${nextTick}`,
          className: cmd.className,
          category: cmd.category,
          message: cmd.message,
          stackTraceDepth: s.callStack.length,
          isSuppressed: false,
        };
        s.stackUnwindingPhase = "THROW_TRIGGERED";
        s.lastExecutionNote = `Bytecode athrow executed in ${topFrame.className}.${topFrame.methodName} -> ${cmd.className}`;
        title = `Bytecode 'athrow': ${cmd.className}`;
        phase = "EXCEPTION_THROWN";

        events.push({
          tick: nextTick,
          actor: topFrame.className,
          action: "athrow",
          detail: `Thrown ${cmd.category} [${cmd.className}]: "${cmd.message}"`,
          tone: cmd.category === "Error" ? "danger" : "warn",
        });

        summary = `Exception ${cmd.className} (${cmd.category}) was thrown. Normal control flow is immediately halted.`;
        internals =
          "Bytecode instruction athrow pops the objectref from the operand stack. The JVM checks if the current frame's Exception Table has a matching range [fromPc, toPc). If not, stack unwinding begins.";

        if (cmd.category === "Error") {
          warning =
            "Errors (e.g. OutOfMemoryError, StackOverflowError) indicate catastrophic JVM failure. Standard application code should NEVER catch java.lang.Error.";
        }
        break;
      }

      case "STEP_UNWIND": {
        if (!s.activeThrowable) {
          s.lastExecutionNote = "No active throwable to unwind.";
          break;
        }

        if (s.callStack.length === 0) {
          s.unhandledEscaped = true;
          s.stackUnwindingPhase = "FATAL_UNCAUGHT_TERMINATION";
          break;
        }

        const topFrame = s.callStack[s.callStack.length - 1];

        // 1. Try-with-resources AutoCloseable cleanup check
        const openRes = topFrame.openedResources.find((r) => !r.isClosed);
        if (openRes) {
          openRes.isClosed = true;
          s.resourcesAutoClosedCount++;

          if (openRes.failOnClose) {
            // Generates a Suppressed Exception
            const suppressed: ActiveThrowable = {
              id: `suppressed-${nextTick}`,
              className: "ResourceCleanupException",
              category: "CheckedException",
              message: `Failure during AutoCloseable.close() on ${openRes.name}`,
              stackTraceDepth: s.callStack.length,
              isSuppressed: true,
              suppressedBy: s.activeThrowable.className,
            };
            s.suppressedThrowables.push(suppressed);

            events.push({
              tick: nextTick,
              actor: "Try-with-Resources",
              action: "Throwable.addSuppressed()",
              detail: `AutoCloseable on ${openRes.name} threw exception on close; chained as suppressed under ${s.activeThrowable.className}`,
              tone: "warn",
            });

            title = `Suppressed Exception Chained: ${openRes.name}.close()`;
            phase = "RESOURCE_CLEANUP_FAILED";
            summary = `During auto-closing of ${openRes.name}, a secondary exception occurred. JVM calls Throwable.addSuppressed() so the original exception is not masked.`;
            internals =
              "In Java 7+ Try-with-Resources, the primary exception in the try block takes precedence. Any exception thrown by close() is attached to the primary exception via Throwable.addSuppressed().";
            break;
          } else {
            events.push({
              tick: nextTick,
              actor: "Try-with-Resources",
              action: "AutoCloseable.close()",
              detail: `Successfully closed resource ${openRes.name} in reverse declaration order`,
              tone: "ok",
            });
            title = `Resource Auto-Closed: ${openRes.name}`;
            phase = "RESOURCE_CLOSED";
            summary = `Resource ${openRes.name} was cleanly closed before exception propagation continues.`;
            internals =
              "The Java compiler synthesizes bytecode ensuring AutoCloseable.close() is called in reverse order of declaration even when an exception is active.";
            break;
          }
        }

        // 2. Check Exception Table in current frame
        const matchingEntry = topFrame.exceptionTable.find((entry) => {
          if (!s.activeThrowable) return false;
          const thrownName = s.activeThrowable.className;
          const catchType = entry.catchType;

          if (catchType === "Exception" || catchType === "Throwable") return true;
          if (thrownName === catchType) return true;
          if (thrownName.includes(catchType) || catchType.includes(thrownName)) return true;

          // Common inheritance prefixes (e.g. PaymentGatewayTimeoutException is subclass of PaymentGatewayException)
          const baseCatchPrefix = catchType.replace(/Exception$/, "");
          return thrownName.startsWith(baseCatchPrefix);
        });

        if (matchingEntry) {
          // Handled here!
          s.handledThrowable = s.activeThrowable;
          s.activeThrowable = null;
          s.stackUnwindingPhase = "CAUGHT_AND_HANDLED";
          s.lastExecutionNote = `Caught in ${topFrame.className}.${topFrame.methodName} at PC target=${matchingEntry.targetPc}`;
          title = `Caught by ${topFrame.className}: ${matchingEntry.catchType}`;
          phase = "EXCEPTION_CAUGHT";

          events.push({
            tick: nextTick,
            actor: topFrame.className,
            action: "EXCEPTION_TABLE_MATCH",
            detail: `Found matching catch block for ${matchingEntry.catchType} (PC target: ${matchingEntry.targetPc})`,
            tone: "ok",
          });

          summary = `Exception was caught and handled in ${topFrame.className}.${topFrame.methodName}. Stack unwinding stops.`;
          internals =
            "The JVM sets the Program Counter (PC) to the target offset defined in the Exception Table. Execution resumes inside the catch handler block.";
          break;
        }

        // 3. No match in current frame -> Pop frame (Stack Unwinding)
        const popped = s.callStack.pop();
        s.framesUnwoundCount++;
        s.lastExecutionNote = `Popped frame ${popped?.className}.${popped?.methodName}. Unwinding stack.`;
        title = `Unwound Frame: ${popped?.className}.${popped?.methodName}`;
        phase = "STACK_UNWINDING";

        events.push({
          tick: nextTick,
          actor: "JVM Unwinder",
          action: "POP_FRAME",
          detail: `No handler in ${popped?.className}.${popped?.methodName}. Frame popped. Remaining stack depth: ${s.callStack.length}`,
          tone: "danger",
        });

        if (s.callStack.length === 0) {
          s.unhandledEscaped = true;
          s.stackUnwindingPhase = "FATAL_UNCAUGHT_TERMINATION";
          title = "Uncaught Exception: Thread Terminated";
          phase = "FATAL_UNCAUGHT";

          events.push({
            tick: nextTick + 1,
            actor: "UncaughtExceptionHandler",
            action: "THREAD_TERMINATED",
            detail: `Active ${s.activeThrowable.className} reached thread root without handler. JVM invokes Thread.UncaughtExceptionHandler.`,
            tone: "danger",
          });

          summary = `The exception ${s.activeThrowable.className} was not caught by any stack frame and escaped the root of the thread.`;
          internals =
            "When an exception reaches the bottom of the Call Stack without being handled, the JVM invokes the Thread's UncaughtExceptionHandler. The thread terminates.";
          warning =
            "Production Hazard: Uncaught exceptions in background threads without an UncaughtExceptionHandler can silently kill worker threads, leading to thread pool starvation.";
        } else {
          s.stackUnwindingPhase = "FRAME_POPPED";
          summary = `No catch handler found in ${popped?.className}.${popped?.methodName}. Frame is popped and the JVM looks up the caller's Exception Table.`;
          internals =
            "Stack unwinding deallocates the local variable array and operand stack of the discarded frame, restoring caller state.";
        }
        break;
      }

      case "CLOSE_RESOURCE_SUCCESS": {
        const top = s.callStack[s.callStack.length - 1];
        if (top && top.openedResources.length > 0) {
          top.openedResources[0].isClosed = true;
          s.resourcesAutoClosedCount++;
          s.lastExecutionNote = `Manual resource closed in ${top.className}`;
          events.push({
            tick: nextTick,
            actor: top.className,
            action: "CLOSE_RESOURCE",
            detail: `Resource ${top.openedResources[0].name} explicitly closed`,
            tone: "ok",
          });
        }
        break;
      }

      case "RESET_TO_STEADY_STATE": {
        return javaExceptionsSimulation.createInitialFrame(activeConfig);
      }
    }

    const invariants = buildInvariants(s, activeConfig);

    return {
      tick: nextTick,
      phase,
      title,
      state: s,
      events,
      invariants,
      narration: {
        summary,
        summaryEn: summary,
        internalsNote: internals,
        internalsNoteEn: internals,
        productionWarning: warning,
        productionWarningEn: warning,
      },
      metrics: {
        stackDepth: s.callStack.length,
        unwoundFrames: s.framesUnwoundCount,
        suppressedExceptions: s.suppressedThrowables.length,
        activeThrowable: s.activeThrowable ? s.activeThrowable.className : "None",
        unwindingPhase: s.stackUnwindingPhase,
      },
    };
  },
};

function buildInvariants(
  state: JavaExceptionsState,
  config: JavaExceptionsConfig,
): SimulationInvariantCheck[] {
  const checks: SimulationInvariantCheck[] = [];

  // Invariant 1: Stack Depth Bound
  checks.push({
    id: "stack-depth-bound",
    label: "Thread Stack Depth Safe Bound",
    passed: state.callStack.length <= config.maxStackDepth,
    detail:
      state.callStack.length <= config.maxStackDepth
        ? `Call stack depth (${state.callStack.length}) within limit (${config.maxStackDepth})`
        : `Stack overflow hazard: depth ${state.callStack.length} exceeds limit ${config.maxStackDepth}`,
  });

  // Invariant 2: Active vs Handled Mutex
  const validThrowableState =
    !(state.activeThrowable && state.handledThrowable && state.stackUnwindingPhase === "CAUGHT_AND_HANDLED");
  checks.push({
    id: "throwable-state-integrity",
    label: "Throwable Lifecycle Integrity",
    passed: validThrowableState,
    detail: state.activeThrowable
      ? `Active ${state.activeThrowable.category} [${state.activeThrowable.className}] currently unwinding stack`
      : state.handledThrowable
        ? `Handled [${state.handledThrowable.className}] successfully consumed by catch block`
        : "Steady state: no active or unhandled exception in flight",
  });

  // Invariant 3: Try-with-resources AutoCloseable Integrity
  const allResourcesSafe = state.callStack.every(
    (frame) =>
      frame.openedResources.every((r) => !r.isClosed || state.resourcesAutoClosedCount > 0),
  );
  checks.push({
    id: "autocloseable-cleanup",
    label: "AutoCloseable Resource Cleanup Integrity",
    passed: allResourcesSafe,
    detail: `Total auto-closed resource invocations: ${state.resourcesAutoClosedCount}`,
  });

  // Invariant 4: Uncaught Thread Termination Check
  checks.push({
    id: "uncaught-thread-termination",
    label: "Thread Liveness Integrity",
    passed: !state.unhandledEscaped,
    detail: state.unhandledEscaped
      ? "FATAL: Unhandled exception escaped root frame. Thread dead."
      : "Thread is alive and processing instructions normally.",
  });

  return checks;
}
