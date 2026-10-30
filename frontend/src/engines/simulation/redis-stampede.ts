import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type RedisStampedeStrategy =
  | "naive-cache-aside"
  | "mutex-singleflight-lock"
  | "logical-ttl-early-refresh";

export type RedisKeyStatus =
  | "VALID_HOT"
  | "EXPIRED_MISS"
  | "RECOMPUTING_IN_DB"
  | "LOGICAL_EXPIRED_SERVE_STALE";

export interface RedisWorkerState {
  id: string;
  state:
    | "IDLE"
    | "CACHE_HIT"
    | "CACHE_MISS_QUERYING_DB"
    | "ACQUIRED_LOCK_QUERYING_DB"
    | "WAITING_ON_LOCK"
    | "SERVED_STALE_ASYNC_REFRESH";
  latencyMs: number;
}

export interface RedisSimulationConfig {
  key: string;
  initialTtlMs: number;
  concurrentWorkers: number;
  strategy: RedisStampedeStrategy;
  dbQueryCostMs: number;
  dbMaxPoolSize: number;
}

export interface RedisStampedeState {
  key: string;
  strategy: RedisStampedeStrategy;
  keyStatus: RedisKeyStatus;
  ttlRemainingMs: number;
  cachedVersion: number;
  lockOwnerWorkerId: string | null;
  lockFencingToken: number;
  dbActiveConnections: number;
  dbMaxPoolSize: number;
  workers: RedisWorkerState[];
  totalCacheHits: number;
  totalCacheMisses: number;
  totalDbQueriesExecuted: number;
}

export type RedisSimulationCommand =
  | { type: "TICK_DECREMENT_TTL"; ms: number }
  | { type: "EXPIRE_TTL_IMMEDIATELY" }
  | { type: "BURST_CONCURRENT_READS" }
  | { type: "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE" }
  | { type: "SWITCH_STRATEGY"; strategy: RedisStampedeStrategy };

function evaluateInvariants(state: RedisStampedeState): SimulationInvariantCheck[] {
  const dbOverloaded = state.dbActiveConnections > state.dbMaxPoolSize;
  const stampedeFree =
    state.strategy === "naive-cache-aside"
      ? state.dbActiveConnections <= 1
      : state.dbActiveConnections <= 1;

  return [
    {
      id: "postgres-connection-pool-safety",
      label: "PostgreSQL Connection Pool Boundary",
      passed: !dbOverloaded,
      detail: !dbOverloaded
        ? `Concurrent DB connections (${state.dbActiveConnections}) within safety boundary (<= ${state.dbMaxPoolSize}).`
        : `DB POOL EXHAUSTION: ${state.dbActiveConnections} concurrent queries exceeded max pool size ${state.dbMaxPoolSize}!`,
    },
    {
      id: "singleflight-database-coalescing",
      label: "Singleflight Query Coalescing during Cache Miss",
      passed: stampedeFree,
      detail: stampedeFree
        ? "At most 1 Worker queries Database to recompute cache."
        : `Cache Stampede active: ${state.dbActiveConnections} Workers hammering Database simultaneously!`,
    },
  ];
}

function computeMetrics(state: RedisStampedeState): Record<string, string | number> {
  const hitRate =
    state.totalCacheHits + state.totalCacheMisses === 0
      ? "100%"
      : `${Math.round(
          (state.totalCacheHits / (state.totalCacheHits + state.totalCacheMisses)) * 100,
        )}%`;

  return {
    "Cache Key Status": state.keyStatus,
    "TTL Remaining": `${state.ttlRemainingMs} ms`,
    "Active DB Queries": `${state.dbActiveConnections} / ${state.dbMaxPoolSize}`,
    "Hit Rate": hitRate,
    "Cumulative DB Queries": state.totalDbQueriesExecuted,
    Strategy: state.strategy,
  };
}

export const redisStampedeSimulation: SimulationEngineSpec<
  RedisSimulationConfig,
  RedisStampedeState,
  RedisSimulationCommand
> = {
  id: "redis-stampede",
  title: "Redis Cache Stampede & Distributed Mutex Simulator",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Redis 7.4 Keyspace Expiration (Active/Passive), SET NX PX Lock Pattern, and Cache-Aside Failure Modes",
    accurateBehaviors: [
      "Simultaneous cache miss causing Thundering Herd spikes against primary database connection pools",
      "Singleflight distributed lock pattern using atomic SET NX PX and safe Lua script release",
      "Logical TTL pattern returning stale data instantly while background asynchronous workers recompute cache",
      "HikariCP connection pool saturation and latency escalation under concurrent database load",
    ],
    simplifications: [
      "Database query execution latency is modeled deterministically across step frames",
      "Redis network round-trip time is fixed to 1ms for cache hit visualizations",
    ],
    assumptions: [
      "All worker threads read the same hot key (catalog:flash-sale:top-deals)",
      "Database connection pool size is capped at 5 connections for explicit overflow demonstration",
    ],
    unsupportedEdgeCases: [
      "Redis cluster key slot migration hash tags (cross-slot multi-key operations)",
      "Redlock multi-node majority quorum distributed locking algorithms",
    ],
  },
  presets: [
    {
      id: "naive-cache-aside-stampede",
      title: "1. Naive Cache-Aside — Connection Pool Collapse on Hot Key Expiration",
      badge: "Connection Pool Collapse",
      description:
        "When the Hot Key expires just as 8 Workers read concurrently, all 8 receive Cache Misses and simultaneously query PostgreSQL, overflowing the pool capacity of 5.",
      config: {
        key: "catalog:flash-sale:top-deals",
        initialTtlMs: 5000,
        concurrentWorkers: 8,
        strategy: "naive-cache-aside",
        dbQueryCostMs: 180,
        dbMaxPoolSize: 5,
      },
      scriptedCommands: [
        { type: "BURST_CONCURRENT_READS" },
        { type: "EXPIRE_TTL_IMMEDIATELY" },
        { type: "BURST_CONCURRENT_READS" },
        { type: "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE" },
        { type: "BURST_CONCURRENT_READS" },
      ],
    },
    {
      id: "mutex-lock-singleflight",
      title: "2. Mutex Lock / Singleflight (SET NX PX) — Eliminates Stampede",
      badge: "Singleflight Mutex Lock",
      description:
        "Upon a Cache Miss, workers compete for an atomic SET lock NX PX. Exactly 1 Worker acquires the lock to query the DB; remaining workers wait safely without overloading PostgreSQL.",
      config: {
        key: "catalog:flash-sale:top-deals",
        initialTtlMs: 5000,
        concurrentWorkers: 8,
        strategy: "mutex-singleflight-lock",
        dbQueryCostMs: 180,
        dbMaxPoolSize: 5,
      },
      scriptedCommands: [
        { type: "BURST_CONCURRENT_READS" },
        { type: "EXPIRE_TTL_IMMEDIATELY" },
        { type: "BURST_CONCURRENT_READS" },
        { type: "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE" },
        { type: "BURST_CONCURRENT_READS" },
      ],
    },
    {
      id: "logical-ttl-background-refresh",
      title: "3. Logical TTL / Early Refresh — Constant Sub-1ms P99 Latency",
      badge: "Zero-Latency Async Refresh",
      description:
        "Logical TTL maintains long physical cache retention. Near expiration, stale data returns in 1ms while an asynchronous background task queries PostgreSQL to refresh cache.",
      config: {
        key: "catalog:flash-sale:top-deals",
        initialTtlMs: 5000,
        concurrentWorkers: 8,
        strategy: "logical-ttl-early-refresh",
        dbQueryCostMs: 180,
        dbMaxPoolSize: 5,
      },
      scriptedCommands: [
        { type: "BURST_CONCURRENT_READS" },
        { type: "EXPIRE_TTL_IMMEDIATELY" },
        { type: "BURST_CONCURRENT_READS" },
        { type: "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE" },
      ],
    },
  ],

  createInitialFrame(config: RedisSimulationConfig): SimulationStepFrame<RedisStampedeState> {
    const workers: RedisWorkerState[] = [];
    for (let i = 1; i <= config.concurrentWorkers; i++) {
      workers.push({
        id: `Worker-${i}`,
        state: "IDLE",
        latencyMs: 0,
      });
    }

    const state: RedisStampedeState = {
      key: config.key,
      strategy: config.strategy,
      keyStatus: "VALID_HOT",
      ttlRemainingMs: config.initialTtlMs,
      cachedVersion: 1,
      lockOwnerWorkerId: null,
      lockFencingToken: 0,
      dbActiveConnections: 0,
      dbMaxPoolSize: config.dbMaxPoolSize,
      workers,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      totalDbQueriesExecuted: 0,
    };

    return {
      tick: 0,
      phase: "Ready (Key Hot & Valid)",
      title: `Initialized Hot Key "${config.key}" in Redis (TTL = ${config.initialTtlMs}ms)`,
      state,
      events: [
        {
          tick: 0,
          actor: "RedisCache",
          action: "KEY_INITIALIZED",
          detail: `Key "${config.key}" (v1) active with TTL = ${config.initialTtlMs}ms. Strategy: ${config.strategy}.`,
          tone: "ok",
        },
      ],
      invariants: evaluateInvariants(state),
      narration: {
        summary: `Key "${config.key}" is cached in Redis RAM (TTL: ${config.initialTtlMs}ms). ${config.concurrentWorkers} Worker threads ready to handle high read traffic.`,
        internalsNote: `Redis stores string values as SDS (Simple Dynamic Strings) and manages expiration timestamps in the database expires dict hash table.`,
      },
      metrics: computeMetrics(state),
    };
  },

  applyCommand(
    currentFrame: SimulationStepFrame<RedisStampedeState>,
    command: RedisSimulationCommand,
  ): SimulationStepFrame<RedisStampedeState> {
    const nextTick = currentFrame.tick + 1;
    const prev = currentFrame.state;
    const workers: RedisWorkerState[] = prev.workers.map((w) => ({ ...w }));

    if (command.type === "BURST_CONCURRENT_READS") {
      const isExpired = prev.ttlRemainingMs <= 0;

      if (!isExpired) {
        for (const w of workers) {
          w.state = "CACHE_HIT";
          w.latencyMs = 1;
        }
        const nextState: RedisStampedeState = {
          ...prev,
          workers,
          totalCacheHits: prev.totalCacheHits + workers.length,
          dbActiveConnections: 0,
        };

        return {
          tick: nextTick,
          phase: "Cache Hits (~1ms)",
          title: `${workers.length} Workers Read "${prev.key}" -> 100% Cache Hit (0 DB load)`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: "WorkerThreads",
              action: "BURST_GET_CACHE_HIT",
              detail: `${workers.length} GET commands hit Redis RAM (~1ms latency). PostgreSQL received 0 queries.`,
              tone: "ok",
            },
          ],
          invariants: evaluateInvariants(nextState),
          narration: {
            summary: `All ${workers.length} Workers executed GET "${prev.key}" and received payloads from Redis RAM in ~1ms. Zero load placed on PostgreSQL.`,
            internalsNote: `During GET execution, Redis calls lookupKeyRead() -> expireIfNeeded(). Because current wall time has not passed key expiry, Redis immediately returns data.`,
          },
          metrics: computeMetrics(nextState),
        };
      }

      // Key is expired: Behavior branches by strategy
      if (prev.strategy === "naive-cache-aside") {
        for (const w of workers) {
          w.state = "CACHE_MISS_QUERYING_DB";
          w.latencyMs = 185;
        }
        const activeConnections = workers.length;
        const nextState: RedisStampedeState = {
          ...prev,
          keyStatus: "EXPIRED_MISS",
          workers,
          totalCacheMisses: prev.totalCacheMisses + workers.length,
          totalDbQueriesExecuted: prev.totalDbQueriesExecuted + workers.length,
          dbActiveConnections: activeConnections,
        };

        return {
          tick: nextTick,
          phase: "CACHE STAMPEDE (Pool Exhausted)",
          title: `THUNDERING HERD: All ${workers.length} Workers Suffered Cache Misses & Flooded PostgreSQL!`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: "WorkerThreads",
              action: "CACHE_STAMPEDE_SPIKE",
              detail: `All ${workers.length} Workers received nil from Redis and opened ${workers.length} heavy SQL queries simultaneously (Max Pool: ${prev.dbMaxPoolSize})!`,
              tone: "danger",
            },
          ],
          invariants: evaluateInvariants(nextState),
          narration: {
            summary: `CACHE STAMPEDE: Because the hot key expired, all ${workers.length} Workers received nil simultaneously and each fired an expensive SQL aggregation query at PostgreSQL!`,
            internalsNote: `Concurrent query volume (${workers.length}) exceeded the HikariCP pool capacity (${prev.dbMaxPoolSize}), forcing threads into connection queues and escalating latency to 185ms+.`,
            productionWarning: `PRODUCTION OUTAGE: In high-scale systems, thousands of concurrent misses on a Tier-1 hot key saturate database CPU at 100%, triggering cascading failures across downstream services.`,
          },
          metrics: computeMetrics(nextState),
        };
      }

      if (prev.strategy === "mutex-singleflight-lock") {
        const leaderId = workers[0].id;
        workers[0].state = "ACQUIRED_LOCK_QUERYING_DB";
        workers[0].latencyMs = 185;

        for (let i = 1; i < workers.length; i++) {
          workers[i].state = "WAITING_ON_LOCK";
          workers[i].latencyMs = 190;
        }

        const nextToken = prev.lockFencingToken + 1;
        const nextState: RedisStampedeState = {
          ...prev,
          keyStatus: "RECOMPUTING_IN_DB",
          lockOwnerWorkerId: leaderId,
          lockFencingToken: nextToken,
          workers,
          totalCacheMisses: prev.totalCacheMisses + workers.length,
          totalDbQueriesExecuted: prev.totalDbQueriesExecuted + 1,
          dbActiveConnections: 1,
        };

        return {
          tick: nextTick,
          phase: "Singleflight Mutex Acquired",
          title: `${leaderId} Acquired SET NX PX Lock (Token ${nextToken}); ${workers.length - 1} Workers Waiting Safely`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: leaderId,
              action: "SET_NX_PX_ACQUIRED",
              detail: `${leaderId} acquired lock "lock:${prev.key}" with token=${nextToken}. Exactly 1 DB connection utilized!`,
              tone: "ok",
            },
          ],
          invariants: evaluateInvariants(nextState),
          narration: {
            summary: `Via Mutex Lock / Singleflight, only "${leaderId}" acquired the atomic SET lock:${prev.key} token_${nextToken} NX PX 5000 lock and queried PostgreSQL. The other ${workers.length - 1} Workers wait safely for the refreshed value without overloading the DB.`,
            internalsNote: `Because Redis single-threads command execution on its event loop, SET ... NX PX guarantees strict mutual exclusion across concurrent workers without race conditions.`,
          },
          metrics: computeMetrics(nextState),
        };
      }

      if (prev.strategy === "logical-ttl-early-refresh") {
        for (const w of workers) {
          w.state = "SERVED_STALE_ASYNC_REFRESH";
          w.latencyMs = 1;
        }

        const refreshWorkerId = workers[0].id;
        const nextState: RedisStampedeState = {
          ...prev,
          keyStatus: "LOGICAL_EXPIRED_SERVE_STALE",
          workers,
          totalCacheHits: prev.totalCacheHits + workers.length,
          totalDbQueriesExecuted: prev.totalDbQueriesExecuted + 1,
          dbActiveConnections: 1,
        };

        return {
          tick: nextTick,
          phase: "Serve Stale (1ms) + Async DB Refresh",
          title: `Served Stale v${prev.cachedVersion} (1ms) & Background Refresh Fired by ${refreshWorkerId}`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: "WorkerThreads",
              action: "SERVE_STALE_TRIGGER_ASYNC",
              detail: `All ${workers.length} Workers served stale data immediately (~1ms). ${refreshWorkerId} spawned 1 async background thread to query DB.`,
              tone: "ok",
            },
          ],
          invariants: evaluateInvariants(nextState),
          narration: {
            summary: `Under Logical TTL, physical data in Redis remains valid. All ${workers.length} Workers received cached responses in 1ms, while "${refreshWorkerId}" initiated a single background worker to recompute fresh data from PostgreSQL.`,
            internalsNote: `This trade-off embraces temporary Eventual Consistency for hundreds of milliseconds in exchange for predictable sub-1ms P99 latency and total database shielding.`,
          },
          metrics: computeMetrics(nextState),
        };
      }
    }

    if (command.type === "EXPIRE_TTL_IMMEDIATELY") {
      const nextState: RedisStampedeState = {
        ...prev,
        ttlRemainingMs: 0,
        keyStatus: "EXPIRED_MISS",
      };

      return {
        tick: nextTick,
        phase: "Key Expired (TTL = 0ms)",
        title: `Time-To-Live (TTL) for Key "${prev.key}" Reached 0ms`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "RedisTimer",
            action: "TTL_EXPIRED",
            detail: `TTL for "${prev.key}" reached 0ms. Subsequent access triggers Passive Expiration.`,
            tone: "warn",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Hot Key "${prev.key}" TTL dropped to 0ms. Click Burst Concurrent Reads to observe what happens when ${workers.length} Workers read simultaneously at this exact moment!`,
          internalsNote: `Redis combines Passive Expiration (lazy deletion when a read accesses an expired key) with Active Expiration (random keyspace sampling at 10 Hz).`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (command.type === "COMPLETE_DB_RECOMPUTE_AND_SET_CACHE") {
      const nextVersion = prev.cachedVersion + 1;
      for (const w of workers) {
        w.state = "IDLE";
        w.latencyMs = 0;
      }

      const nextState: RedisStampedeState = {
        ...prev,
        keyStatus: "VALID_HOT",
        ttlRemainingMs: 5000,
        cachedVersion: nextVersion,
        lockOwnerWorkerId: null,
        dbActiveConnections: 0,
        workers,
      };

      return {
        tick: nextTick,
        phase: "Cache Recomputed (v" + nextVersion + ", TTL 5000ms)",
        title: `Completed Redis Cache Repopulation (v${nextVersion}, TTL = 5000ms) & Released Lua Lock`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Worker-Leader",
            action: "SET_CACHE_AND_RELEASE_LOCK",
            detail: `Updated "${prev.key}" to version v${nextVersion} (TTL 5000ms) and released lock safely via Lua script.`,
            tone: "ok",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Fresh data (v${nextVersion}) from PostgreSQL was written back to Redis with a 5000ms TTL. Under Mutex Lock, the lock holder executed a Lua script verifying token ownership before invoking DEL.`,
          internalsNote: `Atomic unlock script: if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end — prevents accidental deletion of another worker's lock.`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (command.type === "SWITCH_STRATEGY") {
      const nextState: RedisStampedeState = {
        ...prev,
        strategy: command.strategy,
        keyStatus: "VALID_HOT",
        ttlRemainingMs: 5000,
        dbActiveConnections: 0,
        lockOwnerWorkerId: null,
      };

      return {
        tick: nextTick,
        phase: `Switched Strategy -> ${command.strategy}`,
        title: `Switched Stampede Mitigation Strategy to "${command.strategy}"`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "AppConfig",
            action: "SWITCH_STRATEGY",
            detail: `Switched to strategy ${command.strategy} and refreshed TTL = 5000ms.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Switched strategy to "${command.strategy}" and reset TTL to 5000ms. Click "Expire TTL Immediately" then "Burst 8 Concurrent Reads" to compare database connection load.`,
          internalsNote: `Directly compare Active DB Queries between naive-cache-aside (8 queries) and mutex-singleflight-lock / logical-ttl-early-refresh (1 query).`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
