import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  KafkaConsumerGroupState,
} from "../../engines/simulation/kafka-consumer-group";
import {
  Server,
  Layers,
  RefreshCw,
  AlertOctagon,
  ShieldCheck,
} from "lucide-react";

interface KafkaVisualStageProps {
  frame: SimulationStepFrame<KafkaConsumerGroupState>;
}

export function KafkaVisualStage({ frame }: KafkaVisualStageProps) {
  const state = frame.state;

  return (
    <div className="kafka-visual-stage">
      {/* 1. GroupCoordinator Protocol State Banner */}
      <div className={`kafka-protocol-hud state-${state.groupState.toLowerCase()}`}>
        <div className="hud-protocol-status">
          {state.groupState === "Stable" ? (
            <ShieldCheck size={18} color="var(--ok)" />
          ) : (
            <RefreshCw size={18} className="spin-rebalance" color="var(--accent)" />
          )}
          <div>
            <div className="hud-status-title">
              COORDINATOR STATE: <strong>{state.groupState.toUpperCase()}</strong>
            </div>
            <div className="hud-status-desc">
              Topic: <code>{state.topicName}</code> &bull; Group: <code>{state.groupId}</code> &bull; Generation:{" "}
              <code>gen-{state.generationId}</code> &bull; Assignor: <code>{state.assignor}</code>
            </div>
          </div>
        </div>

        {state.stopTheWorldActive && (
          <div className="hud-stw-alert">
            <AlertOctagon size={14} />
            <span>STOP-THE-WORLD ACTIVE (I/O PAUSED)</span>
          </div>
        )}
      </div>

      {/* 2. Main Visual Architecture: Topic Partitions vs Consumer Pods */}
      <div className="kafka-layout-split">
        {/* Left / Upper: Topic Partition Commit Logs */}
        <div className="kafka-panel partitions-panel">
          <div className="kafka-panel-header">
            <div className="panel-title-wrap">
              <Layers size={15} color="var(--accent)" />
              <span>Topic Partitions &amp; Log End Offsets (LEO)</span>
            </div>
            <span className="panel-badge">{state.partitions.length} Partitions</span>
          </div>

          <div className="partitions-log-stack">
            {state.partitions.map((partition) => {
              return (
                <div key={partition.id} className="partition-track-card">
                  <div className="partition-track-header">
                    <div className="part-info">
                      <span className="part-id-badge">P-{partition.id}</span>
                      <span className="part-broker-label">Leader: Broker {partition.leaderBrokerId}</span>
                    </div>

                    <div className="part-owner">
                      {partition.ownerConsumerId ? (
                        <span className="owner-badge active-owner">
                          Assigned to: <strong>{partition.ownerConsumerId}</strong>
                        </span>
                      ) : (
                        <span className="owner-badge unassigned-owner">
                          {partition.revokingFromConsumerId
                            ? `Revoking from ${partition.revokingFromConsumerId}...`
                            : "UNASSIGNED (Awaiting Sync)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Segmented Message Tape */}
                  <div className="message-log-tape">
                    <span className="tape-label">Offsets:</span>
                    <div className="tape-segments-row">
                      {Array.from({ length: Math.max(6, partition.logEndOffset + 1) }).map(
                        (_, offsetIdx) => {
                          const isCommitted = offsetIdx <= partition.committedOffset;
                          const isHw = offsetIdx === partition.highWatermark;
                          const isLeo = offsetIdx === partition.logEndOffset;

                          return (
                            <div
                              key={offsetIdx}
                              className={`offset-block ${
                                offsetIdx < partition.logEndOffset ? "is-message" : "is-empty"
                              } ${isCommitted ? "is-committed" : ""}`}
                              title={`Offset #${offsetIdx} ${isCommitted ? "(Committed)" : ""} ${
                                isHw ? "(High Watermark)" : ""
                              }`}
                            >
                              <span className="offset-num">{offsetIdx}</span>
                              {isHw && <span className="marker-hw" title="High Watermark">HW</span>}
                              {isLeo && <span className="marker-leo" title="Log End Offset">LEO</span>}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="partition-telemetry-row">
                    <span>Committed: <code>{partition.committedOffset}</code></span>
                    <span>High Watermark: <code>{partition.highWatermark}</code></span>
                    <span>Log End: <code>{partition.logEndOffset}</code></span>
                    <span>Lag: <code>{Math.max(0, partition.highWatermark - partition.committedOffset)}</code> msgs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right / Lower: Consumer Group Members */}
        <div className="kafka-panel consumers-panel">
          <div className="kafka-panel-header">
            <div className="panel-title-wrap">
              <Server size={15} color="var(--accent)" />
              <span>Consumer Group Member Pods</span>
            </div>
            <span className="panel-badge">
              Leader: <code>{state.leaderConsumerId || "Electing..."}</code>
            </span>
          </div>

          <div className="consumers-grid">
            {state.consumers.length === 0 ? (
              <div className="empty-consumers-state">No active consumers in group.</div>
            ) : (
              state.consumers.map((consumer) => {
                const isLeader = consumer.id === state.leaderConsumerId;
                const isCrashed = consumer.status === "HEARTBEAT_TIMEOUT";

                return (
                  <div
                    key={consumer.id}
                    className={`consumer-pod-card ${isCrashed ? "pod-crashed" : "pod-active"}`}
                  >
                    <div className="pod-header">
                      <div className="pod-title-wrap">
                        <span className={`pod-status-indicator ${isCrashed ? "status-crashed" : "status-live"}`} />
                        <span className="pod-name">{consumer.id}</span>
                        {isLeader && <span className="pod-leader-badge">LEADER</span>}
                      </div>
                      <span className="pod-status-text">{consumer.status}</span>
                    </div>

                    <div className="pod-body">
                      <div className="pod-metric-row">
                        <span className="pod-metric-lbl">Assigned Partitions:</span>
                        <div className="assigned-partitions-pills">
                          {consumer.assignedPartitions.length === 0 ? (
                            <span className="empty-pills">None</span>
                          ) : (
                            consumer.assignedPartitions.map((pId) => (
                              <span key={pId} className="part-pill">
                                P-{pId}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pod-metric-row">
                        <span className="pod-metric-lbl">Heartbeat:</span>
                        <span className="pod-metric-val">Tick #{consumer.lastHeartbeatTick} (Active)</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
