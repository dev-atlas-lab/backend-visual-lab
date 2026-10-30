# Java Core & JVM Internals Domain UX Specification
**Domain:** Java Core & JVM Internals (`java`)  
**Status:** COMPLETE (Phase 6)

---

## 1. Domain Scope & Pedagogical Architecture

The Java domain encompasses 11 sequential interactive labs covering JVM runtime data areas, garbage collection, collections, memory models, threading, streams, and concurrency:

1. **JVM Memory & Generational GC** (`java-memory-heap-stack-gc`): Call Stack Frames vs Young Gen (Eden, S0, S1) and Old Gen promotion.
2. **Java Exceptions & Stack Unwinding** (`java-exceptions-stack-unwinding`): `athrow`, JVM Exception Tables `(from, to, target, type)`, Try-with-Resources suppressed exceptions.
3. **HashMap Internals & Treeification** (`java-hashmap-treeification`): Hashcode perturbation `(h ^ (h >>> 16))`, `(n - 1) & hash` slot mapping, and Red-Black treeification at depth 8.
4. **ConcurrentHashMap Lock Striping** (`java-concurrenthashmap-locking`): Lock-free atomic CAS insertions, striped `synchronized(binHead)`, and `ForwardingNode` (-1/MOVED) concurrent table resizing.
5. **Java Optional Patterns & Hazards** (`java-optional-functional-patterns`): Eager `orElse()` evaluation pitfalls on cache hits vs lazy `orElseGet()`, and monadic pipeline transformations.
6. **Java Concurrency, JMM & Lock Upgrades** (`java-concurrency-jmm-locks`): JMM Happens-Before, volatile CPU memory barriers, HotSpot 64-bit Mark Word lock inflation (Unlocked -> Biased -> Lightweight CAS -> Heavyweight Mutex).
7. **ThreadPoolExecutor Lifecycle** (`java-thread-pool-executor`): Invariant 4-step dispatching algorithm and saturation policies (`CallerRunsPolicy`, `AbortPolicy`, `DiscardPolicy`).
8. **Stream API & Loop Fusion** (`java-streams-lazy-evaluation`): Lazy evaluation, single-pass loop fusion, short-circuiting at `limit(n)`, and stateful `sorted()` barriers.
9. **Virtual Threads (Project Loom)** (`java-virtual-threads-loom`): M:N user-mode virtual threads, OS Carrier scheduling, and `synchronized` block Thread Pinning.
10. **CompletableFuture Async DAGs** (`java-completable-future-async`): CompletionStage DAG orchestration, thread handoffs, `.join()` starvation deadlocks, and `.exceptionally()` circuits.
11. **References & ThreadLocal Leaks** (`java-references-threadlocal-leaks`): `ThreadLocalMap` Weak Key vs Strong Value, Thread Pool memory leaks, and the 4 Java Reference Types.

---

## 2. Canvas & Visual Projections Standards

Every Java lab projects 3 coordinated visual lanes:
- **Lane 1: Execution Control / Caller Scope**: Call stack frames, worker threads, stream sink DAGs, or inbound task submission queues.
- **Lane 2: JVM Internal Structure**: Heap regions, hash bins, Mark Word bits, carrier threads, or ThreadLocalMap tables.
- **Lane 3: Telemetry & Safety Sentinels**: GC telemetry, lock contention gauges, thread pinning warnings, or memory leak detectors.

---

## 3. Interactive Fault Injection Standards

Each Java lab features domain-specific fault buttons (e.g., `Inject Hash Collisions`, `Provoke Lock Contention`, `Pin Carrier Thread`, `Inject .join() Deadlock`, `Trigger GC to Expose Stale Entry Leak`).
