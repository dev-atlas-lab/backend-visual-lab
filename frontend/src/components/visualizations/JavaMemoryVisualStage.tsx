import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaMemoryGcState,
  JavaHeapObject,
} from "../../engines/simulation/java-memory-gc";
import {
  Layers,
  Box,
  Cpu,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface JavaMemoryVisualStageProps {
  frame: SimulationStepFrame<JavaMemoryGcState>;
}

export function JavaMemoryVisualStage({ frame }: JavaMemoryVisualStageProps) {
  const state = frame.state;
  const [selectedObject, setSelectedObject] = useState<JavaHeapObject | null>(null);

  const edenOccupied = state.youngEden.length;
  const edenPercent = Math.round((edenOccupied / state.edenCapacity) * 100);

  const activeSurvivorObjects = state.activeSurvivor === 0 ? state.youngS0 : state.youngS1;
  const survivorPercent = Math.round((activeSurvivorObjects.length / state.survivorCapacity) * 100);

  const oldGenOccupied = state.oldGen.length;
  const oldGenPercent = Math.round((oldGenOccupied / state.oldGenCapacity) * 100);

  return (
    <div className="jvm-visual-stage">
      {/* 1. Global JVM Memory Architecture Telemetry Bar */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">EDEN SPACE</span>
          <div className="jvm-progress-track">
            <div
              className="jvm-progress-fill eden-fill"
              style={{ width: `${Math.min(100, edenPercent)}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {edenOccupied} / {state.edenCapacity} slots ({edenPercent}%)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">ACTIVE SURVIVOR (S{state.activeSurvivor})</span>
          <div className="jvm-progress-track">
            <div
              className="jvm-progress-fill survivor-fill"
              style={{ width: `${Math.min(100, survivorPercent)}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {activeSurvivorObjects.length} / {state.survivorCapacity} slots ({survivorPercent}%)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">OLD GEN (TENURED)</span>
          <div className="jvm-progress-track">
            <div
              className="jvm-progress-fill oldgen-fill"
              style={{ width: `${Math.min(100, oldGenPercent)}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {oldGenOccupied} / {state.oldGenCapacity} slots ({oldGenPercent}%)
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">Minor GC:</span>
            <span className="gc-count-badge">{state.minorGcCount}</span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Major GC:</span>
            <span className="gc-count-badge warn">{state.majorGcCount}</span>
          </div>
        </div>
      </div>

      {state.isOutOfMemory && (
        <div className="jvm-oom-alert">
          <AlertTriangle size={16} />
          <span>
            <strong>java.lang.OutOfMemoryError: Java heap space!</strong> Tenured space is saturated and cannot accommodate new object promotions.
          </span>
        </div>
      )}

      {/* 2. Main Two-Column Architectural Blueprint: Stack vs Heap */}
      <div className="jvm-architecture-grid">
        {/* Left: JVM Thread Call Stack */}
        <div className="jvm-subsystem-box stack-subsystem">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Layers size={15} color="var(--accent)" />
              <span>JVM Thread Call Stack</span>
            </div>
            <span className="subsystem-meta">
              {state.threadStack.length} {state.threadStack.length === 1 ? "Frame" : "Frames"} (Top of Stack)
            </span>
          </div>

          <div className="stack-frames-list">
            {state.threadStack.length === 0 ? (
              <div className="empty-subsystem-state">Stack is empty. No active methods.</div>
            ) : (
              state.threadStack.map((frame, fIdx) => (
                <div key={frame.id} className="stack-frame-card">
                  <div className="frame-card-header">
                    <span className="frame-icon-badge">#{fIdx + 1}</span>
                    <span className="frame-method-name">{frame.methodName}()</span>
                    <span className="frame-tag">Stack Frame</span>
                  </div>

                  <div className="frame-variables-table">
                    <div className="var-table-heading">
                      <span>Variable / Reference</span>
                      <span>Value / Pointer</span>
                    </div>
                    {frame.localReferences.length === 0 ? (
                      <div className="var-empty">No local variables allocated</div>
                    ) : (
                      frame.localReferences.map((ref, rIdx) => (
                        <div key={rIdx} className="var-table-row">
                          <span className="var-name">
                            {ref.isPrimitive ? "primitive" : "ref"} <code>{ref.varName}</code>
                          </span>
                          <span className="var-target">
                            {ref.isPrimitive ? (
                              <span className="var-val-primitive">{String(ref.primitiveValue)}</span>
                            ) : (
                              <span className="var-val-pointer">
                                <ArrowRight size={11} /> @{ref.targetHeapId || "null"}
                              </span>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: JVM Generational Managed Heap */}
        <div className="jvm-subsystem-box heap-subsystem">
          <div className="subsystem-header">
            <div className="subsystem-title">
              <Cpu size={15} color="var(--accent)" />
              <span>JVM Shared Heap (Generational Layout)</span>
            </div>
            <span className="subsystem-meta">Tenuring Threshold: {state.tenuringThreshold} Minor GCs</span>
          </div>

          <div className="heap-spaces-stack">
            {/* Space A: Eden Space */}
            <div className="heap-region-section eden-section">
              <div className="region-header">
                <span className="region-name">Young Gen: Eden Space</span>
                <span className="region-capacity">
                  {edenOccupied}/{state.edenCapacity} Slots Used
                </span>
              </div>
              <div className="slots-grid">
                {Array.from({ length: state.edenCapacity }).map((_, slotIdx) => {
                  const obj = state.youngEden[slotIdx];
                  return (
                    <MemorySlotCard
                      key={slotIdx}
                      index={slotIdx}
                      object={obj}
                      tenuringThreshold={state.tenuringThreshold}
                      onSelectObject={setSelectedObject}
                    />
                  );
                })}
              </div>
            </div>

            {/* Space B: Dual Survivor Spaces S0 & S1 */}
            <div className="survivors-dual-grid">
              {/* S0 Space */}
              <div
                className={`heap-region-section survivor-section ${
                  state.activeSurvivor === 0 ? "is-active-from" : "is-inactive-to"
                }`}
              >
                <div className="region-header">
                  <span className="region-name">
                    Survivor S0 {state.activeSurvivor === 0 ? "(FROM - Active)" : "(TO - Empty)"}
                  </span>
                  <span className="region-capacity">{state.youngS0.length}/{state.survivorCapacity}</span>
                </div>
                <div className="slots-grid-compact">
                  {Array.from({ length: state.survivorCapacity }).map((_, slotIdx) => {
                    const obj = state.youngS0[slotIdx];
                    return (
                      <MemorySlotCard
                        key={slotIdx}
                        index={slotIdx}
                        object={obj}
                        tenuringThreshold={state.tenuringThreshold}
                        onSelectObject={setSelectedObject}
                      />
                    );
                  })}
                </div>
              </div>

              {/* S1 Space */}
              <div
                className={`heap-region-section survivor-section ${
                  state.activeSurvivor === 1 ? "is-active-from" : "is-inactive-to"
                }`}
              >
                <div className="region-header">
                  <span className="region-name">
                    Survivor S1 {state.activeSurvivor === 1 ? "(FROM - Active)" : "(TO - Empty)"}
                  </span>
                  <span className="region-capacity">{state.youngS1.length}/{state.survivorCapacity}</span>
                </div>
                <div className="slots-grid-compact">
                  {Array.from({ length: state.survivorCapacity }).map((_, slotIdx) => {
                    const obj = state.youngS1[slotIdx];
                    return (
                      <MemorySlotCard
                        key={slotIdx}
                        index={slotIdx}
                        object={obj}
                        tenuringThreshold={state.tenuringThreshold}
                        onSelectObject={setSelectedObject}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Space C: Old Generation (Tenured) */}
            <div className="heap-region-section oldgen-section">
              <div className="region-header">
                <span className="region-name">Old Gen: Tenured Space</span>
                <span className="region-capacity">
                  {oldGenOccupied}/{state.oldGenCapacity} Promoted
                </span>
              </div>
              <div className="slots-grid">
                {Array.from({ length: state.oldGenCapacity }).map((_, slotIdx) => {
                  const obj = state.oldGen[slotIdx];
                  return (
                    <MemorySlotCard
                      key={slotIdx}
                      index={slotIdx}
                      object={obj}
                      tenuringThreshold={state.tenuringThreshold}
                      isOldGen
                      onSelectObject={setSelectedObject}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Object Inspector Dialog (Appears on clicking any memory block) */}
      {selectedObject && (
        <div className="object-inspector-modal" role="dialog" aria-label="Object Details">
          <div className="inspector-modal-content">
            <div className="inspector-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Box size={18} color="var(--accent)" />
                <h3 className="inspector-modal-title">
                  Object: {selectedObject.className} <code>@{selectedObject.id}</code>
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-close"
                onClick={() => setSelectedObject(null)}
                aria-label="Close Inspector"
              >
                &times;
              </button>
            </div>

            <div className="inspector-modal-body">
              <div className="inspector-field-row">
                <span className="field-lbl">GC Roots Reachability:</span>
                <span className="field-val">
                  {selectedObject.isRootReachable ? (
                    <span className="status-badge status-live">
                      <CheckCircle size={13} /> Live (Reachable from Stack Frame)
                    </span>
                  ) : (
                    <span className="status-badge status-dead">
                      <XCircle size={13} /> Unreachable (Eligible for GC sweep)
                    </span>
                  )}
                </span>
              </div>

              <div className="inspector-field-row">
                <span className="field-lbl">Object Age (Tenuring Counter):</span>
                <span className="field-val">
                  <code>{selectedObject.tenuringAge} / {state.tenuringThreshold}</code> Minor GCs
                </span>
              </div>

              <div className="inspector-field-row">
                <span className="field-lbl">Heap Memory Footprint:</span>
                <span className="field-val">
                  <code>{selectedObject.sizeBytes} bytes</code> (Object Header: 12B Mark/Klass + Payload)
                </span>
              </div>

              <div className="inspector-field-row">
                <span className="field-lbl">HotSpot 64-bit Header:</span>
                <span className="field-val">
                  Mark Word: <code>0x0000000000000001 (Unlocked)</code> | Klass: <code>{selectedObject.className}.class</code>
                </span>
              </div>
            </div>

            <div className="inspector-modal-footer">
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Tip: Click outside or press close to dismiss this inspector.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedObject(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual memory slot card inside Eden, Survivor, or Old Gen.
 */
function MemorySlotCard({
  index,
  object,
  tenuringThreshold,
  isOldGen,
  onSelectObject,
}: {
  index: number;
  object?: JavaHeapObject;
  tenuringThreshold: number;
  isOldGen?: boolean;
  onSelectObject: (obj: JavaHeapObject) => void;
}) {
  if (!object) {
    return (
      <div className="memory-slot empty-slot">
        <span className="slot-index">Slot #{index}</span>
        <span className="slot-empty-label">Empty</span>
      </div>
    );
  }

  const isLive = object.isRootReachable;

  return (
    <button
      type="button"
      className={`memory-slot occupied-slot ${isLive ? "slot-live" : "slot-orphan"} ${
        isOldGen ? "slot-oldgen" : ""
      }`}
      onClick={() => onSelectObject(object)}
      title={`Click to inspect ${object.className} (@${object.id})`}
    >
      <div className="slot-top-row">
        <span className="slot-class-name">
          <Box size={11} /> {object.className}
        </span>
        <span className={`reachability-pill ${isLive ? "pill-live" : "pill-dead"}`}>
          {isLive ? "LIVE" : "DEAD"}
        </span>
      </div>

      <div className="slot-meta-row">
        <span className="slot-id">@{object.id}</span>
        <span className="slot-age">
          Age: {object.tenuringAge}/{tenuringThreshold}
        </span>
      </div>

      <div className="slot-bytes">{object.sizeBytes} B</div>
    </button>
  );
}
