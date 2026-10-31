import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaConcurrentHashMapState,
  ConcurrentMapBin,
} from "../../engines/simulation/java-concurrenthashmap";
import {
  Lock,
  Unlock,
  Cpu,
  Layers,
  Hash,
  Info,
  RefreshCw,
} from "lucide-react";

interface JavaConcurrentHashMapVisualStageProps {
  frame: SimulationStepFrame<JavaConcurrentHashMapState>;
}

export function JavaConcurrentHashMapVisualStage({ frame }: JavaConcurrentHashMapVisualStageProps) {
  const state = frame.state;
  const [selectedBin, setSelectedBin] = useState<ConcurrentMapBin | null>(null);

  const lockedBinsCount = state.bins.filter((b) => b.isLocked).length;

  return (
    <div className="jvm-visual-stage chm-visual-stage">
      {/* 1. Global CHM Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">FINE-GRAINED STRIPED LOCKING</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {lockedBinsCount} / {state.tableCapacity} Bins Locked ({state.tableCapacity - lockedBinsCount} Bins Concurrently Accessible)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">CONCURRENT RESIZING STATUS</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {state.isResizing ? (
              <strong style={{ color: "var(--warning)" }}>Resizing (ForwardingNode Help)</strong>
            ) : (
              <span style={{ color: "var(--ok)" }}>Steady State Table</span>
            )}
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">CAS Inserts:</span>
            <span className="gc-count-badge" style={{ color: "var(--ok)" }}>{state.totalCasOperations}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Bin Locks:</span>
            <span className="gc-count-badge">{state.totalSynchronizedLocks}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Contentions:</span>
            <span className={`gc-count-badge ${state.totalContentionEvents > 0 ? "warn" : ""}`}>{state.totalContentionEvents}</span>
          </div>
        </div>
      </div>

      {/* 2. Worker Threads Strip */}
      <div className="chm-threads-row">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Cpu size={14} color="var(--accent)" />
            <span>Concurrent Mutator Threads (Operating Concurrently)</span>
          </div>
        </div>
        <div className="chm-threads-grid">
          {state.threads.map((t) => {
            const isLocking = t.status === "SYNCHRONIZED_LOCKED";
            const isBlocked = t.status === "BLOCKED_ON_BIN";
            const isCas = t.status === "CAS_INSERTING";
            const isHelping = t.status === "HELPING_TRANSFER";

            return (
              <div
                key={t.id}
                className={`chm-thread-badge ${isLocking ? "locking" : isBlocked ? "blocked" : isCas ? "cas" : isHelping ? "helping" : "idle"}`}
              >
                <div className="chm-t-top">
                  <span className="chm-t-name">{t.name}</span>
                  <span className="chm-t-status">{t.status}</span>
                </div>
                <div className="chm-t-bottom">
                  {t.targetBinIndex !== null ? (
                    <span>Target: Bin #{t.targetBinIndex} ({t.targetKey})</span>
                  ) : (
                    <span>Idle</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Striped Bins Table */}
      <div className="chm-bins-container">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Layers size={14} color="var(--accent)" />
            <span>Striped Hash Table Bins: <code>Node&lt;K,V&gt;[] table</code> (synchronized on Bin Head)</span>
          </div>
          <span className="subsystem-meta">
            Locking only the collided bin head leaves all other bins completely lock-free!
          </span>
        </div>

        <div className="chm-bins-grid">
          {state.bins.map((bin) => {
            const isLocked = bin.isLocked;
            const isForwarding = bin.isForwardingNode;
            const isEmpty = bin.nodes.length === 0;

            return (
              <div
                key={bin.index}
                className={`chm-bin-card ${isLocked ? "bin-locked" : isForwarding ? "bin-forwarding" : isEmpty ? "bin-empty" : "bin-occupied"}`}
                onClick={() => setSelectedBin(bin)}
              >
                <div className="bin-card-top">
                  <div className="bin-index-tag">
                    <Hash size={11} />
                    <span>[{bin.index}]</span>
                  </div>
                  <span className={`bin-lock-status ${isLocked ? "locked" : "unlocked"}`}>
                    {isLocked ? (
                      <>
                        <Lock size={10} /> Locked by {bin.lockingThreadId}
                      </>
                    ) : (
                      <>
                        <Unlock size={10} /> Lock-Free
                      </>
                    )}
                  </span>
                </div>

                <div className="bin-contents">
                  {isEmpty ? (
                    <div className="bin-empty-note">
                      <span>Empty (CAS Slot)</span>
                    </div>
                  ) : isForwarding ? (
                    <div className="bin-forwarding-note">
                      <RefreshCw size={12} className="spin-icon" />
                      <span>ForwardingNode (Moved to Next Table)</span>
                    </div>
                  ) : (
                    <div className="bin-nodes-list">
                      {bin.nodes.map((node, nIdx) => (
                        <div key={node.key} className="bin-node-item">
                          <span className="node-head-tag">{nIdx === 0 ? "Bin Head" : "Chain"}</span>
                          <span className="node-entry-str">"{node.key}" &rarr; "{node.value}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Bin Modal */}
      {selectedBin && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedBin(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>ConcurrentHashMap Bin #{selectedBin.index} Inspector</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedBin(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Bin Index:</span>
                  <span className="prop-val highlight">#{selectedBin.index}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Lock Status:</span>
                  <span className={`prop-val ${selectedBin.isLocked ? "danger" : "ok"}`}>
                    {selectedBin.isLocked ? `LOCKED (Holder: ${selectedBin.lockingThreadId})` : "UNLOCKED (Open for concurrent access)"}
                  </span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Bin Structure:</span>
                  <span className="prop-val">{selectedBin.status}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Forwarding Node:</span>
                  <span className="prop-val">{selectedBin.isForwardingNode ? "YES (hash = -1 / MOVED)" : "NO"}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Nodes Count:</span>
                  <span className="prop-val">{selectedBin.nodes.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
