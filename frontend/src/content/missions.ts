/**
 * Interactive Lab Missions & Challenges — Backend Visual Lab
 * Defines guided hands-on challenges for each simulation engine.
 */

export interface LabMission {
  id: string;
  simulationId: string;
  title: string;
  goal: string;
  hint: string;
  checkCompleted: (state: Record<string, unknown>) => boolean;
}

export const labMissions: Record<string, LabMission[]> = {
  "kafka-consumer-group": [
    {
      id: "kafka-mission-1",
      simulationId: "kafka-consumer-group",
      title: "Trigger Consumer Crash Rebalance",
      goal: "Simulate heartbeat failure on Consumer-3 to trigger Stop-The-World PreparingRebalance.",
      hint: "Use preset 'Consumer Crash (Eager Rebalance)' or click 'Crash Consumer C3'.",
      checkCompleted: (state) =>
        state.groupState === "PreparingRebalance" && Boolean(state.stopTheWorldActive),
    },
    {
      id: "kafka-mission-2",
      simulationId: "kafka-consumer-group",
      title: "Complete Coordinator Join & Sync",
      goal: "Rebalance group to Stable state with partition assignments redistributed.",
      hint: "Click 'Complete Join/Sync' or step until generationId reaches 2.",
      checkCompleted: (state) =>
        state.groupState === "Stable" && Number(state.generationId ?? 0) >= 2,
    },
  ],
  "redis-stampede": [
    {
      id: "redis-mission-1",
      simulationId: "redis-stampede",
      title: "Provoke Cache Stampede & Pool Collapse",
      goal: "Allow key TTL to expire under high QPS without distributed locking, causing DB pool exhaustion.",
      hint: "Select 'Naive Cache-Aside (Dogpile Stampede)' and click 'Expire TTL (0ms)'.",
      checkCompleted: (state) =>
        Number(state.activeDbConnections ?? 0) >= 50 && Boolean(state.dbPoolExhausted),
    },
    {
      id: "redis-mission-2",
      simulationId: "redis-stampede",
      title: "Mitigate with Distributed Mutex (SET NX PX)",
      goal: "Enforce single DB worker recompute while peer requests wait, keeping DB connections <= 1.",
      hint: "Select 'Distributed Mutex Lock' preset and step through the cache renewal cycle.",
      checkCompleted: (state) =>
        state.protectionStrategy === "DistributedMutex" && state.activeDbConnections === 1,
    },
  ],
  "postgres-mvcc-btree": [
    {
      id: "postgres-mission-1",
      simulationId: "postgres-mvcc-btree",
      title: "Create Dead Tuple via MVCC Update",
      goal: "Execute an UPDATE command and observe that PostgreSQL creates a new CTID version and hides uncommitted writes.",
      hint: "Click 'Writer UPDATE balance = $950'.",
      checkCompleted: (state) => {
        const tuples = (state.heapTuples as Array<{ ctid: string }>) || [];
        return tuples.some((t) => t.ctid === "(0,3)");
      },
    },
    {
      id: "postgres-mission-2",
      simulationId: "postgres-mvcc-btree",
      title: "Update Visibility Map via VACUUM",
      goal: "Commit writer transaction and run VACUUM to update the Visibility Map.",
      hint: "Click 'Writer COMMIT Tx 202', then click 'Run VACUUM & Update VM'.",
      checkCompleted: (state) => Boolean(state.writerCommitted && state.visibilityMapAllVisible),
    },
  ],
  "java-memory-gc": [
    {
      id: "jvm-memory-mission-1",
      simulationId: "java-memory-gc",
      title: "Trigger Young Gen Minor GC",
      goal: "Allocate objects until Eden capacity is reached, triggering a Minor GC evacuation to Survivor space.",
      hint: "Click '+ Allocate new Order()' repeatedly, then click 'Trigger Minor GC'.",
      checkCompleted: (state) => Number(state.minorGcCount ?? 0) >= 1,
    },
    {
      id: "jvm-memory-mission-2",
      simulationId: "java-memory-gc",
      title: "Promote Object to Tenured Old Gen",
      goal: "Survive multiple GC cycles until an object's tenuring age reaches the threshold.",
      hint: "Select preset 'Object Tenuring Age & Old Gen Promotion' and step through ticks.",
      checkCompleted: (state) => {
        const oldGen = (state.oldGen as Array<unknown>) || [];
        return oldGen.length >= 1;
      },
    },
  ],
  "java-hashmap-treeification": [
    {
      id: "hashmap-mission-1",
      simulationId: "java-hashmap-treeification",
      title: "Trigger Red-Black Treeification",
      goal: "Collide entries into a single bucket beyond TREEIFY_THRESHOLD (8 entries) to convert the linked list to a Red-Black Tree.",
      hint: "Click 'Collide +5 Keys (Bucket #3)' twice or select 'Hash Collision & Treeification' preset.",
      checkCompleted: (state) => {
        const buckets = (state.buckets as Array<{ isTreeified: boolean }>) || [];
        return buckets.some((b) => b.isTreeified);
      },
    },
    {
      id: "hashmap-mission-2",
      simulationId: "java-hashmap-treeification",
      title: "Double Capacity via Resize Doubling",
      goal: "Execute a table resize doubling power-of-two capacity from 16 to 32 slots.",
      hint: "Click 'Resize Doubling x2' or select preset 'Table Resize Doubling (Power of Two)'.",
      checkCompleted: (state) =>
        Number(state.capacity ?? 0) >= 32 && Number(state.resizeCount ?? 0) >= 1,
    },
  ],
  "java-virtual-threads": [
    {
      id: "loom-mission-1",
      simulationId: "java-virtual-threads",
      title: "Observe Continuation Yield on Blocking I/O",
      goal: "Dispatch blocking socket/DB I/O on a Virtual Thread and observe it unmount from the OS Carrier Thread.",
      hint: "Click 'Blocking I/O (Unmount & Yield)' on an active virtual thread.",
      checkCompleted: (state) => {
        const vts = (state.virtualThreads as Array<{ status: string }>) || [];
        return vts.some((vt) => vt.status === "PARKED_WAITING_IO");
      },
    },
    {
      id: "loom-mission-2",
      simulationId: "java-virtual-threads",
      title: "Provoke Carrier Thread Pinning",
      goal: "Execute a blocking operation inside a synchronized block, pinning the underlying OS carrier thread.",
      hint: "Click 'Pinning synchronized!' to witness JEP 444 thread pinning.",
      checkCompleted: (state) => {
        const cts = (state.carrierThreads as Array<{ pinned: boolean }>) || [];
        return cts.some((ct) => ct.pinned);
      },
    },
  ],
  "java-exceptions-stack-unwinding": [
    {
      id: "exceptions-mission-1",
      simulationId: "java-exceptions-stack-unwinding",
      title: "Catch Checked Exception via JVM Exception Table",
      goal: "Push call frames, throw a checked exception, and unwind the stack to match a catch block.",
      hint: "Select 'Payment Gateway Timeout' preset or throw an exception and step unwind.",
      checkCompleted: (state) => state.stackUnwindingPhase === "CAUGHT_AND_HANDLED",
    },
    {
      id: "exceptions-mission-2",
      simulationId: "java-exceptions-stack-unwinding",
      title: "Inspect AutoCloseable Suppressed Exceptions",
      goal: "Trigger a failure during try-with-resources AutoCloseable close() to observe suppressed exception chaining.",
      hint: "Select preset 'Try-With-Resources Suppressed Exception' and step through close.",
      checkCompleted: (state) => {
        const suppressed = (state.suppressedThrowables as Array<unknown>) || [];
        return suppressed.length >= 1;
      },
    },
  ],
  "java-concurrency-jmm-locks": [
    {
      id: "concurrency-mission-1",
      simulationId: "java-concurrency-jmm-locks",
      title: "Escalate Biased Lock to CAS Lightweight",
      goal: "Acquire lock with Thread 1 (Biased) and then have Thread 2 contend, revoking bias into CAS spin.",
      hint: "Click 'T1 Acquire Lock', then click 'T2 Acquire (Contend)'.",
      checkCompleted: (state) => {
        const markWord = state.markWord as { lockState?: string } | undefined;
        return (
          markWord?.lockState === "LIGHTWEIGHT" &&
          Number(state.totalCasOperations ?? 0) >= 1
        );
      },
    },
    {
      id: "concurrency-mission-2",
      simulationId: "java-concurrency-jmm-locks",
      title: "Inflate to Heavyweight OS Mutex",
      goal: "Exceed user-space CAS spin limit to allocate an ObjectMonitor and park threads in the WaitSet.",
      hint: "Click 'Heavy Contention (Inflate Mutex)'.",
      checkCompleted: (state) => {
        const markWord = state.markWord as { lockState?: string } | undefined;
        return (
          markWord?.lockState === "HEAVYWEIGHT" &&
          Number(state.contextSwitchesCount ?? 0) >= 1
        );
      },
    },
    {
      id: "concurrency-mission-3",
      simulationId: "java-concurrency-jmm-locks",
      title: "Enforce JMM Visibility with Volatile Barrier",
      goal: "Toggle volatile modifier on to flush CPU store buffers and eliminate stale cache divergence.",
      hint: "Click 'Toggle Volatile' to ON.",
      checkCompleted: (state) =>
        Boolean(state.isVolatileVariable) && !state.raceConditionDetected,
    },
  ],
  "java-streams-pipeline": [
    {
      id: "streams-mission-1",
      simulationId: "java-streams-pipeline",
      title: "Verify Zero Intermediate Heap Lists (Loop Fusion)",
      goal: "Complete a Stream pipeline with filter and map without allocating any intermediate ArrayLists on the JVM Heap.",
      hint: "Run preset 1 and step until pipeline is complete with intermediateListsAllocated === 0.",
      checkCompleted: (state) => {
        const results = (state.collectedResults as Array<unknown>) || [];
        return (
          Boolean(state.isComplete) &&
          Number(state.intermediateListsAllocated ?? 0) === 0 &&
          results.length > 0
        );
      },
    },
    {
      id: "streams-mission-2",
      simulationId: "java-streams-pipeline",
      title: "Observe Short-Circuit Traversal Abort",
      goal: "Trigger short-circuiting via limit(2) so remaining stream elements are never evaluated by downstream sinks.",
      hint: "Step through preset 1 or click 'Force Short-Circuit'.",
      checkCompleted: (state) => Boolean(state.shortCircuitTriggered),
    },
  ],
  "java-completable-future": [
    {
      id: "cf-mission-1",
      simulationId: "java-completable-future",
      title: "Complete Non-blocking Orchestration DAG",
      goal: "Execute all asynchronous pipeline stages without blocking the caller thread or stalling worker pools.",
      hint: "Select 'Clean Non-Blocking Pipeline' and step until all stages complete.",
      checkCompleted: (state) =>
        Boolean(state.pipelineFinished) &&
        !state.callerThreadBlocked &&
        !state.threadStarvationDetected,
    },
    {
      id: "cf-mission-2",
      simulationId: "java-completable-future",
      title: "Detect Worker Thread Starvation (.join() Anti-pattern)",
      goal: "Expose thread exhaustion hazard by invoking blocking .join() inside a worker thread.",
      hint: "Select 'Anti-Pattern: Worker Thread Starvation' or click 'Inject .join() Starvation'.",
      checkCompleted: (state) => Boolean(state.threadStarvationDetected),
    },
  ],
  "java-concurrenthashmap": [
    {
      id: "chm-mission-1",
      simulationId: "java-concurrenthashmap",
      title: "Execute Lock-Free CAS on Distinct Bins",
      goal: "Simultaneously insert into 3 unpopulated bins using atomic casTabAt with zero monitor lock acquisition.",
      hint: "Select preset 'Lock-Free Atomic CAS' or click 'Parallel CAS Puts'.",
      checkCompleted: (state) => Number(state.totalCasOperations ?? 0) >= 3,
    },
    {
      id: "chm-mission-2",
      simulationId: "java-concurrenthashmap",
      title: "Isolate Striped Bin Lock Contention",
      goal: "Simulate concurrent writes to the same bin to observe synchronized(binHead) locking without affecting peer bins.",
      hint: "Click 'Collided Puts (Synchronized Bin #3)'.",
      checkCompleted: (state) =>
        Number(state.totalSynchronizedLocks ?? 0) >= 1 &&
        Number(state.totalContentionEvents ?? 0) >= 1,
    },
  ],
  "java-optional-patterns": [
    {
      id: "opt-mission-1",
      simulationId: "java-optional-patterns",
      title: "Expose Eager orElse() DB Evaluation Hazard",
      goal: "Observe how orElse(expensiveDbQuery()) evaluates the database query unconditionally even on a cached value hit.",
      hint: "Select preset 'The Eager orElse() Pitfall' or click 'Run .orElse()'.",
      checkCompleted: (state) =>
        Boolean(state.dbQueryExecuted) && state.mode === "OR_ELSE_EAGER_HAZARD",
    },
    {
      id: "opt-mission-2",
      simulationId: "java-optional-patterns",
      title: "Verify Zero DB Queries with Lazy orElseGet()",
      goal: "Demonstrate that passing a Supplier lambda to orElseGet() defers execution, performing 0 redundant database calls.",
      hint: "Select preset 'The Lazy orElseGet() Remedy' or click 'Run .orElseGet()'.",
      checkCompleted: (state) =>
        !state.dbQueryExecuted &&
        Boolean(state.pipelineCompleted) &&
        state.mode === "OR_ELSE_GET_LAZY_OPTIMAL",
    },
  ],
  "java-thread-pool-executor": [
    {
      id: "tp-mission-1",
      simulationId: "java-thread-pool-executor",
      title: "Spawn Emergency Non-Core Workers",
      goal: "Saturate the BlockingQueue with burst tasks to trigger the creation of non-core worker threads up to maximumPoolSize.",
      hint: "Click 'Burst Spike (8 Tasks)' or select preset 2.",
      checkCompleted: (state) => {
        const workers = (state.workers as Array<{ isCore?: boolean }>) || [];
        return workers.filter((w) => !w.isCore).length >= 1;
      },
    },
    {
      id: "tp-mission-2",
      simulationId: "java-thread-pool-executor",
      title: "Activate Saturation Rejection Handler",
      goal: "Overwhelm both the workQueue and maximumPoolSize to trigger the configured RejectedExecutionHandler.",
      hint: "Trigger a burst spike when pool and queue are already full.",
      checkCompleted: (state) =>
        Number(state.totalTasksRejected ?? 0) >= 1 &&
        Boolean(state.saturationEventTriggered),
    },
  ],
  "java-threadlocal-leak": [
    {
      id: "tl-mission-1",
      simulationId: "java-threadlocal-leak",
      title: "Expose Thread Pool Memory Leak (Missing remove())",
      goal: "Simulate worker request processing where strong ThreadLocal reference is released, triggering GC to clear the weak key while retaining the 50 MB value in ThreadLocalMap.",
      hint: "Select preset 1 or trigger GC sweep after releasing the strong key reference.",
      checkCompleted: (state) =>
        Number(state.totalLeakedMb ?? 0) >= 50 &&
        Number(state.staleEntriesCount ?? 0) >= 1,
    },
    {
      id: "tl-mission-2",
      simulationId: "java-threadlocal-leak",
      title: "Enforce Bulletproof try-finally { remove(); } Cleanup",
      goal: "Execute threadLocal.remove() in a finally block to completely expunge all entries from ThreadLocalMap.",
      hint: "Select preset 2 or click 'finally { remove(); }'.",
      checkCompleted: (state) =>
        state.mode === "CLEAN_REMOVE_LIFECYCLE" &&
        Number(state.requestsProcessed ?? 0) >= 1 &&
        Number(state.totalLeakedMb ?? 0) === 0,
    },
  ],
};

export function getMissionsForSimulation(simulationId: string): LabMission[] {
  return labMissions[simulationId] || [];
}
