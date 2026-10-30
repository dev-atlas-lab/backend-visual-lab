import { describe, it, expect } from "vitest";
import {
  kafkaConsumerGroupSimulation,
  redisStampedeSimulation,
  postgresMvccBtreeSimulation,
  javaMemoryGcSimulation,
  javaHashMapSimulation,
  javaVirtualThreadsSimulation,
  javaExceptionsSimulation,
  javaConcurrencySimulation,
  javaStreamsEngine,
  javaCompletableFutureEngine,
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

describe("Java Concurrency, JMM & Lock Inflation Simulation Engine", () => {
  it("escalates lock state from UNLOCKED -> BIASED -> LIGHTWEIGHT (CAS) -> HEAVYWEIGHT (Mutex)", () => {
    const engine = javaConcurrencySimulation;
    const initial = engine.createInitialFrame({ maxSpinAttempts: 3, enableBiasedLocking: true });

    expect(initial.state.markWord.lockState).toBe("UNLOCKED");
    expect(initial.state.markWord.ownerThreadId).toBeNull();

    // Thread 1 acquires uncontested: Biased Lock
    const biased = engine.applyCommand(initial, {
      type: "THREAD_ACQUIRE_LOCK",
      threadId: "thread-1",
    });
    expect(biased.state.markWord.lockState).toBe("BIASED");
    expect(biased.state.markWord.ownerThreadId).toBe("thread-1");

    // Thread 2 attempts acquire: Revocation of Bias -> Lightweight Lock with CAS spinning
    const spinning = engine.applyCommand(biased, {
      type: "THREAD_ACQUIRE_LOCK",
      threadId: "thread-2",
    });
    expect(spinning.state.markWord.lockState).toBe("LIGHTWEIGHT");
    expect(spinning.state.totalCasOperations).toBeGreaterThan(0);
    const t2 = spinning.state.threads.find((t) => t.id === "thread-2");
    expect(t2?.status).toBe("SPINNING_CAS");

    // Trigger Heavy Contention: Exceed spin threshold -> Inflates to Heavyweight OS Mutex
    const inflated = engine.applyCommand(spinning, {
      type: "SIMULATE_CONTENTION",
      threadCount: 3,
    });
    expect(inflated.state.markWord.lockState).toBe("HEAVYWEIGHT");
    expect(inflated.state.markWord.monitorWaitQueue.length).toBeGreaterThan(0);
    expect(inflated.state.contextSwitchesCount).toBeGreaterThan(0);
  });

  it("models JMM visibility: non-volatile causes stale cache read whereas volatile triggers memory barrier", () => {
    const engine = javaConcurrencySimulation;
    const initial = engine.createInitialFrame({ maxSpinAttempts: 4, enableBiasedLocking: true });

    // Non-volatile write by Thread 1
    const t1Write = engine.applyCommand(initial, {
      type: "WRITE_SHARED_VARIABLE",
      threadId: "thread-1",
      newValue: 42,
    });
    expect(t1Write.state.sharedMainMemoryValue).toBe(42);
    expect(t1Write.state.threads.find((t) => t.id === "thread-1")?.localCachedValue).toBe(42);

    // Thread 2 reads without memory barrier: sees stale value (10) and triggers race condition flag
    const t2StaleRead = engine.applyCommand(t1Write, {
      type: "READ_SHARED_VARIABLE",
      threadId: "thread-2",
    });
    expect(t2StaleRead.state.threads.find((t) => t.id === "thread-2")?.localCachedValue).toBe(10);
    expect(t2StaleRead.state.raceConditionDetected).toBe(true);

    // Enable volatile keyword (StoreLoad / LoadLoad barrier)
    const volatileOn = engine.applyCommand(t2StaleRead, {
      type: "TOGGLE_VOLATILE",
      isVolatile: true,
    });
    expect(volatileOn.state.isVolatileVariable).toBe(true);

    // Thread 1 writes new volatile value
    const t1VolatileWrite = engine.applyCommand(volatileOn, {
      type: "WRITE_SHARED_VARIABLE",
      threadId: "thread-1",
      newValue: 99,
    });
    expect(t1VolatileWrite.state.memoryBarrierActive).toBe("STORE_LOAD");

    // Thread 2 reads volatile value: must see fresh 99 due to Happens-Before
    const t2FreshRead = engine.applyCommand(t1VolatileWrite, {
      type: "READ_SHARED_VARIABLE",
      threadId: "thread-2",
    });
    expect(t2FreshRead.state.threads.find((t) => t.id === "thread-2")?.localCachedValue).toBe(99);
    expect(t2FreshRead.state.raceConditionDetected).toBe(false);
  });

  it("wakes parked thread from ObjectMonitor WaitSet when lock is released", () => {
    const engine = javaConcurrencySimulation;
    const initial = engine.createInitialFrame({ maxSpinAttempts: 2, enableBiasedLocking: true });

    // Inflate lock with Thread 1 owning and Thread 2 parked
    const t1Acquire = engine.applyCommand(initial, {
      type: "THREAD_ACQUIRE_LOCK",
      threadId: "thread-1",
    });
    const contested = engine.applyCommand(t1Acquire, {
      type: "SIMULATE_CONTENTION",
      threadCount: 2,
    });

    expect(contested.state.markWord.lockState).toBe("HEAVYWEIGHT");
    expect(contested.state.markWord.ownerThreadId).toBe("thread-1");
    expect(contested.state.markWord.monitorWaitQueue).toContain("thread-2");

    // Thread 1 releases lock: Thread 2 is dequeued from WaitSet and granted ownership
    const released = engine.applyCommand(contested, {
      type: "THREAD_RELEASE_LOCK",
      threadId: "thread-1",
    });
    expect(released.state.markWord.ownerThreadId).toBe("thread-2");
    expect(released.state.markWord.monitorWaitQueue).not.toContain("thread-2");
    const t2 = released.state.threads.find((t) => t.id === "thread-2");
    expect(t2?.status).toBe("RUNNING");
    expect(t2?.holdingLock).toBe(true);
  });

  it("builds preset tapes deterministically", () => {
    for (const preset of javaConcurrencySimulation.presets) {
      const tape = buildPresetTape(javaConcurrencySimulation, preset);
      expect(tape.length).toBe(preset.scriptedCommands.length + 1);
      expect(tape[0].state).toBeDefined();
      expect(tape[tape.length - 1].state).toBeDefined();
    }
  });
});

describe("Java Streams Pipeline Simulation Engine", () => {
  it("enforces lazy evaluation: no processing happens until terminal operation is triggered", () => {
    const engine = javaStreamsEngine;
    const initial = engine.createInitialFrame(engine.presets[0].config);

    expect(initial.state.terminalTriggered).toBe(false);
    expect(initial.state.totalElementsExamined).toBe(0);
    expect(initial.state.sinkAcceptCalls).toBe(0);
    expect(initial.invariants.find((inv) => inv.id === "lazy-evaluation-purity")?.passed).toBe(true);

    const triggered = engine.applyCommand(initial, { type: "TRIGGER_TERMINAL_OP" });
    expect(triggered.state.terminalTriggered).toBe(true);
  });

  it("executes single-pass loop fusion with 0 intermediate lists and short-circuits safely", () => {
    const engine = javaStreamsEngine;
    let frame = engine.createInitialFrame({
      mode: "STREAM_LOOP_FUSION",
      initialItems: [1, 2, 3, 4, 5, 6],
      stages: ["FILTER_EVEN", "MAP_SQUARE", "LIMIT_2", "TERMINAL_TO_LIST"],
      limitThreshold: 2,
    });

    // Step elements until short circuit completes
    for (let i = 0; i < 6; i++) {
      frame = engine.applyCommand(frame, { type: "STEP_PIPELINE" });
      if (frame.state.isComplete) break;
    }

    expect(frame.state.isComplete).toBe(true);
    expect(frame.state.intermediateListsAllocated).toBe(0);
    expect(frame.state.collectedResults).toEqual([4, 16]); // 2^2 = 4, 4^2 = 16
    expect(frame.state.shortCircuitTriggered).toBe(true);
    // Elements 5 and 6 should be skipped
    expect(frame.state.items[4].status).toBe("SKIPPED_SHORT_CIRCUIT");
    expect(frame.state.items[5].status).toBe("SKIPPED_SHORT_CIRCUIT");
  });

  it("detects heap allocations in naive intermediate collection mode", () => {
    const engine = javaStreamsEngine;
    let frame = engine.createInitialFrame({
      mode: "NAIVE_INTERMEDIATE_COLLECTIONS",
      initialItems: [1, 2, 3, 4, 5, 6],
      stages: ["FILTER_EVEN", "MAP_SQUARE", "LIMIT_2", "TERMINAL_TO_LIST"],
      limitThreshold: 2,
    });

    frame = engine.applyCommand(frame, { type: "STEP_PIPELINE" });
    expect(frame.state.intermediateListsAllocated).toBeGreaterThan(0);
    expect(frame.invariants.find((inv) => inv.id === "zero-intermediate-collections")?.detail).toContain(
      "temporary intermediate ArrayList objects",
    );
  });

  it("handles stateful sorted() barrier and breaks single-pass loop fusion", () => {
    const engine = javaStreamsEngine;
    let frame = engine.createInitialFrame({
      mode: "STREAM_LOOP_FUSION",
      initialItems: [6, 2, 4],
      stages: ["FILTER_EVEN", "SORTED_ASC", "MAP_SQUARE", "TERMINAL_TO_LIST"],
      limitThreshold: 10,
    });

    frame = engine.applyCommand(frame, { type: "STEP_PIPELINE" });
    const sortedStage = frame.state.stages.find((s) => s.opType === "SORTED_ASC");
    expect(sortedStage?.internalBuffer).toEqual([2, 4, 6]);
  });
});

describe("Java CompletableFuture Simulation Engine", () => {
  it("orchestrates non-blocking multi-stage async DAG without blocking caller thread", () => {
    const engine = javaCompletableFutureEngine;
    let frame = engine.createInitialFrame(engine.presets[0].config);

    expect(frame.state.callerThreadBlocked).toBe(false);
    expect(frame.state.threadStarvationDetected).toBe(false);

    // Step through all 4 stages
    for (let i = 0; i < 4; i++) {
      frame = engine.applyCommand(frame, { type: "STEP_ASYNC_DISPATCH" });
    }

    expect(frame.state.completedStageCount).toBe(4);
    expect(frame.state.pipelineFinished).toBe(true);
    expect(frame.state.callerThreadBlocked).toBe(false);
    expect(frame.invariants.find((inv) => inv.id === "caller-thread-non-blocking")?.passed).toBe(true);
  });

  it("detects thread starvation deadlock when .join() is invoked inside worker thread", () => {
    const engine = javaCompletableFutureEngine;
    const initial = engine.createInitialFrame({
      mode: "BLOCKING_JOIN_STARVATION",
      workerCount: 2,
    });

    const starved = engine.applyCommand(initial, { type: "INJECT_BLOCKING_JOIN" });
    expect(starved.state.threadStarvationDetected).toBe(true);
    expect(starved.state.callerThreadBlocked).toBe(true);
    expect(starved.invariants.find((inv) => inv.id === "no-thread-starvation")?.passed).toBe(false);
  });

  it("recovers gracefully from stage failure using .exceptionally() fallback", () => {
    const engine = javaCompletableFutureEngine;
    let frame = engine.createInitialFrame({
      mode: "ERROR_RECOVERY_EXCEPTIONALLY",
      workerCount: 2,
    });

    // Step 1: supplyAsync passes
    frame = engine.applyCommand(frame, { type: "STEP_ASYNC_DISPATCH" });
    expect(frame.state.stages[0].status).toBe("COMPLETED");

    // Step 2: callRemotePayment throws
    frame = engine.applyCommand(frame, { type: "STEP_ASYNC_DISPATCH" });
    expect(frame.state.stages[1].status).toBe("FAILED");

    // Step 3: exceptionally recovers with fallback
    frame = engine.applyCommand(frame, { type: "STEP_ASYNC_DISPATCH" });
    expect(frame.state.stages[2].status).toBe("COMPLETED");
    expect(frame.state.recoveredFromError).toBe(true);
    expect(frame.invariants.find((inv) => inv.id === "exceptionally-circuit-resilience")?.passed).toBe(true);
  });

  it("resolves CompletableFuture.allOf() coordination barrier", () => {
    const engine = javaCompletableFutureEngine;
    const initial = engine.createInitialFrame(engine.presets[0].config);

    const barrierResolved = engine.applyCommand(initial, { type: "TRIGGER_ALL_OF_BARRIER" });
    expect(barrierResolved.state.pipelineFinished).toBe(true);
    expect(barrierResolved.state.completedStageCount).toBe(barrierResolved.state.stages.length);
  });
});

