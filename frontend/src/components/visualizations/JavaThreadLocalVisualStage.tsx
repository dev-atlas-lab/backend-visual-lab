import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaThreadLocalState,
  ThreadLocalEntry,
} from "../../engines/simulation/java-threadlocal";
import {
  AlertTriangle,
  Layers,
  Database,
  ShieldCheck,
  Info,
  Server,
} from "lucide-react";

interface JavaThreadLocalVisualStageProps {
  frame: SimulationStepFrame<JavaThreadLocalState>;
}

export function JavaThreadLocalVisualStage({ frame }: JavaThreadLocalVisualStageProps) {
  const state = frame.state;
  const [selectedEntry, setSelectedEntry] = useState<ThreadLocalEntry | null>(null);

  return (
    <div className="jvm-visual-stage threadlocal-visual-stage">
      {/* 1. Global Telemetry Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">HEAP LEAK RETENTION</span>
          <div className="jvm-progress-track">
            <div
              className={`jvm-progress-fill ${state.totalLeakedMb > 0 ? "oldgen-fill" : "eden-fill"}`}
              style={{ width: `${Math.min(100, (state.totalLeakedMb / 200) * 100)}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            <strong>{state.totalLeakedMb} MB</strong> leaked in ThreadLocalMap
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">STALE ENTRIES (KEY == NULL)</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            {state.staleEntriesCount} orphan entries held by pooled threads
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">SIMULATION MODE</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
            {state.mode}
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">GC Sweeps:</span>
            <span className="gc-count-badge">{state.gcRunsCount}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Requests:</span>
            <span className="gc-count-badge" style={{ color: "var(--ok)" }}>{state.requestsProcessed}</span>
          </div>
        </div>
      </div>

      {/* Memory Leak Alert Banner */}
      {state.memoryLeakAlert && (
        <div className="jvm-oom-alert threadlocal-leak-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>CRITICAL THREADLOCAL LEAK DETECTED!</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "var(--text-xs)", opacity: 0.9 }}>
              The ThreadLocal WeakReference key was garbage collected (<code>key == null</code>), but the heavy value payload is permanently pinned in the pooled worker thread's <code>ThreadLocalMap</code>! Without explicit <code>remove()</code>, this leads directly to <code>OutOfMemoryError</code>.
            </p>
          </div>
        </div>
      )}

      {/* 2. Worker Threads & ThreadLocalMap Table */}
      <div className="threadlocal-workers-grid">
        {state.workers.map((worker) => (
          <div key={worker.id} className="worker-threadlocal-card">
            <div className="worker-card-header">
              <div className="worker-header-title">
                <Server size={14} color="var(--accent)" />
                <span className="worker-name">{worker.name}</span>
                <span className="pooled-tag">Tomcat Pool Worker</span>
              </div>
              <span className="current-request-badge">
                {worker.currentRequestId ? `Req: ${worker.currentRequestId}` : "Idle between requests"}
              </span>
            </div>

            {/* Internal Thread.threadLocals Map Representation */}
            <div className="threadlocal-map-box">
              <div className="map-box-title">
                <Database size={13} color="var(--accent)" />
                <span>Internal <code>ThreadLocal.ThreadLocalMap</code> Table</span>
              </div>

              {worker.threadLocalsTable.length === 0 ? (
                <div className="empty-subsystem-state">
                  No ThreadLocal entries active for this thread. Map is empty or clean.
                </div>
              ) : (
                <div className="map-entries-table">
                  <div className="entries-table-header">
                    <span>Slot</span>
                    <span>Key (WeakReference)</span>
                    <span>Value Payload (Strong Ref)</span>
                    <span>Hazard Status</span>
                  </div>

                  {worker.threadLocalsTable.map((entry) => {
                    const isLeaked = entry.isKeyCleared;
                    return (
                      <div
                        key={entry.slotIndex}
                        className={`entry-table-row ${isLeaked ? "stale-leaked" : "healthy"}`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <span className="slot-num">#{entry.slotIndex}</span>
                        <div className="key-ref-cell">
                          {entry.isKeyCleared ? (
                            <span className="key-cleared-badge">null (GC Cleared!)</span>
                          ) : (
                            <span className="key-active-badge">
                              {entry.threadLocalKeyName}
                              {entry.hasStrongRefToKey ? " (Strong in Scope)" : " (Weak Ref Only)"}
                            </span>
                          )}
                        </div>
                        <div className="val-ref-cell">
                          <span className="payload-name">{entry.valuePayload}</span>
                          <span className="payload-size">({entry.valueSizeMb} MB)</span>
                        </div>
                        <div className="hazard-cell">
                          {isLeaked ? (
                            <span className="hazard-badge-leak">
                              <AlertTriangle size={11} /> LEAKING VALUE!
                            </span>
                          ) : (
                            <span className="hazard-badge-ok">
                              <ShieldCheck size={11} /> Retained Safely
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Reference Types Educational Explainer (Strong vs Soft vs Weak vs Phantom) */}
      <div className="ref-types-explainer-bar">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Layers size={14} color="var(--accent)" />
            <span>Java Reference Strengths: Why WeakReference Alone Cannot Prevent Memory Leaks</span>
          </div>
        </div>
        <div className="ref-cards-row">
          <div className="ref-mini-card">
            <span className="ref-kind strong">Strong Reference</span>
            <p><code>Object o = new Object()</code>. Never collected by GC as long as strongly reachable.</p>
          </div>
          <div className="ref-mini-card">
            <span className="ref-kind soft">SoftReference</span>
            <p>Collected only before OutOfMemoryError under high heap pressure. Used for memory-sensitive caches.</p>
          </div>
          <div className="ref-mini-card highlight">
            <span className="ref-kind weak">WeakReference</span>
            <p>Collected on every Minor/Major GC sweep when no strong references remain. Used by <code>ThreadLocalMap.Entry</code>.</p>
          </div>
          <div className="ref-mini-card">
            <span className="ref-kind phantom">PhantomReference</span>
            <p>Enqueued after object is finalized. Used with ReferenceQueue for direct memory cleanup.</p>
          </div>
        </div>
      </div>

      {/* Selected Entry Inspector Modal */}
      {selectedEntry && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedEntry(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>ThreadLocalMap.Entry Inspector</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedEntry(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Table Slot Index:</span>
                  <span className="prop-val highlight">#{selectedEntry.slotIndex}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Key (WeakReference):</span>
                  <span className={`prop-val ${selectedEntry.isKeyCleared ? "danger" : "highlight"}`}>
                    {selectedEntry.isKeyCleared ? "null (Garbage Collected!)" : selectedEntry.threadLocalKeyName}
                  </span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Value Payload:</span>
                  <span className="prop-val">{selectedEntry.valuePayload} ({selectedEntry.valueSizeMb} MB)</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Lifecycle Hazard:</span>
                  <span className="prop-val">
                    {selectedEntry.isKeyCleared
                      ? "STALE ENTRY: The key reference was collected because the calling method ended, but the Entry object and Value object remain anchored in the Thread.threadLocals map until explicit threadLocal.remove() or expungeStaleEntry() is called."
                      : "ACTIVE ENTRY: Strong reference to the ThreadLocal variable still exists in caller stack."}
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
