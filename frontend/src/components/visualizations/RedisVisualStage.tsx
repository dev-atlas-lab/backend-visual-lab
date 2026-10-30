import type { SimulationStepFrame } from "../../engines/simulation/types";
import type {
  RedisStampedeState,
} from "../../engines/simulation/redis-stampede";
import {
  Zap,
  Database,
  Lock,
  Unlock,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface RedisVisualStageProps {
  frame: SimulationStepFrame<RedisStampedeState>;
}

export function RedisVisualStage({ frame }: RedisVisualStageProps) {
  const state = frame.state;

  const ttlPercent = Math.max(0, Math.min(100, (state.ttlRemainingMs / 300) * 100));
  const poolPercent = Math.round((state.dbActiveConnections / state.dbMaxPoolSize) * 100);
  const isPoolSaturated = state.dbActiveConnections >= state.dbMaxPoolSize;

  return (
    <div className="redis-visual-stage">
      {/* 1. Global Strategy & Telemetry Strip */}
      <div className="redis-telemetry-hud">
        <div className="hud-metric-cell">
          <span className="hud-metric-lbl">STAMPEDE MITIGATION STRATEGY</span>
          <span className="hud-metric-val strategy-val">
            <code>{state.strategy}</code>
          </span>
        </div>

        <div className="hud-metric-cell">
          <span className="hud-metric-lbl">CACHE HIT RATIO</span>
          <span className="hud-metric-val">
            {state.totalCacheHits + state.totalCacheMisses > 0
              ? `${Math.round(
                  (state.totalCacheHits / (state.totalCacheHits + state.totalCacheMisses)) * 100
                )}% (${state.totalCacheHits} hits / ${state.totalCacheMisses} misses)`
              : "100% (Warm Cache)"}
          </span>
        </div>

        <div className="hud-metric-cell">
          <span className="hud-metric-lbl">TOTAL DB QUERIES FIRED</span>
          <span className="hud-metric-val">{state.totalDbQueriesExecuted} Queries</span>
        </div>

        <div className="hud-metric-cell">
          <span className="hud-metric-lbl">HIKARICP DB POOL SATURATION</span>
          <span className={`hud-metric-val ${isPoolSaturated ? "pool-alert" : ""}`}>
            {state.dbActiveConnections} / {state.dbMaxPoolSize} Connections ({poolPercent}%)
          </span>
        </div>
      </div>

      {isPoolSaturated && (
        <div className="redis-stampede-warning">
          <AlertTriangle size={18} />
          <span>
            <strong>CACHE STAMPEDE COLLAPSE: Database Connection Pool Exhausted!</strong> All {state.dbMaxPoolSize} HikariCP connections are tied up recomputing the identical hot key concurrently.
          </span>
        </div>
      )}

      {/* 2. Main Two-Column Layout: Redis Memory Key vs Database Connection Pool */}
      <div className="redis-layout-grid">
        {/* Left Column: Redis In-Memory Key & TTL Countdown */}
        <div className="redis-panel keyspace-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <Zap size={15} color="var(--accent)" />
              <span>Redis In-Memory Key Store (Active Keyspace)</span>
            </div>
            <span className={`status-pill pill-${state.keyStatus.toLowerCase()}`}>
              {state.keyStatus}
            </span>
          </div>

          <div className="key-record-card">
            <div className="key-card-topbar">
              <div className="key-identity">
                <span className="key-prefix">STRING</span>
                <span className="key-name">{state.key}</span>
              </div>
              <span className="key-version">Version: #{state.cachedVersion}</span>
            </div>

            {/* Visual TTL Progress Bar */}
            <div className="ttl-bar-section">
              <div className="ttl-header">
                <span className="ttl-title">
                  <Clock size={12} /> Time-To-Live (TTL): <strong>{state.ttlRemainingMs} ms remaining</strong>
                </span>
                <span className="ttl-percent">{Math.round(ttlPercent)}%</span>
              </div>

              <div className="ttl-progress-track">
                <div
                  className={`ttl-progress-fill ${
                    state.ttlRemainingMs === 0 ? "fill-expired" : "fill-active"
                  }`}
                  style={{ width: `${ttlPercent}%` }}
                />
              </div>
            </div>

            {/* Mutex Singleflight Lock Status */}
            <div className="mutex-lock-box">
              <div className="lock-header">
                {state.lockOwnerWorkerId ? (
                  <Lock size={14} color="var(--accent)" />
                ) : (
                  <Unlock size={14} color="var(--ok)" />
                )}
                <span className="lock-title">Singleflight Mutex Lock:</span>
                <span className={`lock-status ${state.lockOwnerWorkerId ? "is-held" : "is-free"}`}>
                  {state.lockOwnerWorkerId ? "HELD BY LEADER" : "FREE / UNLOCKED"}
                </span>
              </div>

              <div className="lock-meta">
                <span>Owner: <code>{state.lockOwnerWorkerId || "None"}</code></span>
                <span>Fencing Token: <code>#{state.lockFencingToken}</code></span>
              </div>
            </div>
          </div>

          {/* Concurrent Reader Worker Threads */}
          <div className="workers-list-section">
            <div className="workers-header">
              <Users size={14} color="var(--accent)" />
              <span>Concurrent Inbound Client Requests ({state.workers.length} Threads)</span>
            </div>

            <div className="workers-grid">
              {state.workers.map((w) => (
                <div key={w.id} className={`worker-thread-card state-${w.state.toLowerCase()}`}>
                  <div className="worker-top">
                    <span className="worker-id">{w.id}</span>
                    <span className="worker-state-badge">{w.state}</span>
                  </div>
                  <div className="worker-latency">Latency: {w.latencyMs} ms</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Database Connection Pool & Origin Store */}
        <div className="redis-panel db-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <Database size={15} color="var(--accent)" />
              <span>PostgreSQL Origin Database &amp; HikariCP Pool</span>
            </div>
            <span className="panel-badge">Max Pool: {state.dbMaxPoolSize} Connections</span>
          </div>

          <div className="db-pool-visualizer">
            <div className="pool-dial-header">
              <span>Active Connection Slots</span>
              <span className="pool-count">
                {state.dbActiveConnections} / {state.dbMaxPoolSize} Active
              </span>
            </div>

            <div className="pool-slots-grid">
              {Array.from({ length: state.dbMaxPoolSize }).map((_, slotIdx) => {
                const isActive = slotIdx < state.dbActiveConnections;

                return (
                  <div
                    key={slotIdx}
                    className={`pool-slot-cell ${isActive ? "slot-busy" : "slot-idle"}`}
                  >
                    <span className="slot-num">Conn #{slotIdx + 1}</span>
                    <span className="slot-status">{isActive ? "BUSY (Querying)" : "IDLE (In Pool)"}</span>
                  </div>
                );
              })}
            </div>

            <div className="db-metrics-panel">
              <div className="metric-row">
                <span>Database Query Cost:</span>
                <code>150 ms per query execution</code>
              </div>
              <div className="metric-row">
                <span>Total Queries Fired:</span>
                <code>{state.totalDbQueriesExecuted} queries</code>
              </div>
              <div className="metric-row">
                <span>Connection Pool Starvation:</span>
                <code>{isPoolSaturated ? "YES (Stampede Hazard)" : "No (Healthy Capacity)"}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
