import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaVirtualThreadsState,
  JavaVirtualThread,
} from "../../engines/simulation/java-virtual-threads";
import {
  Cpu,
  AlertOctagon,
  Clock,
  Zap,
  Info,
  Server,
  Activity,
} from "lucide-react";

interface JavaVirtualThreadsVisualStageProps {
  frame: SimulationStepFrame<JavaVirtualThreadsState>;
}

export function JavaVirtualThreadsVisualStage({ frame }: JavaVirtualThreadsVisualStageProps) {
  const state = frame.state;
  const [selectedThread, setSelectedThread] = useState<JavaVirtualThread | null>(null);

  const runnableCount = state.virtualThreads.filter((t) => t.status === "QUEUED_RUNNABLE").length;
  const runningCount = state.virtualThreads.filter((t) => t.status === "MOUNTED_RUNNING").length;
  const yieldedCount = state.virtualThreads.filter((t) => t.status === "YIELDED_PARKED_IO").length;
  const pinnedCount = state.virtualThreads.filter((t) => t.status === "PINNED_BLOCKED").length;

  const totalVirtualMemoryMb = ((state.virtualThreads.length * state.virtualThreadStackKb) / 1024).toFixed(2);
  const totalPlatformMemoryMb = ((state.virtualThreads.length * state.platformThreadStackKb) / 1024).toFixed(1);

  return (
    <div className="jvm-visual-stage loom-visual-stage">
      {/* 1. Global Loom Runtime Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">OS CARRIER POOL (FORKJOINPOOL)</span>
          <div className="jvm-progress-track">
            <div
              className={`jvm-progress-fill ${state.hasPinnedCarrierAlert ? "oldgen-fill" : "eden-fill"}`}
              style={{
                width: `${(state.carrierThreads.filter((c) => c.status !== "IDLE").length / state.carrierPoolSize) * 100}%`,
              }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {state.carrierThreads.filter((c) => c.status !== "IDLE").length} / {state.carrierPoolSize} Carriers Busy
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">MEMORY FOOTPRINT SCALE</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            Virtual: <strong>{totalVirtualMemoryMb} MB</strong> vs Platform: <strong style={{ color: "var(--danger)" }}>{totalPlatformMemoryMb} MB</strong>
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">Completed:</span>
            <span className="gc-count-badge" style={{ color: "var(--ok)" }}>
              {state.completedCount}
            </span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Pinned:</span>
            <span className={`gc-count-badge ${pinnedCount > 0 ? "warn" : ""}`}>
              {pinnedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Pinning Alert Banner */}
      {state.hasPinnedCarrierAlert && (
        <div className="jvm-oom-alert loom-pinning-alert">
          <AlertOctagon size={18} />
          <div>
            <strong>CRITICAL: Carrier Thread Pinning Detected!</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-xs)", opacity: 0.9 }}>
              A Virtual Thread entered a <code>synchronized</code> block or native JNI call during blocking I/O, preventing the Loom Continuation from unmounting. The OS carrier thread is frozen, choking scheduler throughput!
            </p>
          </div>
        </div>
      )}

      {/* 2. Main Two-Tier Scheduler View: Carrier Pool (OS) vs Virtual Threads (User Mode) */}
      <div className="loom-scheduler-layout">
        {/* Tier A: Operating System Carrier Threads (ForkJoinPool) */}
        <div className="carrier-pool-box">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Server size={15} color="var(--accent)" />
              <span>OS Carrier Threads (ForkJoinPool Workers — 1:1 Kernel Threads)</span>
            </div>
            <span className="subsystem-meta">
              Fixed {state.carrierPoolSize} Platform Threads (CPU Core Count)
            </span>
          </div>

          <div className="carrier-threads-grid">
            {state.carrierThreads.map((carrier) => {
              const isPinned = carrier.status === "PINNED";
              const isBusy = carrier.status === "BUSY";
              const mountedVt = state.virtualThreads.find((vt) => vt.id === carrier.currentVirtualThreadId);

              return (
                <div
                  key={carrier.id}
                  className={`carrier-thread-card status-${carrier.status.toLowerCase()}`}
                >
                  <div className="carrier-header">
                    <div className="carrier-title">
                      <Cpu size={14} color={isPinned ? "var(--danger)" : isBusy ? "var(--accent)" : "var(--text-secondary)"} />
                      <span className="carrier-name">{carrier.name}</span>
                    </div>
                    <span className={`carrier-status-tag ${isPinned ? "pinned" : isBusy ? "busy" : "idle"}`}>
                      {carrier.status}
                    </span>
                  </div>

                  <div className="carrier-body">
                    {isPinned ? (
                      <div className="carrier-pinned-note">
                        <AlertOctagon size={13} color="var(--danger)" />
                        <span>PINNED: Cannot unmount during I/O!</span>
                      </div>
                    ) : mountedVt ? (
                      <div className="carrier-mounted-mount">
                        <span className="carrier-mount-label">Mounted Virtual Thread:</span>
                        <div className="mounted-vt-pill">
                          <Zap size={12} color="var(--accent)" />
                          <span className="vt-name">{mountedVt.name}</span>
                          <span className="vt-stack-tag">({mountedVt.stackSizeKb} KB stack)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="carrier-idle-note">
                        <Clock size={12} />
                        <span>Awaiting runnable virtual threads</span>
                      </div>
                    )}
                  </div>

                  <div className="carrier-footer">
                    <span>Lifetime tasks processed: <strong>{carrier.totalTasksProcessed}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tier B: User-Mode Virtual Threads (Heap Allocated Continuations) */}
        <div className="virtual-threads-box">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Activity size={15} color="var(--accent)" />
              <span>User-Mode Virtual Threads (Loom Continuations on JVM Heap)</span>
            </div>
            <div className="vt-status-counts-summary">
              <span className="badge-stat">Runnable: {runnableCount}</span>
              <span className="badge-stat">Mounted: {runningCount}</span>
              <span className="badge-stat">Yielded (I/O): {yieldedCount}</span>
            </div>
          </div>

          <div className="virtual-threads-scroll-container">
            {state.virtualThreads.length === 0 ? (
              <div className="empty-subsystem-state">No virtual threads active. Click 'Spawn Tasks' below.</div>
            ) : (
              <div className="virtual-threads-grid">
                {state.virtualThreads.map((vt) => {
                  const isMounted = vt.status === "MOUNTED_RUNNING";
                  const isYielded = vt.status === "YIELDED_PARKED_IO";
                  const isPinned = vt.status === "PINNED_BLOCKED";
                  const isCompleted = vt.status === "COMPLETED";

                  return (
                    <button
                      key={vt.id}
                      type="button"
                      className={`vt-card status-${vt.status.toLowerCase()} ${selectedThread?.id === vt.id ? "selected" : ""}`}
                      onClick={() => setSelectedThread(vt)}
                    >
                      <div className="vt-card-top">
                        <span className="vt-card-name">{vt.name}</span>
                        <span className="vt-card-status">
                          {isMounted ? "Mounted" : isYielded ? "Parked (I/O)" : isPinned ? "PINNED" : isCompleted ? "Done" : "Queued"}
                        </span>
                      </div>

                      <div className="vt-card-detail">
                        {isMounted ? (
                          <span className="vt-carrier-assigned">Carrier: {vt.mountedCarrierId}</span>
                        ) : isYielded ? (
                          <span className="vt-io-wait">Waiting Socket I/O ({vt.ioWaitMsRemaining}ms)</span>
                        ) : isPinned ? (
                          <span className="vt-pin-reason">{vt.pinningReason || "Inside synchronized"}</span>
                        ) : isCompleted ? (
                          <span className="vt-completed-tag">Execution finished</span>
                        ) : (
                          <span className="vt-queued-tag">Waiting carrier slot</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Inspector Modal for Selected Virtual Thread */}
      {selectedThread && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedThread(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>Virtual Thread Inspector ({selectedThread.name})</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedThread(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Thread ID:</span>
                  <span className="prop-val highlight">{selectedThread.id}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Runtime Status:</span>
                  <span className="prop-val highlight">{selectedThread.status}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Mounted Carrier Thread:</span>
                  <span className="prop-val">{selectedThread.mountedCarrierId ?? "None (Unmounted/Parked)"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Heap Stack Frame Size:</span>
                  <span className="prop-val">{selectedThread.stackSizeKb} KB (Grows dynamically on heap)</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Platform Thread Equivalent:</span>
                  <span className="prop-val">1024 KB (1 MB reserved OS virtual memory)</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Pinning Status:</span>
                  <span className={`prop-val ${selectedThread.isPinned ? "danger" : ""}`}>
                    {selectedThread.isPinned ? `PINNED (${selectedThread.pinningReason})` : "Unpinned (Clean non-blocking yield)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
