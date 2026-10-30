import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface HeapObject {
  id: string;
  className: string;
  sizeBytes: number;
  generation: "EDEN" | "SURVIVOR_0" | "SURVIVOR_1" | "OLD_GEN";
  tenuringAge: number;
  isRootReachable: boolean;
  variableName?: string;
}

export interface StackFrame {
  id: string;
  methodName: string;
  localReferences: {
    varName: string;
    targetHeapId: string | null;
    isPrimitive: boolean;
    primitiveValue?: string;
  }[];
}

export interface JavaMemoryGcState {
  threadStack: StackFrame[];
  youngEden: HeapObject[];
  youngS0: HeapObject[];
  youngS1: HeapObject[];
  activeSurvivor: 0 | 1;
  oldGen: HeapObject[];
  edenCapacity: number;
  survivorCapacity: number;
  oldGenCapacity: number;
  tenuringThreshold: number;
  minorGcCount: number;
  majorGcCount: number;
  totalGcPauseMs: number;
  oomTriggered: boolean;
}

export interface JavaMemoryGcConfig {
  edenCapacity: number;
  survivorCapacity: number;
  oldGenCapacity: number;
  tenuringThreshold: number;
}

export type JavaMemoryGcCommand =
  | { type: "ALLOCATE_OBJECT"; className: string; varName: string; sizeBytes?: number }
  | { type: "CALL_METHOD"; methodName: string }
  | { type: "RETURN_METHOD" }
  | { type: "TRIGGER_MINOR_GC" }
  | { type: "TRIGGER_MAJOR_GC" };

const defaultConfig: JavaMemoryGcConfig = {
  edenCapacity: 5,
  survivorCapacity: 3,
  oldGenCapacity: 6,
  tenuringThreshold: 3,
};

function recomputeReachability(state: JavaMemoryGcState): void {
  const rootIds = new Set<string>();
  for (const frame of state.threadStack) {
    for (const ref of frame.localReferences) {
      if (!ref.isPrimitive && ref.targetHeapId) {
        rootIds.add(ref.targetHeapId);
      }
    }
  }

  const update = (obj: HeapObject) => {
    obj.isRootReachable = rootIds.has(obj.id);
  };

  state.youngEden.forEach(update);
  state.youngS0.forEach(update);
  state.youngS1.forEach(update);
  state.oldGen.forEach(update);
}

function evaluateInvariants(state: JavaMemoryGcState): SimulationInvariantCheck[] {
  const totalHeapAllocated =
    state.youngEden.length +
    state.youngS0.length +
    state.youngS1.length +
    state.oldGen.length;
  const maxHeap = state.edenCapacity + state.survivorCapacity + state.oldGenCapacity;

  const survivorExclusivity =
    state.youngS0.length === 0 || state.youngS1.length === 0;

  const rootCheck = !state.youngEden.some(
    (o) => o.isRootReachable && !state.threadStack.some((f) => f.localReferences.some((r) => r.targetHeapId === o.id)),
  );

  return [
    {
      id: "survivor-space-exclusivity",
      label: "Survivor Space Exclusivity (From-Space vs To-Space)",
      passed: survivorExclusivity,
      detail: survivorExclusivity
        ? `S${state.activeSurvivor} đang hoạt động, Survivor còn lại để trống làm To-Space chuẩn bị sao chép.`
        : "Vi phạm: Cả 2 vùng S0 và S1 đều đang chứa đối tượng!",
    },
    {
      id: "heap-capacity-boundary",
      label: "Heap Allocation Boundary",
      passed: !state.oomTriggered && totalHeapAllocated <= maxHeap,
      detail: state.oomTriggered
        ? "Cảnh báo OOM: Old Generation đã đầy và không thể thu gom thêm đối tượng!"
        : `Dung lượng Heap: ${totalHeapAllocated}/${maxHeap} đối tượng (${Math.round((totalHeapAllocated / maxHeap) * 100)}%).`,
    },
    {
      id: "gc-root-reachability",
      label: "GC Root Pointer Consistency",
      passed: rootCheck,
      detail: rootCheck
        ? "Mọi đối tượng đánh dấu Reachable đều có con trỏ hợp lệ từ Stack Frame."
        : "Lỗi bất biến: Tìm thấy con trỏ rác không thể truy vết từ Stack Frame Root.",
    },
  ];
}

export const javaMemoryGcSimulation: SimulationEngineSpec<
  JavaMemoryGcConfig,
  JavaMemoryGcState,
  JavaMemoryGcCommand
> = {
  id: "java-memory-gc",
  title: "JVM Memory Management & Generational GC Simulator",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "The Java Virtual Machine Specification (Java SE 21) — Section 2.5 (Runtime Data Areas) & OpenJDK HotSpot Generational Garbage Collection",
    accurateBehaviors: [
      "Stack Frame push/pop khi gọi và kết thúc hàm; các biến cục bộ trong frame đóng vai trò GC Roots.",
      "Đối tượng mới khởi tạo (new) luôn được cấp phát trên Young Gen (Eden Space).",
      "Minor GC thực hiện cơ chế Evacuation Copy: chuyển các object còn sống từ Eden & active Survivor sang Survivor đối diện và tăng tenuringAge.",
      "Đối tượng vượt ngưỡng tenuringThreshold được thăng hạng (promoted) sang Old Gen (Tenured).",
      "Khi Old Gen đầy và không thể dọn dẹp, JVM ném ngoại lệ java.lang.OutOfMemoryError: Java heap space.",
    ],
    simplifications: [
      "Bộ nhớ Heap được định lượng bằng số lượng slot đối tượng thay vì byte offset vật lý.",
      "Thời gian Stop-The-World (STW) pause được giả lập theo số lượng object sao chép thay vì jitter xung nhịp CPU thực tế.",
      "Chưa mô phỏng TLAB (Thread-Local Allocation Buffer) và Card Table / Remembered Set.",
    ],
    assumptions: [
      "Một Single Thread call stack đại diện cho luồng chính của ứng dụng.",
      "Thuật toán GC sử dụng mô hình Generational Copying kinh điển tương đương ParallelGC / CMS Young Gen.",
    ],
    unsupportedEdgeCases: [
      "Humongous allocation trực tiếp vào Old Gen khi kích thước vượt quá 50% G1 Region.",
      "Metaspace OutOfMemoryError do ClassLoader memory leak.",
    ],
  },
  presets: [
    {
      id: "eden-allocation-and-minor-gc",
      title: "Cấp phát Eden & Dọn dẹp Rác Cục bộ (Minor GC)",
      badge: "Eden Evacuation",
      descriptionVi:
        "Quan sát luồng cấp phát đối tượng trên Eden Space, khi hàm return làm mất tham chiếu cục bộ, Minor GC quét GC Roots và dọn dẹp bộ nhớ.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "CALL_METHOD", methodName: "orderService.checkoutOrder()" },
        { type: "ALLOCATE_OBJECT", className: "OrderHeader", varName: "order" },
        { type: "ALLOCATE_OBJECT", className: "PaymentRequest", varName: "req" },
        { type: "ALLOCATE_OBJECT", className: "ByteBuf", varName: "buffer" },
        { type: "ALLOCATE_OBJECT", className: "AuditLog", varName: "audit" },
        { type: "RETURN_METHOD" },
        { type: "TRIGGER_MINOR_GC" },
      ],
    },
    {
      id: "tenuring-age-promotion-old-gen",
      title: "Thăng hạng Thế hệ sang Old Gen (Tenuring Promotion)",
      badge: "Tenuring Age 3",
      descriptionVi:
        "Một đối tượng sống sót qua 3 chu kỳ Minor GC liên tiếp (giữ tham chiếu ở main frame) sẽ được HotSpot GC thăng hạng sang Old Gen.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "ALLOCATE_OBJECT", className: "GlobalUserSession", varName: "userSession" },
        { type: "CALL_METHOD", methodName: "batchJob.tick1()" },
        { type: "ALLOCATE_OBJECT", className: "TempPayload1", varName: "t1" },
        { type: "RETURN_METHOD" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "CALL_METHOD", methodName: "batchJob.tick2()" },
        { type: "ALLOCATE_OBJECT", className: "TempPayload2", varName: "t2" },
        { type: "RETURN_METHOD" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "CALL_METHOD", methodName: "batchJob.tick3()" },
        { type: "ALLOCATE_OBJECT", className: "TempPayload3", varName: "t3" },
        { type: "RETURN_METHOD" },
        { type: "TRIGGER_MINOR_GC" },
      ],
    },
    {
      id: "heap-exhaustion-oom",
      title: "Rò rỉ Bộ nhớ & Tràn Heap (OutOfMemoryError)",
      badge: "Heap OOM",
      descriptionVi:
        "Tích lũy các đối tượng sống lâu trong Old Gen không giải phóng khiến Heap kiệt quệ, kích hoạt Major GC bất thành và ném OOM.",
      config: { ...defaultConfig, oldGenCapacity: 3 },
      scriptedCommands: [
        { type: "ALLOCATE_OBJECT", className: "CacheItemA", varName: "c1" },
        { type: "ALLOCATE_OBJECT", className: "CacheItemB", varName: "c2" },
        { type: "ALLOCATE_OBJECT", className: "CacheItemC", varName: "c3" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "ALLOCATE_OBJECT", className: "CacheItemD", varName: "c4" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MINOR_GC" },
        { type: "TRIGGER_MAJOR_GC" },
      ],
    },
  ],

  createInitialFrame(config = defaultConfig): SimulationStepFrame<JavaMemoryGcState> {
    const initialState: JavaMemoryGcState = {
      threadStack: [
        {
          id: "frame-main",
          methodName: "Application.main(String[] args)",
          localReferences: [
            { varName: "args", targetHeapId: null, isPrimitive: false },
            { varName: "port", targetHeapId: null, isPrimitive: true, primitiveValue: "8080" },
          ],
        },
      ],
      youngEden: [],
      youngS0: [],
      youngS1: [],
      activeSurvivor: 0,
      oldGen: [],
      edenCapacity: config.edenCapacity,
      survivorCapacity: config.survivorCapacity,
      oldGenCapacity: config.oldGenCapacity,
      tenuringThreshold: config.tenuringThreshold,
      minorGcCount: 0,
      majorGcCount: 0,
      totalGcPauseMs: 0,
      oomTriggered: false,
    };

    return {
      tick: 0,
      phase: "INITIALIZED",
      title: "JVM Runtime Data Areas Khởi tạo",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "JVM",
          action: "BOOTSTRAP",
          detail: "Khởi tạo Main Thread Stack, Young Gen (Eden, S0, S1) và Tenured Generation.",
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summaryVi:
          "JVM khởi tạo Stack Frame cho phương thức main(). Eden Space, Survivor Spaces và Old Gen đang sẵn sàng cấp phát bộ nhớ.",
        internalsNoteVi:
          "Các biến nguyên thủy (primitives) như int port = 8080 được lưu trực tiếp trong Stack Frame. Đối tượng (Objects) sẽ được cấp phát trên Heap và Stack Frame chỉ giữ con trỏ tham chiếu (4-byte hoặc 8-byte pointer).",
      },
      metrics: {
        "Eden Used": `0/${config.edenCapacity}`,
        "Survivor Active": "S0 (Empty)",
        "Old Gen Used": `0/${config.oldGenCapacity}`,
        "Minor GC": 0,
        "Total GC Pause": "0 ms",
      },
    };
  },

  applyCommand(currentFrame, command) {
    const state: JavaMemoryGcState = JSON.parse(JSON.stringify(currentFrame.state));
    const nextTick = currentFrame.tick + 1;
    const events = [...currentFrame.events];
    let phase = "MUTATING";
    let title = "";
    let summaryVi = "";
    let internalsNoteVi = "";
    let productionWarningVi: string | undefined;

    switch (command.type) {
      case "CALL_METHOD": {
        const frameId = `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        state.threadStack.push({
          id: frameId,
          methodName: command.methodName,
          localReferences: [],
        });
        phase = "METHOD_INVOCATION";
        title = `Đẩy Stack Frame: ${command.methodName}`;
        summaryVi = `Luồng thực thi gọi phương thức ${command.methodName}. Một Stack Frame mới được cấp phát trên Thread Stack.`;
        internalsNoteVi =
          "Mỗi Thread sở hữu một JVM Stack riêng biệt. Stack Frame chứa Local Variable Table, Operand Stack, và Frame Data (Return Address). Không có chi phí dọn rác GC cho Stack, frame tự giải phóng khi kết thúc hàm.";
        events.push({
          tick: nextTick,
          actor: "ThreadStack",
          action: "PUSH_FRAME",
          detail: `Pushed frame for ${command.methodName}`,
          tone: "info",
        });
        break;
      }

      case "RETURN_METHOD": {
        if (state.threadStack.length <= 1) {
          summaryVi = "Không thể pop Stack Frame gốc main().";
          internalsNoteVi = "Phương thức main là điểm neo của tiến trình.";
          break;
        }
        const popped = state.threadStack.pop();
        recomputeReachability(state);
        phase = "METHOD_RETURN";
        title = `Hoàn tất & Pop Stack Frame: ${popped?.methodName}`;
        summaryVi = `Phương thức ${popped?.methodName} kết thúc, Stack Frame bị giải phóng khỏi Call Stack.`;
        internalsNoteVi =
          "Khi Stack Frame bị pop, các biến cục bộ trong frame bị hủy. Bất kỳ Heap Object nào từng được tham chiếu bởi frame này (nếu không được trả về hoặc gán vào GC root khác) sẽ trở thành rác không thể truy vết (Unreachable Garbage).";
        events.push({
          tick: nextTick,
          actor: "ThreadStack",
          action: "POP_FRAME",
          detail: `Popped frame ${popped?.methodName}; local variable references invalidated`,
          tone: "warn",
        });
        break;
      }

      case "ALLOCATE_OBJECT": {
        if (state.oomTriggered) {
          summaryVi = "JVM đã rơi vào OutOfMemoryError, không thể cấp phát thêm đối tượng.";
          productionWarningVi = "Cần tăng heap (-Xmx) hoặc khắc phục memory leak.";
          break;
        }

        const objId = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newObj: HeapObject = {
          id: objId,
          className: command.className,
          sizeBytes: command.sizeBytes ?? 64,
          generation: "EDEN",
          tenuringAge: 0,
          isRootReachable: true,
          variableName: command.varName,
        };

        // Gán tham chiếu vào frame hiện tại
        const currentStackFrame = state.threadStack[state.threadStack.length - 1];
        if (currentStackFrame) {
          currentStackFrame.localReferences.push({
            varName: command.varName,
            targetHeapId: objId,
            isPrimitive: false,
          });
        }

        if (state.youngEden.length >= state.edenCapacity) {
          // Eden đầy -> tự động kích hoạt Minor GC trước khi cấp phát
          events.push({
            tick: nextTick,
            actor: "JVM Allocator",
            action: "EDEN_FULL",
            detail: "Eden Space đầy! Kích hoạt tự động Minor GC (Stop-The-World Evacuation).",
            tone: "warn",
          });
          // Thực hiện Minor GC inline
          performMinorGc(state, events, nextTick);
        }

        state.youngEden.push(newObj);
        recomputeReachability(state);

        phase = "OBJECT_ALLOCATED";
        title = `Cấp phát Heap: new ${command.className}()`;
        summaryVi = `Đối tượng ${command.className} được cấp phát trên Eden Space. Stack Frame lưu con trỏ biến ${command.varName} trỏ tới địa chỉ heap ${objId}.`;
        internalsNoteVi =
          "Trong HotSpot, object allocation trên Eden diễn ra cực nhanh nhờ con trỏ Bump-the-pointer kết hợp TLAB (Thread-Local Allocation Buffer) nhằm tránh tranh chấp khóa đa luồng.";
        events.push({
          tick: nextTick,
          actor: "HotSpot GC",
          action: "ALLOCATE",
          detail: `new ${command.className}() allocated in Eden [id=${objId}]`,
          tone: "ok",
        });
        break;
      }

      case "TRIGGER_MINOR_GC": {
        performMinorGc(state, events, nextTick);
        phase = "MINOR_GC_COMPLETED";
        title = "Hoàn tất Minor GC (Evacuation Copying)";
        summaryVi = `Minor GC quét rác từ GC Roots. Các đối tượng còn sống sót được sơ tán sang Survivor Space (S${state.activeSurvivor}), đối tượng chết bị thu hồi.`;
        internalsNoteVi =
          "Minor GC chỉ tạm dừng (Stop-The-World) trong thời gian ngắn vì nó chỉ sao chép các đối tượng còn sống (Mark-Copy). Theo Giả thuyết Thế hệ (Weak Generational Hypothesis), 98% đối tượng Java chết ngay sau khi sinh ra.";
        break;
      }

      case "TRIGGER_MAJOR_GC": {
        state.majorGcCount += 1;
        state.totalGcPauseMs += 45;
        recomputeReachability(state);

        const beforeCount = state.oldGen.length;
        state.oldGen = state.oldGen.filter((obj) => obj.isRootReachable);
        const reclaimed = beforeCount - state.oldGen.length;

        if (state.oldGen.length >= state.oldGenCapacity) {
          state.oomTriggered = true;
          productionWarningVi =
            "CRITICAL: Old Generation không còn chỗ trống ngay cả sau Major GC! java.lang.OutOfMemoryError: Java heap space.";
          events.push({
            tick: nextTick,
            actor: "JVM",
            action: "OUT_OF_MEMORY",
            detail: "Major GC failed to reclaim sufficient memory. OOM triggered!",
            tone: "danger",
          });
        } else {
          events.push({
            tick: nextTick,
            actor: "HotSpot GC",
            action: "MAJOR_GC",
            detail: `Full GC executed (Mark-Sweep-Compact). Reclaimed ${reclaimed} stale objects from Old Gen.`,
            tone: "warn",
          });
        }

        phase = "MAJOR_GC_COMPLETED";
        title = "Hoàn tất Major / Full GC";
        summaryVi = `Major GC dọn dẹp Old Generation. Đã thu hồi ${reclaimed} đối tượng rác trong Old Gen.`;
        internalsNoteVi =
          "Major GC sử dụng thuật toán Mark-Sweep-Compact để gom các object sống lại sát nhau, tránh phân mảnh bộ nhớ (Memory Fragmentation). STW pause của Major GC thường cao hơn Minor GC gấp nhiều lần.";
        break;
      }
    }

    recomputeReachability(state);
    const invariants = evaluateInvariants(state);

    return {
      tick: nextTick,
      phase,
      title,
      state,
      events,
      invariants,
      narration: {
        summaryVi,
        internalsNoteVi,
        productionWarningVi,
      },
      metrics: {
        "Eden Used": `${state.youngEden.length}/${state.edenCapacity}`,
        "Survivor Active": `S${state.activeSurvivor} (${(state.activeSurvivor === 0 ? state.youngS0 : state.youngS1).length}/${state.survivorCapacity})`,
        "Old Gen Used": `${state.oldGen.length}/${state.oldGenCapacity}`,
        "Minor GC": state.minorGcCount,
        "Major GC": state.majorGcCount,
        "Total GC Pause": `${state.totalGcPauseMs} ms`,
        "OOM Status": state.oomTriggered ? "CRITICAL (OOM)" : "NORMAL",
      },
    };
  },
};

function performMinorGc(
  state: JavaMemoryGcState,
  events: SimulationStepFrame<JavaMemoryGcState>["events"],
  tick: number,
): void {
  state.minorGcCount += 1;
  state.totalGcPauseMs += 5; // 5ms simulated STW pause

  recomputeReachability(state);

  const currentSurvivor = state.activeSurvivor === 0 ? state.youngS0 : state.youngS1;
  const targetSurvivorIdx = state.activeSurvivor === 0 ? 1 : 0;
  const targetSurvivor = targetSurvivorIdx === 0 ? state.youngS0 : state.youngS1;
  targetSurvivor.length = 0; // Clear To-Space

  // Gom tất cả các object còn sống từ Eden và From-Survivor
  const liveFromEden = state.youngEden.filter((o) => o.isRootReachable);
  const liveFromSurvivor = currentSurvivor.filter((o) => o.isRootReachable);

  const allSurviving = [...liveFromEden, ...liveFromSurvivor];

  for (const obj of allSurviving) {
    obj.tenuringAge += 1;
    if (obj.tenuringAge >= state.tenuringThreshold) {
      // Thăng hạng sang Old Gen
      if (state.oldGen.length < state.oldGenCapacity) {
        obj.generation = "OLD_GEN";
        state.oldGen.push(obj);
        events.push({
          tick,
          actor: "HotSpot GC",
          action: "TENURING_PROMOTION",
          detail: `Object ${obj.className} (age ${obj.tenuringAge}) promoted to Old Gen`,
          tone: "info",
        });
      } else {
        // Old Gen đầy
        state.oomTriggered = true;
        events.push({
          tick,
          actor: "HotSpot GC",
          action: "PROMOTION_FAILURE_OOM",
          detail: `Promotion failure for ${obj.className}: Old Gen is completely full!`,
          tone: "danger",
        });
      }
    } else {
      // Sao chép sang To-Survivor
      obj.generation = targetSurvivorIdx === 0 ? "SURVIVOR_0" : "SURVIVOR_1";
      targetSurvivor.push(obj);
    }
  }

  // Dọn sạch Eden và From-Survivor
  state.youngEden = [];
  currentSurvivor.length = 0;
  state.activeSurvivor = targetSurvivorIdx as 0 | 1;

  events.push({
    tick,
    actor: "HotSpot GC",
    action: "MINOR_GC_EVACUATION",
    detail: `Minor GC # ${state.minorGcCount}: Evacuated ${targetSurvivor.length} live objects to S${state.activeSurvivor}, swept dead objects.`,
    tone: "ok",
  });
}
