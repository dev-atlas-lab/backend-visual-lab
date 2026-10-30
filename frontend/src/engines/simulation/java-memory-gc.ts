import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface StackVariable {
  varName: string;
  isPrimitive: boolean;
  primitiveValue?: string | number;
  targetHeapId?: string; // pointer to heap object
}

export interface JavaStackFrame {
  id: string;
  methodName: string;
  localReferences: StackVariable[];
}

export interface JavaHeapObject {
  id: string;
  className: string;
  variableName?: string;
  tenuringAge: number;
  isRootReachable: boolean;
  sizeBytes: number;
}

export interface JavaMemoryGcConfig {
  edenCapacity: number; // slots in Eden
  survivorCapacity: number; // slots in S0/S1
  oldGenCapacity: number; // slots in Old Gen
  tenuringThreshold: number; // promotions after N minor GCs (default 3 for visual)
}

export interface JavaMemoryGcState {
  threadStack: JavaStackFrame[];
  youngEden: JavaHeapObject[];
  youngS0: JavaHeapObject[];
  youngS1: JavaHeapObject[];
  activeSurvivor: 0 | 1; // 0 means S0 is From-Space, S1 is To-Space
  oldGen: JavaHeapObject[];
  edenCapacity: number;
  survivorCapacity: number;
  oldGenCapacity: number;
  tenuringThreshold: number;
  totalAllocationsCount: number;
  minorGcCount: number;
  majorGcCount: number;
  lastMinorGcReclaimedBytes: number;
  isOutOfMemory: boolean;
}

export type JavaMemoryCommand =
  | { type: "PUSH_STACK_FRAME"; methodName: string }
  | { type: "POP_STACK_FRAME" }
  | { type: "ALLOCATE_PRIMITIVE"; varName: string; value: string | number }
  | { type: "ALLOCATE_OBJECT"; className: string; varName: string }
  | { type: "TRIGGER_MINOR_GC" }
  | { type: "TRIGGER_MAJOR_GC" };

const defaultConfig: JavaMemoryGcConfig = {
  edenCapacity: 4,
  survivorCapacity: 2,
  oldGenCapacity: 4,
  tenuringThreshold: 3,
};

function evaluateInvariants(state: JavaMemoryGcState): SimulationInvariantCheck[] {
  // S0 and S1 mutually exclusive (one is always empty To-Space)
  const s0HasItems = state.youngS0.length > 0;
  const s1HasItems = state.youngS1.length > 0;
  const survivorSeparation = !(s0HasItems && s1HasItems);

  // Old Gen capacity not exceeded
  const oldGenOverflow = state.oldGen.length > state.oldGenCapacity;

  // Reachability integrity: all live objects must be reachable from stack frames
  const allReachableIds = new Set<string>();
  for (const frame of state.threadStack) {
    for (const ref of frame.localReferences) {
      if (!ref.isPrimitive && ref.targetHeapId) {
        allReachableIds.add(ref.targetHeapId);
      }
    }
  }

  const allHeapObjects = [...state.youngEden, ...state.youngS0, ...state.youngS1, ...state.oldGen];
  const reachabilityHonored = allHeapObjects.every((o) => {
    const isReachable = allReachableIds.has(o.id);
    return o.isRootReachable === isReachable;
  });

  const totalHeapAllocated = allHeapObjects.length;
  const maxHeap = state.edenCapacity + state.survivorCapacity + state.oldGenCapacity;

  return [
    {
      id: "jvm-survivor-to-space-empty",
      label: "Survivor Space Role Invariant (To-Space Empty)",
      passed: survivorSeparation,
      detail: survivorSeparation
        ? `S${state.activeSurvivor} active as From-Space; counterpart remains empty as To-Space ready for evacuation.`
        : "VIOLATION: Both S0 and S1 survivor spaces contain objects simultaneously!",
    },
    {
      id: "jvm-old-gen-boundary",
      label: "Old Generation Memory Ceiling (Heap OOM Protection)",
      passed: !oldGenOverflow && !state.isOutOfMemory,
      detail: state.isOutOfMemory
        ? "OOM ALERT: Old Generation exhausted and cannot reclaim memory!"
        : `Heap Occupancy: ${totalHeapAllocated}/${maxHeap} objects (${Math.round((totalHeapAllocated / maxHeap) * 100)}%).`,
    },
    {
      id: "jvm-reachability-gc-roots",
      label: "GC Roots Reachability Invariant (Stack Pointer Tracing)",
      passed: reachabilityHonored,
      detail: reachabilityHonored
        ? "All objects marked Reachable trace to active Stack Frame references."
        : "Invariant error: Unreachable object marked as live root.",
    },
  ];
}

export const javaMemoryGcSimulation: SimulationEngineSpec<
  JavaMemoryGcConfig,
  JavaMemoryGcState,
  JavaMemoryCommand
> = {
  id: "java-memory-gc",
  title: "Java Memory Management & Generational GC Simulator",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "JVM SE 21 Runtime Data Areas (JLS Chap 2) & HotSpot Generational Garbage Collection (Eden/Survivor/Tenured)",
    accurateBehaviors: [
      "Stack Frames push/pop upon method entry and return; local variables serve as active GC Roots.",
      "New object allocations (new) target Young Generation (Eden Space).",
      "Minor GC executes Evacuation Copying: surviving objects in Eden & active Survivor evacuate to opposite Survivor with tenuringAge incremented.",
      "Objects surviving past the tenuringThreshold are promoted to the Old Generation (Tenured).",
      "When Old Gen is exhausted and cannot be reclaimed by Full GC, the JVM throws java.lang.OutOfMemoryError: Java heap space.",
    ],
    simplifications: [
      "Heap capacity is modeled in discrete object slots rather than continuous byte offsets.",
      "Stop-The-World pause durations are modeled via object copy counts rather than CPU wall-clock jitter.",
      "TLAB (Thread-Local Allocation Buffer) and Card Table write barriers are omitted from visual rendering.",
    ],
    assumptions: [
      "Single-threaded call stack representing the primary application thread.",
      "Generational Copying algorithm modeled after ParallelGC / CMS Young Gen evacuation mechanics.",
    ],
    unsupportedEdgeCases: [
      "Humongous object allocations directly into Old Gen when size exceeds 50% G1 Region size.",
    ],
  },
  presets: [
    {
      id: "eden-minor-gc-cycle",
      title: "1. Eden Allocation & Local Garbage Collection (Minor GC)",
      badge: "Minor GC Mark-Copy",
      description:
        "Observe object allocation on Eden. When a method returns and drops its local references, Minor GC scans GC Roots and evacuates live objects.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "PUSH_STACK_FRAME", methodName: "calculateOrderTotal()" },
        { type: "ALLOCATE_PRIMITIVE", varName: "taxRate", value: "0.08" },
        { type: "ALLOCATE_OBJECT", className: "Order", varName: "currentOrder" },
        { type: "ALLOCATE_OBJECT", className: "Discount", varName: "promoDiscount" },
        { type: "POP_STACK_FRAME" },
        { type: "TRIGGER_MINOR_GC" },
      ],
    },
    {
      id: "tenuring-promotion-to-old-gen",
      title: "2. Generational Promotion to Old Gen (Tenuring Age)",
      badge: "Tenuring Promotion",
      description:
        "An object surviving 3 consecutive Minor GC cycles (retained by main stack frame) is promoted by HotSpot GC to Old Gen.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "ALLOCATE_OBJECT", className: "LongLivedCache", varName: "appCache" },
        { type: "ALLOCATE_OBJECT", className: "Temp1", varName: "t1" },
        { type: "ALLOCATE_OBJECT", className: "Temp2", varName: "t2" },
        { type: "ALLOCATE_OBJECT", className: "Temp3", varName: "t3" }, // Eden Full -> Auto Minor GC #1 (appCache age=1)
        { type: "ALLOCATE_OBJECT", className: "Temp4", varName: "t4" },
        { type: "ALLOCATE_OBJECT", className: "Temp5", varName: "t5" },
        { type: "ALLOCATE_OBJECT", className: "Temp6", varName: "t6" }, // Eden Full -> Auto Minor GC #2 (appCache age=2)
        { type: "ALLOCATE_OBJECT", className: "Temp7", varName: "t7" },
        { type: "ALLOCATE_OBJECT", className: "Temp8", varName: "t8" },
        { type: "ALLOCATE_OBJECT", className: "Temp9", varName: "t9" }, // Eden Full -> Auto Minor GC #3 (appCache PROMOTED to Old Gen!)
      ],
    },
    {
      id: "old-gen-oom-hazard",
      title: "3. Memory Leak & Heap Exhaustion (OutOfMemoryError)",
      badge: "Heap OOM",
      description:
        "Accumulating long-lived objects in Old Gen without release exhausts heap memory, causing Major GC failure and throwing OOM.",
      config: { ...defaultConfig, oldGenCapacity: 2, edenCapacity: 2, survivorCapacity: 1 },
      scriptedCommands: [
        { type: "ALLOCATE_OBJECT", className: "StaticLeak1", varName: "leak1" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" }, // Promoted 1
        { type: "ALLOCATE_OBJECT", className: "StaticLeak2", varName: "leak2" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" }, // Promoted 2 (Old Gen full!)
        { type: "ALLOCATE_OBJECT", className: "StaticLeak3", varName: "leak3" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" }, // Attempt promotion -> OOM!
      ],
    },
  ],

  createInitialFrame(config = defaultConfig): SimulationStepFrame<JavaMemoryGcState> {
    const mainFrame: JavaStackFrame = {
      id: "frame-main",
      methodName: "main(String[] args)",
      localReferences: [
        {
          varName: "serverPort",
          isPrimitive: true,
          primitiveValue: 8080,
        },
      ],
    };

    const initialState: JavaMemoryGcState = {
      threadStack: [mainFrame],
      youngEden: [],
      youngS0: [],
      youngS1: [],
      activeSurvivor: 0,
      oldGen: [],
      edenCapacity: config.edenCapacity,
      survivorCapacity: config.survivorCapacity,
      oldGenCapacity: config.oldGenCapacity,
      tenuringThreshold: config.tenuringThreshold,
      totalAllocationsCount: 0,
      minorGcCount: 0,
      majorGcCount: 0,
      lastMinorGcReclaimedBytes: 0,
      isOutOfMemory: false,
    };

    return {
      tick: 0,
      phase: "INITIALIZED",
      title: "JVM Runtime Data Areas Initialized",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "HotSpotJVM",
          action: "BOOTSTRAP",
          detail: "Initialized Main Thread Stack, Young Gen (Eden, S0, S1), and Tenured Generation.",
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summary:
          "JVM initialized Stack Frame for method main(). Eden Space, Survivor Spaces, and Old Gen are ready for allocations.",
        internalsNote:
          "Primitive variables like 'int serverPort = 8080' reside directly in the Stack Frame. Heap Objects are allocated dynamically in Eden, with the Stack holding 4-byte or 8-byte reference pointers.",
      },
      metrics: {
        "Stack Frames": 1,
        "Eden Used": "0 / " + config.edenCapacity,
        "Survivor S0": 0,
        "Survivor S1": 0,
        "Old Gen Used": "0 / " + config.oldGenCapacity,
        "Minor GCs": 0,
        "Tenuring Threshold": config.tenuringThreshold,
      },
    };
  },

  applyCommand(currentFrame, command) {
    const state: JavaMemoryGcState = JSON.parse(JSON.stringify(currentFrame.state));
    const nextTick = currentFrame.tick + 1;
    const events = [...currentFrame.events];
    let phase = "MUTATING";
    let title = "";
    let summary = "";
    let internalsNote = "";
    let productionWarning: string | undefined;

    switch (command.type) {
      case "PUSH_STACK_FRAME": {
        const frameId = `frame-${state.threadStack.length + 1}`;
        state.threadStack.push({
          id: frameId,
          methodName: command.methodName,
          localReferences: [],
        });
        phase = "STACK_FRAME_PUSHED";
        title = `Pushed Stack Frame: ${command.methodName}`;
        summary = `Execution thread invoked method ${command.methodName}. A new Stack Frame was allocated on the Thread Stack.`;
        internalsNote =
          "Each Thread owns a dedicated JVM Stack. Stack Frames contain Local Variable Tables, Operand Stacks, and Frame Data. Stack memory deallocates with zero GC overhead upon method return.";
        events.push({
          tick: nextTick,
          actor: "ThreadStack",
          action: "PUSH_FRAME",
          detail: `Pushed new frame ${command.methodName} to thread stack`,
          tone: "info",
        });
        break;
      }

      case "POP_STACK_FRAME": {
        if (state.threadStack.length <= 1) {
          summary = "Cannot pop the root main() Stack Frame.";
          internalsNote = "The main method anchors application execution.";
          break;
        }
        const popped = state.threadStack.pop();
        recalculateReachability(state);

        phase = "STACK_FRAME_POPPED";
        title = `Completed & Popped Stack Frame: ${popped?.methodName}`;
        summary = `Method ${popped?.methodName} returned; its Stack Frame was deallocated from the Call Stack.`;
        internalsNote =
          "When a Stack Frame is popped, local variables are destroyed. Any Heap objects previously referenced solely by this frame become unreachable garbage eligible for GC reclamation.";
        events.push({
          tick: nextTick,
          actor: "ThreadStack",
          action: "POP_FRAME",
          detail: `Popped frame ${popped?.methodName}; local variable pointers destroyed`,
          tone: "warn",
        });
        break;
      }

      case "ALLOCATE_OBJECT": {
        if (state.isOutOfMemory) {
          summary = "JVM is in OutOfMemoryError state; cannot allocate additional objects.";
          productionWarning = "Increase heap size (-Xmx) or eliminate the memory leak.";
          break;
        }

        const objId = `obj_${state.totalAllocationsCount + 1}`;
        const newObj: JavaHeapObject = {
          id: objId,
          className: command.className,
          variableName: command.varName,
          tenuringAge: 0,
          isRootReachable: true,
          sizeBytes: 64, // simplified 64 bytes
        };

        // Attach reference to current stack frame
        const topFrame = state.threadStack[state.threadStack.length - 1];
        if (topFrame) {
          topFrame.localReferences.push({
            varName: command.varName,
            isPrimitive: false,
            targetHeapId: objId,
          });
        }

        // If Eden is full -> trigger automatic Minor GC before allocation
        if (state.youngEden.length >= state.edenCapacity) {
          events.push({
            tick: nextTick,
            actor: "HotSpotGC",
            action: "EDEN_FULL",
            detail: "Eden Space full! Triggered automated Minor GC (Stop-The-World Evacuation).",
            tone: "warn",
          });
          executeMinorGc(state, events, nextTick);
        }

        state.youngEden.push(newObj);
        state.totalAllocationsCount += 1;
        recalculateReachability(state);

        phase = "OBJECT_ALLOCATED";
        title = `Heap Allocation: new ${command.className}()`;
        summary = `Object ${command.className} allocated in Eden Space. Stack Frame holds reference pointer ${command.varName} pointing to heap address ${objId}.`;
        internalsNote =
          "In HotSpot, Eden allocation is fast via Bump-the-pointer paired with Thread-Local Allocation Buffers (TLAB) to prevent multithreaded lock contention.";
        events.push({
          tick: nextTick,
          actor: "EdenSpace",
          action: "ALLOCATE_HEAP",
          detail: `Allocated ${command.className} (${objId}) on Eden; reference stored in ${topFrame?.methodName}`,
          tone: "ok",
        });
        break;
      }

      case "TRIGGER_MINOR_GC": {
        executeMinorGc(state, events, nextTick);
        phase = "MINOR_GC_COMPLETED";
        title = "Completed Minor GC (Evacuation Copying)";
        summary = `Minor GC scanned reachability from GC Roots. Live objects evacuated to Survivor Space (S${state.activeSurvivor}); dead objects reclaimed.`;
        internalsNote =
          "Minor GC pause durations are short because the Mark-Copy algorithm copies only live objects. By the Weak Generational Hypothesis, 98% of Java objects die young.";
        break;
      }

      case "TRIGGER_MAJOR_GC": {
        const initialOldCount = state.oldGen.length;
        recalculateReachability(state);
        state.oldGen = state.oldGen.filter((o) => o.isRootReachable);
        const reclaimed = initialOldCount - state.oldGen.length;
        state.majorGcCount += 1;

        if (state.oldGen.length >= state.oldGenCapacity) {
          state.isOutOfMemory = true;
          productionWarning =
            "CRITICAL: Old Generation exhausted even after Major GC! java.lang.OutOfMemoryError: Java heap space.";
          events.push({
            tick: nextTick,
            actor: "HotSpotGC",
            action: "OOM_CRASH",
            detail: "Major GC failed to reclaim sufficient Old Gen space. Heap exhausted!",
            tone: "danger",
          });
        } else {
          events.push({
            tick: nextTick,
            actor: "HotSpotGC",
            action: "MAJOR_GC",
            detail: `Major GC reclaimed ${reclaimed} unreachable objects from Old Generation`,
            tone: "ok",
          });
        }

        phase = "MAJOR_GC_COMPLETED";
        title = "Completed Major / Full GC";
        summary = `Major GC swept Old Generation, reclaiming ${reclaimed} dead objects.`;
        internalsNote =
          "Major GC employs Mark-Sweep-Compact to coalesce live objects and eliminate memory fragmentation. Major GC STW pauses are substantially longer than Minor GCs.";
        break;
      }

      case "ALLOCATE_PRIMITIVE": {
        const topFrame = state.threadStack[state.threadStack.length - 1];
        if (topFrame) {
          topFrame.localReferences.push({
            varName: command.varName,
            isPrimitive: true,
            primitiveValue: command.value,
          });
        }
        phase = "PRIMITIVE_ALLOCATED";
        title = `Allocated Primitive: ${command.varName} = ${command.value}`;
        summary = `Primitive stored directly in Stack Frame local variable table (Zero heap allocation).`;
        internalsNote =
          "Primitives (int, long, double, boolean) occupy stack slots directly without heap pointers or GC overhead.";
        events.push({
          tick: nextTick,
          actor: "ThreadStack",
          action: "LOCAL_VAR",
          detail: `Stored primitive ${command.varName} = ${command.value} on stack`,
          tone: "info",
        });
        break;
      }
    }

    const invariants = evaluateInvariants(state);
    const activeSurvivorList = state.activeSurvivor === 0 ? state.youngS0 : state.youngS1;

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
        "Stack Frames": state.threadStack.length,
        "Eden Used": `${state.youngEden.length} / ${state.edenCapacity}`,
        "Survivor Active": `S${state.activeSurvivor} (${activeSurvivorList.length} / ${state.survivorCapacity})`,
        "Old Gen Used": `${state.oldGen.length} / ${state.oldGenCapacity}`,
        "Minor GCs": state.minorGcCount,
        "Major GCs": state.majorGcCount,
      },
    };
  },
};

function executeMinorGc(
  state: JavaMemoryGcState,
  events: SimulationStepFrame<JavaMemoryGcState>["events"],
  tick: number,
): void {
  recalculateReachability(state);

  const fromSurvivor = state.activeSurvivor === 0 ? state.youngS0 : state.youngS1;
  const toSurvivorIndex = (1 - state.activeSurvivor) as 0 | 1;
  const toSurvivor: JavaHeapObject[] = [];

  // Gather live objects from Eden and From-Survivor
  const candidates = [...state.youngEden, ...fromSurvivor].filter((o) => o.isRootReachable);

  let promotedCount = 0;
  let evacuatedCount = 0;

  for (const obj of candidates) {
    obj.tenuringAge += 1;
    if (obj.tenuringAge >= state.tenuringThreshold) {
      // Promote to Old Gen
      if (state.oldGen.length < state.oldGenCapacity) {
        state.oldGen.push(obj);
        promotedCount += 1;
        events.push({
          tick,
          actor: "HotSpotGC",
          action: "PROMOTION",
          detail: `Promoted ${obj.className} (${obj.id}) to Old Gen (Age: ${obj.tenuringAge})`,
          tone: "warn",
        });
      } else {
        // Old Gen Full
        state.isOutOfMemory = true;
        events.push({
          tick,
          actor: "HotSpotGC",
          action: "PROMOTION_FAILED_OOM",
          detail: `Failed to promote ${obj.className}: Old Gen Full! Triggering OutOfMemoryError.`,
          tone: "danger",
        });
      }
    } else {
      // Evacuate to To-Survivor
      toSurvivor.push(obj);
      evacuatedCount += 1;
    }
  }

  // Clear Eden and From-Survivor
  state.youngEden = [];
  if (state.activeSurvivor === 0) {
    state.youngS0 = [];
    state.youngS1 = toSurvivor;
  } else {
    state.youngS1 = [];
    state.youngS0 = toSurvivor;
  }

  state.activeSurvivor = toSurvivorIndex;
  state.minorGcCount += 1;

  events.push({
    tick,
    actor: "HotSpotGC",
    action: "MINOR_GC_DONE",
    detail: `Minor GC completed: evacuated ${evacuatedCount} objects to S${toSurvivorIndex}, promoted ${promotedCount} to Old Gen`,
    tone: "ok",
  });
}

function recalculateReachability(state: JavaMemoryGcState): void {
  const reachableIds = new Set<string>();
  for (const frame of state.threadStack) {
    for (const ref of frame.localReferences) {
      if (!ref.isPrimitive && ref.targetHeapId) {
        reachableIds.add(ref.targetHeapId);
      }
    }
  }

  const update = (obj: JavaHeapObject) => {
    obj.isRootReachable = reachableIds.has(obj.id);
  };

  state.youngEden.forEach(update);
  state.youngS0.forEach(update);
  state.youngS1.forEach(update);
  state.oldGen.forEach(update);
}
