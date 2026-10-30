import { describe, it, expect } from "vitest";
import {
  kafkaConsumerGroupSimulation,
  redisStampedeSimulation,
  postgresMvccBtreeSimulation,
  javaMemoryGcSimulation,
  javaHashMapSimulation,
  javaVirtualThreadsSimulation,
  javaExceptionsSimulation,
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
      dbQueryCostMs: 180,
      dbMaxPoolSize: 5,
    });

    expect(initial.state.dbActiveConnections).toBe(0);

    // Expire TTL
    const expired = engine.applyCommand(initial, { type: "EXPIRE_TTL_IMMEDIATELY" });
    expect(expired.state.ttlRemainingMs).toBe(0);

    // Burst read requests
    const burst = engine.applyCommand(expired, { type: "BURST_CONCURRENT_READS" });
    expect(burst.state.dbActiveConnections).toBe(8);
    // Violates DB pool safety invariant!
    const poolInvariant = burst.invariants.find((i) => i.id === "postgres-connection-pool-safety");
    expect(poolInvariant?.passed).toBe(false);
  });

  it("coalesces DB recomputes to exactly 1 query under Mutex Lock (SET NX PX)", () => {
    const engine = redisStampedeSimulation;
    const initial = engine.createInitialFrame({
      key: "top-deals",
      strategy: "mutex-singleflight-lock",
      concurrentWorkers: 8,
      initialTtlMs: 5000,
      dbQueryCostMs: 180,
      dbMaxPoolSize: 5,
    });

    const expired = engine.applyCommand(initial, { type: "EXPIRE_TTL_IMMEDIATELY" });
    const burst = engine.applyCommand(expired, { type: "BURST_CONCURRENT_READS" });

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

describe("JVM Memory & Generational GC Simulation Engine", () => {
  it("allocates objects on Eden, invalidates reachability upon method return, and evacuates live objects during Minor GC", () => {
    const engine = javaMemoryGcSimulation;
    const initial = engine.createInitialFrame({
      edenCapacity: 5,
      survivorCapacity: 3,
      oldGenCapacity: 6,
      tenuringThreshold: 3,
    });

    expect(initial.state.youngEden.length).toBe(0);
    expect(initial.state.threadStack.length).toBe(1);

    // Call method & allocate objects
    const called = engine.applyCommand(initial, { type: "PUSH_STACK_FRAME", methodName: "orderService.checkout()" });
    expect(called.state.threadStack.length).toBe(2);

    const alloc1 = engine.applyCommand(called, { type: "ALLOCATE_OBJECT", className: "Order", varName: "o1" });
    const alloc2 = engine.applyCommand(alloc1, { type: "ALLOCATE_OBJECT", className: "TempBuf", varName: "b1" });
    expect(alloc2.state.youngEden.length).toBe(2);
    expect(alloc2.state.youngEden.every((o) => o.isRootReachable)).toBe(true);

    // Return method -> stack frame popped, references invalidated
    const returned = engine.applyCommand(alloc2, { type: "POP_STACK_FRAME" });
    expect(returned.state.threadStack.length).toBe(1);
    expect(returned.state.youngEden.every((o) => !o.isRootReachable)).toBe(true);

    // Minor GC -> dead objects in Eden swept, To-Survivor remains empty
    const gcFrame = engine.applyCommand(returned, { type: "TRIGGER_MINOR_GC" });
    expect(gcFrame.state.minorGcCount).toBe(1);
    expect(gcFrame.state.youngEden.length).toBe(0);
    expect(gcFrame.state.youngS0.length).toBe(0);
    expect(gcFrame.state.youngS1.length).toBe(0);
  });

  it("promotes long-lived objects to Old Gen when tenuringAge reaches threshold", () => {
    const engine = javaMemoryGcSimulation;
    const initial = engine.createInitialFrame({
      edenCapacity: 5,
      survivorCapacity: 3,
      oldGenCapacity: 6,
      tenuringThreshold: 3,
    });

    // Allocate in main frame (root persistent)
    let frame = engine.applyCommand(initial, { type: "ALLOCATE_OBJECT", className: "GlobalConfig", varName: "cfg" });
    expect(frame.state.youngEden[0].isRootReachable).toBe(true);

    // Cycle 1: Minor GC -> evacuated to S1 with age 1
    frame = engine.applyCommand(frame, { type: "TRIGGER_MINOR_GC" });
    expect(frame.state.youngS1.length).toBe(1);
    expect(frame.state.youngS1[0].tenuringAge).toBe(1);

    // Cycle 2: Minor GC -> evacuated to S0 with age 2
    frame = engine.applyCommand(frame, { type: "TRIGGER_MINOR_GC" });
    expect(frame.state.youngS0.length).toBe(1);
    expect(frame.state.youngS0[0].tenuringAge).toBe(2);

    // Cycle 3: Minor GC -> reaches threshold 3 -> PROMOTED to Old Gen!
    frame = engine.applyCommand(frame, { type: "TRIGGER_MINOR_GC" });
    expect(frame.state.oldGen.length).toBe(1);
    expect(frame.state.oldGen[0].className).toBe("GlobalConfig");
    expect(frame.state.oldGen[0].tenuringAge).toBe(3);
    expect(frame.invariants.every((i) => i.passed)).toBe(true);
  });
});

describe("Java HashMap Internals & Treeification Simulation Engine", () => {
  it("computes bitwise slot index (n - 1) & hash and inserts key-value pairs", () => {
    const engine = javaHashMapSimulation;
    const initial = engine.createInitialFrame({
      initialCapacity: 16,
      loadFactor: 0.75,
      treeifyThreshold: 8,
      minTreeifyCapacity: 32,
    });

    expect(initial.state.capacity).toBe(16);
    expect(initial.state.threshold).toBe(12);

    const put1 = engine.applyCommand(initial, { type: "PUT", key: "username", value: "alice" });
    expect(put1.state.size).toBe(1);
    expect(put1.state.lastOperationDetails?.key).toBe("username");
    expect(put1.invariants.every((i) => i.passed)).toBe(true);
  });

  it("converts colliding bucket chain to Red-Black Tree when collision depth exceeds threshold 8", () => {
    const engine = javaHashMapSimulation;
    const initial = engine.createInitialFrame({
      initialCapacity: 16,
      loadFactor: 0.75,
      treeifyThreshold: 8,
      minTreeifyCapacity: 16, // lowered for educational check
    });

    // Burst 9 colliding keys into slot 3
    const treeified = engine.applyCommand(initial, {
      type: "BURST_COLLIDING_KEYS",
      count: 9,
      targetBucketIndex: 3,
    });

    const bucket3 = treeified.state.buckets[3];
    expect(bucket3.nodes.length).toBe(9);
    expect(bucket3.mode).toBe("RED_BLACK_TREE");
    expect(treeified.state.treeifiedBucketsCount).toBe(1);
    expect(treeified.invariants.find((i) => i.id === "treeification-integrity")?.passed).toBe(true);
  });

  it("doubles table capacity (power of two) and splits buckets when size exceeds threshold", () => {
    const engine = javaHashMapSimulation;
    const initial = engine.createInitialFrame({
      initialCapacity: 16,
      loadFactor: 0.75,
      treeifyThreshold: 8,
      minTreeifyCapacity: 32,
    });

    // Trigger explicit resize
    const resized = engine.applyCommand(initial, { type: "TRIGGER_RESIZE_DOUBLING" });
    expect(resized.state.capacity).toBe(32);
    expect(resized.state.threshold).toBe(24);
    expect(resized.state.buckets.length).toBe(32);
    expect(resized.invariants.find((i) => i.id === "power-of-two-capacity")?.passed).toBe(true);
  });
});

describe("Java 21 Virtual Threads & Loom Simulation Engine", () => {
  it("mounts virtual threads onto OS Carrier Threads and unmounts cleanly upon blocking I/O", () => {
    const engine = javaVirtualThreadsSimulation;
    const initial = engine.createInitialFrame({
      carrierPoolSize: 2,
      initialSpawnCount: 4,
    });

    expect(initial.state.carrierThreads.length).toBe(2);
    expect(initial.state.carrierThreads.every((c) => c.status === "IDLE")).toBe(true);

    // Step execution: carrier threads mount 2 virtual threads
    const step1 = engine.applyCommand(initial, { type: "STEP_EXECUTION" });
    expect(step1.state.carrierThreads.every((c) => c.status === "BUSY")).toBe(true);
    expect(step1.state.virtualThreads.filter((v) => v.status === "MOUNTED_RUNNING").length).toBe(2);

    // Trigger blocking I/O on running task: Continuation yields, carrier freed immediately!
    const ioYield = engine.applyCommand(step1, { type: "TRIGGER_BLOCKING_IO" });
    const yieldedTask = ioYield.state.virtualThreads.find((v) => v.status === "YIELDED_PARKED_IO");
    expect(yieldedTask).toBeDefined();
    // One carrier thread freed!
    expect(ioYield.state.carrierThreads.some((c) => c.status === "IDLE")).toBe(true);

    // Step execution again: idle carrier immediately picks up another task from queue!
    const step2 = engine.applyCommand(ioYield, { type: "STEP_EXECUTION" });
    expect(step2.state.carrierThreads.every((c) => c.status === "BUSY")).toBe(true);
  });

  it("detects Thread Pinning when synchronized block is invoked during blocking call", () => {
    const engine = javaVirtualThreadsSimulation;
    const initial = engine.createInitialFrame({
      carrierPoolSize: 2,
      initialSpawnCount: 2,
    });

    const step1 = engine.applyCommand(initial, { type: "STEP_EXECUTION" });
    const pinned = engine.applyCommand(step1, { type: "TRIGGER_SYNCHRONIZED_PINNING" });

    expect(pinned.state.hasPinnedCarrierAlert).toBe(true);
    expect(pinned.state.carrierThreads.some((c) => c.status === "PINNED")).toBe(true);
    const pinningInvariant = pinned.invariants.find((i) => i.id === "thread-pinning-safety");
    expect(pinningInvariant?.passed).toBe(false);
  });
});

describe("Java Exceptions, Throwable & Stack Unwinding Simulation Engine", () => {
  it("pushes call frames, throws checked exception, and unwinds stack until catch block matches", () => {
    const engine = javaExceptionsSimulation;
    const initial = engine.createInitialFrame({ maxStackDepth: 6, trackSuppressed: true });
    expect(initial.state.callStack.length).toBe(1);

    // Push OrderController with catch handler
    const frame1 = engine.applyCommand(initial, {
      type: "INVOKE_METHOD",
      className: "OrderController",
      methodName: "checkout()",
      hasCatch: true,
      catchType: "PaymentGatewayException",
    });
    expect(frame1.state.callStack.length).toBe(2);

    // Push OrderService without catch
    const frame2 = engine.applyCommand(frame1, {
      type: "INVOKE_METHOD",
      className: "OrderService",
      methodName: "process()",
      hasCatch: false,
    });
    expect(frame2.state.callStack.length).toBe(3);

    // Throw PaymentGatewayTimeoutException in OrderService
    const thrown = engine.applyCommand(frame2, {
      type: "THROW_EXCEPTION",
      category: "CheckedException",
      className: "PaymentGatewayTimeoutException",
      message: "Socket read timeout connecting to Visa Gateway",
    });
    expect(thrown.state.activeThrowable).not.toBeNull();
    expect(thrown.state.activeThrowable?.category).toBe("CheckedException");

    // Step unwind: OrderService popped because no catch handler exists
    const unwound1 = engine.applyCommand(thrown, { type: "STEP_UNWIND" });
    expect(unwound1.state.callStack.length).toBe(2);
    expect(unwound1.state.framesUnwoundCount).toBe(1);
    expect(unwound1.state.activeThrowable).not.toBeNull();

    // Step unwind: OrderController matches PaymentGatewayException!
    const unwound2 = engine.applyCommand(unwound1, { type: "STEP_UNWIND" });
    expect(unwound2.state.stackUnwindingPhase).toBe("CAUGHT_AND_HANDLED");
    expect(unwound2.state.activeThrowable).toBeNull();
    expect(unwound2.state.handledThrowable?.className).toBe("PaymentGatewayTimeoutException");
    expect(unwound2.invariants.every((inv) => inv.passed)).toBe(true);
  });

  it("chains secondary failure as Suppressed Exception during Try-with-Resources AutoCloseable cleanup", () => {
    const engine = javaExceptionsSimulation;
    const initial = engine.createInitialFrame({ maxStackDepth: 6, trackSuppressed: true });

    // Method with resource that fails on close
    const frameWithResource = engine.applyCommand(initial, {
      type: "INVOKE_METHOD",
      className: "OrderRepository",
      methodName: "queryAccountBalance()",
      hasCatch: true,
      catchType: "SQLException",
      withResource: "DbConnection",
      failOnClose: true,
    });
    expect(frameWithResource.state.callStack[1].openedResources.length).toBe(1);

    // Throw primary SQLException
    const primaryThrow = engine.applyCommand(frameWithResource, {
      type: "THROW_EXCEPTION",
      category: "CheckedException",
      className: "SQLException",
      message: "Row lock timeout on table accounts",
    });

    // Step unwind: AutoCloseable triggered, close() throws and is added as Suppressed Exception
    const stepCleanup = engine.applyCommand(primaryThrow, { type: "STEP_UNWIND" });
    expect(stepCleanup.state.suppressedThrowables.length).toBe(1);
    expect(stepCleanup.state.suppressedThrowables[0].isSuppressed).toBe(true);
    expect(stepCleanup.state.suppressedThrowables[0].suppressedBy).toBe("SQLException");

    // Primary exception is NOT masked!
    expect(stepCleanup.state.activeThrowable?.className).toBe("SQLException");
  });

  it("terminates thread when unhandled RuntimeException reaches bottom of Call Stack", () => {
    const engine = javaExceptionsSimulation;
    const initial = engine.createInitialFrame({ maxStackDepth: 6, trackSuppressed: true });

    // Throw NullPointerException at root main()
    const thrown = engine.applyCommand(initial, {
      type: "THROW_EXCEPTION",
      category: "UncheckedException",
      className: "NullPointerException",
      message: "Cannot read field 'id' because order is null",
    });

    // Step unwind: root frame popped without handler
    const fatal = engine.applyCommand(thrown, { type: "STEP_UNWIND" });
    expect(fatal.state.callStack.length).toBe(0);
    expect(fatal.state.unhandledEscaped).toBe(true);
    expect(fatal.state.stackUnwindingPhase).toBe("FATAL_UNCAUGHT_TERMINATION");
    const liveness = fatal.invariants.find((inv) => inv.id === "uncaught-thread-termination");
    expect(liveness?.passed).toBe(false);
  });
});
