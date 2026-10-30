# Existing Labs Inventory & Technical Assessment
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Scope:** Complete inventory of all 14 active interactive simulation labs  
**Status:** COMPLETE (Phase 0 Audit)

---

## Complete Lab Matrix

| # | Lab Slug | Simulation ID | Domain | Primary Technical Focus |
| :- | :--- | :--- | :--- | :--- |
| **1** | `kafka-consumer-groups-rebalance` | `kafka-consumer-group` | Messaging & Streaming | KIP-429 Cooperative Sticky vs Eager Rebalancing, Generation ID, Partitions |
| **2** | `redis-cache-stampede-ttl` | `redis-stampede` | Caching & Redis | Cache-Aside, Passive/Active TTL Expiry, Distributed Mutex (SET NX PX), Pool Collapse |
| **3** | `postgres-btree-mvcc-visibility` | `postgres-mvcc-btree` | Databases & Storage | 8 KB Slotted Pages, B-Tree Traversal, Heap Tuples (CTID), MVCC xmin/xmax Visibility |
| **4** | `java-memory-heap-stack-gc` | `java-memory-gc` | Java Core & JVM | Call Stack Frames vs Heap, Eden, Survivor S0/S1, Tenuring Age, HotSpot Minor/Full GC |
| **5** | `java-exceptions-stack-unwinding` | `java-exceptions-stack-unwinding` | Java Core & JVM | JVM Exception Tables, Call Stack Unwinding (`athrow`), Try-with-Resources Suppressed Exceptions |
| **6** | `java-hashmap-treeification` | `java-hashmap-treeification` | Java Core & JVM | Bitwise Hash Perturbation, (n-1)&hash, Bucket Collisions, TREEIFY_THRESHOLD=8 Red-Black Tree |
| **7** | `java-concurrenthashmap-locking` | `java-concurrenthashmap` | Java Core & JVM | Atomic CAS on empty bins, Striped synchronized(binHead), ForwardingNode (-1/MOVED) Resizing |
| **8** | `java-optional-functional-patterns` | `java-optional-patterns` | Java Core & JVM | Eager orElse() Evaluation Hazard, Monadic Composition (.map, .filter), Wrapper Memory Overhead |
| **9** | `java-concurrency-jmm-locks` | `java-concurrency-jmm-locks` | Java Core & JVM | JMM Happens-Before, Volatile CPU Memory Barriers, Mark Word Lock Inflation (Biased -> Mutex) |
| **10** | `java-thread-pool-executor` | `java-thread-pool-executor` | Java Core & JVM | 4-Step Dispatching (Core -> Queue -> Non-Core -> Saturation), Saturation Policies (CallerRuns/Abort) |
| **11** | `java-streams-lazy-evaluation` | `java-streams-pipeline` | Java Core & JVM | Lazy Evaluation, Single-pass Loop Fusion, Short-circuiting limit(n), Stateful sorted() Barrier |
| **12** | `java-virtual-threads-loom` | `java-virtual-threads` | Java Core & JVM | Project Loom M:N Schedulers, Carrier Thread Mount/Unmount, Synchronized Thread Pinning |
| **13** | `java-completable-future-async` | `java-completable-future` | Java Core & JVM | CompletionStage DAG, Non-blocking Handoffs, Thread Starvation Deadlocks (.join), allOf() Barriers |
| **14** | `java-references-threadlocal-leaks` | `java-threadlocal-leak` | Java Core & JVM | ThreadLocalMap Weak Key vs Strong Value, Thread Pool Leaks, 4 Reference Types (Weak/Soft/Phantom) |

---

## Detailed Lab-by-Lab Audit

### Lab 1: Apache Kafka — Consumer Groups & Rebalance (`kafka-consumer-groups-rebalance`)
- **Purpose**: Deconstruct consumer group rebalancing protocols and partition ownership handoffs.
- **Simulation Capabilities**: RangeAssignor vs CooperativeStickyAssignor, generation progression, consumer lifecycle (Heartbeat, JoinGroup, SyncGroup).
- **Available Interactions**: Crash Consumer C3, Step Rebalance, Complete Join/Sync, Switch Assignor.
- **Internal State Exposed**: Generation ID, Group State (`Stable`, `PreparingRebalance`, `CompletingRebalance`), per-consumer partition assignments, Stop-The-World flag.
- **Visual Projection**: 3 lanes: Partition Topology (P0-P5), Consumer Group Members (C1-C3), Rebalance Protocol State.
- **Current UX Limitations**: Text description of partition movement is dense; needs visual animated packet/assignment connectors and explicit rebalance timeline view.

---

### Lab 2: Redis — Cache-Aside & Stampede Mitigation (`redis-cache-stampede-ttl`)
- **Purpose**: Demonstrate dogpile cache stampedes when hot keys expire under heavy traffic and compare naive cache-aside against distributed mutex locks (`SET NX PX`).
- **Simulation Capabilities**: 100 QPS concurrent read load, TTL countdown, cache hit/miss evaluation, DB connection pool saturation (0-50 connections).
- **Available Interactions**: Expire TTL (0ms), Fire 100 Concurrent Requests, Switch Strategy (Naive vs Mutex Lock vs Probabilistic Refresh).
- **Internal State Exposed**: Active DB connections, DB pool exhaustion flag, cache status (`HIT` / `MISS`), response latency (p99 ms).
- **Visual Projection**: 3 lanes: Application Incoming Traffic, Redis In-Memory Key & TTL, Database Connection Pool.
- **Current UX Limitations**: Needs graphical gauge/sparkline for connection pool pressure and visual lock token lease progression.

---

### Lab 3: PostgreSQL — B-Tree Index & MVCC Tuple Visibility (`postgres-btree-mvcc-visibility`)
- **Purpose**: Visualize 8 KB slotted disk pages, CTID tuple pointers, B-Tree leaf traversal, and transaction snapshot visibility (`xmin`, `xmax`, isolation levels).
- **Simulation Capabilities**: Sequential Scan vs Index Scan vs Index-Only Scan (Visibility Map), concurrent transactions (TxA, TxB), tuple UPDATE creating physical dead tuples.
- **Available Interactions**: Execute SELECT Query, Run UPDATE on record, Toggle Index Scan, Advance Transaction Commit/Rollback.
- **Internal State Exposed**: 8 KB Page ItemId pointers, Heap Tuple header (`xmin`, `xmax`, `t_ctid`), Transaction Snapshot (`txid`, active list), Disk I/O Block reads.
- **Visual Projection**: 3 lanes: Query Execution Engine & Scan Type, 8 KB Slotted Page Layout (Tuples & CTIDs), MVCC Transaction Snapshot.
- **Current UX Limitations**: Slotted page layout is currently rendered as tabular cards; a database-debugger memory layout grid with direct pointer arrows will significantly elevate comprehension.

---

### Lab 4: Java Memory Management — Stack Frames & GC (`java-memory-heap-stack-gc`)
- **Purpose**: Demystify JVM runtime memory layout: Thread Stack frames, Heap Young Gen (Eden, S0, S1), Old Gen, and HotSpot Minor/Full GC cycles.
- **Simulation Capabilities**: Method call invocation, local variable allocation on Stack, Heap object instantiation, reachability graph invalidation upon return, survivor tenuring age advancement, promotion to Tenured.
- **Available Interactions**: Invoke Method, Return from Method, Trigger Minor GC, Allocate Long-Lived Objects.
- **Internal State Exposed**: Stack Frame call stack, Eden utilization (MB), S0/S1 active state, Old Gen capacity, tenuring age counters.
- **Visual Projection**: 3 lanes: Call Stack Frames, Young Generation (Eden & Survivors), Old Generation & GC Telemetry.
- **Current UX Limitations**: Promotion threshold needs interactive visual counter on each object node.

---

### Lab 5: Java Exceptions — Stack Unwinding (`java-exceptions-stack-unwinding`)
- **Purpose**: Trace JVM exception dispatching, Stack Frame popping (`athrow`), JVM Exception Table matching, and Try-with-Resources suppressed exceptions.
- **Simulation Capabilities**: 4-deep call stack, exception throwing, frame-by-frame unwinding, catch block matching, secondary close() failure suppression.
- **Available Interactions**: Push Call Frame, Throw Exception, Execute Unwinding Step, Trigger Suppressed Exception.
- **Internal State Exposed**: Active Call Stack depth, Exception Table entries `(from, to, target, type)`, unhandled crash sentinel.
- **Visual Projection**: 3 lanes: Call Stack Frames, JVM Exception Table Inspector, Exception Dispatcher & Suppressed Chain.
- **Current UX Limitations**: Exception table range highlighting could be clearer during unwinding.

---

### Lab 6: Java Collections — HashMap Treeification (`java-hashmap-treeification`)
- **Purpose**: Deconstruct internal hash table collisions, bucket chaining, and Java 8 Red-Black Tree treeification when collision depth exceeds 8.
- **Simulation Capabilities**: Hashcode computation with bitwise perturbation `(h ^ (h >>> 16))`, `(n - 1) & hash` slot mapping, linked list chaining, treeification at count 8, table capacity doubling.
- **Available Interactions**: Insert Normal Key, Inject Hash Collisions, Trigger Table Resize.
- **Internal State Exposed**: Table capacity, load factor threshold, colliding bucket depth, node type (`Node` vs `TreeNode`).
- **Visual Projection**: 3 lanes: Hashcode Perturbation & Slot Computation, Bucket Array (Bins 0-15), Collided Bucket Structure (List vs Tree).
- **Current UX Limitations**: Tree visualization is represented as linear nodes; a visual hierarchical tree canvas would enhance clarity.

---

### Lab 7: Java ConcurrentHashMap — Lock Striping (`java-concurrenthashmap-locking`)
- **Purpose**: Reveal lock-free atomic `casTabAt` insertions on empty bins, striped `synchronized(binHead)` on collided bins, and cooperative resizing with `ForwardingNode`.
- **Simulation Capabilities**: Multi-threaded concurrent writes across distinct and collided bins, bucket locking isolation, concurrent resizing table migration.
- **Available Interactions**: Concurrent Insert Disjoint Bins, Concurrent Insert Same Bin (Lock Contention), Trigger Multi-Threaded Table Resize.
- **Internal State Exposed**: Bin lock states, atomic CAS success/failure counters, forwarding table pointers (`hash = -1 / MOVED`).
- **Visual Projection**: 3 lanes: Worker Threads & Operations, ConcurrentHashMap Table & Bin Lock States, Contention & Migration Telemetry.
- **Current UX Limitations**: Needs distinct visual indicators showing lock contention vs lock-free execution in real time.

---

### Lab 8: Java Optional — Functional Patterns & Eager Hazards (`java-optional-functional-patterns`)
- **Purpose**: Contrast eager evaluation of `orElse(expensiveCall())` on cache hits versus lazy `orElseGet(() -> expensiveCall())`, and monadic composition.
- **Simulation Capabilities**: Cache hit vs miss, unconditional database queries triggered by `orElse()`, zero-query lazy supplier execution with `orElseGet()`, monadic pipeline chaining.
- **Available Interactions**: Run Eager orElse() with Cache Hit, Run Lazy orElseGet() with Cache Hit, Execute Monadic Pipeline (.filter, .map).
- **Internal State Exposed**: Database query count, cache hit ratio, anti-pattern sentinel (`isPresent() + get()`), heap wrapper overhead.
- **Visual Projection**: 3 lanes: Cache & Inbound Request, Optional Evaluation Engine (Eager vs Lazy), Database Query Counter & Anti-pattern Sentinel.
- **Current UX Limitations**: Visual comparison between eager and lazy execution flows benefits from side-by-side execution markers.

---

### Lab 9: Java Concurrency — JMM & Lock Upgrades (`java-concurrency-jmm-locks`)
- **Purpose**: Demonstrate JMM visibility hazards (stale CPU cache reads) resolved by `volatile` memory barriers, and HotSpot 64-bit Mark Word lock inflation.
- **Simulation Capabilities**: Thread cache coherency without volatile, volatile write triggering memory bus invalidation, lock state escalation: `UNLOCKED` $\rightarrow$ `BIASED` $\rightarrow$ `LIGHTWEIGHT (CAS)` $\rightarrow$ `HEAVYWEIGHT (OS Mutex)`.
- **Available Interactions**: Non-Volatile Write/Read (Stale), Volatile Write/Read (Barrier), Step Contention (Biased -> Lightweight -> Heavyweight).
- **Internal State Exposed**: CPU L1/L2 cache vs Main Memory value, 64-bit Mark Word bits, ObjectMonitor WaitSet / EntryList size.
- **Visual Projection**: 3 lanes: CPU Cores & L1/L2 Cache Visibility, JMM Main Memory Bus, HotSpot 64-bit Mark Word & ObjectMonitor.
- **Current UX Limitations**: Mark Word bit layout needs interactive bit-mask inspection.

---

### Lab 10: Java ThreadPoolExecutor — Worker Lifecycle (`java-thread-pool-executor`)
- **Purpose**: Unpack the 4-step dispatching algorithm (`Core Workers` $\rightarrow$ `BlockingQueue` $\rightarrow$ `Non-Core Workers` $\rightarrow$ `Saturation Policy`).
- **Simulation Capabilities**: Task queuing, worker spawning up to `maximumPoolSize`, saturation rejection policies (`AbortPolicy`, `CallerRunsPolicy`, `DiscardPolicy`), worker keep-alive termination.
- **Available Interactions**: Submit Single Task, Burst Submit (10 Tasks), Switch Rejection Policy, Process Queued Task.
- **Internal State Exposed**: Core pool size, active workers count, workQueue capacity & occupancy, saturation rejection counter.
- **Visual Projection**: 3 lanes: Task Ingestion & Dispatcher (4-Step Logic), Worker Threads Pool (Core & Non-Core), BlockingQueue Buffer & Saturation Sentinel.
- **Current UX Limitations**: 4-step policy flowchart needs an active-node indicator tracking where each incoming task currently routes.

---

### Lab 11: Java Stream API — Lazy Evaluation & Loop Fusion (`java-streams-lazy-evaluation`)
- **Purpose**: Verify that intermediate operations (`filter`, `map`) execute lazily with zero element traversal until terminal operation (`findFirst`, `collect`), and examine single-pass loop fusion.
- **Simulation Capabilities**: Lazy pipeline construction, fused single-pass traversal, short-circuiting at `limit(n)`, stateful `sorted()` barrier breaking fusion.
- **Available Interactions**: Build Intermediate Pipeline, Trigger Terminal Count (Full Traversal), Trigger Short-Circuit findFirst, Toggle Stateful sorted() Barrier.
- **Internal State Exposed**: Upstream elements evaluated, intermediate list allocation counter (0 in fused mode vs N in naive mode), short-circuit termination flag.
- **Visual Projection**: 3 lanes: Stream Pipeline Operations & Sink DAG, Element Traversal & Loop Fusion Tracer, Heap Allocation Sentinel & Short-Circuit Telemetry.
- **Current UX Limitations**: Element passing through the filter/map chain needs smooth step-by-step element tracking.

---

### Lab 12: Java Virtual Threads — Project Loom (`java-virtual-threads-loom`)
- **Purpose**: Explore Java 21 user-mode Virtual Threads, Continuation unmounting on blocking socket/DB I/O, Carrier Thread scheduling, and `synchronized` block Thread Pinning.
- **Simulation Capabilities**: M:N user-mode virtual thread mounting onto OS carrier threads, non-blocking continuation park on sleep/socket read, synchronized block pinning carrier thread.
- **Available Interactions**: Spawn 100 Virtual Threads, Trigger Non-Blocking I/O, Trigger Synchronized Blocking Call (Pinning), Complete I/O & Resume.
- **Internal State Exposed**: OS Carrier threads (ForkJoinPool worker-1/2), pinned carrier thread sentinel, blocked carrier warning.
- **Visual Projection**: 3 lanes: Virtual Threads Queue (Continuation State), OS Carrier Threads (Worker Pool), Thread Pinning Sentinel & Native Memory Telemetry.
- **Current UX Limitations**: Pinned state indicator needs prominent visual alert and thread stack trace.

---

### Lab 13: Java CompletableFuture — Async DAGs (`java-completable-future-async`)
- **Purpose**: Trace asynchronous DAG orchestration across thread pools, thread handoffs (`thenApply` vs `thenApplyAsync`), `.join()` thread starvation deadlocks, and `.exceptionally()` fallback resilience.
- **Simulation Capabilities**: Multi-stage dependency DAG, thread pool handoff (`ForkJoinPool` to `CustomExecutor`), worker thread deadlock when calling blocking `.join()`, `.allOf()` barrier coordination.
- **Available Interactions**: Execute Non-blocking Async DAG, Inject Blocking .join() inside Worker Thread (Deadlock), Trigger Stage Exception & Verify Fallback.
- **Internal State Exposed**: DAG stage completion status (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`), thread allocation mapping, deadlock warning.
- **Visual Projection**: 3 lanes: Asynchronous DAG Stage Graph, Execution Thread Pools (ForkJoinPool vs Custom), Thread Starvation Sentinel & Circuit Fallback.
- **Current UX Limitations**: Visual DAG edges should reflect live data flow dependencies.

---

### Lab 14: Java References & ThreadLocal — Memory Leaks (`java-references-threadlocal-leaks`)
- **Purpose**: Expose the thread pool memory leak mechanism in `ThreadLocal.ThreadLocalMap` (`Entry extends WeakReference<ThreadLocal<?>>`) and compare Strong, Soft, Weak, and Phantom references.
- **Simulation Capabilities**: Request context set on pooled thread, call stack frame pop releasing outer strong ref, GC clearing weak key (`key == null`), strong `Entry.value` remaining leaked indefinitely on permanent worker thread, cleanup via `threadLocal.remove()`.
- **Available Interactions**: Submit Request (50 MB Payload), Release Strong Key Ref (Pop Stack), Trigger GC (Expose Stale Entry Leak), Execute finally { remove() }, Allocate 4 Reference Types.
- **Internal State Exposed**: Worker thread locals table, weak key collected status, leaked MB counter, stale entries count, reference queue items.
- **Visual Projection**: 3 lanes: Worker Threads & ThreadLocalMap Table, Reference Types Reachability Graph, Memory Leak Sentinel & GC Telemetry.
- **Current UX Limitations**: The GC Root reachability path from Thread to Value needs distinct visual highlighting.
