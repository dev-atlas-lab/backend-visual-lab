import { describe, it, expect } from "vitest";
import {
  kafkaConsumerGroupSimulation,
  redisStampedeSimulation,
  postgresMvccBtreeSimulation,
  computePartitionAssignment,
  buildPresetTape,
} from "../engines/simulation";

describe("Kafka Consumer Group Simulation Engine", () => {
  it("computes deterministic RangeAssignor partition assignments", () => {
    const consumers = ["c-1", "c-2", "c-3"];
    const assignment = computePartitionAssignment(6, consumers, "RangeAssignor");
    expect(assignment.get("c-1")).toEqual([0, 1]);
    expect(assignment.get("c-2")).toEqual([2, 3]);
    expect(assignment.get("c-3")).toEqual([4, 5]);
  });

  it("executes eager rebalance on consumer crash and increments generationId upon join/sync", () => {
    const engine = kafkaConsumerGroupSimulation;
    const initialFrame = engine.createInitialFrame({
      topicName: "orders.v1",
      groupId: "billing-cg",
      partitionCount: 6,
      initialConsumerCount: 3,
      assignor: "RangeAssignor",
    });

    expect(initialFrame.state.generationId).toBe(1);
    expect(initialFrame.state.groupState).toBe("Stable");
    expect(initialFrame.invariants.every((i) => i.passed)).toBe(true);

    // Kill C3
    const killedFrame = engine.applyCommand(initialFrame, {
      type: "KILL_CONSUMER",
      consumerId: "consumer-3",
      reason: "heartbeat_timeout",
    });

    expect(killedFrame.state.groupState).toBe("PreparingRebalance");
    expect(killedFrame.state.stopTheWorldActive).toBe(true);
    // In eager mode, all consumers have their partitions revoked
    expect(killedFrame.state.consumers.every((c) => c.assignedPartitions.length === 0)).toBe(true);

    // Complete rebalance
    const stableFrame = engine.applyCommand(killedFrame, {
      type: "COORDINATOR_COMPLETE_JOIN_SYNC",
    });

    expect(stableFrame.state.groupState).toBe("Stable");
    expect(stableFrame.state.generationId).toBe(2);
    expect(stableFrame.state.stopTheWorldActive).toBe(false);
    expect(stableFrame.state.consumers.find((c) => c.id === "consumer-1")?.assignedPartitions).toEqual([0, 1, 2]);
    expect(stableFrame.state.consumers.find((c) => c.id === "consumer-2")?.assignedPartitions).toEqual([3, 4, 5]);
  });

  it("builds preset tapes deterministically", () => {
    const preset = kafkaConsumerGroupSimulation.presets[0];
    const tape = buildPresetTape(kafkaConsumerGroupSimulation, preset);
    expect(tape.length).toBe(preset.scriptedCommands.length + 1);
    expect(tape[0].state.generationId).toBe(1);
    expect(tape[tape.length - 1].state.generationId).toBe(2);
  });
});

describe("Redis Stampede & TTL Simulation Engine", () => {
  it("detects connection pool exhaustion under naive cache-aside when TTL expires", () => {
    const engine = redisStampedeSimulation;
    const initial = engine.createInitialFrame({
      key: "top-deals",
      strategy: "naive-cache-aside",
      concurrentWorkers: 8,
      initialTtlMs: 5000,
      dbMaxPoolSize: 5,
    });

    expect(initial.state.dbActiveConnections).toBe(0);

    // Expire TTL
    const expired = engine.applyCommand(initial, { type: "ADVANCE_TTL_TO_EXPIRY" });
    expect(expired.state.ttlRemainingMs).toBe(0);

    // Burst read requests
    const burst = engine.applyCommand(expired, { type: "BURST_READ_REQUESTS" });
    expect(burst.state.dbActiveConnections).toBe(8);
    // Violates DB pool safety invariant!
    const poolInvariant = burst.invariants.find((i) => i.id === "db-connection-pool-safety");
    expect(poolInvariant?.passed).toBe(false);
  });

  it("coalesces DB recomputes to exactly 1 query under Mutex Lock (SET NX PX)", () => {
    const engine = redisStampedeSimulation;
    const initial = engine.createInitialFrame({
      key: "top-deals",
      strategy: "mutex-singleflight-lock",
      concurrentWorkers: 8,
      initialTtlMs: 5000,
      dbMaxPoolSize: 5,
    });

    const expired = engine.applyCommand(initial, { type: "ADVANCE_TTL_TO_EXPIRY" });
    const burst = engine.applyCommand(expired, { type: "BURST_READ_REQUESTS" });

    // Exactly 1 worker querying DB, pool safe!
    expect(burst.state.dbActiveConnections).toBe(1);
    expect(burst.invariants.every((i) => i.passed)).toBe(true);
  });
});

describe("PostgreSQL B-Tree & MVCC Simulation Engine", () => {
  it("appends new physical tuple with new CTID on UPDATE and hides uncommitted writes", () => {
    const engine = postgresMvccBtreeSimulation;
    const initial = engine.createInitialFrame({
      isolationLevel: "READ COMMITTED",
      scanType: "IndexScan",
      targetAccountId: 42,
    });

    expect(initial.state.returnedBalanceUsd).toBe(500);

    // Writer updates balance
    const updated = engine.applyCommand(initial, {
      type: "WRITER_UPDATE_ACCOUNT_BALANCE",
      newBalanceUsd: 950,
    });

    // Uncommitted tuple (0,3) is invisible; reader still sees $500
    const selectUncommitted = engine.applyCommand(updated, { type: "EXECUTE_READER_SELECT" });
    expect(selectUncommitted.state.returnedBalanceUsd).toBe(500);

    // Commit writer
    const committed = engine.applyCommand(selectUncommitted, {
      type: "WRITER_COMMIT_TRANSACTION",
    });

    // Under READ COMMITTED, next select sees committed $950
    const selectCommitted = engine.applyCommand(committed, { type: "EXECUTE_READER_SELECT" });
    expect(selectCommitted.state.returnedBalanceUsd).toBe(950);
  });

  it("preserves repeatable snapshot in REPEATABLE READ after writer commit", () => {
    const engine = postgresMvccBtreeSimulation;
    const initial = engine.createInitialFrame({
      isolationLevel: "REPEATABLE READ",
      scanType: "IndexScan",
      targetAccountId: 42,
    });

    const updated = engine.applyCommand(initial, {
      type: "WRITER_UPDATE_ACCOUNT_BALANCE",
      newBalanceUsd: 950,
    });
    const committed = engine.applyCommand(updated, { type: "WRITER_COMMIT_TRANSACTION" });

    // Under REPEATABLE READ, reader still sees initial $500 snapshot!
    const select = engine.applyCommand(committed, { type: "EXECUTE_READER_SELECT" });
    expect(select.state.returnedBalanceUsd).toBe(500);
  });
});
