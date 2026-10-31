import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaConcurrencyState,
  ThreadExecutionState,
} from "../../engines/simulation/java-concurrency";
import {
  Lock,
  Unlock,
  Cpu,
  Layers,
  AlertTriangle,
  RotateCw,
  Info,
  Shield,
} from "lucide-react";

interface JavaConcurrencyVisualStageProps {
  frame: SimulationStepFrame<JavaConcurrencyState>;
}

export function JavaConcurrencyVisualStage({ frame }: JavaConcurrencyVisualStageProps) {
  const state = frame.state;
  const [selectedThread, setSelectedThread] = useState<ThreadExecutionState | null>(null);

  const lockStateBits =
    state.markWord.lockState === "UNLOCKED"
      ? "001"
      : state.markWord.lockState === "BIASED"
      ? "101"
      : state.markWord.lockState === "LIGHTWEIGHT"
      ? "00"
      : "10";

  return (
    <div className="jvm-visual-stage concurrency-visual-stage">
      {/* 1. Global Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">HOTSPOT MARK WORD LOCK STATE</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {state.markWord.lockState} (Bits: {lockStateBits})
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">JMM MEMORY BARRIER</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {state.isVolatileVariable ? (
              <strong style={{ color: "var(--ok)" }}>ACTIVE ({state.memoryBarrierActive})</strong>
            ) : (
              <span style={{ color: "var(--danger)" }}>NONE (Stale Cache Hazard)</span>
            )}
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">CAS Ops:</span>
            <span className="gc-count-badge">{state.totalCasOperations}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Context Switches:</span>
            <span className={`gc-count-badge ${state.contextSwitchesCount > 0 ? "warn" : ""}`}>
              {state.contextSwitchesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Lock Escalation Alert */}
      {state.lockInflationReason && (
        <div className="jvm-oom-alert concurrency-inflation-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>HOTSPOT LOCK ESCALATION EVENT!</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-xs)", opacity: 0.9 }}>
              {state.lockInflationReason}
            </p>
          </div>
        </div>
      )}

      {/* 2. HotSpot 64-Bit Mark Word Layout Box */}
      <div className="mark-word-box">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Shield size={14} color="var(--accent)" />
            <span>HotSpot JVM 64-bit Object Header (Mark Word Layout)</span>
          </div>
          <span className="subsystem-meta">
            Lock State: <strong>{state.markWord.lockState}</strong>
          </span>
        </div>

        <div className="mark-word-bits-diagram">
          <div className="bit-segment unused-bits">
            <span className="bit-label">Identity HashCode</span>
            <span className="bit-val">{state.markWord.hashcode}</span>
          </div>
          <div className="bit-segment age-bits">
            <span className="bit-label">GC Age (4-bit)</span>
            <span className="bit-val">{state.markWord.age} / 15</span>
          </div>
          <div className="bit-segment biased-bit">
            <span className="bit-label">Biased (1-bit)</span>
            <span className="bit-val">{state.markWord.lockState === "BIASED" ? "1" : "0"}</span>
          </div>
          <div className={`bit-segment lock-bits state-${state.markWord.lockState.toLowerCase()}`}>
            <span className="bit-label">Lock Bits (2-bit)</span>
            <span className="bit-val">{lockStateBits}</span>
          </div>
        </div>

        <div className="lock-state-progression">
          <div className={`state-step ${state.markWord.lockState === "UNLOCKED" ? "active" : ""}`}>
            1. UNLOCKED (001)
          </div>
          <span className="progression-arrow">&rarr;</span>
          <div className={`state-step ${state.markWord.lockState === "BIASED" ? "active" : ""}`}>
            2. BIASED (101)
          </div>
          <span className="progression-arrow">&rarr;</span>
          <div className={`state-step ${state.markWord.lockState === "LIGHTWEIGHT" ? "active" : ""}`}>
            3. LIGHTWEIGHT CAS (00)
          </div>
          <span className="progression-arrow">&rarr;</span>
          <div className={`state-step ${state.markWord.lockState === "HEAVYWEIGHT" ? "active" : ""}`}>
            4. HEAVYWEIGHT MUTEX (10)
          </div>
        </div>
      </div>

      {/* 3. JMM (Java Memory Model) Cache Visibility vs Shared Heap Variable */}
      <div className="jmm-visibility-layout">
        <div className="jmm-subsystem-box">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Layers size={14} color="var(--accent)" />
              <span>JMM Memory Visibility: Main Memory (Heap) vs Thread CPU Caches</span>
            </div>
            <span className="subsystem-meta">
              Variable Type: <strong>{state.isVolatileVariable ? "volatile int count" : "plain int count"}</strong>
            </span>
          </div>

          <div className="main-memory-shelf">
            <span className="shelf-label">Main Memory (Heap Storage):</span>
            <div className="heap-shared-val">
              <span>sharedValue = </span>
              <strong>{state.sharedMainMemoryValue}</strong>
            </div>
          </div>

          {/* Threads Local Register / Store Buffer Caches */}
          <div className="thread-caches-grid">
            {state.threads.map((t) => {
              const isHolding = t.holdingLock;
              const isSpinning = t.status === "SPINNING_CAS";
              const isBlocked = t.status === "PARKED_MUTEX" || t.status === "BLOCKED";
              const isStale = t.localCachedValue !== state.sharedMainMemoryValue;

              return (
                <div
                  key={t.id}
                  className={`thread-cache-card ${isHolding ? "holding-lock" : isBlocked ? "blocked" : ""}`}
                  onClick={() => setSelectedThread(t)}
                >
                  <div className="thread-card-header">
                    <div className="thread-title">
                      <Cpu size={13} color={isHolding ? "var(--ok)" : isBlocked ? "var(--danger)" : "var(--accent)"} />
                      <span>{t.name}</span>
                    </div>
                    <span className="thread-status-badge">{t.status}</span>
                  </div>

                  <div className="cache-value-view">
                    <span className="cache-label">CPU Local Cache / Register:</span>
                    <div className="cache-val-box">
                      <span className={`cache-val ${isStale ? "stale-hazard" : "fresh"}`}>
                        {t.localCachedValue}
                      </span>
                      {isStale && (
                        <span className="stale-warning">
                          <AlertTriangle size={11} /> Stale View! (Heap is {state.sharedMainMemoryValue})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="thread-card-footer">
                    {isHolding ? (
                      <span className="holding-tag">
                        <Lock size={11} /> Holds Mark Word Lock
                      </span>
                    ) : isSpinning ? (
                      <span className="spinning-tag">
                        <RotateCw size={11} className="spin-icon" /> CAS Spin ({t.casSpinAttempts} spins)
                      </span>
                    ) : (
                      <span className="idle-tag">
                        <Unlock size={11} /> Lock Released
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Thread Modal */}
      {selectedThread && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedThread(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>Thread State Inspector ({selectedThread.name})</span>
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
                  <span className="prop-name">Execution State:</span>
                  <span className="prop-val highlight">{selectedThread.status}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Holds Mark Word Lock:</span>
                  <span className="prop-val">{selectedThread.holdingLock ? "YES (Owner)" : "NO"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Thread-Local Cached Value:</span>
                  <span className="prop-val">{selectedThread.localCachedValue}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">CAS Spin Attempts:</span>
                  <span className="prop-val">{selectedThread.casSpinAttempts}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Happens-Before Visibility:</span>
                  <span className="prop-val">
                    {state.isVolatileVariable
                      ? "Guaranteed: Read executed through volatile Memory Barrier (LoadLoad/LoadStore)."
                      : "Unguaranteed: Plain reads may return stale register values due to store buffer caching."}
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
