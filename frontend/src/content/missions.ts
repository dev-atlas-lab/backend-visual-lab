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
};

export function getMissionsForSimulation(simulationId: string): LabMission[] {
  return labMissions[simulationId] || [];
}
