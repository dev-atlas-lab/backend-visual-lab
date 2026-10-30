import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  PostgresMvccBtreeState,
} from "../../engines/simulation/postgres-mvcc-btree";
import {
  Database,
  Search,
  Eye,
  EyeOff,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

interface PostgresVisualStageProps {
  frame: SimulationStepFrame<PostgresMvccBtreeState>;
}

export function PostgresVisualStage({ frame }: PostgresVisualStageProps) {
  const state = frame.state;

  return (
    <div className="pg-visual-stage">
      {/* 1. Transaction Snapshot & Buffer Pool Telemetry Bar */}
      <div className="pg-telemetry-hud">
        <div className="pg-hud-item">
          <span className="pg-hud-lbl">ISOLATION LEVEL</span>
          <span className="pg-hud-val accent-val">{state.isolationLevel}</span>
        </div>

        <div className="pg-hud-item">
          <span className="pg-hud-lbl">SCAN STRATEGY</span>
          <span className="pg-hud-val">{state.scanType}</span>
        </div>

        <div className="pg-hud-item">
          <span className="pg-hud-lbl">READER SNAPSHOT</span>
          <span className="pg-hud-val">
            <code>txid={state.readerTxId}</code> (ceiling: <code>txid={state.readerSnapshotMaxTx}</code>)
          </span>
        </div>

        <div className="pg-hud-item">
          <span className="pg-hud-lbl">WRITER STATUS</span>
          <span className="pg-hud-val">
            <code>txid={state.writerTxId}</code> &bull;{" "}
            <span className={state.writerCommitted ? "status-committed" : "status-inflight"}>
              {state.writerCommitted ? "COMMITTED" : "IN-FLIGHT (UNCOMMITTED)"}
            </span>
          </span>
        </div>

        <div className="pg-hud-item">
          <span className="pg-hud-lbl">RETURNED VALUE</span>
          <span className="pg-hud-val val-balance">
            {state.returnedBalanceUsd !== null ? `$${state.returnedBalanceUsd}` : "NULL (No scan executed)"}
          </span>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: B-Tree Index vs 8KB Slotted Page */}
      <div className="pg-layout-grid">
        {/* Left Column: B-Tree nbtree Index Traversal */}
        <div className="pg-panel btree-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <Search size={15} color="var(--accent)" />
              <span>B-Tree (nbtree) Index Pages</span>
            </div>
            <span className="panel-badge">Target Key: account_id = {state.targetAccountId}</span>
          </div>

          <div className="btree-nodes-flow">
            {state.btreeNodes.map((node) => (
              <div
                key={node.pageNumber}
                className={`btree-page-card ${node.visitedInCurrentScan ? "is-visited" : ""}`}
              >
                <div className="btree-page-header">
                  <span className="page-lvl-badge">{node.level} Page</span>
                  <span className="page-num">Block #{node.pageNumber}</span>
                  <span className="page-range">{node.keyRangeLabel}</span>
                </div>

                <div className="btree-entries-grid">
                  {node.entries.map((entry, eIdx) => (
                    <div
                      key={eIdx}
                      className={`btree-entry-cell ${
                        entry.key === state.targetAccountId ? "is-match" : ""
                      }`}
                    >
                      <span className="entry-key">Key: <strong>{entry.key}</strong></span>
                      <span className="entry-ctid">
                        &rarr; CTID: <code>{entry.targetCtid}</code>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="btree-footer-hint">
            <span>
              {state.scanType === "SeqScan"
                ? "Notice: Sequential Scan bypasses B-Tree index pages and reads heap directly."
                : "Index Scan traverses B-Tree root -> leaf to resolve target CTID pointer."}
            </span>
          </div>
        </div>

        {/* Right Column: PostgreSQL 8 KB Slotted Page Architecture */}
        <div className="pg-panel slotted-page-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <Database size={15} color="var(--accent)" />
              <span>PostgreSQL 8 KB Slotted Page (Heap Block 0)</span>
            </div>
            <span className="panel-badge">
              Visibility Map: {state.visibilityMapAllVisible ? "ALL_VISIBLE" : "DIRTY"}
            </span>
          </div>

          <div className="slotted-page-container">
            {/* 1. Page Header (pd_lsn, pd_lower, pd_upper) */}
            <div className="page-header-strip">
              <div className="header-meta-item">
                <span className="meta-k">pd_lsn:</span>
                <span className="meta-v">0/16B2408</span>
              </div>
              <div className="header-meta-item">
                <span className="meta-k">pd_checksum:</span>
                <span className="meta-v">0x4a12</span>
              </div>
              <div className="header-meta-item">
                <span className="meta-k">pd_lower (Offset to Free Space):</span>
                <span className="meta-v">byte 32</span>
              </div>
              <div className="header-meta-item">
                <span className="meta-k">pd_upper (Offset to Tuples):</span>
                <span className="meta-v">byte 8048</span>
              </div>
            </div>

            {/* 2. Line Pointer Array (ItemPointers growing DOWNWARDS) */}
            <div className="item-pointers-section">
              <div className="section-label-row">
                <ArrowDown size={12} />
                <span>Line Pointer Array (ItemPointer / Offset Table) grows downward &darr;</span>
              </div>
              <div className="pointers-row">
                {state.heapTuples.map((tuple, idx) => (
                  <div key={tuple.ctid} className="item-pointer-badge">
                    <span className="pointer-idx">#{idx + 1}</span>
                    <span className="pointer-ctid">{tuple.ctid}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Free Space Hole */}
            <div className="page-free-space-hole">
              <span>8,016 Bytes Free Space (pd_lower &rarr; pd_upper)</span>
            </div>

            {/* 4. Heap Tuples (MVCC storage growing UPWARDS) */}
            <div className="heap-tuples-section">
              <div className="section-label-row">
                <ArrowUp size={12} />
                <span>Heap Tuples with MVCC Headers grow upward &uarr;</span>
              </div>

              <div className="tuples-list">
                {state.heapTuples.map((tuple) => (
                  <div
                    key={tuple.ctid}
                    className={`heap-tuple-card ${
                      tuple.isVisibleToReader ? "tuple-visible" : "tuple-dead"
                    }`}
                  >
                    <div className="tuple-header">
                      <div className="tuple-ctid-wrap">
                        <span className="tuple-ctid">CTID: {tuple.ctid}</span>
                        <span className="tuple-acc">Account #{tuple.accountId}</span>
                      </div>

                      <div className="tuple-visibility-badge">
                        {tuple.isVisibleToReader ? (
                          <span className="vis-live">
                            <Eye size={12} /> VISIBLE TO READER
                          </span>
                        ) : (
                          <span className="vis-dead">
                            <EyeOff size={12} /> INVISIBLE / DEAD
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="tuple-body">
                      <div className="tuple-field-row">
                        <span className="f-lbl">xmin (Created Tx):</span>
                        <span className="f-val">
                          <code>txid={tuple.xmin}</code>
                        </span>
                        <span className="f-lbl">xmax (Deleted Tx):</span>
                        <span className="f-val">
                          <code>{tuple.xmax !== null ? `txid=${tuple.xmax}` : "0 (Live Tuple)"}</code>
                        </span>
                      </div>

                      <div className="tuple-payload-row">
                        <span className="f-lbl">Tuple Data (balance_usd):</span>
                        <span className="payload-balance">
                          <strong>${tuple.balanceUsd}</strong>
                        </span>
                      </div>

                      <div className="tuple-reason-row">
                        <span className="reason-text">&bull; MVCC Evaluation: {tuple.visibilityReason}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
