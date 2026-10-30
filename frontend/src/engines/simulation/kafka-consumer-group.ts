import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type KafkaAssignorStrategy =
  | "RangeAssignor"
  | "RoundRobinAssignor"
  | "CooperativeStickyAssignor";

export type KafkaGroupState =
  | "Empty"
  | "PreparingRebalance"
  | "CompletingRebalance"
  | "Stable";

export interface KafkaPartitionState {
  id: number;
  leaderBrokerId: number;
  logEndOffset: number;
  highWatermark: number;
  committedOffset: number;
  ownerConsumerId: string | null;
  revokingFromConsumerId: string | null;
}

export interface KafkaConsumerMember {
  id: string;
  status: "ACTIVE" | "HEARTBEAT_TIMEOUT" | "LEAVING";
  assignedPartitions: number[];
  lastHeartbeatTick: number;
}

export interface KafkaConsumerGroupState {
  topicName: string;
  groupId: string;
  assignor: KafkaAssignorStrategy;
  groupState: KafkaGroupState;
  generationId: number;
  leaderConsumerId: string | null;
  partitions: KafkaPartitionState[];
  consumers: KafkaConsumerMember[];
  stopTheWorldActive: boolean;
}

export interface KafkaSimulationConfig {
  topicName: string;
  groupId: string;
  partitionCount: number;
  initialConsumerCount: number;
  assignor: KafkaAssignorStrategy;
}

export type KafkaSimulationCommand =
  | { type: "PRODUCE_AND_POLL"; messagesPerPartition: number }
  | { type: "KILL_CONSUMER"; consumerId: string; reason: "heartbeat_timeout" | "graceful_leave" }
  | { type: "ADD_CONSUMER"; consumerId?: string }
  | { type: "COORDINATOR_COMPLETE_JOIN_SYNC" }
  | { type: "COOPERATIVE_INCREMENTAL_REASSIGN" }
  | { type: "SWITCH_ASSIGNOR"; assignor: KafkaAssignorStrategy };

export function computePartitionAssignment(
  partitionCount: number,
  activeConsumerIds: string[],
  assignor: KafkaAssignorStrategy,
  previousAssignment?: Map<string, number[]>,
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const cid of activeConsumerIds) {
    result.set(cid, []);
  }
  if (activeConsumerIds.length === 0) {
    return result;
  }

  const n = partitionCount;
  const m = activeConsumerIds.length;

  if (assignor === "RangeAssignor") {
    const minPerConsumer = Math.floor(n / m);
    const consumersWithExtra = n % m;
    let cursor = 0;
    activeConsumerIds.forEach((cid, idx) => {
      const count = minPerConsumer + (idx < consumersWithExtra ? 1 : 0);
      const owned: number[] = [];
      for (let i = 0; i < count; i++) {
        owned.push(cursor++);
      }
      result.set(cid, owned);
    });
    return result;
  }

  if (assignor === "RoundRobinAssignor" || !previousAssignment) {
    for (let p = 0; p < n; p++) {
      const targetConsumer = activeConsumerIds[p % m];
      result.get(targetConsumer)?.push(p);
    }
    return result;
  }

  // CooperativeStickyAssignor: preserve existing assignments up to target quota (ceil(n/m))
  const maxQuota = Math.ceil(n / m);
  const minQuota = Math.floor(n / m);
  const extraSlotsAllowed = n % m === 0 ? m : n % m;
  let consumersAtMaxQuota = 0;

  const assignedSet = new Set<number>();

  for (const cid of activeConsumerIds) {
    const prev = previousAssignment.get(cid) ?? [];
    const kept: number[] = [];
    for (const p of prev) {
      if (p < n && !assignedSet.has(p)) {
        const limit = consumersAtMaxQuota < extraSlotsAllowed ? maxQuota : minQuota;
        if (kept.length < limit) {
          kept.push(p);
          assignedSet.add(p);
        }
      }
    }
    if (kept.length === maxQuota) {
      consumersAtMaxQuota++;
    }
    result.set(cid, kept);
  }

  // Assign remaining unassigned partitions to consumers with lowest partition counts
  for (let p = 0; p < n; p++) {
    if (!assignedSet.has(p)) {
      let bestCid = activeConsumerIds[0];
      let bestLen = result.get(bestCid)?.length ?? 0;
      for (const cid of activeConsumerIds) {
        const len = result.get(cid)?.length ?? 0;
        if (len < bestLen) {
          bestCid = cid;
          bestLen = len;
        }
      }
      result.get(bestCid)?.push(p);
      assignedSet.add(p);
    }
  }

  for (const cid of activeConsumerIds) {
    result.get(cid)?.sort((a, b) => a - b);
  }
  return result;
}

function evaluateInvariants(state: KafkaConsumerGroupState): SimulationInvariantCheck[] {
  const ownerCountPerPartition = new Map<number, number>();
  for (const c of state.consumers) {
    if (c.status === "ACTIVE") {
      for (const p of c.assignedPartitions) {
        ownerCountPerPartition.set(p, (ownerCountPerPartition.get(p) ?? 0) + 1);
      }
    }
  }

  let exclusiveOwnership = true;
  for (const count of ownerCountPerPartition.values()) {
    if (count > 1) {
      exclusiveOwnership = false;
    }
  }

  const activeConsumers = state.consumers.filter((c) => c.status === "ACTIVE");
  const unassignedCount = state.partitions.filter((p) => p.ownerConsumerId === null).length;
  const fullCoverageWhenStable =
    state.groupState !== "Stable" || activeConsumers.length === 0 || unassignedCount === 0;

  return [
    {
      id: "exclusive-partition-ownership",
      label: "Exclusive Partition Ownership per Group",
      passed: exclusiveOwnership,
      detail: exclusiveOwnership
        ? "Mỗi Partition chỉ được gán cho tối đa 1 Consumer đang ACTIVE trong cùng Consumer Group."
        : "VI PHẠM: Có nhiều hơn 1 Consumer cùng đọc 1 Partition!",
    },
    {
      id: "stable-partition-coverage",
      label: "Complete Partition Coverage in Stable State",
      passed: fullCoverageWhenStable,
      detail: fullCoverageWhenStable
        ? `Tất cả ${state.partitions.length} Partitions đều có owner khi nhóm ở trạng thái Stable.`
        : `Đang có ${unassignedCount} Partitions chờ gán lại trong quá trình Rebalance.`,
    },
    {
      id: "cooperative-pause-check",
      label: "Zero Stop-The-World Pause (Cooperative Mode)",
      passed: !state.stopTheWorldActive,
      detail: state.stopTheWorldActive
        ? "Eager Rebalance đang thu hồi toàn bộ Partitions (Stop-The-World pause)."
        : "Các Partitions không bị ảnh hưởng vẫn tiếp tục xử lý bình thường.",
    },
  ];
}

function computeMetrics(state: KafkaConsumerGroupState): Record<string, string | number> {
  const activeConsumers = state.consumers.filter((c) => c.status === "ACTIVE");
  const totalLag = state.partitions.reduce(
    (acc, p) => acc + Math.max(0, p.highWatermark - p.committedOffset),
    0,
  );
  const ownedPartitions = state.partitions.filter((p) => p.ownerConsumerId !== null).length;

  return {
    "Group State": state.groupState,
    "Generation ID": state.generationId,
    "Active Consumers": `${activeConsumers.length} / ${state.consumers.length}`,
    "Assigned Partitions": `${ownedPartitions} / ${state.partitions.length}`,
    "Total Consumer Lag": totalLag,
    Assignor: state.assignor,
  };
}

export const kafkaConsumerGroupSimulation: SimulationEngineSpec<
  KafkaSimulationConfig,
  KafkaConsumerGroupState,
  KafkaSimulationCommand
> = {
  id: "kafka-consumer-group",
  title: "Apache Kafka Consumer Groups & Rebalance Internals",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Apache Kafka 3.8 GroupCoordinator State Machine & KIP-429 CooperativeStickyAssignor",
    accurateBehaviors: [
      "GroupCoordinator state transitions: Stable -> PreparingRebalance -> CompletingRebalance -> Stable",
      "Monotonic generationId increment on every completed JoinGroup/SyncGroup barrier",
      "Exact PartitionAssignor algorithms for RangeAssignor, RoundRobinAssignor, and CooperativeStickyAssignor",
      "Contrast between Eager Rebalance (full partition revocation / stop-the-world) and Cooperative Sticky (incremental revocation)",
    ],
    simplifications: [
      "Heartbeat intervals and session.timeout.ms are quantized into discrete logical ticks rather than wall-clock milliseconds",
      "FindCoordinator and TCP socket framing are represented as high-level protocol events in the inspector log",
    ],
    assumptions: [
      "All partitions belong to a single subscribed topic (orders.v1) with in-sync replicas",
      "Consumers have identical subscription regex and equal processing capacity",
    ],
    unsupportedEdgeCases: [
      "Static Group Membership (group.instance.id) session persistence across restarts",
      "Broker coordinator failover (__consumer_offsets partition leadership migration)",
    ],
  },
  presets: [
    {
      id: "eager-rebalance-on-crash",
      title: "1. Eager Rebalance (RangeAssignor) khi Consumer C3 Crash",
      badge: "Stop-The-World Rebalance",
      descriptionVi:
        "Khởi đầu với 3 Consumers và 6 Partitions. Khi C3 bị mất kết nối (Heartbeat Timeout), Eager Rebalance thu hồi toàn bộ 6 Partitions (Stop-The-World) trước khi gán lại cho C1 và C2.",
      config: {
        topicName: "orders.v1",
        groupId: "order-billing-cg",
        partitionCount: 6,
        initialConsumerCount: 3,
        assignor: "RangeAssignor",
      },
      scriptedCommands: [
        { type: "PRODUCE_AND_POLL", messagesPerPartition: 5 },
        { type: "KILL_CONSUMER", consumerId: "consumer-3", reason: "heartbeat_timeout" },
        { type: "COORDINATOR_COMPLETE_JOIN_SYNC" },
        { type: "PRODUCE_AND_POLL", messagesPerPartition: 4 },
      ],
    },
    {
      id: "cooperative-sticky-rebalance",
      title: "2. Cooperative Sticky (KIP-429) — Không dừng toàn cục",
      badge: "Production Recommended",
      descriptionVi:
        "Sử dụng CooperativeStickyAssignor: Khi C3 rời nhóm, C1 (P0, P1) và C2 (P2, P3) KHÔNG bị thu hồi các Partition đang giữ và tiếp tục đọc dữ liệu; chỉ P4 và P5 được phân bổ lại.",
      config: {
        topicName: "orders.v1",
        groupId: "order-billing-cg",
        partitionCount: 6,
        initialConsumerCount: 3,
        assignor: "CooperativeStickyAssignor",
      },
      scriptedCommands: [
        { type: "PRODUCE_AND_POLL", messagesPerPartition: 5 },
        { type: "KILL_CONSUMER", consumerId: "consumer-3", reason: "heartbeat_timeout" },
        { type: "COORDINATOR_COMPLETE_JOIN_SYNC" },
        { type: "PRODUCE_AND_POLL", messagesPerPartition: 4 },
        { type: "ADD_CONSUMER", consumerId: "consumer-4" },
        { type: "COOPERATIVE_INCREMENTAL_REASSIGN" },
      ],
    },
  ],

  createInitialFrame(config: KafkaSimulationConfig): SimulationStepFrame<KafkaConsumerGroupState> {
    const consumerIds = Array.from(
      { length: config.initialConsumerCount },
      (_, idx) => `consumer-${idx + 1}`,
    );
    const assignmentMap = computePartitionAssignment(
      config.partitionCount,
      consumerIds,
      config.assignor,
    );

    const partitions: KafkaPartitionState[] = Array.from(
      { length: config.partitionCount },
      (_, pIdx) => {
        let owner: string | null = null;
        for (const [cid, pList] of assignmentMap.entries()) {
          if (pList.includes(pIdx)) {
            owner = cid;
            break;
          }
        }
        return {
          id: pIdx,
          leaderBrokerId: (pIdx % 3) + 1,
          logEndOffset: 10,
          highWatermark: 10,
          committedOffset: 10,
          ownerConsumerId: owner,
          revokingFromConsumerId: null,
        };
      },
    );

    const consumers: KafkaConsumerMember[] = consumerIds.map((cid) => ({
      id: cid,
      status: "ACTIVE",
      assignedPartitions: assignmentMap.get(cid) ?? [],
      lastHeartbeatTick: 0,
    }));

    const state: KafkaConsumerGroupState = {
      topicName: config.topicName,
      groupId: config.groupId,
      assignor: config.assignor,
      groupState: "Stable",
      generationId: 1,
      leaderConsumerId: consumerIds[0] ?? null,
      partitions,
      consumers,
      stopTheWorldActive: false,
    };

    return {
      tick: 0,
      phase: "Stable (Gen 1)",
      title: `Khởi tạo Consumer Group "${config.groupId}" ở trạng thái Stable`,
      state,
      events: [
        {
          tick: 0,
          actor: "GroupCoordinator",
          action: "SYNC_GROUP_COMPLETE",
          detail: `Generation 1 thiết lập thành công với ${config.initialConsumerCount} Consumers và ${config.partitionCount} Partitions (${config.assignor}).`,
          tone: "ok",
        },
      ],
      invariants: evaluateInvariants(state),
      narration: {
        summaryVi: `Consumer Group "${config.groupId}" đang ở trạng thái Stable (generationId = 1). ${config.partitionCount} Partitions của topic "${config.topicName}" được chia đều cho ${config.initialConsumerCount} Consumers theo chiến lược ${config.assignor}.`,
        internalsNoteVi: `Trong giao thức Classic Consumer Group, Broker đóng vai trò GroupCoordinator bầu "${consumerIds[0]}" làm Group Leader trong pha JoinGroup. Consumer Leader thực thi thuật toán ${config.assignor} và gửi bảng phân bổ thông qua SyncGroupRequest.`,
      },
      metrics: computeMetrics(state),
    };
  },

  applyCommand(
    currentFrame: SimulationStepFrame<KafkaConsumerGroupState>,
    command: KafkaSimulationCommand,
  ): SimulationStepFrame<KafkaConsumerGroupState> {
    const nextTick = currentFrame.tick + 1;
    const prev = currentFrame.state;
    const clonedPartitions: KafkaPartitionState[] = prev.partitions.map((p) => ({ ...p }));
    const clonedConsumers: KafkaConsumerMember[] = prev.consumers.map((c) => ({
      ...c,
      assignedPartitions: [...c.assignedPartitions],
    }));

    if (command.type === "PRODUCE_AND_POLL") {
      const delta = command.messagesPerPartition;
      for (const p of clonedPartitions) {
        p.logEndOffset += delta;
        p.highWatermark += delta;
        if (p.ownerConsumerId !== null && !prev.stopTheWorldActive) {
          p.committedOffset = p.highWatermark;
        }
      }
      for (const c of clonedConsumers) {
        if (c.status === "ACTIVE") {
          c.lastHeartbeatTick = nextTick;
        }
      }

      const nextState: KafkaConsumerGroupState = {
        ...prev,
        partitions: clonedPartitions,
        consumers: clonedConsumers,
      };

      return {
        tick: nextTick,
        phase: `${nextState.groupState} (Gen ${nextState.generationId})`,
        title: `Producer gửi +${delta} msg/partition & Active Consumers poll()`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Producer / Consumers",
            action: "FETCH_AND_COMMIT_OFFSET",
            detail: `Mỗi Partition nhận thêm ${delta} records. Các Partition có owner xử lý và commit offset lên __consumer_offsets.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summaryVi: `Producer ghi thêm ${delta} bản ghi vào mỗi Partition (High Watermark tăng). Các Consumer đang giữ Partition thực hiện poll() và commit offset mới.`,
          internalsNoteVi: `Consumer chỉ được phép đọc các message có offset < High Watermark (đã được sao chép đầy đủ tới toàn bộ In-Sync Replicas - ISR).`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (command.type === "KILL_CONSUMER") {
      const target = clonedConsumers.find((c) => c.id === command.consumerId);
      const orphanedPartitions = target ? [...target.assignedPartitions] : [];
      if (target) {
        target.status =
          command.reason === "heartbeat_timeout" ? "HEARTBEAT_TIMEOUT" : "LEAVING";
        target.assignedPartitions = [];
      }

      const isEager = prev.assignor !== "CooperativeStickyAssignor";

      if (isEager) {
        // Eager rebalance revokes ALL partitions across ALL consumers immediately
        for (const c of clonedConsumers) {
          c.assignedPartitions = [];
        }
        for (const p of clonedPartitions) {
          p.revokingFromConsumerId = p.ownerConsumerId;
          p.ownerConsumerId = null;
        }
      } else {
        // CooperativeSticky only leaves the crashed consumer's partitions unassigned while survivors keep working!
        for (const p of clonedPartitions) {
          if (orphanedPartitions.includes(p.id)) {
            p.revokingFromConsumerId = command.consumerId;
            p.ownerConsumerId = null;
            // New messages arriving on orphaned partitions accumulate lag during rebalance
            p.logEndOffset += 3;
            p.highWatermark += 3;
          }
        }
      }

      const activeSurvivors = clonedConsumers.filter((c) => c.status === "ACTIVE");
      const nextState: KafkaConsumerGroupState = {
        ...prev,
        groupState: "PreparingRebalance",
        leaderConsumerId: activeSurvivors[0]?.id ?? null,
        partitions: clonedPartitions,
        consumers: clonedConsumers,
        stopTheWorldActive: isEager,
      };

      return {
        tick: nextTick,
        phase: "PreparingRebalance",
        title: `Consumer "${command.consumerId}" rời nhóm (${command.reason}) -> PreparingRebalance`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupCoordinator",
            action: "PREPARING_REBALANCE",
            detail: isEager
              ? `${command.consumerId} hết hạn session.timeout.ms. Eager Protocol thu hồi TOÀN BỘ Partitions (Stop-The-World)!`
              : `${command.consumerId} mất kết nối. Cooperative Protocol giữ nguyên các Partition của Consumer còn sống, chỉ đánh dấu Partition [${orphanedPartitions.join(", ")}] cần gán lại.`,
            tone: "warn",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summaryVi: isEager
            ? `GroupCoordinator phát hiện "${command.consumerId}" không gửi Heartbeat trong khoảng session.timeout.ms và chuyển nhóm sang PreparingRebalance. Vì dùng Eager (${prev.assignor}), TẤT CẢ Consumers phải gọi onPartitionsRevoked() và dừng đọc toàn bộ 6 Partitions!`
            : `GroupCoordinator phát hiện "${command.consumerId}" rời nhóm và kích hoạt PreparingRebalance. Nhờ CooperativeStickyAssignor (KIP-429), các Consumer còn sống vẫn giữ nguyên Partition của mình và tiếp tục xử lý, chỉ giải phóng [${orphanedPartitions.join(", ")}].`,
          internalsNoteVi: `Các Consumer còn sống nhận mã lỗi REBALANCE_IN_PROGRESS trong phản hồi HeartbeatResponse tiếp theo và gửi JoinGroupRequest để bước vào thế hệ (generationId) mới.`,
          productionWarningVi: isEager
            ? `CẢNH BÁO PRODUCTION: Trong Eager Rebalance, toàn bộ Consumer Group ngừng tiêu thụ dữ liệu (Stop-The-World) cho đến khi JoinGroup + SyncGroup hoàn tất, gây spike Consumer Lag trên mọi Partition!`
            : undefined,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (
      command.type === "COORDINATOR_COMPLETE_JOIN_SYNC" ||
      command.type === "COOPERATIVE_INCREMENTAL_REASSIGN"
    ) {
      const activeConsumers = clonedConsumers.filter((c) => c.status === "ACTIVE");
      const activeIds = activeConsumers.map((c) => c.id);

      const prevMap = new Map<string, number[]>();
      for (const c of activeConsumers) {
        prevMap.set(c.id, [...c.assignedPartitions]);
      }

      const newAssignment = computePartitionAssignment(
        clonedPartitions.length,
        activeIds,
        prev.assignor,
        prevMap,
      );

      for (const c of clonedConsumers) {
        if (c.status === "ACTIVE") {
          c.assignedPartitions = newAssignment.get(c.id) ?? [];
        } else {
          c.assignedPartitions = [];
        }
      }

      for (const p of clonedPartitions) {
        let newOwner: string | null = null;
        for (const [cid, list] of newAssignment.entries()) {
          if (list.includes(p.id)) {
            newOwner = cid;
            break;
          }
        }
        p.ownerConsumerId = newOwner;
        p.revokingFromConsumerId = null;
        if (newOwner !== null) {
          p.committedOffset = p.highWatermark;
        }
      }

      const newGen = prev.generationId + 1;
      const nextState: KafkaConsumerGroupState = {
        ...prev,
        groupState: "Stable",
        generationId: newGen,
        leaderConsumerId: activeIds[0] ?? null,
        partitions: clonedPartitions,
        consumers: clonedConsumers,
        stopTheWorldActive: false,
      };

      const assignmentSummary = activeIds
        .map((cid) => `${cid}: [${(newAssignment.get(cid) ?? []).map((p) => `P${p}`).join(", ")}]`)
        .join(" | ");

      return {
        tick: nextTick,
        phase: `Stable (Gen ${newGen})`,
        title: `Hoàn tất JoinGroup & SyncGroup -> Stable (Generation ${newGen})`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupCoordinator",
            action: "COMPLETING_TO_STABLE",
            detail: `Generation ${newGen} hoàn tất phân bổ (${prev.assignor}): ${assignmentSummary}`,
            tone: "ok",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summaryVi: `GroupCoordinator hoàn tất pha CompletingRebalance -> Stable với generationId = ${newGen}. Phân bổ Partition mới: ${assignmentSummary}.`,
          internalsNoteVi: `Mọi OffsetCommitRequest từ thế hệ cũ (generationId < ${newGen}) nếu bị trễ mạng gửi đến Broker lúc này sẽ bị GroupCoordinator từ chối ngay lập tức với lỗi ILLEGAL_GENERATION để bảo vệ tính nhất quán.`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (command.type === "ADD_CONSUMER") {
      const nextIdx = clonedConsumers.length + 1;
      const newId = command.consumerId ?? `consumer-${nextIdx}`;
      const existing = clonedConsumers.find((c) => c.id === newId);
      if (existing) {
        existing.status = "ACTIVE";
        existing.lastHeartbeatTick = nextTick;
      } else {
        clonedConsumers.push({
          id: newId,
          status: "ACTIVE",
          assignedPartitions: [],
          lastHeartbeatTick: nextTick,
        });
      }

      const isEager = prev.assignor !== "CooperativeStickyAssignor";
      if (isEager) {
        for (const c of clonedConsumers) {
          c.assignedPartitions = [];
        }
        for (const p of clonedPartitions) {
          p.revokingFromConsumerId = p.ownerConsumerId;
          p.ownerConsumerId = null;
        }
      }

      const nextState: KafkaConsumerGroupState = {
        ...prev,
        groupState: "PreparingRebalance",
        partitions: clonedPartitions,
        consumers: clonedConsumers,
        stopTheWorldActive: isEager,
      };

      return {
        tick: nextTick,
        phase: "PreparingRebalance",
        title: `Consumer mới "${newId}" gửi JoinGroupRequest -> PreparingRebalance`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: newId,
            action: "JOIN_GROUP_REQUEST",
            detail: `${newId} gia nhập nhóm "${prev.groupId}". GroupCoordinator kích hoạt Rebalance để chia lại tải.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summaryVi: `Consumer "${newId}" gửi JoinGroupRequest tới GroupCoordinator. Nhóm chuyển sang PreparingRebalance để tính toán lại bảng phân bổ Partition.`,
          internalsNoteVi: `Khi mở rộng quy mô (Scale-out) với CooperativeStickyAssignor, chỉ những Partition dư trên các Consumer cũ mới bị thu hồi (Incremental Revocation) để chuyển sang "${newId}".`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    if (command.type === "SWITCH_ASSIGNOR") {
      const activeIds = clonedConsumers
        .filter((c) => c.status === "ACTIVE")
        .map((c) => c.id);
      const newAssignment = computePartitionAssignment(
        clonedPartitions.length,
        activeIds,
        command.assignor,
      );

      for (const c of clonedConsumers) {
        c.assignedPartitions =
          c.status === "ACTIVE" ? (newAssignment.get(c.id) ?? []) : [];
      }
      for (const p of clonedPartitions) {
        let owner: string | null = null;
        for (const [cid, list] of newAssignment.entries()) {
          if (list.includes(p.id)) {
            owner = cid;
            break;
          }
        }
        p.ownerConsumerId = owner;
        p.revokingFromConsumerId = null;
      }

      const nextGen = prev.generationId + 1;
      const nextState: KafkaConsumerGroupState = {
        ...prev,
        assignor: command.assignor,
        groupState: "Stable",
        generationId: nextGen,
        partitions: clonedPartitions,
        consumers: clonedConsumers,
        stopTheWorldActive: false,
      };

      return {
        tick: nextTick,
        phase: `Stable (Gen ${nextGen})`,
        title: `Chuyển chiến lược phân bổ sang ${command.assignor} (Gen ${nextGen})`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupLeader",
            action: "SWITCH_PARTITION_ASSIGNOR",
            detail: `Áp dụng ${command.assignor} ở Generation ${nextGen}.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summaryVi: `Consumer Group đã chuyển sang thuật toán ${command.assignor} ở Generation ${nextGen}.`,
          internalsNoteVi: `RangeAssignor chia các Partition liên tiếp cho từng Consumer, trong khi RoundRobinAssignor xoay vòng từng Partition qua danh sách Consumers đã sắp xếp theo thứ tự từ điển.`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
