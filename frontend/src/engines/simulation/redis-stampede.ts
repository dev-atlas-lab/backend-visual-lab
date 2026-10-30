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
  | "LOGICALLY_STALE_SERVING"
  | "EXPIRED_MISS"
  | "RECOMPUTING_LOCKED";

export interface RedisWorkerRequest {
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

export interface RedisStampedeState {
  key: string;
  strategy: RedisStampedeStrategy;
  keyStatus: RedisKeyStatus;
  ttlRemainingMs: number;
  cachedVersion: number;
  lockOwnerWorkerId: string | null;
  lockFencingToken: number;
  workers: RedisWorkerRequest[];
  dbActiveConnections: number;
  dbMaxPoolSize: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  totalDbQueriesExecuted: number;
}

export interface RedisStampedeConfig {
  key: string;
  strategy: RedisStampedeStrategy;
  concurrentWorkers: number;
  initialTtlMs: number;
  dbMaxPoolSize: number;
}

export type RedisStampedeCommand =
  | { type: "BURST_READ_REQUESTS" }
  | { type: "ADVANCE_TTL_TO_EXPIRY" }
  | { type: "COMPLETE_DB_RECOMPUTE_AND_SET" }
  | { type: "SWITCH_STRATEGY"; strategy: RedisStampedeStrategy };

function evaluateRedisInvariants(state: RedisStampedeState): SimulationInvariantCheck[] {
  const poolSafe = state.dbActiveConnections <= state.dbMaxPoolSize;
  const singleRecomputeUnderLock =
    state.strategy === "naive-cache-aside" || state.dbActiveConnections <= 1;

  return [
    {
      id: "db-connection-pool-safety",
      label: "PostgreSQL Connection Pool Within Capacity",
      passed: poolSafe,
      detail: poolSafe
        ? `Số kết nối DB đồng thời (${state.dbActiveConnections}) nằm trong ngưỡng an toàn (<= ${state.dbMaxPoolSize}).`
        : `QUÁ TẢI DB POOL: ${state.dbActiveConnections} truy vấn đồng thời vượt ngưỡng tối đa ${state.dbMaxPoolSize} kết nối!`,
    },
    {
      id: "stampede-coalescing",
      label: "Singleflight / Coalesced DB Recompute on Expiry",
      passed: singleRecomputeUnderLock,
      detail: singleRecomputeUnderLock
        ? "Chỉ tối đa 1 Worker truy vấn Database khi tái tạo dữ liệu Cache."
        : `Cache Stampede đang xảy ra: ${state.dbActiveConnections} Workers cùng đập vào Database!`,
    },
  ];
}

function computeRedisMetrics(state: RedisStampedeState): Record<string, string | number> {
  return {
    Strategy: state.strategy,
    "Key Status": state.keyStatus,
    "TTL Remaining": `${state.ttlRemainingMs} ms`,
    "DB Active Queries": `${state.dbActiveConnections} / ${state.dbMaxPoolSize}`,
    "Cache Hits / Misses": `${state.totalCacheHits} / ${state.totalCacheMisses}`,
    "Total DB Queries": state.totalDbQueriesExecuted,
  };
}

export const redisStampedeSimulation: SimulationEngineSpec<
  RedisStampedeConfig,
  RedisStampedeState,
  RedisStampedeCommand
> = {
  id: "redis-stampede",
  title: "Redis Cache-Aside, TTL Expiration & Cache Stampede Prevention",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Redis 7.4 Passive/Active Expiration, Atomic SET NX PX Distributed Lock & Singleflight Coalescing",
    accurateBehaviors: [
      "Passive (lazy) key expiration triggered when concurrent workers execute GET after TTL reaches 0 ms",
      "Thundering herd (Cache Stampede) connection pool exhaustion when N workers simultaneously miss a hot key",
      "Atomic SET lock_key token NX PX mutex election where exactly 1 worker queries PostgreSQL while N-1 wait/coalesce",
      "Logical TTL / Early Refresh where callers receive slightly stale cached values in 1 ms while 1 background worker refreshes asynchronously",
    ],
    simplifications: [
      "Worker concurrency is modeled as discrete synchronized waves of N workers rather than continuous Poisson arrivals",
      "Redis network RTT is fixed at 1 ms and PostgreSQL aggregation query time at 180 ms for deterministic comparison",
    ],
    assumptions: [
      "The cached item is a high-traffic hot key (e.g., homepage leaderboard or flash-sale inventory)",
      "Database query cost is expensive relative to Redis GET",
    ],
    unsupportedEdgeCases: [
      "Redis cluster master-replica failover during an active SET NX PX lock lease",
      "Client GC pause exceeding lock PX TTL (covered in dedicated Distributed Lock module)",
    ],
  },
  presets: [
    {
      id: "naive-cache-stampede",
      title: "1. Naive Cache-Aside — Sập Connection Pool khi Hot Key hết TTL",
      badge: "Failure Scenario",
      descriptionVi:
        "Khi Hot Key hết hạn TTL đúng lúc 8 Workers cùng đọc, toàn bộ 8 Workers đều nhận Cache Miss và đồng loạt bắn 8 câu query nặng xuống PostgreSQL (vượt trần Pool = 5).",
      config: {
        key: "catalog:flash-sale:top-deals",
        strategy: "naive-cache-aside",
        concurrentWorkers: 8,
        initialTtlMs: 5000,
        dbMaxPoolSize: 5,
      },
      scriptedCommands: [
        { type: "BURST_READ_REQUESTS" },
        { type: "ADVANCE_TTL_TO_EXPIRY" },
        { type: "BURST_READ_REQUESTS" },
        { type: "COMPLETE_DB_RECOMPUTE_AND_SET" },
      ],
    },
    {
      id: "mutex-lock-protection",
      title: "2. Mutex Lock / Singleflight (SET NX PX) — Chặn đứng Stampede",
      badge: "Protected Architecture",
      descriptionVi:
        "Khi xảy ra Cache Miss, các Workers tranh khóa nguyên tử SET lock NX PX. Chỉ duy nhất Worker-1 giành được quyền query DB; 7 Workers còn lại chờ kết quả mà không làm nghẽn PostgreSQL.",
      config: {
        key: "catalog:flash-sale:top-deals",
        strategy: "mutex-singleflight-lock",
        concurrentWorkers: 8,
        initialTtlMs: 5000,
        dbMaxPoolSize: 5,
      },
      scriptedCommands: [
        { type: "BURST_READ_REQUESTS" },
        { type: "ADVANCE_TTL_TO_EXPIRY" },
        { type: "BURST_READ_REQUESTS" },
        { type: "COMPLETE_DB_RECOMPUTE_AND_SET" },
      ],
    },
  ],

  createInitialFrame(config: RedisStampedeConfig): SimulationStepFrame<RedisStampedeState> {
    const workers: RedisWorkerRequest[] = Array.from(
      { length: config.concurrentWorkers },
      (_, idx) => ({
        id: `worker-${idx + 1}`,
        state: "IDLE",
        latencyMs: 0,
      }),
    );

    const state: RedisStampedeState = {
      key: config.key,
      strategy: config.strategy,
      keyStatus: "VALID_HOT",
      ttlRemainingMs: config.initialTtlMs,
      cachedVersion: 1,
      lockOwnerWorkerId: null,
      lockFencingToken: 100,
      workers,
      dbActiveConnections: 0,
      dbMaxPoolSize: config.dbMaxPoolSize,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      totalDbQueriesExecuted: 0,
    };

    return {
      tick: 0,
      phase: "Warm Cache (Valid TTL)",
      title: `Khởi tạo Hot Key "${config.key}" trong Redis (TTL = ${config.initialTtlMs}ms)`,
      state,
      events: [
        {
          tick: 0,
          actor: "Redis",
          action: "KEY_WARM",
          detail: `Key "${config.key}" (v1) đang có hiệu lực với TTL = ${config.initialTtlMs}ms. Chiến lược: ${config.strategy}.`,
          tone: "ok",
        },
      ],
      invariants: evaluateRedisInvariants(state),
      narration: {
        summaryVi: `Key "${config.key}" đang nằm sẵn trong bộ nhớ Redis (TTL còn ${config.initialTtlMs}ms). Có ${config.concurrentWorkers} Worker threads sẵn sàng phục vụ lưu lượng truy cập cao.`,
        internalsNoteVi: `Redis lưu trữ chuỗi giá trị dưới dạng SDS (Simple Dynamic String) và quản lý thời gian hết hạn trong bảng băm expires dict của database.`,
      },
      metrics: computeRedisMetrics(state),
    };
  },

  applyCommand(
    currentFrame: SimulationStepFrame<RedisStampedeState>,
    command: RedisStampedeCommand,
  ): SimulationStepFrame<RedisStampedeState> {
    const nextTick = currentFrame.tick + 1;
    const prev = currentFrame.state;
    const workers = prev.workers.map((w) => ({ ...w }));

    if (command.type === "BURST_READ_REQUESTS") {
      if (prev.ttlRemainingMs > 0) {
        for (const w of workers) {
          w.state = "CACHE_HIT";
          w.latencyMs = 1;
        }
        const nextState: RedisStampedeState = {
          ...prev,
          workers,
          dbActiveConnections: 0,
          totalCacheHits: prev.totalCacheHits + workers.length,
        };

        return {
          tick: nextTick,
          phase: "100% Cache Hit (1ms)",
          title: `${workers.length} Workers đọc "${prev.key}" -> 100% Cache Hit (0 DB load)`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: "Workers -> Redis",
              action: "GET_CACHE_HIT",
              detail: `${workers.length} lệnh GET đều trúng Cache (latency ~1ms). PostgreSQL nhận 0 truy vấn.`,
              tone: "ok",
            },
          ],
          invariants: evaluateRedisInvariants(nextState),
          narration: {
            summaryVi: `Tất cả ${workers.length} Workers thực thi lệnh GET "${prev.key}" và nhận dữ liệu ngay từ RAM của Redis với độ trễ ~1ms. Database hoàn toàn không chịu tải.`,
            internalsNoteVi: `Khi thực thi GET, Redis gọi hàm lookupKeyRead() -> expireIfNeeded(). Vì thời gian hiện tại chưa vượt quá mốc hết hạn của key, Redis trả về giá trị ngay lập tức.`,
          },
          metrics: computeRedisMetrics(nextState),
        };
      }

      // TTL is 0 (Expired!)
      if (prev.strategy === "naive-cache-aside") {
        for (const w of workers) {
          w.state = "CACHE_MISS_QUERYING_DB";
          w.latencyMs = 185;
        }
        const nextState: RedisStampedeState = {
          ...prev,
          keyStatus: "EXPIRED_MISS",
          workers,
          dbActiveConnections: workers.length,
          totalCacheMisses: prev.totalCacheMisses + workers.length,
          totalDbQueriesExecuted: prev.totalDbQueriesExecuted + workers.length,
        };

        return {
          tick: nextTick,
          phase: "CACHE STAMPEDE SURGE!",
          title: `THUNDERING HERD: Cả ${workers.length} Workers bị Cache Miss và đập thẳng vào PostgreSQL!`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: "Workers -> PostgreSQL",
              action: "STAMPEDE_DB_OVERLOAD",
              detail: `Tất cả ${workers.length} Workers nhận nil từ Redis và mở ${workers.length} truy vấn SQL nặng cùng lúc (Pool tối đa: ${prev.dbMaxPoolSize})!`,
              tone: "danger",
            },
          ],
          invariants: evaluateRedisInvariants(nextState),
          narration: {
            summaryVi: `BÃO TRUY VẤN (Cache Stampede): Vì key đã hết hạn, cả ${workers.length} Workers đồng thời nhận kết quả nil (Cache Miss) và tự mình chạy câu truy vấn tổng hợp nặng xuống PostgreSQL!`,
            internalsNoteVi: `Số lượng truy vấn đồng thời (${workers.length}) vượt quá giới hạn HikariCP Connection Pool (${prev.dbMaxPoolSize}), khiến các luồng bị treo chờ kết nối và đẩy độ trễ lên 185ms+.`,
            productionWarningVi: `SỰ CỐ PRODUCTION: Trong thực tế, hàng nghìn request đồng thời gặp Cache Miss trên cùng một Hot Key sẽ làm CPU Database chạm đỉnh 100% và gây hiệu ứng dây chuyền (Cascading Failure) toàn hệ thống.`,
          },
          metrics: computeRedisMetrics(nextState),
        };
      }

      if (prev.strategy === "mutex-singleflight-lock") {
        const leaderId = workers[0]?.id ?? "worker-1";
        workers.forEach((w, idx) => {
          if (idx === 0) {
            w.state = "ACQUIRED_LOCK_QUERYING_DB";
            w.latencyMs = 182;
          } else {
            w.state = "WAITING_ON_LOCK";
            w.latencyMs = 45;
          }
        });

        const nextToken = prev.lockFencingToken + 1;
        const nextState: RedisStampedeState = {
          ...prev,
          keyStatus: "RECOMPUTING_LOCKED",
          lockOwnerWorkerId: leaderId,
          lockFencingToken: nextToken,
          workers,
          dbActiveConnections: 1,
          totalCacheMisses: prev.totalCacheMisses + 1,
          totalDbQueriesExecuted: prev.totalDbQueriesExecuted + 1,
        };

        return {
          tick: nextTick,
          phase: "Mutex Lock Coalescing (1 DB Query)",
          title: `${leaderId} giữ khóa SET NX PX (token ${nextToken}); ${workers.length - 1} Workers chờ an toàn`,
          state: nextState,
          events: [
            ...currentFrame.events,
            {
              tick: nextTick,
              actor: leaderId,
              action: "SET_LOCK_NX_PX",
              detail: `${leaderId} chiếm khóa "lock:${prev.key}" với token=${nextToken}. Chỉ 1 kết nối DB được sử dụng!`,
              tone: "ok",
            },
          ],
          invariants: evaluateRedisInvariants(nextState),
          narration: {
            summaryVi: `Nhờ cơ chế Mutex Lock / Singleflight, chỉ duy nhất "${leaderId}" thực thi thành công lệnh nguyên tử SET lock:${prev.key} token_${nextToken} NX PX 5000 và gọi xuống PostgreSQL. ${workers.length - 1} Workers còn lại chờ kết quả mới mà không tạo thêm tải lên DB.`,
            internalsNoteVi: `Vì vòng lặp sự kiện (event loop) của Redis thực thi lệnh tuần tự đơn luồng, lệnh SET ... NX PX đảm bảo tính loại trừ tương hỗ tuyệt đối giữa các Workers cùng thời điểm.`,
          },
          metrics: computeRedisMetrics(nextState),
        };
      }

      // logical-ttl-early-refresh
      const refreshWorkerId = workers[0]?.id ?? "worker-1";
      workers.forEach((w, idx) => {
        w.state = "SERVED_STALE_ASYNC_REFRESH";
        w.latencyMs = idx === 0 ? 2 : 1;
      });

      const nextState: RedisStampedeState = {
        ...prev,
        keyStatus: "LOGICALLY_STALE_SERVING",
        lockOwnerWorkerId: refreshWorkerId,
        workers,
        dbActiveConnections: 1,
        totalCacheHits: prev.totalCacheHits + workers.length,
        totalDbQueriesExecuted: prev.totalDbQueriesExecuted + 1,
      };

      return {
        tick: nextTick,
        phase: "Logical TTL (Serve Stale + Async Refresh)",
        title: `Trả ngay dữ liệu v${prev.cachedVersion} (1ms) & nạp nền bất đồng bộ bởi ${refreshWorkerId}`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: refreshWorkerId,
            action: "LOGICAL_TTL_BACKGROUND_REFRESH",
            detail: `Tất cả ${workers.length} Workers nhận dữ liệu ngay (~1ms). ${refreshWorkerId} chạy 1 luồng nền cập nhật DB.`,
            tone: "ok",
          },
        ],
        invariants: evaluateRedisInvariants(nextState),
        narration: {
          summaryVi: `Với chiến lược Logical TTL, dữ liệu vật lý trong Redis vẫn được giữ lại. Cả ${workers.length} Workers nhận kết quả ngay trong 1ms, trong khi "${refreshWorkerId}" kích hoạt 1 tác vụ nền duy nhất để làm mới dữ liệu từ PostgreSQL.`,
          internalsNoteVi: `Phương pháp này đánh đổi tính nhất quán tức thời trong vài trăm mili-giây (Eventual Consistency) để đổi lấy độ trễ đuôi P99 = 1ms và bảo vệ Database tuyệt đối.`,
        },
        metrics: computeRedisMetrics(nextState),
      };
    }

    if (command.type === "ADVANCE_TTL_TO_EXPIRY") {
      for (const w of workers) {
        w.state = "IDLE";
        w.latencyMs = 0;
      }

      const nextState: RedisStampedeState = {
        ...prev,
        ttlRemainingMs: 0,
        keyStatus:
          prev.strategy === "logical-ttl-early-refresh"
            ? "LOGICALLY_STALE_SERVING"
            : "EXPIRED_MISS",
        workers,
        dbActiveConnections: 0,
      };

      return {
        tick: nextTick,
        phase: "TTL Expired (0ms)",
        title: `Thời gian sống (TTL) của key "${prev.key}" chạm mốc 0ms`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Redis Clock",
            action: "TTL_EXPIRED",
            detail: `TTL của "${prev.key}" đã về 0ms. Lượt truy cập tiếp theo sẽ kích hoạt Passive Expiration.`,
            tone: "warn",
          },
        ],
        invariants: evaluateRedisInvariants(nextState),
        narration: {
          summaryVi: `TTL của Hot Key "${prev.key}" đã giảm về 0ms. Hãy nhấn bước tiếp theo để quan sát điều gì xảy ra khi ${workers.length} Workers đồng loạt gửi yêu cầu đọc ngay khoảnh khắc này!`,
          internalsNoteVi: `Redis sử dụng kết hợp Passive Expiration (xóa lười khi có lệnh đọc chạm vào key đã quá hạn) và Active Expiration (lấy mẫu ngẫu nhiên theo chu kỳ hz = 10 lần/giây).`,
        },
        metrics: computeRedisMetrics(nextState),
      };
    }

    if (command.type === "COMPLETE_DB_RECOMPUTE_AND_SET") {
      for (const w of workers) {
        w.state = "CACHE_HIT";
        w.latencyMs = 1;
      }
      const nextVersion = prev.cachedVersion + 1;
      const nextState: RedisStampedeState = {
        ...prev,
        keyStatus: "VALID_HOT",
        ttlRemainingMs: 5000,
        cachedVersion: nextVersion,
        lockOwnerWorkerId: null,
        workers,
        dbActiveConnections: 0,
      };

      return {
        tick: nextTick,
        phase: `Cache Refilled (v${nextVersion})`,
        title: `Hoàn tất nạp lại Redis Cache (v${nextVersion}, TTL = 5000ms) & giải phóng khóa Lua`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Redis",
            action: "SET_CACHE_AND_LUA_UNLOCK",
            detail: `Cập nhật "${prev.key}" lên phiên bản v${nextVersion} (TTL 5000ms) và giải phóng khóa an toàn bằng Lua script.`,
            tone: "ok",
          },
        ],
        invariants: evaluateRedisInvariants(nextState),
        narration: {
          summaryVi: `Dữ liệu mới (v${nextVersion}) từ PostgreSQL đã được ghi ngược vào Redis với TTL = 5000ms. Nếu dùng Mutex Lock, Worker giữ khóa thực thi Lua script kiểm tra khớp token trước khi gọi DEL khóa.`,
          internalsNoteVi: `Lua script mở khóa nguyên tử: if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end — ngăn chặn lỗi xóa nhầm khóa của Worker khác.`,
        },
        metrics: computeRedisMetrics(nextState),
      };
    }

    if (command.type === "SWITCH_STRATEGY") {
      for (const w of workers) {
        w.state = "IDLE";
        w.latencyMs = 0;
      }
      const nextState: RedisStampedeState = {
        ...prev,
        strategy: command.strategy,
        keyStatus: "VALID_HOT",
        ttlRemainingMs: 5000,
        lockOwnerWorkerId: null,
        workers,
        dbActiveConnections: 0,
      };

      return {
        tick: nextTick,
        phase: `Strategy: ${command.strategy}`,
        title: `Chuyển chiến lược chống Stampede sang "${command.strategy}"`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Playground",
            action: "SWITCH_STAMPEDE_STRATEGY",
            detail: `Đã chuyển sang chiến lược ${command.strategy} và làm mới TTL = 5000ms.`,
            tone: "info",
          },
        ],
        invariants: evaluateRedisInvariants(nextState),
        narration: {
          summaryVi: `Đã chuyển sang chiến lược "${command.strategy}" và đặt lại TTL = 5000ms. Bạn có thể bấm "Expire TTL (0ms)" rồi "Burst 8 Concurrent Reads" để so sánh tải trên PostgreSQL.`,
          internalsNoteVi: `So sánh trực tiếp số lượng DB Active Queries giữa naive-cache-aside (8 queries) và mutex-singleflight-lock / logical-ttl-early-refresh (1 query).`,
        },
        metrics: computeRedisMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
