import { useState } from "react";
import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  JavaHashMapState,
  HashMapNode,
} from "../../engines/simulation/java-hashmap";
import {
  Hash,
  Binary,
  Layers,
  GitBranch,
  Info,
} from "lucide-react";

interface JavaHashMapVisualStageProps {
  frame: SimulationStepFrame<JavaHashMapState>;
}

export function JavaHashMapVisualStage({ frame }: JavaHashMapVisualStageProps) {
  const state = frame.state;
  const [selectedNode, setSelectedNode] = useState<HashMapNode | null>(null);

  const loadPercent = Math.min(100, Math.round((state.size / state.capacity) * 100));
  const isNearThreshold = state.size >= state.threshold;

  return (
    <div className="jvm-visual-stage hashmap-visual-stage">
      {/* 1. Hash Telemetry & Capacity Strip */}
      <div className="jvm-telemetry-strip">
        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">TABLE OCCUPANCY (SIZE / CAP)</span>
          <div className="jvm-progress-track">
            <div
              className={`jvm-progress-fill ${isNearThreshold ? "oldgen-fill" : "eden-fill"}`}
              style={{ width: `${loadPercent}%` }}
            />
          </div>
          <span className="jvm-telemetry-val">
            {state.size} / {state.capacity} entries ({loadPercent}%)
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">RESIZE THRESHOLD (0.75x)</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            Capacity {state.capacity} &times; 0.75 = <strong>{state.threshold}</strong>
          </span>
        </div>

        <div className="jvm-telemetry-item">
          <span className="jvm-telemetry-label">TREEIFY THRESHOLD</span>
          <span className="jvm-telemetry-val" style={{ fontFamily: "var(--font-mono)" }}>
            &ge; {state.treeifyThreshold} nodes / bucket (Min Cap: {state.minTreeifyCapacity})
          </span>
        </div>

        <div className="jvm-telemetry-item counters-item">
          <div className="jvm-gc-count">
            <span className="gc-count-label">Collisions:</span>
            <span className={`gc-count-badge ${state.totalCollisions > 0 ? "warn" : ""}`}>
              {state.totalCollisions}
            </span>
          </div>
          <div className="jvm-gc-count">
            <span className="gc-count-label">Treeified Bins:</span>
            <span className="gc-count-badge" style={{ color: "var(--accent)" }}>
              {state.treeifiedBucketsCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Bitwise Perturbation & Index Calculation Breakdown Banner */}
      {state.lastOperationDetails ? (
        <div className="hash-calculation-banner">
          <div className="calc-banner-title">
            <Binary size={14} color="var(--accent)" />
            <span>OpenJDK Bitwise Hash Perturbation: <code>(h ^ (h &gt;&gt;&gt; 16)) &amp; (n - 1)</code></span>
          </div>
          <div className="calc-breakdown-grid">
            <div className="calc-step-cell">
              <span className="calc-step-tag">1. Raw hashCode()</span>
              <code className="calc-step-val">
                key="{state.lastOperationDetails.key}" &rarr; 0x{state.lastOperationDetails.rawHashCode.toString(16).toUpperCase()}
              </code>
            </div>
            <div className="calc-step-cell">
              <span className="calc-step-tag">2. Spread Perturbation (h ^ h &gt;&gt;&gt; 16)</span>
              <code className="calc-step-val">
                spread = 0x{state.lastOperationDetails.spreadHash.toString(16).toUpperCase()}
              </code>
            </div>
            <div className="calc-step-cell">
              <span className="calc-step-tag">3. Power-of-Two Index Mask</span>
              <code className="calc-step-val highlight-val">
                {state.lastOperationDetails.spreadHash} &amp; ({state.capacity} - 1) = Bucket #{state.lastOperationDetails.targetIndex}
              </code>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Buckets Table Array (Node<K,V>[] table) */}
      <div className="hashmap-table-container">
        <div className="subsystem-header">
          <div className="subsystem-title">
            <Layers size={15} color="var(--accent)" />
            <span>HashMap Internal Bucket Array: <code>Node&lt;K,V&gt;[] table</code> (Length: {state.capacity})</span>
          </div>
          <span className="subsystem-meta">
            Click any bucket or node to inspect internal pointers
          </span>
        </div>

        <div className="hashmap-buckets-grid">
          {state.buckets.map((bucket) => {
            const isTree = bucket.mode === "RED_BLACK_TREE";
            const isCollided = bucket.nodes.length > 1;
            const isEmpty = bucket.nodes.length === 0;

            return (
              <div
                key={bucket.index}
                className={`hashmap-bucket-card ${
                  isTree
                    ? "mode-tree"
                    : isCollided
                    ? "mode-collided"
                    : isEmpty
                    ? "mode-empty"
                    : "mode-single"
                }`}
              >
                <div className="bucket-card-top">
                  <div className="bucket-index-pill">
                    <Hash size={11} />
                    <span>[{bucket.index}]</span>
                  </div>
                  <span className={`bucket-mode-badge mode-${bucket.mode.toLowerCase()}`}>
                    {isTree ? "R-B Tree" : isCollided ? `Chain (${bucket.nodes.length})` : isEmpty ? "null" : "Single"}
                  </span>
                </div>

                {/* Bucket Contents: Chain or Tree */}
                <div className="bucket-nodes-flow">
                  {isEmpty ? (
                    <div className="bucket-null-placeholder">null</div>
                  ) : isTree ? (
                    <div className="bucket-tree-view">
                      <div className="tree-root-tag">
                        <GitBranch size={12} color="var(--accent)" />
                        <span>TreeNode Root</span>
                      </div>
                      <div className="tree-nodes-cluster">
                        {bucket.nodes.map((node, nIdx) => (
                          <button
                            key={node.key}
                            type="button"
                            className={`tree-node-pill ${selectedNode?.key === node.key ? "selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(node);
                            }}
                            title={`Key: ${node.key}, Value: ${node.value}`}
                          >
                            <span className="tree-node-color-dot" style={{ backgroundColor: nIdx % 2 === 0 ? "var(--text-primary)" : "var(--danger)" }} />
                            <span className="tree-node-key">{node.key}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bucket-chain-list">
                      {bucket.nodes.map((node, nIdx) => (
                        <div key={node.key} className="chain-node-wrapper">
                          <button
                            type="button"
                            className={`chain-node-pill ${selectedNode?.key === node.key ? "selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(node);
                            }}
                          >
                            <span className="chain-node-key">{node.key}</span>
                            <span className="chain-node-arrow">&rarr;</span>
                            <span className="chain-node-val">{node.value}</span>
                          </button>
                          {nIdx < bucket.nodes.length - 1 ? (
                            <span className="chain-pointer-arrow">&darr;</span>
                          ) : (
                            <span className="chain-null-terminator">&darr; null</span>
                          )}
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

      {/* 4. Inspection Modal for Selected Node or Bucket */}
      {selectedNode && (
        <div className="jvm-object-modal-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="jvm-object-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={16} color="var(--accent)" />
                <span>Node&lt;K,V&gt; Internal Inspector</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedNode(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-prop">
                  <span className="prop-name">Key (K):</span>
                  <span className="prop-val highlight">"{selectedNode.key}"</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Value (V):</span>
                  <span className="prop-val">"{selectedNode.value}"</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Target Bucket Index:</span>
                  <span className="prop-val highlight">#{selectedNode.bucketIndex}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Raw hashCode:</span>
                  <span className="prop-val">{selectedNode.rawHashCode} (0x{selectedNode.rawHashCode.toString(16)})</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Spread Hash (h ^ h&gt;&gt;&gt;16):</span>
                  <span className="prop-val">{selectedNode.spreadHash}</span>
                </div>
                <div className="modal-prop">
                  <span className="prop-name">Formula Verification:</span>
                  <span className="prop-val">
                    {selectedNode.spreadHash} &amp; ({state.capacity} - 1) = {selectedNode.bucketIndex}
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
