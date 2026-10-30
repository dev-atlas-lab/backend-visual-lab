import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type VirtualThreadStatus =
  | "QUEUED_RUNNABLE"
  | "MOUNTED_RUNNING"
  | "YIELDED_PARKED_IO"
  | "PINNED_BLOCKED"
  | "COMPLETED";

export interface VirtualThreadTask {
  id: string;
  name: string;
  status: VirtualThreadStatus;
  mountedCarrierId: string | null;
  ioWaitMsRemaining: number;
  isPinned: boolean;
  pinningReason?: string;
  stackSizeKb: number;
}

export interface CarrierThread {
  id: string;
  name: string;
  status: "IDLE" | "BUSY" | "PINNED";
  currentVirtualThreadId: string | null;
  totalTasksProcessed: number;
}

export interface JavaVirtualThreadsState {
  carrierThreads: CarrierThread[];
  virtualThreads: VirtualThreadTask[];
  completedCount: number;
  totalSpawned: number;
  carrierPoolSize: number;
  platformThreadStackKb: number; // 1024 KB (1MB) standard
  virtualThreadStackKb: number;  // 2 KB lightweight continuation
  hasPinnedCarrierAlert: boolean;
}

export interface JavaVirtualThreadsConfig {
  carrierPoolSize: number;
  initialSpawnCount: number;
}

export type JavaVirtualThreadsCommand =
  | { type: "SPAWN_TASKS"; count: number }
  | { type: "STEP_EXECUTION" }
  | { type: "TRIGGER_BLOCKING_IO"; targetVirtualThreadId?: string }
  | { type: "TRIGGER_SYNCHRONIZED_PINNING"; targetVirtualThreadId?: string }
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
        ? `Tất cả Carrier Threads đều đang làm việc hết công suất hoặc hàng đợi rảnh (${runnableCount} runnable).`
        : `Lãng phí CPU: Có ${idleCarriers} Carrier Thread rảnh rỗi trong khi có ${runnableCount} Virtual Threads đang chờ!`,
    },
    {
      id: "thread-pinning-safety",
      label: "Thread Pinning Absence (No Synchronized / JNI Hold)",
      passed: pinnedCarriers === 0,
      detail: pinnedCarriers === 0
        ? "Không có Carrier Thread nào bị ghim (pinned). Mọi thao tác I/O đều yield continuation an toàn."
        : `CẢNH BÁO PINNING: Có ${pinnedCarriers} Carrier Thread bị khóa chặt do synchronized block, làm tê liệt khả năng điều phối!`,
    },
    {
      id: "memory-footprint-advantage",
      label: "Memory Footprint Scale (Virtual vs Platform Threads)",
      passed: true,
      detail: `Với ${state.virtualThreads.length} threads: Virtual Threads tiêu thụ ~${totalVirtualMemoryMb.toFixed(1)} MB (heap-allocated stack), trong khi Platform Threads sẽ ngốn ~${equivalentPlatformMemoryMb.toFixed(1)} MB bộ nhớ OS!`,
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
      "Virtual Threads là M:N user-mode threads được điều phối trên một nhóm nhỏ OS Carrier Threads (ForkJoinPool).",
      "Khi gặp thao tác I/O chặn (Socket read/write, LockSupport.park), Continuation sẽ yield, unmount khỏi Carrier Thread ngay lập tức.",
      "Carrier Thread được giải phóng tức thì để nhận và thực thi Virtual Thread tiếp theo từ hàng đợi.",
      "Khi gặp khối synchronized hoặc native frame, Virtual Thread sẽ PIN Carrier Thread (không thể unmount), gây cạn kiệt tài nguyên Worker OS.",
      "Dung lượng stack của Virtual Thread co giãn trên Heap (vài KB), thay vì stack 1MB cố định của OS Platform Thread.",
    ],
    simplifications: [
      "Thời gian I/O blocking được mô phỏng theo số vòng lặp logical tick.",
      "ForkJoinPool work-stealing giữa các hàng đợi cục bộ được biểu diễn qua hàng đợi tập trung (global run queue).",
    ],
    assumptions: [
      "Ứng dụng thực thi các tác vụ I/O-bound (gọi HTTP API bên ngoài, query Database).",
      "Hệ điều hành cung cấp cơ chế Epoll / Kqueue hỗ trợ Non-blocking I/O ngầm dưới tầng JVM.",
    ],
    unsupportedEdgeCases: [
      "Trường hợp CPU-bound compute chuyên sâu (Virtual Threads không mang lại lợi ích thông lượng so với Platform Threads).",
      "Scoped Values và StructuredTaskScope deadline cascading.",
    ],
  },
  presets: [
    {
      id: "continuation-yield-high-throughput",
      title: "Mở rộng Tác vụ I/O & Cơ chế Continuation Yield",
      badge: "Non-blocking Yield",
      descriptionVi:
        "Quan sát 8 Virtual Threads cùng thực hiện gọi Database I/O. Khi chặn, Virtual Thread unmount để Carrier Thread phục vụ ngay tác vụ kế tiếp.",
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
      title: "Cạm bẫy Thread Pinning với khối synchronized",
      badge: "Carrier Pinning",
      descriptionVi:
        "Khi Virtual Thread thực hiện gọi I/O bên trong khối synchronized, Carrier Thread bị ghim (pinned) và không thể unmount, làm nghẽn toàn bộ Pool.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "STEP_EXECUTION" },
        { type: "TRIGGER_SYNCHRONIZED_PINNING" },
        { type: "STEP_EXECUTION" },
        { type: "RESOLVE_IO_COMPLETION" },
      ],
    },
  ],

  createInitialFrame(config = defaultConfig): SimulationStepFrame<JavaVirtualThreadsState> {
    const carrierThreads: CarrierThread[] = Array.from({ length: config.carrierPoolSize }, (_, i) => ({
      id: `carrier-worker-${i + 1}`,
      name: `ForkJoinPool-worker-${i + 1}`,
      status: "IDLE",
      currentVirtualThreadId: null,
      totalTasksProcessed: 0,
    }));

    const virtualThreads: VirtualThreadTask[] = Array.from({ length: config.initialSpawnCount }, (_, i) => ({
      id: `vt-${i + 1}`,
      name: `VirtualThread[#${i + 1}]`,
      status: "QUEUED_RUNNABLE",
      mountedCarrierId: null,
      ioWaitMsRemaining: 0,
      isPinned: false,
      stackSizeKb: 2,
    }));

    const initialState: JavaVirtualThreadsState = {
      carrierThreads,
      virtualThreads,
      completedCount: 0,
      totalSpawned: config.initialSpawnCount,
      carrierPoolSize: config.carrierPoolSize,
      platformThreadStackKb: 1024,
      virtualThreadStackKb: 2,
      hasPinnedCarrierAlert: false,
    };

    return {
      tick: 0,
      phase: "INITIALIZED",
      title: "Java 21 Virtual Threads Runtime Khởi tạo",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "LoomRuntime",
          action: "BOOTSTRAP",
          detail: `Khởi tạo ${config.carrierPoolSize} OS Carrier Threads và xếp hàng ${config.initialSpawnCount} Virtual Threads.`,
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summaryVi:
          "JVM khởi tạo Carrier Thread Pool với 2 OS threads vật lý. 8 Virtual Threads đang xếp hàng chờ trong Run Queue.",
        internalsNoteVi:
          "Không giống như Platform Thread tiêu tốn 1MB bộ nhớ ảo OS cho stack, mỗi Virtual Thread ban đầu chỉ chiếm vài trăm byte đến 2KB heap memory cho Continuation frame.",
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
    let summaryVi = "";
    let internalsNoteVi = "";
    let productionWarningVi: string | undefined;

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
        title = `Khởi tạo thêm +${command.count} Virtual Threads`;
        summaryVi = `Thêm ${command.count} Virtual Threads vào hàng đợi. Tổng số tác vụ: ${state.totalSpawned}.`;
        internalsNoteVi =
          "Hàm Thread.ofVirtual().start(runnable) tạo ra luồng với chi phí cực thấp, không cần duy trì Thread Pool truyền thống (ExecutorService thread pooling là anti-pattern với Virtual Threads).";
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
        // Gán các runnable tasks vào idle carriers
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
        title = `Lên lịch Điều phối (Scheduled ${scheduledCount} Tasks)`;
        summaryVi = `Carrier Thread Pool mount các Virtual Threads từ Run Queue vào thực thi trực tiếp trên CPU core.`;
        internalsNoteVi =
          "Quá trình Mount sao chép các con trỏ từ Heap Continuation stack vào thanh ghi CPU thật của Carrier Thread. Thời gian mount/unmount chỉ mất vài chục nano giây.";
        break;
      }

      case "TRIGGER_BLOCKING_IO": {
        // Tìm một task đang chạy và cho nó thực hiện blocking I/O
        const runningTask = state.virtualThreads.find(
          (vt) => vt.status === "MOUNTED_RUNNING" && !vt.isPinned,
        );

        if (runningTask && runningTask.mountedCarrierId) {
          const carrier = state.carrierThreads.find((c) => c.id === runningTask.mountedCarrierId);
          runningTask.status = "YIELDED_PARKED_IO";
          runningTask.ioWaitMsRemaining = 50; // Giả lập 50ms latency I/O
          runningTask.mountedCarrierId = null;

          if (carrier) {
            carrier.status = "IDLE";
            carrier.currentVirtualThreadId = null;
          }

          phase = "CONTINUATION_YIELD";
          title = `${runningTask.name} gặp Blocking I/O -> Unmount & Yield Carrier!`;
          summaryVi = `${runningTask.name} thực hiện truy vấn Socket/DB chặn. JVM Continuation unmount luồng này ra khỏi ${carrier?.name}. Carrier Thread được giải phóng NGAY LẬP TỨC để nhận tác vụ khác!`;
          internalsNoteVi =
            "Dưới JEP 444, các hàm I/O kinh điển (InputStream.read, Socket.connect, JDBC executeQuery) đã được viết lại để tự động gọi Continuation.yield() khi không có dữ liệu, chuyển epoll descriptor vào Poller thread của JVM.";
          events.push({
            tick: nextTick,
            actor: runningTask.name,
            action: "YIELD_UNMOUNT",
            detail: `Blocking I/O encountered. Unmounted from carrier ${carrier?.name}, continuation frame saved to heap.`,
            tone: "ok",
          });
        } else {
          summaryVi = "Không có Virtual Thread nào đang chạy ở trạng thái unpinned để yield I/O.";
          internalsNoteVi = "Hãy nhấn Chạy bước (Step Execution) để mount tác vụ trước.";
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
          title = `NGUY HIỂM: Thread Pinning xảy ra trên ${carrier?.name}!`;
          summaryVi = `${runningTask.name} gọi I/O chặn bên trong một khối 'synchronized'. JVM KHÔNG THỂ unmount Continuation và buộc phải ghim chặt (pin) Carrier Thread ${carrier?.name}!`;
          internalsNoteVi =
            "Khi một Virtual Thread nằm trong synchronized block hoặc gọi native C/JNI frame, HotSpot không thể tháo rời call stack. Carrier Thread bị chiếm giữ làm mất khả năng phục vụ các tác vụ khác. GIẢI PHÁP: Thay thế synchronized bằng java.util.concurrent.locks.ReentrantLock.";
          productionWarningVi =
            "CẢNH BÁO SẢN XUẤT: Thread Pinning làm vô hiệu hóa lợi thế của Virtual Threads và có thể khiến ứng dụng cạn kiệt Carrier Pool (-Djdk.tracePinnedThreads=full để truy vết).";
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
        // Giải phóng các I/O đang chờ
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
              detail: `${vt.name} nhận phản hồi từ Socket epoll -> unpark trở lại Runnable Queue`,
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
        title = `Hoàn tất I/O Callback (${resolvedCount} Tác vụ)`;
        summaryVi = `Dữ liệu I/O đã sẵn sàng. Các Virtual Thread được unpark và xếp trở lại Run Queue để Carrier Thread rảnh tiếp tục xử lý.`;
        internalsNoteVi =
          "Một Virtual Thread không bị ràng buộc với bất kỳ Carrier Thread cụ thể nào. Sau khi unpark, nó có thể được tiếp tục thực thi trên bất kỳ Carrier Thread nào khác trong pool.";
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
        summaryVi,
        internalsNoteVi,
        productionWarningVi,
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
