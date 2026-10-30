import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export type KafkaAssignorType =
  | "RangeAssignor"
  | "RoundRobinAssignor"
  | "CooperativeStickyAssignor";

export type KafkaGroupProtocolState =
  | "Stable"
  | "PreparingRebalance"
  | "CompletingRebalance"
  | "Dead";

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

export interface KafkaSimulationConfig {
  topicName: string;
  groupId: string;
  partitionCount: number;
  initialConsumerCount: number;
  assignor: KafkaAssignorType;
}

export interface KafkaConsumerGroupState {
  topicName: string;
  groupId: string;
  groupState: KafkaGroupProtocolState;
  generationId: number;
  leaderConsumerId: string | null;
  assignor: KafkaAssignorType;
  partitions: KafkaPartitionState[];
  consumers: KafkaConsumerMember[];
  stopTheWorldActive: boolean;
}

export type KafkaSimulationCommand =
  | { type: "PRODUCE_AND_POLL"; messagesPerPartition: number }
  | { type: "KILL_CONSUMER"; consumerId: string; reason: "heartbeat_timeout" | "voluntary_leave" }
  | { type: "ADD_CONSUMER"; consumerId?: string }
  | { type: "COORDINATOR_COMPLETE_JOIN_SYNC" }
  | { type: "COOPERATIVE_INCREMENTAL_REASSIGN" }
  | { type: "SWITCH_ASSIGNOR"; assignor: KafkaAssignorType };

/**
 * Pure Partition Assignor implementations
 */
export function computePartitionAssignment(
  partitionCount: number,
  consumerIds: string[],
  assignor: KafkaAssignorType,
  previousAssignments: Map<string, number[]> = new Map(),
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  consumerIds.forEach((id) => result.set(id, []));

  if (consumerIds.length === 0) {
    return result;
  }

  const sortedConsumers = [...consumerIds].sort();

  if (assignor === "RangeAssignor") {
    const numPartitions = partitionCount;
    const numConsumers = sortedConsumers.length;
    const basePartitionsPerConsumer = Math.floor(numPartitions / numConsumers);
    const extraPartitions = numPartitions % numConsumers;

    let currentStart = 0;
    for (let i = 0; i < sortedConsumers.length; i++) {
      const consumer = sortedConsumers[i];
      const count = basePartitionsPerConsumer + (i < extraPartitions ? 1 : 0);
      const partitions: number[] = [];
      for (let p = 0; p < count; p++) {
        partitions.push(currentStart + p);
      }
      currentStart += count;
      result.set(consumer, partitions);
    }
    return result;
  }

  if (assignor === "RoundRobinAssignor") {
    for (let p = 0; p < partitionCount; p++) {
      const assignedConsumer = sortedConsumers[p % sortedConsumers.length];
      result.get(assignedConsumer)!.push(p);
    }
    return result;
  }

  if (assignor === "CooperativeStickyAssignor") {
    // Retain existing partitions where valid, balance remainder
    const targetQuota = Math.floor(partitionCount / sortedConsumers.length);
    const remainder = partitionCount % sortedConsumers.length;

    const assignedPartitions = new Set<number>();

    // Step 1: Retain valid sticky partitions up to quota
    for (let i = 0; i < sortedConsumers.length; i++) {
      const cid = sortedConsumers[i];
      const prev = previousAssignments.get(cid) ?? [];
      const quota = targetQuota + (i < remainder ? 1 : 0);
      const kept = prev.filter((p) => p < partitionCount).slice(0, quota);
      kept.forEach((p) => assignedPartitions.add(p));
      result.set(cid, kept);
    }

    // Step 2: Assign unassigned partitions to members with available capacity
    const unassigned: number[] = [];
    for (let p = 0; p < partitionCount; p++) {
      if (!assignedPartitions.has(p)) {
        unassigned.push(p);
      }
    }

    for (let i = 0; i < sortedConsumers.length && unassigned.length > 0; i++) {
      const cid = sortedConsumers[i];
      const quota = targetQuota + (i < remainder ? 1 : 0);
      const currentList = result.get(cid)!;
      while (currentList.length < quota && unassigned.length > 0) {
        currentList.push(unassigned.shift()!);
      }
    }
    return result;
  }

  return result;
}

function evaluateInvariants(state: KafkaConsumerGroupState): SimulationInvariantCheck[] {
  const activeConsumers = state.consumers.filter((c) => c.status === "ACTIVE");
  const assignedPartitionIds = activeConsumers.flatMap((c) => c.assignedPartitions);
  const exclusiveOwnership = new Set(assignedPartitionIds).size === assignedPartitionIds.length;

  const unassignedCount = state.partitions.filter((p) => p.ownerConsumerId === null).length;
  const fullCoverageWhenStable =
    state.groupState !== "Stable" || activeConsumers.length === 0 || unassignedCount === 0;

  return [
    {
      id: "exclusive-partition-ownership",
      label: "Exclusive Partition Ownership per Group",
      passed: exclusiveOwnership,
      detail: exclusiveOwnership
        ? "Each Partition is assigned to at most 1 ACTIVE Consumer within the Consumer Group."
        : "VIOLATION: Multiple Consumers are consuming from the same Partition simultaneously!",
    },
    {
      id: "stable-partition-coverage",
      label: "Complete Partition Coverage in Stable State",
      passed: fullCoverageWhenStable,
      detail: fullCoverageWhenStable
        ? `All ${state.partitions.length} Partitions are mapped to active owners in Stable state.`
        : `${unassignedCount} Partition(s) unassigned pending rebalance completion.`,
    },
    {
      id: "cooperative-pause-check",
      label: "Zero Stop-The-World Pause (Cooperative Mode)",
      passed: !state.stopTheWorldActive,
      detail: state.stopTheWorldActive
        ? "Eager Rebalance in progress: all partitions revoked (Stop-The-World pause)."
        : "Unaffected steady partitions continue uninterrupted message consumption.",
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
      title: "1. Eager Rebalance (RangeAssignor) on Consumer C3 Crash",
      badge: "Stop-The-World Rebalance",
      description:
        "Starts with 3 Consumers and 6 Partitions. When C3 disconnects (Heartbeat Timeout), Eager Rebalance revokes all 6 Partitions (Stop-The-World) before reassigning to C1 and C2.",
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
      title: "2. Cooperative Sticky (KIP-429) — Zero Global Pause",
      badge: "Production Recommended",
      description:
        "Using CooperativeStickyAssignor: When C3 departs, C1 (P0, P1) and C2 (P2, P3) retain their assigned partitions without pausing; only P4 and P5 are migrated.",
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
    const consumerIds: string[] = [];
    for (let i = 1; i <= config.initialConsumerCount; i++) {
      consumerIds.push(`consumer-${i}`);
    }

    const assignment = computePartitionAssignment(
      config.partitionCount,
      consumerIds,
      config.assignor,
    );

    const partitions: KafkaPartitionState[] = [];
    for (let p = 0; p < config.partitionCount; p++) {
      let owner: string | null = null;
      for (const [cid, parts] of assignment.entries()) {
        if (parts.includes(p)) {
          owner = cid;
          break;
        }
      }
      partitions.push({
        id: p,
        leaderBrokerId: 101 + (p % 3),
        logEndOffset: 10,
        highWatermark: 10,
        committedOffset: 10,
        ownerConsumerId: owner,
        revokingFromConsumerId: null,
      });
    }

    const consumers: KafkaConsumerMember[] = consumerIds.map((id) => ({
      id,
      status: "ACTIVE",
      assignedPartitions: assignment.get(id) ?? [],
      lastHeartbeatTick: 0,
    }));

    const state: KafkaConsumerGroupState = {
      topicName: config.topicName,
      groupId: config.groupId,
      groupState: "Stable",
      generationId: 1,
      leaderConsumerId: consumerIds[0] ?? null,
      assignor: config.assignor,
      partitions,
      consumers,
      stopTheWorldActive: false,
    };

    return {
      tick: 0,
      phase: "Stable (Gen 1)",
      title: `Initialized Consumer Group "${config.groupId}" in Stable State`,
      state,
      events: [
        {
          tick: 0,
          actor: "GroupCoordinator",
          action: "SYNC_GROUP_COMPLETE",
          detail: `Generation 1 established with ${config.initialConsumerCount} Consumers and ${config.partitionCount} Partitions (${config.assignor}).`,
          tone: "ok",
        },
      ],
      invariants: evaluateInvariants(state),
      narration: {
        summary: `Consumer Group "${config.groupId}" is in Stable state (generationId = 1). ${config.partitionCount} Partitions of topic "${config.topicName}" are distributed across ${config.initialConsumerCount} Consumers via ${config.assignor}.`,
        internalsNote: `Under the Classic Consumer Group protocol, the broker GroupCoordinator elected "${consumerIds[0]}" as Group Leader during JoinGroup. The Consumer Leader executed the ${config.assignor} algorithm client-side and returned the plan via SyncGroupRequest.`,
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
        title: `Producer sent +${delta} msg/partition & Active Consumers poll()`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "Producer / Consumers",
            action: "FETCH_AND_COMMIT_OFFSET",
            detail: `Each partition received +${delta} records. Active partition owners committed updated offsets to __consumer_offsets.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Producer appended ${delta} records to each Partition (High Watermark incremented). Active partition owners polled and committed fresh offsets.`,
          internalsNote: `Consumers may only read records with offsets < High Watermark (replicated to all In-Sync Replicas - ISR).`,
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
        for (const c of clonedConsumers) {
          c.assignedPartitions = [];
        }
        for (const p of clonedPartitions) {
          p.revokingFromConsumerId = p.ownerConsumerId;
          p.ownerConsumerId = null;
        }
      } else {
        for (const p of clonedPartitions) {
          if (orphanedPartitions.includes(p.id)) {
            p.revokingFromConsumerId = command.consumerId;
            p.ownerConsumerId = null;
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
        title: `Consumer "${command.consumerId}" Departed (${command.reason}) -> PreparingRebalance`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupCoordinator",
            action: "PREPARING_REBALANCE",
            detail: isEager
              ? `${command.consumerId} timed out on session.timeout.ms. Eager Protocol revoked ALL Partitions (Stop-The-World)!`
              : `${command.consumerId} disconnected. Cooperative Protocol retained healthy consumer partitions, revoking only [${orphanedPartitions.join(", ")}].`,
            tone: "warn",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: isEager
            ? `GroupCoordinator detected "${command.consumerId}" missed Heartbeat within session.timeout.ms and transitioned to PreparingRebalance. Under Eager (${prev.assignor}), ALL Consumers invoked onPartitionsRevoked() and stopped reading all 6 Partitions!`
            : `GroupCoordinator detected "${command.consumerId}" departed and initiated PreparingRebalance. Under CooperativeStickyAssignor (KIP-429), surviving consumers continue consuming steady partitions; only [${orphanedPartitions.join(", ")}] are queued for reassignment.`,
          internalsNote: `Surviving consumers receive REBALANCE_IN_PROGRESS in their next HeartbeatResponse and dispatch JoinGroupRequest to enter the new generationId.`,
          productionWarning: isEager
            ? "PRODUCTION HAZARD: In Eager Rebalance, the entire Consumer Group halts consumption (Stop-The-World) until JoinGroup + SyncGroup complete, spiking Consumer Lag across all partitions!"
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
        title: `Completed JoinGroup & SyncGroup -> Stable (Generation ${newGen})`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupCoordinator",
            action: "COMPLETING_TO_STABLE",
            detail: `Generation ${newGen} finalized assignment (${prev.assignor}): ${assignmentSummary}`,
            tone: "ok",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `GroupCoordinator transitioned from CompletingRebalance -> Stable with generationId = ${newGen}. Partition assignment: ${assignmentSummary}.`,
          internalsNote: `Any delayed OffsetCommitRequest carrying older generationIds (< ${newGen}) arriving at the Broker will be rejected immediately with ILLEGAL_GENERATION to maintain consistency.`,
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
        title: `New Consumer "${newId}" Sent JoinGroupRequest -> PreparingRebalance`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: newId,
            action: "JOIN_GROUP_REQUEST",
            detail: `${newId} joined group "${prev.groupId}". GroupCoordinator triggered rebalance to rebalance workload.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Consumer "${newId}" submitted JoinGroupRequest to GroupCoordinator. Group entered PreparingRebalance to recompute partition assignments.`,
          internalsNote: `During scale-out with CooperativeStickyAssignor, only excess partitions on existing consumers are revoked (Incremental Revocation) to shift to "${newId}".`,
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
        title: `Switched Partition Assignor to ${command.assignor} (Gen ${nextGen})`,
        state: nextState,
        events: [
          ...currentFrame.events,
          {
            tick: nextTick,
            actor: "GroupLeader",
            action: "SWITCH_PARTITION_ASSIGNOR",
            detail: `Applied ${command.assignor} in Generation ${nextGen}.`,
            tone: "info",
          },
        ],
        invariants: evaluateInvariants(nextState),
        narration: {
          summary: `Consumer Group switched assignment algorithm to ${command.assignor} in Generation ${nextGen}.`,
          internalsNote: `RangeAssignor allocates contiguous partition slices per consumer; RoundRobinAssignor rotates partitions across lexicographically sorted consumers.`,
        },
        metrics: computeMetrics(nextState),
      };
    }

    return currentFrame;
  },
};
