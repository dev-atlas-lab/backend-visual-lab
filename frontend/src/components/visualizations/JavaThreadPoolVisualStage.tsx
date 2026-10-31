import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaThreadPoolState,
  PoolWorkerThread,
} from "../../engines/simulation/java-thread-pool";
import {
  Cpu,
  ArrowRight,
  ShieldAlert,
  Inbox,
} from "lucide-react";

interface JavaThreadPoolVisualStageProps {
  frame: SimulationStepFrame<JavaThreadPoolState>;
}

export function JavaThreadPoolVisualStage({ frame }: JavaThreadPoolVisualStageProps) {
  const state = frame.state;
  const [selectedWorker, setSelectedWorker] = useState<PoolWorkerThread | null>(null);

  const coreWorkers = state.workers.filter((w) => w.isCore);
  const nonCoreWorkers = state.workers.filter((w) => !w.isCore);
  const queuePercent = Math.round((state.queue.length / state.queueCapacity) * 100);

  return (
    <div className="jvm-visual-stage threadpool-visual-stage">
      {/* 1. Global ThreadPool Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">WORK QUEUE OCCUPANCY</span>
          <div className="jvm-progress-track">
            <div
              className={`jvm-progress-fill ${queuePercent >= 80 ? "oldgen-fill" : "eden-fill"}`}
              style={{ width: `${Math.min(100, queuePercent)}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {state.queue.length} / {state.queueCapacity} queued ({queuePercent}%)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">ACTIVE WORKER THREADS</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {state.workers.length} / {state.maximumPoolSize} threads ({coreWorkers.length} Core + {nonCoreWorkers.length} Non-Core)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">ACTIVE REJECTION POLICY</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            RejectedExecutionHandler: <strong>{state.rejectionPolicy}</strong>
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">Submitted:</span>
            <span className="gc-count-badge">{state.totalTasksSubmitted}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Completed:</span>
            <span className="gc-count-badge" style={{ color: "var(--ok)" }}>{state.totalTasksCompleted}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Rejected:</span>
            <span className={`gc-count-badge ${state.totalTasksRejected > 0 ? "warn" : ""}`}>{state.totalTasksRejected}</span>
          </div>
        </div>
      </div>

      {/* Saturation / CallerRuns Alert Banner */}
      {state.saturationEventTriggered && (
        <div className="jvm-oom-alert threadpool-saturation-alert">
          <ShieldAlert size={18} />
          <div>
            <strong>THREAD POOL SATURATION TRIGGERED!</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-xs)", opacity: 0.9 }}>
              All core workers busy, <code>BlockingQueue</code> is 100% full, and max non-core worker ceiling ({state.maximumPoolSize}) has been reached!
              Current policy: <code>{state.rejectionPolicy}</code> {state.callerRunsActive ? "— Tasks are currently being executed directly on the Caller thread to throttle incoming load!" : ""}.
            </p>
          </div>
        </div>
      )}

      {/* 2. 4-Step Dispatch Pipeline Diagram */}
      <div className="dispatch-pipeline-flow">
        {/* Step 1: Core Worker Pool */}
        <div className="pipeline-phase-box phase-core">
          <div className="phase-header">
            <div className="phase-title">
              <span className="phase-num-badge">Step 1</span>
              <span>Core Pool ({coreWorkers.length}/{state.corePoolSize})</span>
            </div>
            <span className="phase-badge">Priority 1</span>
          </div>

          <div className="phase-workers-list">
            {coreWorkers.map((worker) => {
              const isBusy = worker.status === "BUSY";
              return (
                <div
                  key={worker.id}
                  className={`pool-worker-card ${isBusy ? "busy" : "idle"}`}
                  onClick={() => setSelectedWorker(worker)}
                >
                  <div className="worker-card-header">
                    <Cpu size={13} color={isBusy ? "var(--accent)" : "var(--text-secondary)"} />
                    <span className="worker-name">{worker.name}</span>
                  </div>
                  <div className="worker-card-body">
                    {isBusy ? (
                      <span className="task-assigned-tag">Task: {worker.currentTaskId}</span>
                    ) : (
                      <span className="task-idle-tag">Idle (Awaiting Task)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pipeline-connector-arrow">
          <span>If Full</span>
          <ArrowRight size={18} />
        </div>

        {/* Step 2: BlockingQueue */}
        <div className="pipeline-phase-box phase-queue">
          <div className="phase-header">
            <div className="phase-title">
              <span className="phase-num-badge">Step 2</span>
              <span>BlockingQueue ({state.queue.length}/{state.queueCapacity})</span>
            </div>
            <span className="phase-badge">Priority 2</span>
          </div>

          <div className="phase-queue-slots">
            {Array.from({ length: state.queueCapacity }).map((_, slotIdx) => {
              const task = state.queue[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`queue-slot-item ${task ? "occupied" : "empty"}`}
                >
                  <span className="slot-idx-tag">#{slotIdx + 1}</span>
                  {task ? (
                    <div className="slot-task-info">
                      <Inbox size={12} color="var(--accent)" />
                      <span className="task-title">{task.name}</span>
                    </div>
                  ) : (
                    <span className="slot-empty-label">Empty Slot</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pipeline-connector-arrow">
          <span>If Full</span>
          <ArrowRight size={18} />
        </div>

        {/* Step 3: Non-Core Worker Pool */}
        <div className="pipeline-phase-box phase-noncore">
          <div className="phase-header">
            <div className="phase-title">
              <span className="phase-num-badge">Step 3</span>
              <span>Non-Core Workers ({nonCoreWorkers.length}/{state.maximumPoolSize - state.corePoolSize})</span>
            </div>
            <span className="phase-badge">Priority 3</span>
          </div>

          <div className="phase-workers-list">
            {nonCoreWorkers.length === 0 ? (
              <div className="empty-subsystem-state">
                No non-core workers active. They only spawn when the work queue is saturated.
              </div>
            ) : (
              nonCoreWorkers.map((worker) => {
                const isBusy = worker.status === "BUSY";
                return (
                  <div
                    key={worker.id}
                    className={`pool-worker-card non-core ${isBusy ? "busy" : "idle"}`}
                    onClick={() => setSelectedWorker(worker)}
                  >
                    <div className="worker-card-header">
                      <Cpu size={13} color={isBusy ? "var(--warning)" : "var(--text-secondary)"} />
                      <span className="worker-name">{worker.name} (Non-Core)</span>
                    </div>
                    <div className="worker-card-body">
                      {isBusy ? (
                        <span className="task-assigned-tag">Task: {worker.currentTaskId}</span>
                      ) : (
                        <span className="task-idle-tag">KeepAlive Expiring</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pipeline-connector-arrow">
          <span>If Full</span>
          <ArrowRight size={18} />
        </div>

        {/* Step 4: Rejection Handler */}
        <div className="pipeline-phase-box phase-rejection">
          <div className="phase-header">
            <div className="phase-title">
              <span className="phase-num-badge">Step 4</span>
              <span>Rejection Handler</span>
            </div>
            <span className="phase-badge danger">Saturation Fallback</span>
          </div>

          <div className="rejection-policy-box">
            <div className="rejection-name">{state.rejectionPolicy}</div>
            <p className="rejection-desc">
              {state.rejectionPolicy === "CallerRunsPolicy"
                ? "Executes rejected tasks synchronously on the calling thread (e.g. HTTP controller thread), providing automatic natural backpressure."
                : state.rejectionPolicy === "AbortPolicy"
                ? "Throws RejectedExecutionException immediately to signal saturation upstream."
                : state.rejectionPolicy === "DiscardPolicy"
                ? "Silently drops newly incoming tasks with zero notification."
                : "Drops the oldest unhandled task at head of queue to accommodate new task."}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Worker Modal */}
      {selectedWorker && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedWorker(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Cpu size={16} color="var(--accent)" />
                <span>Worker Thread Details ({selectedWorker.name})</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedWorker(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Worker ID:</span>
                  <span className="prop-val highlight">{selectedWorker.id}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Worker Type:</span>
                  <span className="prop-val">{selectedWorker.isCore ? "Core Pool Worker (Permanent)" : "Non-Core Worker (KeepAlive Evictable)"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Current Status:</span>
                  <span className="prop-val highlight">{selectedWorker.status}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Current Executing Task:</span>
                  <span className="prop-val">{selectedWorker.currentTaskId ?? "None (Idle in take() / poll())"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Tasks Completed:</span>
                  <span className="prop-val">{selectedWorker.tasksCompletedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
