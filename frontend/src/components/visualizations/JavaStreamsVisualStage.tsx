import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaStreamsState,
  StreamItem,
} from "../../engines/simulation/java-streams";
import {
  Layers,
  ArrowRight,
  Zap,
  CheckCircle,
  Info,
} from "lucide-react";

interface JavaStreamsVisualStageProps {
  frame: SimulationStepFrame<JavaStreamsState>;
}

export function JavaStreamsVisualStage({ frame }: JavaStreamsVisualStageProps) {
  const state = frame.state;
  const [selectedItem, setSelectedItem] = useState<StreamItem | null>(null);

  const isFused = state.mode === "STREAM_LOOP_FUSION";

  return (
    <div className="jvm-visual-stage streams-visual-stage">
      {/* 1. Global Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">EXECUTION ENGINE MODE</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {isFused ? "Stream Pipeline Loop Fusion (Zero Intermediate Lists)" : "Naive Eager Collections (Allocates Heap Lists)"}
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">HEAP ALLOCATIONS SAVED</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {isFused ? (
              <strong style={{ color: "var(--ok)" }}>0 intermediate lists allocated</strong>
            ) : (
              <strong style={{ color: "var(--danger)" }}>{state.intermediateListsAllocated} lists allocated on heap</strong>
            )}
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">Examined:</span>
            <span className="gc-count-badge">{state.totalElementsExamined}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Sink Pushes:</span>
            <span className="gc-count-badge" style={{ color: "var(--accent)" }}>{state.sinkAcceptCalls}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Collected:</span>
            <span className="gc-count-badge" style={{ color: "var(--ok)" }}>{state.collectedResults.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Pipeline Operators Chain */}
      <div className="streams-pipeline-chain">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Zap size={14} color="var(--accent)" />
            <span>Java Stream Pipeline Stages (Lazy Evaluation Chain)</span>
          </div>
          <span className="subsystem-meta">
            {state.terminalTriggered ? "Terminal Collector Triggered" : "Awaiting Terminal Operation"}
          </span>
        </div>

        <div className="pipeline-operators-flow">
          {state.stages.map((stage, sIdx) => {
            const isActive = state.activeStageIndex === sIdx;
            return (
              <div key={stage.id} className="operator-stage-wrapper">
                <div className={`operator-stage-card ${isActive ? "active-stage" : ""} ${stage.isTerminal ? "terminal-stage" : ""}`}>
                  <div className="op-card-top">
                    <span className="op-type-tag">{stage.isTerminal ? "Terminal Op" : "Intermediate"}</span>
                    <span className="op-name">{stage.name}</span>
                  </div>
                  <div className="op-card-meta">
                    <span>Processed: <strong>{stage.processedCount}</strong></span>
                    {stage.isShortCircuit && <span className="short-circuit-pill">Short-Circuiting</span>}
                  </div>
                </div>

                {sIdx < state.stages.length - 1 && (
                  <div className="op-connector">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Stream Elements Moving Through Pipeline */}
      <div className="stream-elements-flow-box">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Layers size={14} color="var(--accent)" />
            <span>Stream Source Elements &amp; State Transformations</span>
          </div>
          <span className="subsystem-meta">Click an element to view step-by-step history</span>
        </div>

        <div className="stream-elements-grid">
          {state.items.map((item) => {
            const isCollected = item.status === "COLLECTED";
            const isFiltered = item.status === "FILTERED_OUT";
            const isSkipped = item.status === "SKIPPED_SHORT_CIRCUIT";
            const isProcessing = item.status === "PROCESSING";

            return (
              <button
                key={item.id}
                type="button"
                className={`stream-element-pill status-${item.status.toLowerCase()} ${selectedItem?.id === item.id ? "selected" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="elem-pill-header">
                  <span className="elem-orig-val">#{item.originalValue}</span>
                  <span className="elem-status-text">
                    {isCollected ? "Collected" : isFiltered ? "Filtered" : isSkipped ? "Short-Circuit" : isProcessing ? "In Flight" : "Pending"}
                  </span>
                </div>
                <div className="elem-pill-val">
                  <span>Current: <strong>{item.currentValue}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Collected Results Shelf */}
      <div className="collected-results-shelf">
        <div className="shelf-title">
          <CheckCircle size={14} color="var(--ok)" />
          <span>Final Collected Result Collection (<code>List&lt;Integer&gt;</code>):</span>
        </div>
        <div className="results-chips-list">
          {state.collectedResults.length === 0 ? (
            <span className="no-results-hint">No elements collected yet.</span>
          ) : (
            state.collectedResults.map((val, idx) => (
              <span key={idx} className="result-chip">
                {val}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Selected Element Modal */}
      {selectedItem && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>Stream Item #{selectedItem.originalValue} Trace</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedItem(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Original Value:</span>
                  <span className="prop-val highlight">{selectedItem.originalValue}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Final Transformed Value:</span>
                  <span className="prop-val highlight">{selectedItem.currentValue}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Status:</span>
                  <span className="prop-val">{selectedItem.status}</span>
                </div>
                <div className="modal-prop" style={{ gridColumn: "span 2" }}>
                  <span className="prop-name">Evaluation History:</span>
                  <div className="history-trace-list">
                    {selectedItem.history.map((h, hIdx) => (
                      <div key={hIdx} className="history-trace-line">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
