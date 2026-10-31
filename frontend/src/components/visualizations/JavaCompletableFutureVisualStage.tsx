import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaCompletableFutureState,
  AsyncStage,
} from "../../engines/simulation/java-completable-future";
import {
  GitMerge,
  ArrowRight,
  Cpu,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";

interface JavaCompletableFutureVisualStageProps {
  frame: SimulationStepFrame<JavaCompletableFutureState>;
}

export function JavaCompletableFutureVisualStage({ frame }: JavaCompletableFutureVisualStageProps) {
  const state = frame.state;
  const [selectedStage, setSelectedStage] = useState<AsyncStage | null>(null);

  return (
    <div className="jvm-visual-stage cf-visual-stage">
      {/* 1. Global Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">PIPELINE EXECUTION PROGRESS</span>
          <div className="jvm-progress-track">
            <div
              className={`jvm-progress-fill ${state.threadStarvationDetected ? "oldgen-fill" : "eden-fill"}`}
              style={{ width: `${(state.completedStageCount / state.stages.length) * 100}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {state.completedStageCount} / {state.stages.length} stages completed
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">CALLER THREAD STATUS</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {state.callerThreadBlocked ? (
              <strong style={{ color: "var(--danger)" }}>BLOCKED IN .join() (Starvation Hazard)</strong>
            ) : (
              <span style={{ color: "var(--ok)" }}>Non-Blocking (Async Callback)</span>
            )}
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">ForkJoin Workers:</span>
            <span className="gc-count-badge">{state.commonPoolWorkers.length}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Custom Workers:</span>
            <span className="gc-count-badge">{state.customPoolWorkers.length}</span>
          </div>
        </div>
      </div>

      {/* Starvation Alert */}
      {state.threadStarvationDetected && (
        <div className="jvm-oom-alert cf-starvation-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>THREAD STARVATION DEADLOCK DETECTED!</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-xs)", opacity: 0.9 }}>
              Synchronous <code>future.join()</code> or <code>future.get()</code> was called inside <code>ForkJoinPool.commonPool()</code>, exhausting worker threads and halting the pipeline!
            </p>
          </div>
        </div>
      )}

      {/* 2. Async Directed Acyclic Graph (DAG) Pipeline */}
      <div className="cf-pipeline-container">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <GitMerge size={14} color="var(--accent)" />
            <span>CompletableFuture Async DAG Execution Graph</span>
          </div>
          <span className="subsystem-meta">Mode: {state.mode}</span>
        </div>

        <div className="cf-stages-flow">
          {state.stages.map((stage, idx) => (
            <div key={stage.id} className="cf-stage-wrapper">
                <button
                  type="button"
                  className={`cf-stage-card status-${stage.status.toLowerCase()} ${selectedStage?.id === stage.id ? "selected" : ""}`}
                  onClick={() => setSelectedStage(stage)}
                >
                  <div className="stage-card-top">
                    <span className="stage-index-badge">#{idx + 1}</span>
                    <span className="stage-name">{stage.name}</span>
                    <span className={`stage-status-pill ${stage.status.toLowerCase()}`}>
                      {stage.status}
                    </span>
                  </div>

                  <div className="stage-signature">
                    <code>{stage.methodSignature}</code>
                  </div>

                  <div className="stage-meta-row">
                    <span className="pool-type-tag">{stage.poolType}</span>
                    {stage.workerThreadId && (
                      <span className="worker-id-tag">Worker: {stage.workerThreadId}</span>
                    )}
                  </div>

                  {stage.result && (
                    <div className="stage-result-banner">
                      Result: <strong>{stage.result}</strong>
                    </div>
                  )}

                  {stage.errorMessage && (
                    <div className="stage-error-banner">
                      Error: <strong>{stage.errorMessage}</strong>
                    </div>
                  )}
                </button>

                {idx < state.stages.length - 1 && (
                  <div className="stage-flow-arrow">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
          ))}
        </div>
      </div>

      {/* 3. Thread Pools Utilization Row */}
      <div className="cf-pools-row">
        <div className="pool-box">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Cpu size={13} color="var(--accent)" />
              <span>ForkJoinPool.commonPool() Workers</span>
            </div>
          </div>
          <div className="pool-workers-grid">
            {state.commonPoolWorkers.map((w) => (
              <div key={w.id} className={`pool-worker-chip status-${w.status.toLowerCase()}`}>
                <span className="worker-chip-name">{w.name}</span>
                <span className="worker-chip-task">{w.assignedStageId ? `Stage: ${w.assignedStageId}` : "Idle"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pool-box">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Layers size={13} color="var(--accent)" />
              <span>Dedicated CustomThreadPool Workers</span>
            </div>
          </div>
          <div className="pool-workers-grid">
            {state.customPoolWorkers.map((w) => (
              <div key={w.id} className={`pool-worker-chip status-${w.status.toLowerCase()}`}>
                <span className="worker-chip-name">{w.name}</span>
                <span className="worker-chip-task">{w.assignedStageId ? `Stage: ${w.assignedStageId}` : "Idle"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Stage Inspector Modal */}
      {selectedStage && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedStage(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>Async Stage Inspector ({selectedStage.name})</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedStage(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Method:</span>
                  <span className="prop-val highlight">{selectedStage.methodSignature}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Target Executor:</span>
                  <span className="prop-val">{selectedStage.poolType}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Current Status:</span>
                  <span className="prop-val highlight">{selectedStage.status}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Assigned Worker Thread:</span>
                  <span className="prop-val">{selectedStage.workerThreadId ?? "None"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Blocking Join Called:</span>
                  <span className={`prop-val ${selectedStage.isBlockingJoinCalled ? "danger" : "ok"}`}>
                    {selectedStage.isBlockingJoinCalled ? "YES (Thread Locked in get()/join())" : "NO (Non-blocking async completion)"}
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
