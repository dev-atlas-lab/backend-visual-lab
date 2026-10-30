import type {
  KafkaConsumerGroupState,
  PostgresMvccBtreeState,
  RedisStampedeState,
  JavaMemoryGcState,
  JavaHashMapState,
  JavaVirtualThreadsState,
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

export function projectJavaMemoryFrameToLanes(
  frame: SimulationStepFrame<JavaMemoryGcState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const stackCards: VisualNodeCard[] = state.threadStack.map((f, idx) => ({
    id: f.id,
    title: f.methodName,
    subtitle: `Stack Frame #${idx + 1} (Local Variables: ${f.localReferences.length})`,
    badgeText: idx === state.threadStack.length - 1 ? "ACTIVE (TOP)" : "SUSPENDED",
    tone: idx === state.threadStack.length - 1 ? "healthy" : "muted",
    details: f.localReferences.map(
      (r) =>
        r.isPrimitive
          ? `primitive: ${r.varName} = ${r.primitiveValue}`
          : `ref: ${r.varName} -> [${r.targetHeapId}]`,
    ),
  }));

  const edenCards: VisualNodeCard[] = state.youngEden.map((o) => ({
    id: o.id,
    title: `new ${o.className}()`,
    subtitle: `Heap ID: ${o.id}`,
    badgeText: o.isRootReachable ? "LIVE (ROOT-REACHABLE)" : "GARBAGE (UNREACHABLE)",
    tone: o.isRootReachable ? "healthy" : "danger",
    details: [
      `Variable: ${o.variableName ?? "anonymous"}`,
      `Generation: EDEN | Age: ${o.tenuringAge}`,
      `Size: ${o.sizeBytes} bytes`,
    ],
  }));

  const activeSurvivorList = state.activeSurvivor === 0 ? state.youngS0 : state.youngS1;
  const survivorCards: VisualNodeCard[] = activeSurvivorList.map((o) => ({
    id: o.id,
    title: o.className,
    subtitle: `Survivor Space S${state.activeSurvivor}`,
    badgeText: `AGE ${o.tenuringAge} / ${state.tenuringThreshold}`,
    tone: o.tenuringAge >= state.tenuringThreshold - 1 ? "warning" : "info",
    details: [
      `Heap ID: ${o.id}`,
      `Status: Surviving Minor GC #${o.tenuringAge}`,
      `Next GC: ${o.tenuringAge + 1 >= state.tenuringThreshold ? "PROMOTE TO OLD GEN" : "Copy to S" + (1 - state.activeSurvivor)}`,
    ],
  }));

  const oldGenCards: VisualNodeCard[] = state.oldGen.map((o) => ({
    id: o.id,
    title: o.className,
    subtitle: "Tenured / Old Generation",
    badgeText: "PROMOTED (LONG-LIVED)",
    tone: o.isRootReachable ? "healthy" : "warning",
    details: [
      `Heap ID: ${o.id}`,
      `Origin: Promoted after reaching Tenuring Age ${o.tenuringAge}`,
      `Reachable: ${o.isRootReachable ? "YES" : "NO (Awaiting Full GC)"}`,
    ],
  }));

  return [
    {
      laneId: "jvm-thread-stack",
      laneTitle: `JVM Call Stack (GC Roots) — ${state.threadStack.length} Frame(s)`,
      cards: stackCards,
    },
    {
      laneId: "jvm-young-eden",
      laneTitle: `Young Gen: Eden Space (${state.youngEden.length}/${state.edenCapacity} slots)`,
      cards: edenCards.length > 0 ? edenCards : [
        {
          id: "eden-empty",
          title: "Eden Space Trống",
          subtitle: "Sẵn sàng cấp phát",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["Chưa có đối tượng mới nào hoặc vừa hoàn tất Minor GC dọn sạch."],
        },
      ],
    },
    {
      laneId: "jvm-young-survivor",
      laneTitle: `Young Gen: Active Survivor S${state.activeSurvivor} (To-Space S${1 - state.activeSurvivor} is Empty)`,
      cards: survivorCards.length > 0 ? survivorCards : [
        {
          id: "survivor-empty",
          title: `Survivor S${state.activeSurvivor} Trống`,
          subtitle: "Chưa có object sống sót qua Minor GC",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["Các đối tượng chết ngay trong Eden mà không cần sơ tán vào Survivor."],
        },
      ],
    },
    {
      laneId: "jvm-old-gen",
      laneTitle: `Old Gen / Tenured Space (${state.oldGen.length}/${state.oldGenCapacity} slots)`,
      cards: oldGenCards.length > 0 ? oldGenCards : [
        {
          id: "oldgen-empty",
          title: "Old Generation Trống",
          subtitle: "Chưa có đối tượng thăng hạng",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["Đối tượng cần sống sót qua 3 chu kỳ Minor GC để được thăng hạng."],
        },
      ],
    },
  ];
}

export function projectJavaHashMapFrameToLanes(
  frame: SimulationStepFrame<JavaHashMapState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const bucketCards: VisualNodeCard[] = state.buckets
    .filter((b) => b.nodes.length > 0)
    .map((b) => ({
      id: `bucket-${b.index}`,
      title: `Bucket Slot #${b.index}`,
      subtitle: `${b.nodes.length} Node(s) — Mode: ${b.mode}`,
      badgeText: b.mode === "RED_BLACK_TREE" ? "RED-BLACK TREE O(log n)" : b.nodes.length > 1 ? "COLLISION CHAIN O(n)" : "HEAD NODE O(1)",
      tone: b.mode === "RED_BLACK_TREE" ? "danger" : b.nodes.length > 1 ? "warning" : "healthy",
      details: b.nodes.map(
        (n, i) =>
          `[#${i + 1}] "${n.key}" -> "${n.value}" (rawHash: ${n.rawHashCode}, spread: 0x${n.spreadHash.toString(16)})`,
      ),
    }));

  const opCards: VisualNodeCard[] = state.lastOperationDetails ? [
    {
      id: "last-op",
      title: `Phép tính Băm: "${state.lastOperationDetails.key}"`,
      subtitle: `hashCode() = ${state.lastOperationDetails.rawHashCode}`,
      badgeText: state.lastOperationDetails.collisionOccurred ? "VA CHẠM (COLLISION)" : "SLOT MỚI",
      tone: state.lastOperationDetails.collisionOccurred ? "warning" : "healthy",
      details: [
        `Perturbation hash: (h ^ (h >>> 16)) = 0x${state.lastOperationDetails.spreadHash.toString(16)}`,
        `Index: (${state.capacity} - 1) & hash = ${state.lastOperationDetails.targetIndex}`,
        `Treeified: ${state.lastOperationDetails.treeified ? "YES (Mô hình Cây)" : "NO"}`,
      ],
    },
  ] : [
    {
      id: "no-op",
      title: "Chưa có Thao tác Băm",
      subtitle: "Nhấn Put Entry để bắt đầu",
      badgeText: "IDLE",
      tone: "muted",
      details: ["Thực hiện lệnh PUT để xem cách tính hash và vị trí bucket."],
    },
  ];

  return [
    {
      laneId: "hashmap-calculation",
      laneTitle: `Thao tác & Phép tính Phân tán Băm (Perturbation)`,
      cards: opCards,
    },
    {
      laneId: "hashmap-active-buckets",
      laneTitle: `Mảng Table Node<K,V>[] — Đang sử dụng ${bucketCards.length}/${state.capacity} slots (Threshold: ${state.threshold})`,
      cards: bucketCards.length > 0 ? bucketCards : [
        {
          id: "all-empty",
          title: "Toàn bộ Buckets đang Trống",
          subtitle: `Capacity: ${state.capacity}`,
          badgeText: "SIZE: 0",
          tone: "muted",
          details: ["Chưa có phần tử nào được thêm vào HashMap."],
        },
      ],
    },
  ];
}

export function projectJavaVirtualThreadsFrameToLanes(
  frame: SimulationStepFrame<JavaVirtualThreadsState>,
): VisualLaneProjection[] {
  const { state } = frame;

  const carrierCards: VisualNodeCard[] = state.carrierThreads.map((c) => ({
    id: c.id,
    title: c.name,
    subtitle: `OS Platform Thread (Tasks processed: ${c.totalTasksProcessed})`,
    badgeText: c.status === "PINNED" ? "CRITICAL: PINNED" : c.status === "BUSY" ? "BUSY (MOUNTED)" : "IDLE",
    tone: c.status === "PINNED" ? "danger" : c.status === "BUSY" ? "healthy" : "muted",
    details: [
      `Trạng thái: ${c.status}`,
      `Đang chạy: ${c.currentVirtualThreadId ?? "None (Rảnh rỗi)"}`,
      c.status === "PINNED" ? "ĐANG BỊ KHÓA BỞI SYNCHRONIZED BLOCK!" : "Sẵn sàng nhận Virtual Thread tiếp theo",
    ],
  }));

  const activeVtCards: VisualNodeCard[] = state.virtualThreads
    .filter((vt) => vt.status !== "QUEUED_RUNNABLE" && vt.status !== "COMPLETED")
    .map((vt) => ({
      id: vt.id,
      title: vt.name,
      subtitle: `Trạng thái: ${vt.status}`,
      badgeText: vt.status === "PINNED_BLOCKED" ? "PINNED" : vt.status === "YIELDED_PARKED_IO" ? "PARKED (I/O YIELD)" : "MOUNTED",
      tone: vt.status === "PINNED_BLOCKED" ? "danger" : vt.status === "YIELDED_PARKED_IO" ? "warning" : "healthy",
      details: [
        `Mounted Carrier: ${vt.mountedCarrierId ?? "None (Continuation on Heap)"}`,
        `Stack footprint: ~${vt.stackSizeKb} KB (co giãn động)`,
        vt.pinningReason ? `Cảnh báo: ${vt.pinningReason}` : "I/O non-blocking yield",
      ],
    }));

  const runnableQueueCards: VisualNodeCard[] = state.virtualThreads
    .filter((vt) => vt.status === "QUEUED_RUNNABLE")
    .slice(0, 8)
    .map((vt) => ({
      id: vt.id,
      title: vt.name,
      subtitle: "Hàng đợi Runnable Queue",
      badgeText: "CHỜ CARRIER",
      tone: "info",
      details: ["Sẵn sàng mount vào Carrier Thread tiếp theo rảnh."],
    }));

  return [
    {
      laneId: "vt-carrier-pool",
      laneTitle: `OS Carrier Thread Pool (${state.carrierPoolSize} Kernel Threads) — Pinning Alert: ${state.hasPinnedCarrierAlert ? "ON" : "OFF"}`,
      cards: carrierCards,
    },
    {
      laneId: "vt-active-threads",
      laneTitle: `Virtual Threads Đang Chạy hoặc Chờ I/O (${activeVtCards.length} active)`,
      cards: activeVtCards.length > 0 ? activeVtCards : [
        {
          id: "no-active-vt",
          title: "Không có Virtual Thread nào đang chạy",
          subtitle: "Nhấn Chạy bước (Step Execution) để mount tác vụ",
          badgeText: "IDLE",
          tone: "muted",
          details: ["Tất cả Virtual Threads đang trong hàng đợi runnable hoặc đã hoàn tất."],
        },
      ],
    },
    {
      laneId: "vt-run-queue",
      laneTitle: `Hàng đợi Chờ Điều phối (${state.virtualThreads.filter((v) => v.status === "QUEUED_RUNNABLE").length} Tasks)`,
      cards: runnableQueueCards.length > 0 ? runnableQueueCards : [
        {
          id: "queue-empty",
          title: "Hàng đợi Runnable Trống",
          subtitle: "Mọi tác vụ đã được lên lịch",
          badgeText: "0 QUEUED",
          tone: "muted",
          details: ["Nhấn Spawn Virtual Threads để thêm tải công việc."],
        },
      ],
    },
  ];
}
