import type {
  KafkaConsumerGroupState,
  PostgresMvccBtreeState,
  RedisStampedeState,
  JavaMemoryGcState,
  JavaHashMapState,
  JavaVirtualThreadsState,
  JavaExceptionsState,
  JavaConcurrencyState,
  JavaStreamsState,
  JavaCompletableFutureState,
  JavaConcurrentHashMapState,
  JavaOptionalState,
  JavaThreadPoolState,
  JavaThreadLocalState,
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
  if (!state || !Array.isArray(state.partitions) || !Array.isArray(state.consumers)) {
    return [];
  }

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
  if (!state || !Array.isArray(state.workers)) {
    return [];
  }

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
  if (!state || !Array.isArray(state.btreeNodes) || !Array.isArray(state.heapTuples)) {
    return [];
  }

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
      t.visibilityReason,
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
  if (!state || !Array.isArray(state.youngEden) || !Array.isArray(state.threadStack)) {
    return [];
  }

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
          title: "Eden Space Empty",
          subtitle: "Ready for allocation",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["No active objects allocated or recently swept clean by Minor GC."],
        },
      ],
    },
    {
      laneId: "jvm-young-survivor",
      laneTitle: `Young Gen: Active Survivor S${state.activeSurvivor} (To-Space S${1 - state.activeSurvivor} is Empty)`,
      cards: survivorCards.length > 0 ? survivorCards : [
        {
          id: "survivor-empty",
          title: `Survivor S${state.activeSurvivor} Empty`,
          subtitle: "No objects survived Minor GC yet",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["Short-lived objects died in Eden without needing evacuation into Survivor."],
        },
      ],
    },
    {
      laneId: "jvm-old-gen",
      laneTitle: `Old Gen / Tenured Space (${state.oldGen.length}/${state.oldGenCapacity} slots)`,
      cards: oldGenCards.length > 0 ? oldGenCards : [
        {
          id: "oldgen-empty",
          title: "Old Generation Empty",
          subtitle: "No promoted objects",
          badgeText: "0 OBJECTS",
          tone: "muted",
          details: ["Objects must survive 3 Minor GC cycles to be promoted to Old Gen."],
        },
      ],
    },
  ];
}

export function projectJavaHashMapFrameToLanes(
  frame: SimulationStepFrame<JavaHashMapState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.buckets)) {
    return [];
  }

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
      title: `Hash Computation: "${state.lastOperationDetails.key}"`,
      subtitle: `hashCode() = ${state.lastOperationDetails.rawHashCode}`,
      badgeText: state.lastOperationDetails.collisionOccurred ? "COLLISION DETECTED" : "NEW SLOT",
      tone: state.lastOperationDetails.collisionOccurred ? "warning" : "healthy",
      details: [
        `Perturbation hash: (h ^ (h >>> 16)) = 0x${state.lastOperationDetails.spreadHash.toString(16)}`,
        `Index: (${state.capacity} - 1) & hash = ${state.lastOperationDetails.targetIndex}`,
        `Treeified: ${state.lastOperationDetails.treeified ? "YES (Red-Black Tree)" : "NO"}`,
      ],
    },
  ] : [
    {
      id: "no-op",
      title: "No Hash Operation Yet",
      subtitle: "Click Put Entry to begin",
      badgeText: "IDLE",
      tone: "muted",
      details: ["Execute a PUT command to inspect hash perturbation and bucket index calculation."],
    },
  ];

  return [
    {
      laneId: "hashmap-calculation",
      laneTitle: `Operation & Perturbation Spreading Calculation`,
      cards: opCards,
    },
    {
      laneId: "hashmap-active-buckets",
      laneTitle: `Table Array Node<K,V>[] — Utilizing ${bucketCards.length}/${state.capacity} slots (Threshold: ${state.threshold})`,
      cards: bucketCards.length > 0 ? bucketCards : [
        {
          id: "all-empty",
          title: "All Buckets Currently Empty",
          subtitle: `Capacity: ${state.capacity}`,
          badgeText: "SIZE: 0",
          tone: "muted",
          details: ["No key-value pairs added to HashMap yet."],
        },
      ],
    },
  ];
}

export function projectJavaVirtualThreadsFrameToLanes(
  frame: SimulationStepFrame<JavaVirtualThreadsState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.virtualThreads) || !Array.isArray(state.carrierThreads)) {
    return [];
  }

  const carrierCards: VisualNodeCard[] = state.carrierThreads.map((c) => ({
    id: c.id,
    title: c.name,
    subtitle: `OS Platform Thread (Tasks processed: ${c.totalTasksProcessed})`,
    badgeText: c.status === "PINNED" ? "CRITICAL: PINNED" : c.status === "BUSY" ? "BUSY (MOUNTED)" : "IDLE",
    tone: c.status === "PINNED" ? "danger" : c.status === "BUSY" ? "healthy" : "muted",
    details: [
      `Status: ${c.status}`,
      `Running Task: ${c.currentVirtualThreadId ?? "None (Idle)"}`,
      c.status === "PINNED" ? "LOCKED BY SYNCHRONIZED BLOCK!" : "Ready to mount next Virtual Thread",
    ],
  }));

  const activeVtCards: VisualNodeCard[] = state.virtualThreads
    .filter((vt) => vt.status !== "QUEUED_RUNNABLE" && vt.status !== "COMPLETED")
    .map((vt) => ({
      id: vt.id,
      title: vt.name,
      subtitle: `Status: ${vt.status}`,
      badgeText: vt.status === "PINNED_BLOCKED" ? "PINNED" : vt.status === "YIELDED_PARKED_IO" ? "PARKED (I/O YIELD)" : "MOUNTED",
      tone: vt.status === "PINNED_BLOCKED" ? "danger" : vt.status === "YIELDED_PARKED_IO" ? "warning" : "healthy",
      details: [
        `Mounted Carrier: ${vt.mountedCarrierId ?? "None (Continuation on Heap)"}`,
        `Stack footprint: ~${vt.stackSizeKb} KB (dynamic heap)`,
        vt.pinningReason ? `Warning: ${vt.pinningReason}` : "I/O non-blocking yield",
      ],
    }));

  const runnableQueueCards: VisualNodeCard[] = state.virtualThreads
    .filter((vt) => vt.status === "QUEUED_RUNNABLE")
    .slice(0, 8)
    .map((vt) => ({
      id: vt.id,
      title: vt.name,
      subtitle: "Runnable Queue",
      badgeText: "AWAITING CARRIER",
      tone: "info",
      details: ["Ready to mount onto the next idle Carrier Thread."],
    }));

  return [
    {
      laneId: "vt-carrier-pool",
      laneTitle: `OS Carrier Thread Pool (${state.carrierPoolSize} Kernel Threads) — Pinning Alert: ${state.hasPinnedCarrierAlert ? "ON" : "OFF"}`,
      cards: carrierCards,
    },
    {
      laneId: "vt-active-threads",
      laneTitle: `Active or Parked Virtual Threads (${activeVtCards.length} active)`,
      cards: activeVtCards.length > 0 ? activeVtCards : [
        {
          id: "no-active-vt",
          title: "No Virtual Threads Currently Running",
          subtitle: "Click Step Execution to schedule tasks",
          badgeText: "IDLE",
          tone: "muted",
          details: ["All Virtual Threads are in the runnable queue or have completed execution."],
        },
      ],
    },
    {
      laneId: "vt-run-queue",
      laneTitle: `Runnable Task Queue (${state.virtualThreads.filter((v) => v.status === "QUEUED_RUNNABLE").length} Tasks)`,
      cards: runnableQueueCards.length > 0 ? runnableQueueCards : [
        {
          id: "queue-empty",
          title: "Runnable Queue Empty",
          subtitle: "All tasks have been scheduled",
          badgeText: "0 QUEUED",
          tone: "muted",
          details: ["Click Spawn Tasks to inject additional workload."],
        },
      ],
    },
  ];
}

export function projectJavaExceptionsFrameToLanes(
  frame: SimulationStepFrame<JavaExceptionsState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.callStack)) {
    return [];
  }

  // Lane 1: Thread Call Stack Frames (Top of stack first)
  const stackCards: VisualNodeCard[] = state.callStack
    .slice()
    .reverse()
    .map((item, idx) => {
      const isTop = idx === 0;
      const isHandlingCatch =
        state.handledThrowable !== null && isTop;
      const hasResource = item.openedResources.length > 0;

      let tone: VisualNodeCard["tone"] = "healthy";
      if (state.activeThrowable && isTop) {
        tone = "danger";
      } else if (isHandlingCatch) {
        tone = "healthy";
      } else if (hasResource) {
        tone = "info";
      }

      const details: string[] = [
        `ExceptionTable: ${item.exceptionTable.length > 0 ? item.exceptionTable.map((e) => `catch(${e.catchType})->PC:${e.targetPc}`).join(", ") : "None (Pass-through)"}`,
        `Resources: ${item.openedResources.length > 0 ? item.openedResources.map((r) => `${r.name} (${r.isClosed ? "CLOSED" : "OPEN"})`).join(", ") : "0"}`,
      ];

      if (item.hasFinallyBlock) {
        details.push("finally: [Guaranteed Execution]");
      }

      return {
        id: item.id,
        title: `${item.className}.${item.methodName}`,
        subtitle: isTop ? "Top of Call Stack (Active PC)" : `Caller Frame (Depth #${state.callStack.length - idx})`,
        badgeText: isTop
          ? state.activeThrowable
            ? "UNWINDING"
            : isHandlingCatch
              ? "CATCH HANDLER"
              : "EXECUTING"
          : "CALLER",
        tone,
        details,
      };
    });

  // Lane 2: Active or Handled Throwable Details
  const throwableCards: VisualNodeCard[] = [];
  if (state.activeThrowable) {
    const t = state.activeThrowable;
    throwableCards.push({
      id: t.id,
      title: `${t.className}`,
      subtitle: `Category: ${t.category}`,
      badgeText: "IN-FLIGHT THROWABLE",
      tone: t.category === "Error" ? "danger" : "warning",
      details: [
        `Message: "${t.message}"`,
        `Origin Depth: Frame #${t.stackTraceDepth}`,
        `HotSpot Bytecode: athrow opcode active`,
      ],
    });
  } else if (state.handledThrowable) {
    const h = state.handledThrowable;
    throwableCards.push({
      id: h.id,
      title: `${h.className} [HANDLED]`,
      subtitle: `Category: ${h.category}`,
      badgeText: "CAUGHT & CONSUMED",
      tone: "healthy",
      details: [
        `Caught message: "${h.message}"`,
        `Exception Table matched successfully`,
        `Normal execution resumed inside catch block`,
      ],
    });
  } else {
    throwableCards.push({
      id: "no-active-throwable",
      title: "No Active Throwable",
      subtitle: "Call Stack running steady",
      badgeText: "NORMAL CONTROL FLOW",
      tone: "muted",
      details: [
        "Normal bytecode execution proceeding via invokevirtual / ireturn.",
        "Throw an exception or invoke methods to trigger unwinding.",
      ],
    });
  }

  // Chained Suppressed Exceptions
  state.suppressedThrowables.forEach((s) => {
    throwableCards.push({
      id: s.id,
      title: `Suppressed: ${s.className}`,
      subtitle: `AutoCloseable on ${s.suppressedBy || "Resource"}`,
      badgeText: "SUPPRESSED (Throwable.addSuppressed)",
      tone: "warning",
      details: [
        `Message: "${s.message}"`,
        `Preserved alongside primary exception without masking!`,
      ],
    });
  });

  // Lane 3: AutoCloseable Resources Status
  const allResources = state.callStack.flatMap((f) =>
    f.openedResources.map((r) => ({ ...r, frameMethod: `${f.className}.${f.methodName}` })),
  );

  const resourceCards: VisualNodeCard[] = allResources.length > 0
    ? allResources.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: `Scope: ${r.frameMethod}`,
        badgeText: r.isClosed ? "AUTO-CLOSED" : "OPEN RESOURCE",
        tone: r.isClosed ? "healthy" : r.failOnClose ? "warning" : "info",
        details: [
          `AutoCloseable Interface: close() ${r.isClosed ? "executed" : "pending"}`,
          r.failOnClose ? "Config: close() will simulate failure" : "Config: clean closure",
        ],
      }))
    : [
        {
          id: "no-resources",
          title: "No Try-with-Resources Open",
          subtitle: "Zero unmanaged native handles",
          badgeText: "NO RESOURCES",
          tone: "muted",
          details: ["Resources declared in try(...) are automatically closed in reverse order of declaration."],
        },
      ];

  return [
    {
      laneId: "java-exceptions-stack",
      laneTitle: `Thread Call Stack (${state.callStack.length} Frames) — Unwound: ${state.framesUnwoundCount}`,
      cards: stackCards.length > 0 ? stackCards : [
        {
          id: "stack-empty",
          title: "Call Stack Empty",
          subtitle: state.unhandledEscaped ? "Thread Crashed with Uncaught Exception" : "All frames returned",
          badgeText: state.unhandledEscaped ? "FATAL THREAD DEATH" : "EMPTY",
          tone: state.unhandledEscaped ? "danger" : "muted",
          details: state.unhandledEscaped
            ? ["UncaughtExceptionHandler invoked. Process or worker thread terminated."]
            : ["Thread has terminated normal execution."],
        },
      ],
    },
    {
      laneId: "java-exceptions-throwable",
      laneTitle: `Throwable State & Suppressed Chains (${throwableCards.length} Items)`,
      cards: throwableCards,
    },
    {
      laneId: "java-exceptions-resources",
      laneTitle: `AutoCloseable Resources & Reverse Order Cleanup (${state.resourcesAutoClosedCount} Auto-Closed)`,
      cards: resourceCards,
    },
  ];
}

export function projectJavaConcurrencyFrameToLanes(
  frame: SimulationStepFrame<JavaConcurrencyState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !state.markWord || !Array.isArray(state.threads)) {
    return [];
  }

  // Lane 1: Object Header (Mark Word) & Lock Escalation Status
  const mw = state.markWord;
  let lockTone: VisualNodeCard["tone"] = "healthy";
  let lockBadge = "UNLOCKED (001)";

  if (mw.lockState === "BIASED") {
    lockTone = "healthy";
    lockBadge = "BIASED (101)";
  } else if (mw.lockState === "LIGHTWEIGHT") {
    lockTone = "warning";
    lockBadge = "LIGHTWEIGHT CAS (00)";
  } else if (mw.lockState === "HEAVYWEIGHT") {
    lockTone = "danger";
    lockBadge = "HEAVYWEIGHT MUTEX (10)";
  }

  const markWordCards: VisualNodeCard[] = [
    {
      id: "hotspot-mark-word",
      title: "HotSpot 64-bit Mark Word",
      subtitle: `Lock State: ${mw.lockState}`,
      badgeText: lockBadge,
      tone: lockTone,
      details: [
        `Owner Thread: ${mw.ownerThreadId ?? "None (Uncontested)"}`,
        `Spin Count: ${mw.spinCount}`,
        `Monitor WaitSet: ${mw.monitorWaitQueue.length} threads parked`,
        state.lockInflationReason ? `Escalation: ${state.lockInflationReason}` : "Uncontested fast path",
      ],
    },
    {
      id: "jmm-shared-memory",
      title: "Heap Main Memory Variable",
      subtitle: state.isVolatileVariable ? "Type: volatile int" : "Type: non-volatile int",
      badgeText: state.isVolatileVariable ? "VOLATILE COHERENT" : "STALE READ HAZARD",
      tone: state.isVolatileVariable ? "healthy" : state.raceConditionDetected ? "danger" : "warning",
      details: [
        `Current Main Memory Value: ${state.sharedMainMemoryValue}`,
        `Memory Barrier: ${state.memoryBarrierActive}`,
        state.isVolatileVariable
          ? "StoreLoad barrier flushes CPU store buffer immediately"
          : "CPUs may cache stale copy in L1/L2 registers without sync",
      ],
    },
  ];

  // Lane 2: Threads & Local CPU Cache / Register Coherence
  const threadCards: VisualNodeCard[] = state.threads.map((t) => {
    const isStale = t.localCachedValue !== state.sharedMainMemoryValue;
    let tone: VisualNodeCard["tone"] = "info";
    if (t.holdingLock) tone = "healthy";
    else if (t.status === "SPINNING_CAS") tone = "warning";
    else if (t.status === "PARKED_MUTEX") tone = "danger";

    return {
      id: t.id,
      title: t.name,
      subtitle: `Status: ${t.status}`,
      badgeText: t.holdingLock ? "HOLDS LOCK" : t.status,
      tone,
      details: [
        `Thread-Local L1 Value: ${t.localCachedValue} ${isStale ? "(STALE!)" : "(Synchronized)"}`,
        `CAS Spin Attempts: ${t.casSpinAttempts}`,
        t.status === "PARKED_MUTEX"
          ? "Suspended in OS Futex/WaitSet (Kernel Context Switch)"
          : t.status === "SPINNING_CAS"
            ? "Executing CPU PAUSE loops in user-space"
            : "Active execution",
      ],
    };
  });

  // Lane 3: Synchronization Telemetry & Kernel Metrics
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "cas-telemetry",
      title: "Optimistic Atomic CAS Telemetry",
      subtitle: "User-space Compare-And-Swap Operations",
      badgeText: `${state.totalCasOperations} CAS OPS`,
      tone: "info",
      details: [
        `Total atomic cmpxchg executed: ${state.totalCasOperations}`,
        "Lock-free optimistic progress without kernel traps",
      ],
    },
    {
      id: "kernel-context-switch-telemetry",
      title: "OS Kernel Context Switch Overhead",
      subtitle: "Thread Park / Unpark Events",
      badgeText: `${state.contextSwitchesCount} CONTEXT SWITCHES`,
      tone: state.contextSwitchesCount > 0 ? "danger" : "healthy",
      details: [
        `Kernel context switches: ${state.contextSwitchesCount}`,
        state.contextSwitchesCount > 0
          ? "Heavyweight monitor invoked pthread_mutex / futex syscalls (~1-5 μs per switch)"
          : "Zero kernel transitions (100% user-mode speed)",
      ],
    },
  ];

  return [
    {
      laneId: "jmm-mark-word",
      laneTitle: `HotSpot Object Header (Mark Word) & JMM Heap Memory (${mw.lockState})`,
      cards: markWordCards,
    },
    {
      laneId: "jmm-threads",
      laneTitle: `Application Threads & CPU Cache Coherence (${state.threads.length} Threads)`,
      cards: threadCards,
    },
    {
      laneId: "jmm-telemetry",
      laneTitle: "Concurrency Performance & Kernel Metrics",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaStreamsFrameToLanes(
  frame: SimulationStepFrame<JavaStreamsState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.stages) || !Array.isArray(state.items)) {
    return [];
  }

  // Lane 1: Pipeline Stages (Chained Sink<T> Nodes)
  const stageCards: VisualNodeCard[] = state.stages.map((stage, idx) => {
    let tone: VisualNodeCard["tone"] = "info";
    if (stage.isTerminal) tone = "healthy";
    else if (stage.isStateful) tone = "warning";
    else if (stage.isShortCircuit) tone = "info";

    const details: string[] = [
      `Type: ${stage.isTerminal ? "Terminal Operation (Eager)" : "Intermediate Operation (Lazy)"}`,
      `Behavior: ${stage.isStateful ? "Stateful Barrier (Requires Buffering)" : "Stateless (Loop Fusion Compatible)"}`,
      `Processed Elements: ${stage.processedCount}`,
    ];

    if (stage.internalBuffer.length > 0) {
      details.push(`Internal Buffer: [${stage.internalBuffer.join(", ")}]`);
    }

    return {
      id: stage.id,
      title: `Stage ${idx + 1}: ${stage.name}`,
      subtitle: stage.isTerminal ? "Terminal Sink Accumulator" : "Chained Sink<T> Delegate",
      badgeText: stage.isTerminal
        ? "TERMINAL SINK"
        : stage.isStateful
          ? "STATEFUL BARRIER"
          : "FUSED SINK",
      tone,
      details,
    };
  });

  // Lane 2: Elements in Pipeline Traversal (Spliterator Stream Items)
  const itemCards: VisualNodeCard[] = state.items.map((item) => {
    let tone: VisualNodeCard["tone"] = "muted";
    if (item.status === "COLLECTED") tone = "healthy";
    else if (item.status === "PROCESSING") tone = "info";
    else if (item.status === "FILTERED_OUT") tone = "warning";
    else if (item.status === "SKIPPED_SHORT_CIRCUIT") tone = "muted";

    return {
      id: item.id,
      title: `Item [Val: ${item.originalValue}]`,
      subtitle: `Current Status: ${item.status}`,
      badgeText: item.status,
      tone,
      details: [
        `Original Value: ${item.originalValue}`,
        `Current Transformed Value: ${item.currentValue}`,
        `Latest Log: ${item.history[item.history.length - 1] || "Initialized"}`,
      ],
    };
  });

  // Lane 3: Loop Fusion & Heap Allocation Telemetry
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "loop-fusion-allocations",
      title: "Heap Intermediate Collections",
      subtitle: "Loop Fusion Memory Efficiency",
      badgeText:
        state.intermediateListsAllocated === 0
          ? "0 LISTS (ZERO HEAP TRASH)"
          : `${state.intermediateListsAllocated} INTERMEDIATE LISTS`,
      tone: state.intermediateListsAllocated === 0 ? "healthy" : "danger",
      details: [
        state.intermediateListsAllocated === 0
          ? "Loop Fusion Active: Intermediate stages fuse into a single pass per element with zero intermediate List allocations."
          : `Naive Multi-Pass: Allocated ${state.intermediateListsAllocated} temporary intermediate ArrayLists on Heap!`,
        `Total Sink.accept() Dispatches: ${state.sinkAcceptCalls}`,
        `Elements Examined: ${state.totalElementsExamined} / ${state.items.length}`,
      ],
    },
    {
      id: "short-circuit-status",
      title: "Short-Circuit Cancellation Status",
      subtitle: "Sink.cancellationRequested() Check",
      badgeText: state.shortCircuitTriggered ? "SHORT-CIRCUITED (ABORTED)" : "ACTIVE TRAVERSAL",
      tone: state.shortCircuitTriggered ? "healthy" : "info",
      details: [
        state.shortCircuitTriggered
          ? "Short-circuit limit reached! Traversal terminated early without touching remaining source elements."
          : "Pipeline continuing normal traversal.",
        `Collected Output Results: [${state.collectedResults.join(", ")}]`,
      ],
    },
  ];

  return [
    {
      laneId: "stream-stages",
      laneTitle: `Stream Pipeline Stages (${state.stages.length} Chained Sinks)`,
      cards: stageCards,
    },
    {
      laneId: "stream-elements",
      laneTitle: `Spliterator Source & Element Flow (${state.items.length} Elements)`,
      cards: itemCards,
    },
    {
      laneId: "stream-telemetry",
      laneTitle: "Loop Fusion & Memory Telemetry",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaCompletableFutureFrameToLanes(
  frame: SimulationStepFrame<JavaCompletableFutureState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.stages)) {
    return [];
  }

  // Lane 1: CompletionStage DAG Stages
  const stageCards: VisualNodeCard[] = state.stages.map((st) => {
    let tone: VisualNodeCard["tone"] = "muted";
    if (st.status === "COMPLETED") tone = "healthy";
    else if (st.status === "RUNNING") tone = "info";
    else if (st.status === "FAILED") tone = "danger";
    else if (st.status === "BLOCKED_STARVATION") tone = "danger";

    const details: string[] = [
      `Pool Target: ${st.poolType}`,
      `Worker: ${st.workerThreadId || "Unassigned"}`,
      `Signature: ${st.methodSignature}`,
    ];
    if (st.result) {
      details.push(`Result: ${st.result}`);
    }
    if (st.errorMessage) {
      details.push(`Exception: ${st.errorMessage}`);
    }

    return {
      id: st.id,
      title: st.name,
      subtitle: `Stage Status: ${st.status}`,
      badgeText: st.status,
      tone,
      details,
    };
  });

  // Lane 2: Worker Thread Pools
  const allWorkers = [...(state.commonPoolWorkers || []), ...(state.customPoolWorkers || [])];
  const workerCards: VisualNodeCard[] = allWorkers.map((w) => {
    let tone: VisualNodeCard["tone"] = "healthy";
    if (w.status === "EXECUTING") tone = "info";
    else if (w.status === "DEADLOCKED_STARVED") tone = "danger";

    return {
      id: w.id,
      title: w.name,
      subtitle: `Pool: ${w.poolType}`,
      badgeText: w.status,
      tone,
      details: [
        `Pool Class: ${w.poolType}`,
        `Current Assignment: ${w.assignedStageId || "None (Idle in Pool)"}`,
        w.status === "DEADLOCKED_STARVED"
          ? "CRITICAL: Pinned waiting on child future .join() call!"
          : "Available for non-blocking task execution",
      ],
    };
  });

  // Lane 3: Non-Blocking & Orchestration Health
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "thread-starvation-telemetry",
      title: "ThreadPool Starvation & Deadlock Sentinel",
      subtitle: "Anti-pattern Detection: .join() in Worker",
      badgeText: state.threadStarvationDetected ? "STARVATION ALERT (DEADLOCK HAZARD)" : "ZERO STARVATION",
      tone: state.threadStarvationDetected ? "danger" : "healthy",
      details: [
        state.threadStarvationDetected
          ? "A worker thread was blocked waiting for a child task on the same pool (.join() anti-pattern)."
          : "Pure non-blocking stage execution. Zero threads blocked.",
        `Caller Thread Blocked: ${state.callerThreadBlocked ? "YES (LATENCY DEGRADED)" : "NO (100% NON-BLOCKING)"}`,
      ],
    },
    {
      id: "pipeline-progress-telemetry",
      title: "CompletionStage DAG Progress",
      subtitle: "Asynchronous Coordination Telemetry",
      badgeText: `${state.completedStageCount} / ${state.stages.length} STAGES DONE`,
      tone: state.pipelineFinished ? "healthy" : "info",
      details: [
        `Pipeline Status: ${state.pipelineFinished ? "Completed" : "In Flight"}`,
        `Error Recovery (.exceptionally): ${state.recoveredFromError ? "Active & Recovered" : "Not Triggered"}`,
      ],
    },
  ];

  return [
    {
      laneId: "cf-stages",
      laneTitle: `CompletableFuture DAG Stages (${state.stages.length} Stages)`,
      cards: stageCards,
    },
    {
      laneId: "cf-workers",
      laneTitle: `Thread Pool Workers (${allWorkers.length} Workers)`,
      cards: workerCards,
    },
    {
      laneId: "cf-telemetry",
      laneTitle: "Non-blocking & Starvation Telemetry",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaConcurrentHashMapFrameToLanes(
  frame: SimulationStepFrame<JavaConcurrentHashMapState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.bins) || !Array.isArray(state.threads)) {
    return [];
  }

  // Lane 1: Table Bins
  const binCards: VisualNodeCard[] = state.bins.map((bin) => {
    let tone: VisualNodeCard["tone"] = "muted";
    let badge = "EMPTY";

    if (bin.isForwardingNode) {
      tone = "warning";
      badge = "FORWARDING (-1)";
    } else if (bin.isLocked) {
      tone = "danger";
      badge = `LOCKED (${bin.lockingThreadId})`;
    } else if (bin.nodes.length > 1) {
      tone = "warning";
      badge = `CHAIN (${bin.nodes.length})`;
    } else if (bin.nodes.length === 1) {
      tone = "healthy";
      badge = "SINGLE NODE";
    }

    return {
      id: `bin-${bin.index}`,
      title: `Bin #${bin.index}`,
      subtitle: bin.isForwardingNode
        ? "ForwardingNode (hash = -1 / MOVED)"
        : `Items: ${bin.nodes.length}`,
      badgeText: badge,
      tone,
      details: bin.nodes.map((n) => `[hash: ${n.hash % 1000}] ${n.key} -> ${n.value}`),
    };
  });

  // Lane 2: Worker Threads
  const threadCards: VisualNodeCard[] = state.threads.map((th) => {
    let tone: VisualNodeCard["tone"] = "healthy";
    if (th.status === "BLOCKED_ON_BIN") tone = "danger";
    else if (th.status === "SYNCHRONIZED_LOCKED") tone = "warning";
    else if (th.status === "HELPING_TRANSFER") tone = "info";

    return {
      id: th.id,
      title: th.name,
      subtitle: `Status: ${th.status}`,
      badgeText: th.status,
      tone,
      details: [
        `Target Bin: ${th.targetBinIndex !== null ? `Bin #${th.targetBinIndex}` : "None"}`,
        `Target Key: ${th.targetKey || "None"}`,
      ],
    };
  });

  // Lane 3: Locking & Scalability Telemetry
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "cas-empty-bins-metric",
      title: "Lock-Free CAS Insertions",
      subtitle: "casTabAt on Empty Buckets",
      badgeText: `${state.totalCasOperations} CAS OPS`,
      tone: "healthy",
      details: [
        `Total atomic CAS successes: ${state.totalCasOperations}`,
        "Zero monitor acquisition cost when inserting into unpopulated bins.",
      ],
    },
    {
      id: "bin-striped-locks-metric",
      title: "Striped Bin Locking",
      subtitle: "synchronized(binHead) on Collisions",
      badgeText: `${state.totalSynchronizedLocks} BIN LOCKS`,
      tone: state.totalContentionEvents > 0 ? "warning" : "healthy",
      details: [
        `Total bin locks acquired: ${state.totalSynchronizedLocks}`,
        `Contention wait events: ${state.totalContentionEvents}`,
        "Only the collided bucket is held; all other bins accept concurrent operations.",
      ],
    },
  ];

  return [
    {
      laneId: "chm-bins",
      laneTitle: `Hash Table Bins (${state.tableCapacity} Bins)`,
      cards: binCards,
    },
    {
      laneId: "chm-threads",
      laneTitle: `Worker Threads (${state.threads.length} Threads)`,
      cards: threadCards,
    },
    {
      laneId: "chm-telemetry",
      laneTitle: "Concurrency & Lock Striping Telemetry",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaOptionalFrameToLanes(
  frame: SimulationStepFrame<JavaOptionalState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.stages)) {
    return [];
  }

  // Lane 1: Optional Container Box
  const boxCards: VisualNodeCard[] = [
    {
      id: "opt-box",
      title: `Optional<${state.isPresent ? "PresentValue" : "Empty"}>`,
      subtitle: `Heap Container: ${state.heapBytesAllocated} bytes overhead`,
      badgeText: state.isPresent ? "PRESENT" : "EMPTY",
      tone: state.isPresent ? "healthy" : "warning",
      details: [
        `Payload Reference: ${state.wrappedValue ? `'${state.wrappedValue}'` : "null"}`,
        "Intended for method return types representing absent values.",
        "Non-serializable: Not permitted as JPA Entity / DTO fields.",
      ],
    },
  ];

  // Lane 2: Monadic Pipeline Stages
  const stageCards: VisualNodeCard[] = state.stages.map((st) => {
    let tone: VisualNodeCard["tone"] = "muted";
    if (st.status === "COMPLETED" || st.status === "PASSED") tone = "healthy";
    else if (st.status === "FILTERED_EMPTY") tone = "warning";

    return {
      id: st.id,
      title: st.name,
      subtitle: `Op Type: ${st.operationType}`,
      badgeText: st.status,
      tone,
      details: [
        `Current Stream State: ${st.currentValue || (st.status === "FILTERED_EMPTY" ? "Optional.empty()" : "Pending")}`,
      ],
    };
  });

  // Lane 3: Eager vs Lazy Evaluation Telemetry
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "evaluation-mode-metric",
      title: "Evaluation Strategy",
      subtitle: state.mode === "OR_ELSE_EAGER_HAZARD" ? "orElse(...) [Eager Hazard]" : "orElseGet(...) [Lazy Optimal]",
      badgeText: state.mode,
      tone: state.mode === "OR_ELSE_EAGER_HAZARD" ? "danger" : "healthy",
      details: [
        `Database Queries Executed: ${state.dbQueryExecuted ? "1 (WASTED RPC!)" : "0 (SAVED)"}`,
        `CPU Cycles Burned: ${state.cpuCyclesBurned}`,
        state.mode === "OR_ELSE_EAGER_HAZARD"
          ? "CRITICAL: orElse() evaluated argument eagerly before presence check!"
          : "Lazy Supplier was skipped because Optional was already present.",
      ],
    },
    {
      id: "anti-pattern-sentinel",
      title: "Code Smell Sentinel",
      subtitle: "opt.isPresent() + opt.get() Check",
      badgeText: state.antiPatternDetected ? "ANTI-PATTERN DETECTED" : "IDIOMATIC MONAD",
      tone: state.antiPatternDetected ? "danger" : "healthy",
      details: [
        state.antiPatternDetected
          ? "Raw .get() call detected! Defeats functional safety and risks NoSuchElementException."
          : "Clean monadic composition via .map(), .filter(), and .orElseGet().",
      ],
    },
  ];

  return [
    {
      laneId: "opt-box-lane",
      laneTitle: "JVM Heap Optional Object",
      cards: boxCards,
    },
    {
      laneId: "opt-stages-lane",
      laneTitle: `Monadic Pipeline Stages (${state.stages.length} Stages)`,
      cards: stageCards,
    },
    {
      laneId: "opt-telemetry-lane",
      laneTitle: "Evaluation & Resource Telemetry",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaThreadPoolFrameToLanes(
  frame: SimulationStepFrame<JavaThreadPoolState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.workers) || !Array.isArray(state.queue)) {
    return [];
  }

  // Lane 1: Worker Thread Pool
  const workerCards: VisualNodeCard[] = state.workers.map((w) => {
    let tone: VisualNodeCard["tone"] = "healthy";
    if (w.status === "BUSY") tone = "info";
    else if (w.status === "EXPIRED") tone = "muted";

    return {
      id: w.id,
      title: w.name,
      subtitle: w.isCore ? "Core Pool Worker" : "Non-Core Temporary Worker",
      badgeText: w.status,
      tone,
      details: [
        `Assignment: ${w.currentTaskId || "Idle (Polling Queue)"}`,
        `Completed Tasks: ${w.tasksCompletedCount}`,
      ],
    };
  });

  // Lane 2: BlockingQueue Buffer
  const queueCards: VisualNodeCard[] = [
    {
      id: "work-queue-status",
      title: `BlockingQueue (${state.queue.length} / ${state.queueCapacity})`,
      subtitle: state.queue.length >= state.queueCapacity ? "QUEUE SATURATED (BURST SPIKE)" : "QUEUE AVAILABLE",
      badgeText: `${state.queue.length} QUEUED`,
      tone: state.queue.length >= state.queueCapacity ? "danger" : state.queue.length > 0 ? "warning" : "healthy",
      details: state.queue.map((t) => `${t.name} (submitted at tick ${t.submittedAtTick})`),
    },
  ];

  // Lane 3: Saturation & Rejection Telemetry
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "dispatch-4step-metric",
      title: "4-Step Dispatch Algorithm Status",
      subtitle: "corePool -> workQueue -> maxPool -> handler",
      badgeText: state.saturationEventTriggered ? "SATURATED" : "ACCEPTING",
      tone: state.saturationEventTriggered ? "danger" : "healthy",
      details: [
        `Core Workers: ${state.workers.filter((w) => w.isCore).length} / ${state.corePoolSize}`,
        `Non-Core Workers: ${state.workers.filter((w) => !w.isCore).length} / ${state.maximumPoolSize - state.corePoolSize}`,
        `Submitted Tasks: ${state.totalTasksSubmitted}`,
        `Completed Tasks: ${state.totalTasksCompleted}`,
      ],
    },
    {
      id: "rejection-policy-metric",
      title: `Saturation Policy: ${state.rejectionPolicy}`,
      subtitle: state.callerRunsActive ? "Caller Thread Absorbing Load" : "Policy Armed",
      badgeText: `${state.totalTasksRejected} REJECTED`,
      tone: state.totalTasksRejected > 0 ? "danger" : "healthy",
      details: [
        `Rejection Count: ${state.totalTasksRejected}`,
        state.callerRunsActive
          ? "CallerRunsPolicy active: Main caller thread executing tasks directly, applying natural backpressure."
          : `Current handler policy: ${state.rejectionPolicy}`,
      ],
    },
  ];

  return [
    {
      laneId: "tp-workers",
      laneTitle: `Worker Thread Pool (${state.workers.length} / ${state.maximumPoolSize} Workers)`,
      cards: workerCards,
    },
    {
      laneId: "tp-queue",
      laneTitle: `Work Queue Buffer (${state.queue.length} / ${state.queueCapacity} Tasks)`,
      cards: queueCards,
    },
    {
      laneId: "tp-telemetry",
      laneTitle: "Saturation & Rejection Telemetry",
      cards: telemetryCards,
    },
  ];
}

export function projectJavaThreadLocalFrameToLanes(
  frame: SimulationStepFrame<JavaThreadLocalState>,
): VisualLaneProjection[] {
  const { state } = frame;
  if (!state || !Array.isArray(state.workers) || !Array.isArray(state.references)) {
    return [];
  }

  // Lane 1: ThreadLocalMap Table on Worker Threads
  const workerCards: VisualNodeCard[] = state.workers.map((w) => {
    const staleCount = w.threadLocalsTable.filter((e) => e.isKeyCleared).length;
    let tone: VisualNodeCard["tone"] = "healthy";
    if (staleCount > 0) tone = "danger";
    else if (w.threadLocalsTable.length > 0) tone = "warning";

    const details: string[] = [
      `Current In-Flight Request: ${w.currentRequestId || "Idle in Pool"}`,
      `ThreadLocalMap Entries Count: ${w.threadLocalsTable.length}`,
      ...w.threadLocalsTable.map(
        (e) =>
          `[Slot #${e.slotIndex}] Key: ${e.isKeyCleared ? "NULL (STALE WEAK REF!)" : e.threadLocalKeyName} | Value: ${e.valuePayload} (${e.valueSizeMb} MB)`,
      ),
    ];

    return {
      id: w.id,
      title: w.name,
      subtitle: staleCount > 0 ? `${staleCount} STALE LEAKED ENTRIES` : "Clean ThreadLocal Context",
      badgeText: staleCount > 0 ? "MEMORY LEAK" : w.threadLocalsTable.length > 0 ? "ACTIVE MAP" : "IDLE",
      tone,
      details,
    };
  });

  // Lane 2: Java Reference Reachability Graph
  const referenceCards: VisualNodeCard[] = state.references.map((ref) => {
    let tone: VisualNodeCard["tone"] = "healthy";
    if (ref.isCollected) tone = "muted";
    else if (!ref.hasStrongRef && ref.type === "WEAK") tone = "danger";
    else if (ref.type === "SOFT") tone = "info";

    const details: string[] = [
      `Referent Object: ${ref.targetObject} (${ref.sizeMb} MB)`,
      `Strong Root Link: ${ref.hasStrongRef ? "Active (GCRoots connected)" : "Detached (Candidate for reclamation)"}`,
      `GC Status: ${ref.isCollected ? "COLLECTED BY GC" : "Retained on Heap"}`,
    ];
    if (ref.isEnqueuedInRefQueue) {
      details.push("Enqueued in ReferenceQueue for native cleanup");
    }

    return {
      id: ref.id,
      title: ref.name,
      subtitle: `Type: java.lang.ref.${ref.type === "STRONG" ? "Strong" : ref.type === "SOFT" ? "SoftReference" : ref.type === "WEAK" ? "WeakReference" : "PhantomReference"}`,
      badgeText: ref.isCollected ? "CLEARED" : ref.hasStrongRef ? "REACHABLE" : "WEAK/DETACHED",
      tone,
      details,
    };
  });

  // Lane 3: Memory Leak Sentinel & Heap Telemetry
  const telemetryCards: VisualNodeCard[] = [
    {
      id: "threadlocal-leak-sentinel",
      title: "ThreadPool Memory Leak Sentinel",
      subtitle: "Thread -> ThreadLocalMap -> Entry.value Link",
      badgeText: state.memoryLeakAlert ? "CRITICAL MEMORY LEAK" : "ZERO LEAKS",
      tone: state.memoryLeakAlert ? "danger" : "healthy",
      details: [
        `Total Leaked Memory: ${state.totalLeakedMb} MB`,
        `Stale Entries (key == null): ${state.staleEntriesCount}`,
        state.memoryLeakAlert
          ? "CRITICAL: Value retained by permanent worker thread because remove() was omitted in finally block!"
          : "Compliant try-finally { threadLocal.remove(); } lifecycle active.",
      ],
    },
    {
      id: "gc-sweep-telemetry",
      title: "Garbage Collector Cycle Telemetry",
      subtitle: "WeakReference vs SoftReference Reclaim",
      badgeText: `${state.gcRunsCount} GC RUNS`,
      tone: "info",
      details: [
        `Total GC sweeps: ${state.gcRunsCount}`,
        `HTTP Requests Processed: ${state.requestsProcessed}`,
        "WeakReference keys cleared on next GC; SoftReferences purged under heap pressure.",
      ],
    },
  ];

  return [
    {
      laneId: "tl-workers",
      laneTitle: `Worker Threads & ThreadLocalMap (${state.workers.length} Pooled Threads)`,
      cards: workerCards,
    },
    {
      laneId: "tl-references",
      laneTitle: "Java Reference Types Reachability Graph",
      cards: referenceCards,
    },
    {
      laneId: "tl-telemetry",
      laneTitle: "Memory Leak & GC Telemetry",
      cards: telemetryCards,
    },
  ];
}
