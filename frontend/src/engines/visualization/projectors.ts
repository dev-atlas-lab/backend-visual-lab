import type {
  KafkaConsumerGroupState,
  PostgresMvccBtreeState,
  RedisStampedeState,
  SimulationStepFrame,
} from "../simulation";

export interface VisualNodeCard {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  tone: "healthy" | "warning" | "danger" | "info" | "muted";
  details: string[];
}

export interface VisualLaneProjection {
  laneId: string;
  laneTitle: string;
  cards: VisualNodeCard[];
}

export function projectKafkaFrameToLanes(
  frame: SimulationStepFrame<KafkaConsumerGroupState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const partitionCards: VisualNodeCard[] = state.partitions.map((p) => {
    const lag = Math.max(0, p.highWatermark - p.committedOffset);
    const isUnassigned = p.ownerConsumerId === null;
    return {
      id: `partition-${p.id}`,
      title: `Partition P${p.id}`,
      subtitle: `Broker #${p.leaderBrokerId} (Leader)`,
      badgeText: isUnassigned
        ? p.revokingFromConsumerId
          ? `REVOKED (${p.revokingFromConsumerId})`
          : "UNASSIGNED"
        : `OWNER: ${p.ownerConsumerId}`,
      tone: isUnassigned ? "warning" : lag > 0 ? "info" : "healthy",
      details: [
        `HW / LEO: ${p.highWatermark} / ${p.logEndOffset}`,
        `Committed Offset: ${p.committedOffset}`,
        `Consumer Lag: ${lag} msgs`,
      ],
    };
  });

  const consumerCards: VisualNodeCard[] = state.consumers.map((c) => {
    const isDown = c.status !== "ACTIVE";
    return {
      id: c.id,
      title: c.id,
      subtitle: c.id === state.leaderConsumerId ? "Group Leader (Assignor)" : "Group Member",
      badgeText: isDown
        ? c.status
        : state.stopTheWorldActive
          ? "PAUSED (REBALANCING)"
          : `ACTIVE (${c.assignedPartitions.length} parts)`,
      tone: isDown ? "danger" : state.stopTheWorldActive ? "warning" : "healthy",
      details: [
        `Assigned: ${
          c.assignedPartitions.length > 0
            ? c.assignedPartitions.map((p) => `P${p}`).join(", ")
            : "None (Idle / Revoked)"
        }`,
        `Last Heartbeat: Tick #${c.lastHeartbeatTick}`,
      ],
    };
  });

  return [
    {
      laneId: "kafka-partitions",
      laneTitle: `Topic "${state.topicName}" — ${state.partitions.length} Partitions`,
      cards: partitionCards,
    },
    {
      laneId: "kafka-consumers",
      laneTitle: `Consumer Group "${state.groupId}" — Gen #${state.generationId} (${state.groupState})`,
      cards: consumerCards,
    },
  ];
}

export function projectRedisFrameToLanes(
  frame: SimulationStepFrame<RedisStampedeState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const infraCards: VisualNodeCard[] = [
    {
      id: "redis-hot-key",
      title: `Redis Key: ${state.key}`,
      subtitle: `Strategy: ${state.strategy}`,
      badgeText: `${state.keyStatus} (TTL: ${state.ttlRemainingMs}ms)`,
      tone:
        state.keyStatus === "VALID_HOT"
          ? "healthy"
          : state.keyStatus === "EXPIRED_MISS"
            ? "danger"
            : "warning",
      details: [
        `Cached Payload Version: v${state.cachedVersion}`,
        `Mutex Lock Owner: ${state.lockOwnerWorkerId ?? "None (Unlocked)"}`,
        `Fencing Token: #${state.lockFencingToken}`,
      ],
    },
    {
      id: "postgres-pool",
      title: "PostgreSQL Primary Connection Pool",
      subtitle: `HikariCP maxPoolSize = ${state.dbMaxPoolSize}`,
      badgeText:
        state.dbActiveConnections > state.dbMaxPoolSize
          ? `POOL EXHAUSTED (${state.dbActiveConnections}/${state.dbMaxPoolSize})`
          : `ACTIVE QUERIES: ${state.dbActiveConnections}/${state.dbMaxPoolSize}`,
      tone:
        state.dbActiveConnections > state.dbMaxPoolSize
          ? "danger"
          : state.dbActiveConnections > 0
            ? "warning"
            : "healthy",
      details: [
        `Active SQL Queries: ${state.dbActiveConnections}`,
        `Cumulative DB Queries: ${state.totalDbQueriesExecuted}`,
        `Cache Hits / Misses: ${state.totalCacheHits} / ${state.totalCacheMisses}`,
      ],
    },
  ];

  const workerCards: VisualNodeCard[] = state.workers.map((w) => {
    const tone =
      w.state === "CACHE_HIT" || w.state === "SERVED_STALE_ASYNC_REFRESH"
        ? "healthy"
        : w.state === "CACHE_MISS_QUERYING_DB"
          ? "danger"
          : w.state === "ACQUIRED_LOCK_QUERYING_DB" || w.state === "WAITING_ON_LOCK"
            ? "warning"
            : "muted";

    return {
      id: w.id,
      title: w.id,
      subtitle: `Response Latency: ${w.latencyMs} ms`,
      badgeText: w.state,
      tone,
      details: [
        w.state === "CACHE_MISS_QUERYING_DB"
          ? "Executing heavy SQL query directly against PostgreSQL!"
          : w.state === "ACQUIRED_LOCK_QUERYING_DB"
            ? "Holds SET NX PX lock; recomputing from DB"
            : w.state === "WAITING_ON_LOCK"
              ? "Coalesced / waiting for Leader cache refill"
              : "Served from Redis memory",
      ],
    };
  });

  return [
    {
      laneId: "redis-infra",
      laneTitle: "Redis Cache Node & PostgreSQL Connection Pool Status",
      cards: infraCards,
    },
    {
      laneId: "redis-workers",
      laneTitle: `Concurrent Application Workers (${state.workers.length} Threads)`,
      cards: workerCards,
    },
  ];
}

export function projectPostgresFrameToLanes(
  frame: SimulationStepFrame<PostgresMvccBtreeState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const btreeCards: VisualNodeCard[] = state.btreeNodes.map((n) => ({
    id: `btree-page-${n.pageNumber}`,
    title: `B-Tree Page #${n.pageNumber} (${n.level})`,
    subtitle: n.keyRangeLabel,
    badgeText: n.visitedInCurrentScan ? "VISITED IN SCAN" : "NOT READ",
    tone: n.visitedInCurrentScan ? "info" : "muted",
    details: n.entries.map((e) => `Key ${e.key} -> ${e.targetCtid}`),
  }));

  const tupleCards: VisualNodeCard[] = state.heapTuples.map((t) => ({
    id: `tuple-${t.ctid}`,
    title: `Heap Tuple CTID ${t.ctid}`,
    subtitle: `account_id = ${t.accountId} | balance = $${t.balanceUsd}`,
    badgeText: t.isVisibleToReader ? "VISIBLE TO READER" : "INVISIBLE (MVCC HIDDEN)",
    tone: t.isVisibleToReader ? "healthy" : t.xmax !== null ? "warning" : "danger",
    details: [
      `Header: t_xmin = ${t.xmin} | t_xmax = ${t.xmax ?? "NULL"}`,
      t.visibilityReasonVi,
    ],
  }));

  return [
    {
      laneId: "pg-btree-pages",
      laneTitle: `B-Tree Index "pk_accounts" (Visibility Map All-Visible = ${state.visibilityMapAllVisible ? "1" : "0"})`,
      cards: btreeCards,
    },
    {
      laneId: "pg-heap-tuples",
      laneTitle: `8 KB Slotted Heap Pages — Reader Tx ${state.readerTxId} (${state.isolationLevel})`,
      cards: tupleCards,
    },
  ];
}
