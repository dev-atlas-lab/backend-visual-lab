import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
} from "./types";

/**
 * HotSpot JVM Object Header (Mark Word) lock states:
 * 1. UNLOCKED (001): Normal object, no lock active.
 * 2. BIASED (101): Fast path for single thread without atomic CAS.
 * 3. LIGHTWEIGHT (00): Thin lock using user-space CAS spin on BasicObjectLock in stack.
 * 4. HEAVYWEIGHT (10): Inflated OS Mutex (ObjectMonitor) parking threads in WaitSet.
 */
export type LockState = "UNLOCKED" | "BIASED" | "LIGHTWEIGHT" | "HEAVYWEIGHT";

export interface ThreadExecutionState {
  id: string;
  name: string;
  status: "RUNNING" | "SPINNING_CAS" | "PARKED_MUTEX" | "BLOCKED";
  holdingLock: boolean;
  casSpinAttempts: number;
  localCachedValue: number; // JMM thread-local cache
  hasReadVolatileBarrier: boolean;
}

export interface HotspotMarkWord {
  lockState: LockState;
  ownerThreadId: string | null;
  hashcode: string;
  age: number; // 4 bits GC age (0-15)
  biasEpoch: number;
  spinCount: number;
  monitorWaitQueue: string[]; // Thread IDs waiting on Heavyweight Monitor
}

export interface JavaConcurrencyConfig {
  maxSpinAttempts: number;
  enableBiasedLocking: boolean;
}

export interface JavaConcurrencyState {
  markWord: HotspotMarkWord;
  sharedMainMemoryValue: number; // Heap main memory variable
  isVolatileVariable: boolean;
  threads: ThreadExecutionState[];
  memoryBarrierActive: "NONE" | "LOAD_LOAD" | "STORE_STORE" | "STORE_LOAD";
  lockInflationReason: string | null;
  totalCasOperations: number;
  contextSwitchesCount: number;
  raceConditionDetected: boolean;
}

export type JavaConcurrencyCommand =
  | { type: "THREAD_ACQUIRE_LOCK"; threadId: string }
  | { type: "THREAD_RELEASE_LOCK"; threadId: string }
  | { type: "WRITE_SHARED_VARIABLE"; threadId: string; newValue: number }
  | { type: "READ_SHARED_VARIABLE"; threadId: string }
  | { type: "TOGGLE_VOLATILE"; isVolatile: boolean }
  | { type: "SIMULATE_CONTENTION"; threadCount: number }
  | { type: "RESET_TO_STEADY_STATE" };

const defaultConcurrencyConfig: JavaConcurrencyConfig = {
  maxSpinAttempts: 4,
  enableBiasedLocking: true,
};

export const javaConcurrencySimulation: SimulationEngineSpec<
  JavaConcurrencyConfig,
  JavaConcurrencyState,
  JavaConcurrencyCommand
> = {
  id: "java-concurrency-jmm-locks",
  title: "Java Concurrency, JMM Memory Model & Lock Inflation Engine",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "Java Language Specification (JLS SE 21) §17 (Threads and Locks), JSR-133 (Java Memory Model), and HotSpot ObjectMonitor / Mark Word implementation",
    accurateBehaviors: [
      "JMM Visibility mechanics: non-volatile CPU register/store buffer caching vs volatile memory barrier flushing",
      "HotSpot 64-bit Mark Word lock states transition: Unlocked (001) -> Biased (101) -> Lightweight (00) -> Heavyweight (10)",
      "User-space CAS (Compare-And-Swap) spin-locking before escalating to kernel mutex",
      "Heavyweight ObjectMonitor inflation when contention exceeds spin threshold, putting threads into OS WaitSet",
      "Happens-Before guarantee: volatile write happens-before subsequent volatile read",
    ],
    simplifications: [
      "Mark Word visualized with explicit symbolic fields rather than raw 64-bit hexadecimal mask operations",
      "CPU L1/L2 cache invalidate queues modeled as thread-local cached registers",
      "Spin pause loop modeled in discrete discrete tick cycles rather than CPU PAUSE instructions",
    ],
    assumptions: [
      "SMP architecture with multi-core cache hierarchy (x86-64 / ARM64 memory model)",
      "Standard HotSpot JVM lock escalation behavior (locks never deflate during contention)",
    ],
    unsupportedEdgeCases: [
      "False sharing across 64-byte CPU cache lines (Contended annotation padding)",
      "Instruction reordering involving out-of-order execution speculatively retired stores",
    ],
  },
  presets: [
    {
      id: "preset-lock-escalation",
      title: "HotSpot Lock Inflation: Biased -> Lightweight CAS -> Heavyweight Monitor",
      badge: "Lock Upgrades",
      description:
        "Witness the HotSpot JVM progressively inflate an object's Mark Word from Biased (101) to Thin CAS Spin (00) and finally Heavyweight OS Mutex (10) under multi-thread contention.",
      config: { maxSpinAttempts: 3, enableBiasedLocking: true },
      scriptedCommands: [
        { type: "THREAD_ACQUIRE_LOCK", threadId: "thread-1" }, // Biased to T1
        { type: "THREAD_ACQUIRE_LOCK", threadId: "thread-2" }, // Revoke bias -> Lightweight CAS
        { type: "THREAD_ACQUIRE_LOCK", threadId: "thread-3" }, // High contention -> Inflate Heavyweight Monitor
        { type: "THREAD_RELEASE_LOCK", threadId: "thread-1" }, // T1 exits -> Wake T2 from Monitor
      ],
    },
    {
      id: "preset-jmm-visibility-volatile",
      title: "JMM Visibility: Stale CPU Cache vs Volatile Memory Barrier",
      badge: "JSR-133 Visibility",
      description:
        "Thread-1 updates shared variable while Thread-2 reads from stale CPU cache. Toggle volatile to observe CPU StoreLoad barrier flushing.",
      config: { maxSpinAttempts: 3, enableBiasedLocking: true },
      scriptedCommands: [
        { type: "WRITE_SHARED_VARIABLE", threadId: "thread-1", newValue: 42 },
        { type: "READ_SHARED_VARIABLE", threadId: "thread-2" }, // Stale read!
        { type: "TOGGLE_VOLATILE", isVolatile: true },
        { type: "WRITE_SHARED_VARIABLE", threadId: "thread-1", newValue: 99 },
        { type: "READ_SHARED_VARIABLE", threadId: "thread-2" }, // Coherent read with barrier!
      ],
    },
    {
      id: "preset-cas-contention-aba",
      title: "Optimistic Concurrency & Lock-Free CAS Contention",
      badge: "Lock-Free CAS",
      description:
        "Multiple worker threads attempt atomic Compare-And-Swap updates concurrently. Observe user-space retry loops without kernel context switching.",
      config: { maxSpinAttempts: 4, enableBiasedLocking: false },
      scriptedCommands: [
        { type: "SIMULATE_CONTENTION", threadCount: 3 },
      ],
    },
  ],

  createInitialFrame(config) {
    const activeConfig = config ?? defaultConcurrencyConfig;
    const state: JavaConcurrencyState = {
      markWord: {
        lockState: "UNLOCKED",
        ownerThreadId: null,
        hashcode: "0x7a3f89b2",
        age: 1,
        biasEpoch: 0,
        spinCount: 0,
        monitorWaitQueue: [],
      },
      sharedMainMemoryValue: 10,
      isVolatileVariable: false,
      threads: [
        {
          id: "thread-1",
          name: "Thread-1 (Writer)",
          status: "RUNNING",
          holdingLock: false,
          casSpinAttempts: 0,
          localCachedValue: 10,
          hasReadVolatileBarrier: false,
        },
        {
          id: "thread-2",
          name: "Thread-2 (Reader)",
          status: "RUNNING",
          holdingLock: false,
          casSpinAttempts: 0,
          localCachedValue: 10,
          hasReadVolatileBarrier: false,
        },
        {
          id: "thread-3",
          name: "Thread-3 (Worker)",
          status: "RUNNING",
          holdingLock: false,
          casSpinAttempts: 0,
          localCachedValue: 10,
          hasReadVolatileBarrier: false,
        },
      ],
      memoryBarrierActive: "NONE",
      lockInflationReason: null,
      totalCasOperations: 0,
      contextSwitchesCount: 0,
      raceConditionDetected: false,
    };

    return {
      tick: 1,
      phase: "STEADY_STATE",
      title: "HotSpot Object Header & JMM Memory Initialized",
      state,
      events: [
        {
          tick: 1,
          actor: "HotSpot JVM",
          action: "OBJECT_ALLOCATED",
          detail: `Target object allocated on Heap with Unlocked Mark Word (tag bits: 001, BiasedLocking=${activeConfig.enableBiasedLocking ? "enabled" : "disabled"})`,
          tone: "info",
        },
      ],
      invariants: buildInvariants(state),
      narration: {
        summary:
          "The object header is initialized in UNLOCKED state (tag 001). Threads have local CPU register caches of shared memory.",
        summaryEn:
          "The object header is initialized in UNLOCKED state (tag 001). Threads have local CPU register caches of shared memory.",
        internalsNote:
          "In HotSpot 64-bit architecture, each Java object header consists of a 64-bit Mark Word and a 32/64-bit Klass Word. The 2-3 least significant bits of the Mark Word determine the synchronization state.",
        internalsNoteEn:
          "In HotSpot 64-bit architecture, each Java object header consists of a 64-bit Mark Word and a 32/64-bit Klass Word. The 2-3 least significant bits of the Mark Word determine the synchronization state.",
      },
      metrics: {
        lockState: state.markWord.lockState,
        lockOwner: state.markWord.ownerThreadId ?? "None",
        mainMemoryValue: state.sharedMainMemoryValue,
        isVolatile: state.isVolatileVariable ? "YES (Barrier Active)" : "NO (Cache Hazard)",
        waitQueueSize: state.markWord.monitorWaitQueue.length,
        contextSwitches: state.contextSwitchesCount,
      },
    };
  },

  applyCommand(prevFrame, cmd, config) {
    const activeConfig: JavaConcurrencyConfig = config ?? defaultConcurrencyConfig;
    const nextTick = prevFrame.tick + 1;
    const s: JavaConcurrencyState = JSON.parse(JSON.stringify(prevFrame.state));
    const events = [...prevFrame.events];
    let title = prevFrame.title;
    let phase = prevFrame.phase;
    let summary = "";
    let internals = "";
    let warning: string | undefined = undefined;

    switch (cmd.type) {
      case "THREAD_ACQUIRE_LOCK": {
        const th = s.threads.find((t) => t.id === cmd.threadId);
        if (!th) break;

        // Current Lock State Transition:
        if (s.markWord.lockState === "UNLOCKED") {
          if (activeConfig.enableBiasedLocking) {
            // Unlocked -> BIASED (Fast path, single thread, no atomic CAS)
            s.markWord.lockState = "BIASED";
            s.markWord.ownerThreadId = th.id;
            th.holdingLock = true;
            th.status = "RUNNING";
            title = `Lock Acquired: BIASED to ${th.name}`;
            phase = "LOCK_BIASED";
            s.lockInflationReason = "Single thread lock entry; biased without atomic instructions";

            events.push({
              tick: nextTick,
              actor: th.name,
              action: "BIASED_LOCK_ACQUIRED",
              detail: `Object biased to thread ${th.id}. Mark Word tag updated to 101.`,
              tone: "ok",
            });

            summary = `${th.name} acquired lock via Biased Locking. No atomic CPU instructions or CAS were required.`;
            internals =
              "HotSpot replaces the Thread ID field in the Mark Word with the current thread ID. Subsequent entries by this thread require only a single pointer comparison.";
          } else {
            // Unlocked -> LIGHTWEIGHT (CAS)
            s.markWord.lockState = "LIGHTWEIGHT";
            s.markWord.ownerThreadId = th.id;
            th.holdingLock = true;
            s.totalCasOperations++;
            title = `Lock Acquired: LIGHTWEIGHT (CAS) by ${th.name}`;
            phase = "LOCK_LIGHTWEIGHT";

            events.push({
              tick: nextTick,
              actor: th.name,
              action: "CAS_LOCK_ACQUIRED",
              detail: `Lightweight lock established via atomic CAS. Mark Word tag: 00.`,
              tone: "ok",
            });
            summary = `${th.name} acquired Lightweight Lock using user-space atomic CAS.`;
            internals =
              "The JVM creates a Displaced Mark Word on the thread stack and uses atomic CAS (cmpxchg on x86) to point the object's Mark Word to the stack record.";
          }
        } else if (s.markWord.lockState === "BIASED") {
          if (s.markWord.ownerThreadId === th.id) {
            // Reentrant entry on Biased Lock
            title = `Reentrant Lock Entry: ${th.name}`;
            summary = `${th.name} reentered biased lock without any synchronization cost.`;
            internals = "HotSpot confirms Thread ID matches in Mark Word; zero memory barrier overhead.";
          } else {
            // Contention on Biased Lock -> Revoke Bias and inflate to LIGHTWEIGHT CAS!
            s.markWord.lockState = "LIGHTWEIGHT";
            s.markWord.spinCount++;
            s.totalCasOperations++;
            th.status = "SPINNING_CAS";
            th.casSpinAttempts++;
            s.lockInflationReason = "Contention detected: Revoked Biased Locking -> Escalated to Lightweight CAS";
            title = `Lock Inflation: BIASED -> LIGHTWEIGHT (Contention by ${th.name})`;
            phase = "REVOKE_AND_INFLATE_CAS";

            events.push({
              tick: nextTick,
              actor: "HotSpot Runtime",
              action: "REVOKE_BIAS_AND_INFLATE",
              detail: `Bias revoked because ${th.name} contested lock owned by ${s.markWord.ownerThreadId}. Escalated to Lightweight Lock.`,
              tone: "warn",
            });

            summary = `Contention occurred: ${th.name} attempted to acquire lock owned by ${s.markWord.ownerThreadId}. The JVM revoked Biased lock and escalated to Lightweight CAS spin.`;
            internals =
              "HotSpot revokes biased locking at a Safepoint or on-the-fly, converting the lock into a Lightweight Lock. Contender threads begin user-space CAS spinning.";
          }
        } else if (s.markWord.lockState === "LIGHTWEIGHT") {
          if (s.markWord.ownerThreadId === th.id) {
            title = `Reentrant Lightweight Lock: ${th.name}`;
            summary = `${th.name} re-acquired Lightweight Lock reentrantly.`;
          } else {
            // Contention on Lightweight Lock -> Spin or Inflate to HEAVYWEIGHT
            if (s.markWord.spinCount < activeConfig.maxSpinAttempts) {
              s.markWord.spinCount++;
              s.totalCasOperations++;
              th.status = "SPINNING_CAS";
              th.casSpinAttempts++;
              title = `User-Space CAS Spin: ${th.name} (Spin #${th.casSpinAttempts})`;
              phase = "CAS_SPINNING";

              events.push({
                tick: nextTick,
                actor: th.name,
                action: "CAS_SPIN_RETRY",
                detail: `User-space spin retry #${th.casSpinAttempts}/${activeConfig.maxSpinAttempts} (no OS context switch)`,
                tone: "warn",
              });

              summary = `${th.name} is spinning in user-space with atomic CAS, avoiding an expensive OS kernel context switch.`;
              internals =
                "Adaptive spinning executes a loop of CPU PAUSE instructions, hoping the holding thread releases the lock in a few hundred nanoseconds.";
            } else {
              // Exceeded spin threshold -> Inflate to HEAVYWEIGHT MONITOR!
              s.markWord.lockState = "HEAVYWEIGHT";
              th.status = "PARKED_MUTEX";
              s.contextSwitchesCount++;
              s.markWord.monitorWaitQueue.push(th.id);
              s.lockInflationReason = "Exceeded max CAS spin count -> Inflated to Heavyweight OS Mutex (ObjectMonitor)";
              title = `Lock Inflation: LIGHTWEIGHT -> HEAVYWEIGHT (Thread Parked in WaitSet)`;
              phase = "INFLATE_HEAVYWEIGHT_MONITOR";

              events.push({
                tick: nextTick,
                actor: "HotSpot Monitor",
                action: "INFLATE_OBJECT_MONITOR",
                detail: `ObjectMonitor allocated. ${th.name} parked in OS Mutex WaitSet (Heavyweight tag: 10)`,
                tone: "danger",
              });

              summary = `Spin threshold exceeded. Lock inflated to Heavyweight OS Monitor. ${th.name} was parked via pthread_mutex / futex, incurring an OS context switch (~1-5 μs).`;
              internals =
                "An ObjectMonitor structure is allocated in native heap. The Mark Word stores a pointer to the monitor. Parked threads are placed in the _cxq or _EntryList queues.";
              warning =
                "Heavyweight lock inflation causes OS context switches, cache line invalidations, and latency spikes in high-throughput backend services.";
            }
          }
        } else if (s.markWord.lockState === "HEAVYWEIGHT") {
          // Already Heavyweight -> Thread immediately parked
          th.status = "PARKED_MUTEX";
          s.contextSwitchesCount++;
          if (!s.markWord.monitorWaitQueue.includes(th.id)) {
            s.markWord.monitorWaitQueue.push(th.id);
          }
          title = `${th.name} Blocked in Heavyweight WaitSet`;
          events.push({
            tick: nextTick,
            actor: th.name,
            action: "THREAD_PARKED",
            detail: `Thread parked into OS WaitSet queue. Remaining queued: ${s.markWord.monitorWaitQueue.length}`,
            tone: "danger",
          });
          summary = `${th.name} was blocked by the Heavyweight Monitor and suspended by the OS scheduler.`;
        }
        break;
      }

      case "THREAD_RELEASE_LOCK": {
        const th = s.threads.find((t) => t.id === cmd.threadId);
        if (!th || !th.holdingLock) {
          summary = `Thread ${cmd.threadId} does not hold the lock; cannot release.`;
          break;
        }

        th.holdingLock = false;
        title = `Lock Released by ${th.name}`;

        if (s.markWord.lockState === "HEAVYWEIGHT") {
          // Wake next thread from WaitSet
          const nextThreadId = s.markWord.monitorWaitQueue.shift();
          if (nextThreadId) {
            const nextThread = s.threads.find((t) => t.id === nextThreadId);
            if (nextThread) {
              nextThread.status = "RUNNING";
              nextThread.holdingLock = true;
              s.markWord.ownerThreadId = nextThread.id;
              s.contextSwitchesCount++;

              events.push({
                tick: nextTick,
                actor: "ObjectMonitor",
                action: "UNPARK_THREAD",
                detail: `Unparked ${nextThread.name} from WaitSet. Lock transferred.`,
                tone: "ok",
              });
              summary = `${th.name} released Heavyweight Lock. OS unparked ${nextThread.name} from the WaitSet.`;
              internals =
                "ObjectMonitor::exit() awakens a successor thread using OS signaling (pthread_cond_signal / futex). Heavyweight locks NEVER deflate back to Lightweight in HotSpot.";
            }
          } else {
            s.markWord.ownerThreadId = null;
            summary = `${th.name} released Heavyweight Lock. Monitor is now idle with empty WaitSet.`;
          }
        } else {
          // Biased or Lightweight release
          s.markWord.ownerThreadId = null;
          s.markWord.lockState = "UNLOCKED";
          s.markWord.spinCount = 0;
          events.push({
            tick: nextTick,
            actor: th.name,
            action: "LOCK_RELEASED",
            detail: "Lock released cleanly; Mark Word reset to UNLOCKED (tag 001)",
            tone: "ok",
          });
          summary = `${th.name} exited synchronized block. Mark Word restored to UNLOCKED.`;
          internals =
            "In Lightweight Lock release, atomic CAS restores the Displaced Mark Word from the thread stack to the object header.";
        }
        break;
      }

      case "WRITE_SHARED_VARIABLE": {
        const th = s.threads.find((t) => t.id === cmd.threadId);
        if (!th) break;

        th.localCachedValue = cmd.newValue;
        s.sharedMainMemoryValue = cmd.newValue;
        title = `${th.name} wrote shared value = ${cmd.newValue}`;

        if (s.isVolatileVariable) {
          s.memoryBarrierActive = "STORE_LOAD";
          // Volatile write immediately invalidates all other threads' local caches!
          s.threads.forEach((other) => {
            if (other.id !== th.id) {
              other.localCachedValue = cmd.newValue; // Flushed
            }
          });

          events.push({
            tick: nextTick,
            actor: th.name,
            action: "VOLATILE_STORE_BARRIER",
            detail: `Volatile write with StoreStore & StoreLoad barrier: flushed ${cmd.newValue} to main memory & invalidated peer CPU caches`,
            tone: "ok",
          });
          summary = `Volatile write executed. HotSpot inserted a StoreLoad memory barrier (lock addl $0,0(%rsp) on x86) guaranteeing global visibility.`;
          internals =
            "JSR-133: A volatile write establishes a Happens-Before relationship. It prevents store-store reordering and forces cache lines to be flushed to main memory.";
        } else {
          s.memoryBarrierActive = "NONE";
          // Non-volatile: Peer threads retain STALE local cache!
          s.raceConditionDetected = true;
          events.push({
            tick: nextTick,
            actor: th.name,
            action: "NON_VOLATILE_STORE",
            detail: `Non-volatile write: updated L1 cache and memory, but other threads retain stale CPU registers!`,
            tone: "warn",
          });
          summary = `Non-volatile write executed. Other threads still possess STALE values in their CPU store buffers!`;
          internals =
            "Without volatile or synchronization barriers, the compiler and CPU may keep values in registers without memory coherence, creating data race hazards.";
          warning =
            "JMM Visibility Hazard: Without volatile or synchronized, other threads may loop indefinitely reading a stale variable!";
        }
        break;
      }

      case "READ_SHARED_VARIABLE": {
        const th = s.threads.find((t) => t.id === cmd.threadId);
        if (!th) break;

        if (s.isVolatileVariable) {
          th.localCachedValue = s.sharedMainMemoryValue;
          th.hasReadVolatileBarrier = true;
          s.memoryBarrierActive = "LOAD_LOAD";
          title = `${th.name} read VOLATILE value = ${s.sharedMainMemoryValue}`;
          events.push({
            tick: nextTick,
            actor: th.name,
            action: "VOLATILE_LOAD_BARRIER",
            detail: `Volatile read: LoadLoad & LoadStore barrier executed. Read coherent value ${s.sharedMainMemoryValue} from main memory.`,
            tone: "ok",
          });
          summary = `${th.name} performed a volatile read, bypassing CPU registers and fetching directly from coherent main memory.`;
        } else {
          title = `${th.name} read NON-VOLATILE value = ${th.localCachedValue}`;
          const isStale = th.localCachedValue !== s.sharedMainMemoryValue;
          events.push({
            tick: nextTick,
            actor: th.name,
            action: "NON_VOLATILE_LOAD",
            detail: isStale
              ? `STALE READ! Read ${th.localCachedValue} from CPU register, but Main Memory is ${s.sharedMainMemoryValue}!`
              : `Read ${th.localCachedValue} from local cache.`,
            tone: isStale ? "danger" : "info",
          });
          summary = isStale
            ? `${th.name} read a STALE value (${th.localCachedValue}) because the CPU register was not invalidated!`
            : `${th.name} read ${th.localCachedValue} from local cache.`;
        }
        break;
      }

      case "TOGGLE_VOLATILE": {
        s.isVolatileVariable = cmd.isVolatile;
        if (cmd.isVolatile) {
          // Flush main memory to all threads
          s.threads.forEach((t) => {
            t.localCachedValue = s.sharedMainMemoryValue;
          });
          s.raceConditionDetected = false;
        }
        title = `Volatile Semantic: ${cmd.isVolatile ? "ENABLED" : "DISABLED"}`;
        events.push({
          tick: nextTick,
          actor: "JMM Engine",
          action: "TOGGLE_VOLATILE_MODIFIER",
          detail: `Variable modified with 'volatile' = ${cmd.isVolatile}. Hardware memory barriers ${cmd.isVolatile ? "ACTIVE" : "INACTIVE"}.`,
          tone: cmd.isVolatile ? "ok" : "warn",
        });
        summary = `Variable is now ${cmd.isVolatile ? "VOLATILE (guaranteed visibility)" : "NON-VOLATILE (stale cache possible)"}.`;
        break;
      }

      case "SIMULATE_CONTENTION": {
        s.markWord.lockState = "HEAVYWEIGHT";
        s.markWord.ownerThreadId = "thread-1";
        s.threads[0].holdingLock = true;
        s.threads[0].status = "RUNNING";
        s.threads[1].status = "SPINNING_CAS";
        s.threads[1].casSpinAttempts = 2;
        s.threads[2].status = "PARKED_MUTEX";
        s.markWord.monitorWaitQueue = ["thread-2", "thread-3"];
        s.totalCasOperations += 5;
        s.contextSwitchesCount += 2;
        s.lockInflationReason =
          "Contention burst exceeded spin threshold -> Inflated to Heavyweight OS Mutex (ObjectMonitor)";
        title = "Simulated Multi-Thread Lock Contention & Inflation";
        phase = "SIMULATE_CONTENTION";

        events.push({
          tick: nextTick,
          actor: "Workload Generator",
          action: "BURST_THREADS",
          detail:
            "Thread-1 holds lock; Contention exceeded spin threshold; ObjectMonitor allocated; Threads parked in WaitSet.",
          tone: "warn",
        });
        summary =
          "Simulated high concurrency: lock escalated to Heavyweight OS Mutex with threads parked in OS WaitSet.";
        internals =
          "This reproduces real-world high-throughput backend contention where fast-path locks escalate into mixed CAS and Heavyweight mutexes.";
        break;
      }

      case "RESET_TO_STEADY_STATE": {
        return javaConcurrencySimulation.createInitialFrame(activeConfig);
      }
    }

    const invariants = buildInvariants(s);

    return {
      tick: nextTick,
      phase,
      title,
      state: s,
      events,
      invariants,
      narration: {
        summary,
        summaryEn: summary,
        internalsNote: internals,
        internalsNoteEn: internals,
        productionWarning: warning,
        productionWarningEn: warning,
      },
      metrics: {
        lockState: s.markWord.lockState,
        lockOwner: s.markWord.ownerThreadId ?? "None",
        mainMemoryValue: s.sharedMainMemoryValue,
        isVolatile: s.isVolatileVariable ? "YES (Barrier Active)" : "NO (Cache Hazard)",
        waitQueueSize: s.markWord.monitorWaitQueue.length,
        contextSwitches: s.contextSwitchesCount,
      },
    };
  },
};

function buildInvariants(
  state: JavaConcurrencyState,
): SimulationInvariantCheck[] {
  const checks: SimulationInvariantCheck[] = [];

  // Invariant 1: Single Lock Owner Invariant (Mutual Exclusion)
  const lockHolders = state.threads.filter((t) => t.holdingLock);
  checks.push({
    id: "mutual-exclusion-integrity",
    label: "Mutual Exclusion (Mutex) Safety",
    passed: lockHolders.length <= 1,
    detail:
      lockHolders.length <= 1
        ? lockHolders.length === 1
          ? `Exclusive lock held by single thread: ${lockHolders[0].name}`
          : "Lock is unheld (no concurrent active critical sections)"
        : `CRITICAL SAFETY VIOLATION: ${lockHolders.length} threads simultaneously inside critical section!`,
  });

  // Invariant 2: JMM Volatile Visibility Coherence
  const staleThreads = state.threads.filter(
    (t) => t.localCachedValue !== state.sharedMainMemoryValue,
  );
  checks.push({
    id: "jmm-memory-visibility",
    label: "JMM Memory Visibility Coherence",
    passed: state.isVolatileVariable ? staleThreads.length === 0 : true,
    detail: state.isVolatileVariable
      ? staleThreads.length === 0
        ? "Volatile StoreLoad barrier ensures 100% cache coherence across all CPU cores"
        : `Visibility violation: ${staleThreads.length} threads reading stale CPU cache`
      : staleThreads.length > 0
        ? `Expected non-volatile divergence: ${staleThreads.length} threads holding stale CPU registers`
        : "Main memory and thread registers currently synchronized",
  });

  // Invariant 3: HotSpot Lock Escalation Monotonicity
  checks.push({
    id: "lock-escalation-validity",
    label: "HotSpot Lock State Validity",
    passed: ["UNLOCKED", "BIASED", "LIGHTWEIGHT", "HEAVYWEIGHT"].includes(
      state.markWord.lockState,
    ),
    detail: `Current Object Mark Word tag: ${state.markWord.lockState} (Spin count: ${state.markWord.spinCount})`,
  });

  // Invariant 4: OS Context Switch Threshold
  checks.push({
    id: "kernel-context-switch-alert",
    label: "Kernel Context Switch Overhead",
    passed: state.markWord.lockState !== "HEAVYWEIGHT" || state.contextSwitchesCount > 0,
    detail:
      state.markWord.lockState === "HEAVYWEIGHT"
        ? `Heavyweight lock active with ${state.contextSwitchesCount} kernel context switch events (WaitSet: ${state.markWord.monitorWaitQueue.length})`
        : "Lock operating in user-space (Zero kernel context switches)",
  });

  return checks;
}
