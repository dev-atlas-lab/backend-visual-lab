import type { ScenarioQuestion } from "../domain";

export const questionBank: ScenarioQuestion[] = [
  // Java Core & JVM Internals Questions
  {
    id: "java-q1-stack-vs-heap",
    moduleId: "java-memory-heap-stack-gc",
    domainId: "java",
    type: "single-choice",
    stem: "A Java method defines a local variable 'int counter = 10;' and creates a new object 'Order order = new Order();'. When the method finishes execution and its stack frame is popped, what happens to 'counter' and 'order' in JVM memory?",
    choices: [
      {
        id: "a",
        text: "Both 'counter' and the 'Order' instance are instantly deallocated by the operating system alongside the stack frame without GC intervention.",
        explanation:
          "Incorrect: Only the primitive 'counter' and the reference pointer 'order' on the Stack frame are popped with the frame. The 'Order' instance itself resides on the Heap and requires the Garbage Collector for reclamation.",
      },
      {
        id: "b",
        text: "The primitive 'counter' and the reference pointer 'order' on the Stack frame are instantly cleared. The Heap-allocated 'Order' object becomes unreachable from GC Roots and will be reclaimed in the next Minor GC cycle.",
        explanation:
          "Correct: The Stack frame directly stores primitive variables and 4/8-byte reference pointers. When the method returns, the stack frame is popped instantly with zero GC overhead. The Heap-allocated 'Order' instance loses its reference path (unreachable from GC Roots) and becomes garbage eligible for Minor GC.",
      },
      {
        id: "c",
        text: "The 'Order' instance is immediately moved into Old Gen (Tenured) to avoid fragmented allocation in Eden.",
        explanation:
          "Incorrect: Objects are not promoted directly to Old Gen upon creation unless they exceed the tenuring threshold across multiple GC cycles or qualify as Humongous objects.",
      },
      {
        id: "d",
        text: "The HotSpot garbage collector immediately pauses all application threads (Stop-The-World) to sweep the 'Order' object from the heap.",
        explanation:
          "Incorrect: HotSpot GC does not trigger an immediate STW pause when a method exits; GC cycles are triggered only when Eden space is exhausted or via periodic triggers.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "The stack frame deallocates immediately upon method return, removing primitives and reference pointers. The Heap object becomes unreachable from all GC Roots and will be reclaimed during the next HotSpot Minor GC cycle.",
    sourceIds: ["jvm-spec-se21"],
  },
  {
    id: "java-q2-generational-promotion",
    moduleId: "java-memory-heap-stack-gc",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements accurately describe the mechanics and assumptions of HotSpot Generational Garbage Collection (Young vs Old Generation)? Select TWO.",
    choices: [
      {
        id: "a",
        text: "It is built on the Weak Generational Hypothesis: the vast majority of Java objects die shortly after allocation, making copying collection in Young Gen extremely fast.",
        explanation:
          "Correct: The Weak Generational Hypothesis demonstrates that 95% to 98% of Java objects die shortly after allocation (method-scoped). Minor GC copying cost is proportional only to the small volume of surviving objects.",
      },
      {
        id: "b",
        text: "Survivor space S0 and S1 are utilized simultaneously for new object allocations to maximize L1 CPU cache locality.",
        explanation:
          "Incorrect: At any given moment, only one Survivor space (S0 or S1) acts as From-Space holding survivors, while the other must remain completely empty (To-Space) ready for the next evacuation.",
      },
      {
        id: "c",
        text: "Surviving objects in Young Gen have an age counter incremented after each Minor GC; upon reaching MaxTenuringThreshold (default 15), they are promoted to the Old Generation (Tenured).",
        explanation:
          "Correct: Surviving objects have their tenuring age incremented in the Object Header Mark Word with each Minor GC cycle. Upon reaching MaxTenuringThreshold, they are promoted to Old Generation.",
      },
      {
        id: "d",
        text: "Major / Full GC pauses are consistently shorter than Minor GC pauses because the Old Generation contains fewer objects.",
        explanation:
          "Incorrect: Major/Full GC traverses the entire Old Gen and often runs Mark-Sweep-Compact, resulting in significantly longer Stop-The-World (STW) pause times compared to Minor GC.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanation:
      "Generational GC is based on the Weak Generational Hypothesis (most objects die young) and uses an age counter (Tenuring Age) to promote long-lived objects to the Old Generation once they cross the MaxTenuringThreshold.",
    sourceIds: ["jvm-spec-se21"],
  },

  // Java Collections & HashMap Treeification Questions
  {
    id: "java-q3-hashmap-indexing",
    moduleId: "java-hashmap-treeification",
    domainId: "java",
    type: "single-choice",
    stem: "In Java 8+, why does java.util.HashMap enforce that table capacity must always be a power of two (e.g., 16, 32, 64), and how does it compute the bucket index from a key's 32-bit hash value?",
    choices: [
      {
        id: "a",
        text: "It allows replacing the slow mathematical modulo operator (%) with an ultra-fast bitwise AND operation: index = (capacity - 1) & hash.",
        explanation:
          "Correct: When capacity is a power of 2, (capacity - 1) is a contiguous sequence of binary 1s (e.g., 16 - 1 = 15 = 0b1111). The bitwise AND (n - 1) & hash is mathematically equivalent to hash % n, but executes in nanoseconds on CPU arithmetic-logic units.",
      },
      {
        id: "b",
        text: "It guarantees that no hash collisions can mathematically occur regardless of the key's hashCode implementation.",
        explanation:
          "Incorrect: Hash collisions still inevitably occur by the Pigeonhole Principle regardless of table capacity.",
      },
      {
        id: "c",
        text: "It forces the JVM to allocate contiguous physical memory pages aligned directly with CPU cache line boundaries.",
        explanation:
          "Incorrect: This is a software collection indexing optimization and is unrelated to operating system virtual memory page alignment.",
      },
      {
        id: "d",
        text: "It is required so that the HashMap can execute binary search directly on the table buckets in O(log n) time.",
        explanation:
          "Incorrect: HashMap accesses bucket slots directly via array index in O(1) time, not via binary search.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "Power-of-two capacity allows replacing expensive integer modulo operations (hash % capacity) with ultra-fast bitwise masking ((capacity - 1) & hash), maximizing array indexing performance.",
    sourceIds: ["openjdk-hashmap-source"],
  },
  {
    id: "java-q4-treeify-threshold",
    moduleId: "java-hashmap-treeification",
    domainId: "java",
    type: "multiple-response",
    stem: "Under what conditions does Java 8+ HashMap convert a colliding bucket from a Singly-Linked List into a Red-Black Tree (TreeNode), and what architectural problem does this solve? Select TWO.",
    choices: [
      {
        id: "a",
        text: "The bucket chain length must reach or exceed TREEIFY_THRESHOLD (8) AND the total table capacity must be at least MIN_TREEIFY_CAPACITY (64).",
        explanation:
          "Correct: If chain depth reaches 8 but capacity is less than 64, HashMap doubles table capacity instead of treeifying to disperse collisions across more buckets.",
      },
      {
        id: "b",
        text: "It converts immediately whenever any two keys produce identical 32-bit hash codes regardless of table capacity.",
        explanation:
          "Incorrect: Two keys sharing a hash code only form a linked list of length 2, well below the treeify threshold of 8.",
      },
      {
        id: "c",
        text: "It mitigates Hash Collision DoS vulnerabilities by capping the worst-case lookup, insertion, and deletion complexity at O(log n) instead of degrading to O(n).",
        explanation:
          "Correct: Prior to Java 8, hash collision DoS attacks degraded lookups into linked list traversal of O(n), causing 100% CPU lockups. Red-Black Tree balances the worst-case lookup, insertion, and deletion complexity at O(log n).",
      },
      {
        id: "d",
        text: "It reduces memory consumption by 50% because TreeNode uses fewer bytes than standard Node.",
        explanation:
          "Incorrect: TreeNode objects consume roughly twice the memory of standard Node objects because they store parent, left, right pointers and red/black color booleans.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanation:
      "Java 8+ converts colliding buckets to Red-Black Trees when chain depth reaches 8 and capacity is at least 64, defending against Hash Collision DoS attacks by bounding lookup latency to O(log n).",
    sourceIds: ["openjdk-hashmap-source"],
  },

  // Java 8+ Streams & CompletableFuture Questions
  {
    id: "java-q5-stream-lazy-fusion",
    moduleId: "java-streams-lazy-evaluation",
    domainId: "java",
    type: "single-choice",
    stem: "Consider the Java Stream pipeline: list.stream().filter(x -> x > 10).map(x -> x * 2).findFirst();. How does the JVM execute this pipeline internally?",
    choices: [
      {
        id: "a",
        text: "It creates a temporary ArrayList holding all elements > 10, then creates a second ArrayList for the mapped values, and finally extracts the first item.",
        explanation:
          "Incorrect: This is the traditional eager evaluation approach. The Stream API is specifically architected to avoid allocating wasteful intermediate collections.",
      },
      {
        id: "b",
        text: "Intermediate operations (filter, map) are lazy and fused into a single pull-based pipeline. Processing halts immediately at the very first element that matches the filter and is transformed by map, without examining the remaining elements.",
        explanation:
          "Correct: Stream API applies Loop Fusion and Lazy Evaluation: no processing executes until a terminal operation (findFirst) is invoked. Thanks to short-circuiting, processing terminates immediately at the first element matching the filter and map transforms.",
      },
      {
        id: "c",
        text: "It automatically spins up an asynchronous thread pool for each intermediate step and joins them at the terminal operation.",
        explanation:
          "Incorrect: Sequential streams execute entirely on the calling thread without spawning asynchronous worker pools.",
      },
      {
        id: "d",
        text: "It compiles the pipeline directly into native C GPU instructions via Project Panama.",
        explanation:
          "Incorrect: Stream API is a standard Java library architecture built upon Spliterators and Sink pipelines, not Project Panama GPU compilation.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "The Stream API applies Lazy Evaluation combined with Loop Fusion: filter and map stages merge into a single element-by-element pass, and short-circuiting operations (like findFirst) terminate execution as soon as the first matching element is processed.",
    sourceIds: ["jsr-335-streams"],
  },
  {
    id: "java-q6-parallel-stream-pitfall",
    moduleId: "java-streams-lazy-evaluation",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO engineering hazards are associated with executing blocking I/O calls (e.g., HTTP REST calls, slow SQL queries) inside a Java parallel stream (list.parallelStream())? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Parallel streams share the JVM-wide ForkJoinPool.commonPool(). Blocking threads in this pool starves all other parallel streams and CompletableFuture async tasks across the entire application.",
        explanation:
          "Correct: ForkJoinPool.commonPool() is a JVM-wide static shared resource. Blocking worker threads with high-latency I/O starves parallel streams, CompletableFuture tasks, and other concurrent processing across the entire JVM.",
      },
      {
        id: "b",
        text: "Parallel streams automatically disable all thread safety checks in concurrent collections.",
        explanation:
          "Incorrect: Collections do not have thread safety disabled, but mutating shared state in parallel stream lambdas introduces severe race conditions.",
      },
      {
        id: "c",
        text: "Parallel streams are designed specifically for CPU-bound computations with low coordination overhead; using them for high-latency I/O destroys throughput due to thread saturation.",
        explanation:
          "Correct: ForkJoinPool work-stealing algorithms are optimized for CPU-bound divide-and-conquer workloads. High-latency blocking I/O causes worker threads to stall, preventing work-stealing and destroying throughput.",
      },
      {
        id: "d",
        text: "Parallel streams will throw an UnsupportedOperationException if any lambda takes longer than 100 milliseconds.",
        explanation:
          "Incorrect: The Java runtime has no built-in mechanism to throw timeout exceptions based on lambda execution duration.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanation:
      "Parallel streams default to the shared ForkJoinPool.commonPool(), which is designed strictly for CPU-bound computations. Injecting blocking I/O starves the shared worker threads, impacting the entire application.",
    sourceIds: ["jsr-335-streams"],
  },

  // Java 21 Virtual Threads Questions
  {
    id: "java-q7-virtual-threads-yield",
    moduleId: "java-virtual-threads-loom",
    domainId: "java",
    type: "single-choice",
    stem: "In Java 21 (Project Loom), what happens when a Virtual Thread executes a blocking network socket read (e.g., Socket.getInputStream().read())?",
    choices: [
      {
        id: "a",
        text: "The underlying OS Carrier Thread is put into an OS kernel BLOCKED state, consuming 1 MB of physical RAM until the network packet arrives.",
        explanation:
          "Incorrect: This describes the traditional behavior of 1:1 OS Platform Threads, where blocking an I/O socket parks the OS kernel thread and retains 1 MB of stack memory.",
      },
      {
        id: "b",
        text: "The Virtual Thread's Continuation yields: its execution stack is copied to the JVM heap, it unmounts from the Carrier Thread, and the Carrier Thread is immediately free to execute another Virtual Thread.",
        explanation:
          "Correct: JEP 444 refactors blocking I/O in the JDK. When I/O blocks, Continuation.yield() unmounts the Virtual Thread from its Carrier Thread, stashing its small stack on the heap. The Carrier Thread is immediately freed to execute other Virtual Threads.",
      },
      {
        id: "c",
        text: "The JVM automatically throws a SocketTimeoutException to prevent threads from hanging.",
        explanation:
          "Incorrect: Socket reads still preserve sequential blocking semantics from the application's perspective without throwing timeout exceptions.",
      },
      {
        id: "d",
        text: "The JVM spins up a new OS kernel thread to take over the waiting socket descriptor.",
        explanation:
          "Incorrect: The JVM uses an internal background poller thread (epoll/kqueue) to monitor file descriptors rather than spawning new OS threads.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "When encountering blocking I/O, the Virtual Thread's Continuation unmounts from the OS Carrier Thread, preserving its execution frame on the JVM heap. The Carrier Thread is instantly freed to process other runnable tasks, unlocking massive concurrency.",
    sourceIds: ["jep-444-virtual-threads"],
  },
  {
    id: "java-q8-thread-pinning-hazard",
    moduleId: "java-virtual-threads-loom",
    domainId: "java",
    type: "multiple-response",
    stem: "What causes 'Thread Pinning' in Java 21 Virtual Threads, and how should backend engineers resolve it? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Thread Pinning occurs when a Virtual Thread executes a blocking operation inside a synchronized block/method or a native JNI method call.",
        explanation:
          "Correct: When inside a synchronized block or native JNI call, HotSpot cannot cleanly unmount the execution stack from the OS thread. The Virtual Thread pins the Carrier Thread, blocking it completely.",
      },
      {
        id: "b",
        text: "Replace legacy synchronized blocks protecting blocking I/O with java.util.concurrent.locks.ReentrantLock to allow clean Continuation unmounting.",
        explanation:
          "Correct: ReentrantLock is implemented using LockSupport.park() and AbstractQueuedSynchronizer (AQS), which fully cooperate with Virtual Threads and allow Carrier Threads to unmount cleanly.",
      },
      {
        id: "c",
        text: "Increase the number of Carrier Threads to 1,000,000 using the -XX:CarrierThreadMultiplier flag.",
        explanation:
          "Incorrect: Carrier Threads are actual OS kernel threads. Spawning millions of OS threads causes catastrophic memory exhaustion and context-switching collapse.",
      },
      {
        id: "d",
        text: "Thread Pinning is a harmless cosmetic warning that has zero impact on application latency or concurrency throughput.",
        explanation:
          "Incorrect: Thread pinning severely degrades system scalability because it starves the Carrier pool workers and stalls all waiting Virtual Threads.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "Thread Pinning occurs when a Virtual Thread executes blocking operations inside 'synchronized' blocks or native JNI frames. Engineers resolve this by replacing 'synchronized' with 'ReentrantLock', restoring unmounting behavior.",
    sourceIds: ["jep-444-virtual-threads"],
  },

  // Kafka Consumer Group & Rebalance Questions
  {
    id: "kafka-q1-rebalance-protocol",
    moduleId: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    type: "single-choice",
    stem: "A team runs a Kafka Consumer Group with 6 partitions and 3 consumers using the default RangeAssignor. Consumer C3 crashes due to an out-of-memory error. Under the classic Eager Rebalance protocol, what happens immediately to partitions P0..P3 processed by the surviving consumers C1 and C2?",
    choices: [
      {
        id: "a",
        text: "Consumers C1 and C2 keep reading P0..P3 without interruption while only P4 and P5 are reassigned.",
        explanation:
          "Incorrect: This describes CooperativeStickyAssignor (KIP-429), not the classic Eager Rebalance protocol.",
      },
      {
        id: "b",
        text: "All partitions P0..P5 are revoked across all members, causing a group-wide Stop-The-World processing pause until JoinGroup and SyncGroup complete.",
        explanation:
          "Correct: The Eager Rebalance protocol requires all group members to invoke onPartitionsRevoked() and relinquish all partitions, triggering a group-wide Stop-The-World processing pause until JoinGroup and SyncGroup complete.",
      },
      {
        id: "c",
        text: "The Broker GroupCoordinator immediately reassigns P4 and P5 to C1 and C2 without waiting for any consumer heartbeat.",
        explanation:
          "Incorrect: In the classic group protocol, the broker GroupCoordinator does not compute partition assignments; it delegates assignment to the Consumer Group leader.",
      },
      {
        id: "d",
        text: "Consumers C1 and C2 continue processing and silently commit offsets with the old generationId.",
        explanation:
          "Incorrect: Once a rebalance begins, the GroupCoordinator rejects offset commits bearing the old generationId with an ILLEGAL_GENERATION error.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "In classic Eager Rebalance, any membership churn triggers a global Stop-The-World pause: all active consumers forfeit their assigned partitions and stop processing until the JoinGroup -> SyncGroup election cycle concludes.",
    sourceIds: ["kafka-design-doc", "kip-429"],
  },
  {
    id: "kafka-q2-cooperative-sticky",
    moduleId: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    type: "multiple-response",
    stem: "Which TWO statements accurately describe the architectural improvements introduced by the Cooperative Sticky Assignor (KIP-429) compared to Eager Rebalancing? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Consumers keep consuming from unaffected partitions during the first rebalance phase without a global Stop-The-World pause.",
        explanation:
          "Correct: KIP-429 implements Incremental Cooperative Rebalancing, allowing consumers to retain unaffected partition assignments and continue reading without a global pause.",
      },
      {
        id: "b",
        text: "It eliminates the need for the Kafka GroupCoordinator broker role by switching to a gossip protocol between consumers.",
        explanation:
          "Incorrect: KIP-429 still relies on the broker GroupCoordinator to manage group generation state and protocol synchronization.",
      },
      {
        id: "c",
        text: "Partition migrations occur in two targeted rebalance rounds: only partitions migrating between members are revoked first, then reassigned in the second round.",
        explanation:
          "Correct: To avoid split-brain consumption where two consumers read the same partition, KIP-429 uses a two-phase protocol: migrating partitions are revoked in round 1 and reassigned in round 2.",
      },
      {
        id: "d",
        text: "It allows multiple consumers in the same Consumer Group to simultaneously consume from the exact same partition.",
        explanation:
          "Incorrect: Kafka enforces that each partition within a Consumer Group can be assigned to at most one consumer member at any time.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanation:
      "KIP-429 resolves the Stop-The-World drawback of Eager Rebalancing by splitting reassignment into incremental rounds, revoking only partitions that need migration while steady partitions continue active consumption.",
    sourceIds: ["kip-429"],
  },

  // Redis Cache Stampede & TTL Questions
  {
    id: "redis-q1-stampede-root-cause",
    moduleId: "redis-cache-stampede-ttl",
    domainId: "caching",
    type: "single-choice",
    stem: "A flash-sale homepage key `catalog:flash-sale:top-deals` with high concurrent read traffic expires its TTL in Redis. Under a naive Cache-Aside implementation, what is the primary failure mode observed on the backing PostgreSQL database?",
    choices: [
      {
        id: "a",
        text: "PostgreSQL rejects incoming connections because Redis automatically replicates expired keys into PostgreSQL write buffers.",
        explanation:
          "Incorrect: Redis does not automatically replicate or push expired keys to PostgreSQL.",
      },
      {
        id: "b",
        text: "Cache Stampede (Thundering Herd): hundreds of concurrent worker threads simultaneously receive a cache miss and execute the expensive SQL aggregation query concurrently, exhausting the connection pool and spiking CPU.",
        explanation:
          "Correct: When a heavily accessed key expires without request coalescing, hundreds of concurrent threads encounter a cache miss simultaneously and hammer the database with expensive queries, exhausting HikariCP connection pools and spiking CPU.",
      },
      {
        id: "c",
        text: "PostgreSQL switches from B-Tree index scan to Sequential scan due to Redis memory exhaustion.",
        explanation:
          "Incorrect: PostgreSQL execution plans are determined by its cost-based optimizer using internal statistics, not Redis memory pressure.",
      },
      {
        id: "d",
        text: "Redis deadlocks its single-threaded event loop waiting for PostgreSQL transaction locks.",
        explanation:
          "Incorrect: Redis runs an independent event loop and does not participate in database transactional lock queues.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "A Cache Stampede (Thundering Herd) occurs when a high-traffic cache key expires and concurrent application requests simultaneously fall through to the database, saturating database connections and causing service degradation.",
    sourceIds: ["cache-stampede-vldb", "redis-eviction-spec"],
  },
  {
    id: "redis-q2-mutex-lock-pattern",
    moduleId: "redis-cache-stampede-ttl",
    domainId: "caching",
    type: "multiple-response",
    stem: "When implementing the Mutex Lock (Singleflight) pattern in Redis to prevent Cache Stampede, which TWO design practices are essential to prevent deadlocks and lock stealing? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Acquire the lock using the atomic command `SET lock_key unique_token NX PX ttl_ms` instead of separate `SETNX` and `EXPIRE` commands.",
        explanation:
          "Correct: Splitting SETNX and EXPIRE introduces a race condition that leads to permanent deadlocks if the worker crashes before setting the expiration.",
      },
      {
        id: "b",
        text: "Release the lock using an atomic Lua script that verifies the key's value matches `unique_token` before executing `DEL`.",
        explanation:
          "Correct: Releasing a lock via simple DEL risks lock stealing, where a stalled worker (e.g., due to a GC pause exceeding lock TTL) deletes a lock newly acquired by another worker. A Lua script ensures atomic token verification before deletion.",
      },
      {
        id: "c",
        text: "Set the lock TTL to 0ms so the lock releases immediately after the network packet reaches Redis.",
        explanation:
          "Incorrect: A TTL of 0ms causes immediate expiration, rendering the mutex lock completely ineffective for protecting the recomputation window.",
      },
      {
        id: "d",
        text: "Ensure all worker threads bypass the cache and query PostgreSQL directly if the lock is held.",
        explanation:
          "Incorrect: Bypassing the lock to query PostgreSQL directly invalidates the purpose of the singleflight mutex pattern.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "Safe distributed mutex locking in Redis requires atomic acquisition (SET ... NX PX) to eliminate deadlocks and atomic release via Lua scripts (checking token equality before DEL) to prevent lock stealing.",
    sourceIds: ["redis-distlock-spec"],
  },

  // PostgreSQL B-Tree & MVCC Questions
  {
    id: "postgres-q1-update-ctid-internals",
    moduleId: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    type: "single-choice",
    stem: "In PostgreSQL, when transaction Tx 202 executes `UPDATE accounts SET balance_usd = 950 WHERE account_id = 42`, how does PostgreSQL physically store this modification on the 8 KB heap page?",
    choices: [
      {
        id: "a",
        text: "It overwrites the balance bytes directly in-place inside the existing heap tuple at CTID (0,1) and writes the old value to a separate Undo rollback segment.",
        explanation:
          "Incorrect: This describes MySQL InnoDB's Undo Log or Oracle rollback segments. PostgreSQL does not use an Undo Log for older tuple versions.",
      },
      {
        id: "b",
        text: "It marks `t_xmax = 202` on the existing tuple at CTID (0,1) and appends a brand-new physical heap tuple version at a new CTID (e.g., (0,3)) with `t_xmin = 202`.",
        explanation:
          "Correct: PostgreSQL implements MVCC via an append-only multi-version storage model: the old tuple is stamped with t_xmax = current_txid, and a new physical tuple version is inserted at a new CTID with t_xmin = current_txid.",
      },
      {
        id: "c",
        text: "It immediately locks the entire B-Tree root page and prevents all concurrent readers from accessing table accounts.",
        explanation:
          "Incorrect: PostgreSQL writers do not block readers, nor do they lock entire B-Tree root pages during row updates.",
      },
      {
        id: "d",
        text: "It truncates Block 0 and moves all uncommitted transactions to the write-ahead log without modifying shared buffers.",
        explanation:
          "Incorrect: Updates modify buffer cache pages (shared_buffers) and append WAL records; they do not truncate disk blocks.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "Unlike databases with Undo Logs, PostgreSQL writes new tuple versions directly onto heap pages. An UPDATE sets xmax on the old tuple and appends a fresh tuple with a new CTID and xmin.",
    sourceIds: ["postgres-page-layout", "postgres-mvcc-concurrency"],
  },
  {
    id: "postgres-q2-index-only-scan-vm",
    moduleId: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    type: "single-choice",
    stem: "Under what specific condition can a PostgreSQL query planner execute a true Index-Only Scan that reads zero 8 KB table heap pages (Heap Fetches = 0)?",
    choices: [
      {
        id: "a",
        text: "Whenever the query references only columns that are part of the B-Tree index, regardless of table write activity.",
        explanation:
          "Incorrect: B-Tree indexes in PostgreSQL do not store xmin/xmax transaction visibility metadata, requiring heap page reads unless verified by the Visibility Map.",
      },
      {
        id: "b",
        text: "Only when the matching heap page has its `all_visible` bit set to 1 in the PostgreSQL Visibility Map (typically maintained by VACUUM), proving that all tuples on the page are visible to all current transactions.",
        explanation:
          "Correct: The Visibility Map (VM) tracks an all_visible bit for each 8 KB page. When all_visible = 1, PostgreSQL is guaranteed all tuples on the page are visible to all running transactions, allowing Index-Only Scans to bypass heap fetches entirely (Heap Fetches = 0).",
      },
      {
        id: "c",
        text: "Only when the table is configured with `UNLOGGED` mode and synchronous_commit is turned off.",
        explanation:
          "Incorrect: Table UNLOGGED status does not waive MVCC visibility checks for index scans.",
      },
      {
        id: "d",
        text: "Only when the isolation level is set to READ UNCOMMITTED.",
        explanation:
          "Incorrect: PostgreSQL treats READ UNCOMMITTED identically to READ COMMITTED, enforcing standard MVCC visibility rules.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "An Index-Only Scan achieves peak performance (Heap Fetches = 0) only when the Visibility Map's all_visible bit is set. If recent updates haven't been processed by VACUUM, the engine must still fetch the heap page to verify MVCC visibility.",
    sourceIds: ["postgres-btree-nbtree", "postgres-mvcc-concurrency"],
  },

  // Java Core: Exceptions, Throwable & Stack Unwinding Questions
  {
    id: "java-q1-exception-table-unwinding",
    moduleId: "java-exceptions-stack-unwinding",
    domainId: "java",
    type: "single-choice",
    stem: "When a Java method throws an exception using the bytecode instruction 'athrow', how does the JVM locate the appropriate catch block, and what happens if no matching block is found in the current method?",
    choices: [
      {
        id: "a",
        text: "The JVM performs an linear if-else check across all methods in the class file, and if none match, it immediately triggers garbage collection.",
        explanation:
          "Incorrect: The JVM does not inspect unrelated methods in the class. It strictly inspects the active method's Exception Table, and if not matched, unwinds the Call Stack to the caller frame.",
      },
      {
        id: "b",
        text: "The JVM looks up the current method's Exception Table matching the Program Counter (PC) against [from, to) ranges. If no matching catch type is found, the current stack frame is popped (deallocated), and the JVM recursively inspects the caller's Exception Table (Stack Unwinding).",
        explanation:
          "Correct: In the JVM specification (§3.12 & §2.10), every compiled try-catch block registers entries in the method's Exception Table. When athrow executes, the JVM checks entries where from <= PC < to for type compatibility. If none match, stack unwinding pops the current frame and checks the caller frame at its call site PC.",
      },
      {
        id: "c",
        text: "The JVM pauses all other application threads with a Stop-The-World barrier while scanning the thread stack.",
        explanation:
          "Incorrect: Exception handling and stack unwinding are purely thread-local operations executed entirely on the throwing thread's private Call Stack with zero global coordination.",
      },
      {
        id: "d",
        text: "The JVM dynamically transforms the exception into a checked IOException and halts the operating system process.",
        explanation:
          "Incorrect: The JVM does not alter the exception type at runtime; checked vs unchecked enforcement is primarily a compile-time (javac) guarantee, with runtime following polymorphic instanceof checks.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "The JVM inspects the compiled Exception Table for the current method based on the instruction pointer (PC). When no handler matches, it unwinds the Call Stack frame by frame until a matching handler is found or the thread crashes.",
    sourceIds: ["jvm-spec-se21", "jvms-21-exceptions"],
  },
  {
    id: "java-q2-suppressed-exceptions",
    moduleId: "java-exceptions-stack-unwinding",
    domainId: "java",
    type: "multiple-response",
    stem: "In a Java 7+ Try-with-Resources block where an AutoCloseable resource is declared, suppose the try block throws Exception A, and the automatic invocation of resource.close() subsequently throws Exception B. Which TWO statements accurately describe the resulting behavior? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Exception A is discarded, and Exception B becomes the primary thrown exception because finally-like cleanup always takes precedence.",
        explanation:
          "Incorrect: In pre-Java 7 finally blocks, an exception in finally would mask/hide the original try exception. Try-with-Resources was specifically engineered to eliminate this bug by preserving Exception A as primary.",
      },
      {
        id: "b",
        text: "Exception A is preserved as the primary thrown exception that propagates to the caller.",
        explanation:
          "Correct: Under Try-with-Resources semantics (JLS §14.20.3), the exception thrown from the try block takes precedence as the primary failure event.",
      },
      {
        id: "c",
        text: "Exception B is attached to Exception A as a Suppressed Exception via Throwable.addSuppressed(B), accessible via A.getSuppressed().",
        explanation:
          "Correct: Rather than masking the root cause or dropping the close() failure, the JVM attaches Exception B as a suppressed exception under Exception A. Developers can inspect all secondary failures via getSuppressed().",
      },
      {
        id: "d",
        text: "The JVM converts both exceptions into an unrecoverable java.lang.InternalError and crashes the virtual machine.",
        explanation:
          "Incorrect: Suppressed exceptions are standard Java Throwable instances and do not cause VM-level InternalError crashes.",
      },
    ],
    correctChoiceIds: ["b", "c"],
    correctExplanation:
      "Under Java Try-with-Resources, the primary try-block exception propagates normally, while any secondary exceptions arising from AutoCloseable.close() are chained via Throwable.addSuppressed() to avoid masking critical failure diagnostics.",
    sourceIds: ["jvms-21-exceptions"],
  },

  // Java Core: Concurrency, JMM & Lock Upgrades Questions
  {
    id: "java-q1-volatile-jmm-visibility",
    moduleId: "java-concurrency-jmm-locks",
    domainId: "java",
    type: "single-choice",
    stem: "A Java service has a shared field 'private volatile int requestCount = 0;'. Two threads simultaneously execute 'requestCount++;' 1,000 times each without external locking. What is the expected final value of requestCount, and why?",
    choices: [
      {
        id: "a",
        text: "Exactly 2,000, because the 'volatile' modifier guarantees that every read and write operation is executed atomically as a unified CPU transaction.",
        explanation:
          "Incorrect: Volatile guarantees only visibility and instruction ordering, NOT compound atomicity. 'count++' is a multi-step read-modify-write operation.",
      },
      {
        id: "b",
        text: "Likely less than 2,000 (e.g. 1,600-1,950), because 'requestCount++' is not atomic: it compiles into three distinct bytecodes (getfield, iadd, putfield). Two threads can read the same value concurrently and overwrite each other's updates.",
        explanation:
          "Correct: In the Java Memory Model, 'volatile' enforces visibility across CPU caches and prevents instruction reordering via memory barriers, but it does NOT provide mutual exclusion or compound atomicity. 'count++' requires an atomic primitive like AtomicInteger.incrementAndGet() or a synchronized block.",
      },
      {
        id: "c",
        text: "Exactly 1,000, because the second thread detects the volatile lock and aborts execution.",
        explanation:
          "Incorrect: Volatile variables do not possess locks and never reject or abort concurrent writes.",
      },
      {
        id: "d",
        text: "The JVM throws a ConcurrentModificationException at runtime as soon as simultaneous writes are detected.",
        explanation:
          "Incorrect: ConcurrentModificationException is thrown by collection fail-fast iterators (like ArrayList / HashMap), not by primitive variable memory access.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanation:
      "Volatile ensures visibility and ordering, but 'count++' is a compound read-modify-write operation (getfield, iadd, putfield). Without synchronization or AtomicInteger, race conditions cause lost updates.",
    sourceIds: ["jsr-133-jmm", "jvm-spec-se21"],
  },
  {
    id: "java-q2-hotspot-lock-inflation",
    moduleId: "java-concurrency-jmm-locks",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements accurately describe the HotSpot JVM Object Header (Mark Word) lock escalation pathway and mechanics? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Biased Locking (tag 101) optimizes for single-threaded locks by storing the owner's Thread ID directly in the Mark Word, requiring zero atomic CAS instructions on subsequent entries by that thread.",
        explanation:
          "Correct: Biased locking establishes a zero-cost fast path for uncontested single-thread synchronization. HotSpot checks that the Mark Word's Thread ID matches the current thread, avoiding atomic CAS instructions.",
      },
      {
        id: "b",
        text: "When lock contention is detected, HotSpot immediately inflates the lock to a Heavyweight OS Mutex and never attempts user-space CAS spinning.",
        explanation:
          "Incorrect: HotSpot first attempts Lightweight Locking using atomic CAS in user space, including adaptive spinning loops (PAUSE instructions), before escalating to an OS mutex.",
      },
      {
        id: "c",
        text: "A Heavyweight Lock (tag 10) allocates an ObjectMonitor structure where contending threads are parked via OS kernel primitives (futex/mutex), incurring CPU context switches.",
        explanation:
          "Correct: Heavyweight Monitor inflation transitions lock management to an allocated native ObjectMonitor. Blocked threads are put into the OS wait queue (context switch ~1-5 μs) until unparked by the releasing thread.",
      },
      {
        id: "d",
        text: "Once inflated to a Heavyweight Lock, HotSpot automatically deflates the lock back to Biased Locking immediately after the thread exits the synchronized block.",
        explanation:
          "Incorrect: In HotSpot, lock deflation almost never happens on block exit; it is an expensive operation performed only during Safepoint phases of Garbage Collection.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanation:
      "HotSpot locks escalate from Biased (zero CAS cost) to Lightweight (user-space CAS spin) and finally Heavyweight Monitor (OS kernel thread parking with context switch overhead).",
    sourceIds: ["jsr-133-jmm", "jvm-spec-se21"],
  },
  {
    id: "java-q11-cf-join-starvation",
    moduleId: "java-completable-future-async",
    domainId: "java",
    type: "single-choice",
    stem: "A backend engineer invokes subtaskFuture.join() inside a task submitted to ForkJoinPool.commonPool(). Under peak traffic, the service experiences severe latency spikes and worker threads freeze. What is the fundamental root cause of this failure mode?",
    choices: [
      {
        id: "a",
        text: "The task invokes blocking thread synchronization while holding a pool worker thread. Because ForkJoinPool.commonPool has a bounded default parallelism (CPU cores - 1), all worker threads become blocked waiting for subtasks that cannot be scheduled due to thread starvation.",
        explanation:
          "Correct: Calling blocking methods like .join() or .get() inside worker tasks ties up pool threads. In a bounded pool like commonPool(), if all worker threads are waiting on subtasks that are queued behind them, the entire pool deadlocks from thread starvation.",
      },
      {
        id: "b",
        text: "Calling .join() terminates the JVM process due to an unhandled checked InterruptedException.",
        explanation:
          "Incorrect: .join() throws unchecked CompletionException, not a checked InterruptedException (which is thrown by .get()). More importantly, it blocks the thread rather than killing the JVM.",
      },
      {
        id: "c",
        text: "ForkJoinPool does not support CompletableFuture pipelines and immediately throws a RejectedExecutionException upon invoking .join().",
        explanation:
          "Incorrect: ForkJoinPool.commonPool() is the default executor for CompletableFuture. The issue is blocking thread starvation, not lack of support.",
      },
      {
        id: "d",
        text: "The Garbage Collector freezes all threads permanently because .join() pins objects to Old Gen memory.",
        explanation:
          "Incorrect: GC is not responsible for worker thread starvation caused by synchronous blocking in thread pools.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "Calling blocking .join() within a bounded thread pool exhausts available worker threads, creating a classic thread pool starvation deadlock.",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q12-cf-async-handoff",
    moduleId: "java-completable-future-async",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements correctly describe thread execution semantics and exception propagation in Java CompletableFuture pipelines? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Methods without the 'Async' suffix (e.g., .thenApply()) typically execute on whichever thread completed the preceding stage, or synchronously on the caller thread if the upstream stage is already done.",
        explanation:
          "Correct: Non-async completion stage callbacks run synchronously on the thread that completes the future, eliminating context-switch overhead when sequential work is lightweight.",
      },
      {
        id: "b",
        text: "Methods with the 'Async' suffix (e.g., .thenApplyAsync()) guarantee execution is dispatched to an Executor (either the specified pool or ForkJoinPool.commonPool()), decoupling stage execution from upstream threads.",
        explanation:
          "Correct: .thenApplyAsync() dispatches task execution to an Executor, ensuring heavy transformations do not monopolize completing threads.",
      },
      {
        id: "c",
        text: "If an upstream stage throws an unchecked exception, downstream .thenApply() stages will still execute with a null value instead of skipping to exceptionally.",
        explanation:
          "Incorrect: When a stage completes exceptionally, subsequent normal transformation stages are skipped; execution short-circuits directly down to .exceptionally() or .handle().",
      },
      {
        id: "d",
        text: "CompletableFuture.allOf() returns a future that resolves to an aggregated List<T> containing the resolved values of all parameter futures.",
        explanation:
          "Incorrect: CompletableFuture.allOf() returns CompletableFuture<Void>. Values must be extracted individually from the constituent futures after allOf completes.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "Non-async methods execute inline on the completing thread, while Async methods dispatch to an Executor. Unhandled exceptions bypass normal transformation stages until caught by .exceptionally() or .handle().",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q13-chm-locking-internals",
    moduleId: "java-concurrenthashmap-locking",
    domainId: "java",
    type: "single-choice",
    stem: "Why does ConcurrentHashMap in Java 8+ achieve significantly higher write scalability than Java 7 Segment locking?",
    choices: [
      {
        id: "a",
        text: "Java 8 replaces coarse Segment arrays with fine-grained atomic CAS (casTabAt) for empty bins, and restricts synchronization to just the first node of each collided bucket (synchronized(binHead)), permitting concurrent writes across all other bins.",
        explanation:
          "Correct: By removing Segment locks and locking strictly on the head node of individual hash bins, lock striping granularity equals the table capacity (often thousands of buckets), drastically reducing lock contention.",
      },
      {
        id: "b",
        text: "Java 8 completely eliminates all synchronization and operates 100% lock-free for all reads and writes using hardware transactional memory.",
        explanation:
          "Incorrect: While empty bucket writes and all reads are lock-free, collided bucket insertions still acquire synchronized on the bucket head node.",
      },
      {
        id: "c",
        text: "Java 8 requires all threads to execute in a single-threaded event loop similar to Node.js, eliminating thread contention.",
        explanation:
          "Incorrect: ConcurrentHashMap is designed specifically for high-concurrency multi-threaded JVM architectures.",
      },
      {
        id: "d",
        text: "Java 8 locks the entire internal array for both reads and writes using a ReentrantReadWriteLock.",
        explanation:
          "Incorrect: Global table locking is the anti-pattern of Collections.synchronizedMap(), not ConcurrentHashMap.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "Java 8+ ConcurrentHashMap utilizes lock-free atomic CAS for empty buckets and fine-grained synchronized on the bucket head node, allowing simultaneous writes across distinct bins.",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q14-chm-forwarding-nodes",
    moduleId: "java-concurrenthashmap-locking",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements correctly describe concurrent reads and table resizing mechanics in Java 8+ ConcurrentHashMap? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Read operations (get()) are completely lock-free and never acquire locks, traversing nodes via volatile value and next pointers.",
        explanation:
          "Correct: Node.val and Node.next are declared volatile, ensuring that reader threads always observe the latest updates without locking.",
      },
      {
        id: "b",
        text: "During table resize, migrated buckets are replaced by a ForwardingNode with hash = -1 (MOVED), signaling other active writer threads to cooperatively assist in data migration via helpTransfer().",
        explanation:
          "Correct: ForwardingNode marks processed bins and forwards readers to the new table, while enlisting other mutating threads to assist with transfer.",
      },
      {
        id: "c",
        text: "When a table resize begins, all read operations are blocked until the entire resize operation finishes.",
        explanation:
          "Incorrect: Readers are never blocked during resize; ForwardingNodes seamlessly route queries to the new nextTable.",
      },
      {
        id: "d",
        text: "ConcurrentHashMap permits null keys and null values under all execution circumstances.",
        explanation:
          "Incorrect: ConcurrentHashMap explicitly forbids null keys and null values to prevent ambiguity between 'key mapped to null' and 'key not present' under concurrent access.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "get() is strictly lock-free via volatile field semantics, and ForwardingNodes (hash = -1) facilitate non-blocking reads and multi-threaded cooperative table transfers.",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q15-optional-orelse-trap",
    moduleId: "java-optional-functional-patterns",
    domainId: "java",
    type: "single-choice",
    stem: "An engineer writes: User user = userCache.findUser(id).orElse(userService.fetchRemoteUser(id));. In load testing, remote service calls spike even though the cache hit rate is 99%. What is the technical cause?",
    choices: [
      {
        id: "a",
        text: "In Java, method arguments evaluate eagerly prior to method invocation. Consequently, fetchRemoteUser(id) is executed on every invocation before calling orElse(), discarding the remote result when the cache hits. The code must use orElseGet(() -> ...) for lazy evaluation.",
        explanation:
          "Correct: orElse(...) accepts an evaluated value, so the expression inside is evaluated immediately. orElseGet(Supplier) accepts a lambda, deferring evaluation until the Optional is confirmed empty.",
      },
      {
        id: "b",
        text: "The userCache is corrupt and always returns Optional.empty() during high load.",
        explanation:
          "Incorrect: The question explicitly specifies a 99% cache hit rate; the issue is eager argument evaluation in Java.",
      },
      {
        id: "c",
        text: "Calling orElse() always invalidates the L1 cache entry.",
        explanation:
          "Incorrect: orElse() is a pure method on Optional and has no side effects on the underlying cache.",
      },
      {
        id: "d",
        text: "The JVM JIT compiler automatically converts orElseGet into orElse under -O3 optimization.",
        explanation:
          "Incorrect: JIT compilation preserves Java language evaluation semantics; eager argument evaluation is a language guarantee.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "Java evaluates method parameters eagerly. Calling orElse(expensive()) always executes the expensive call; orElseGet(() -> expensive()) defers evaluation via a lazy Supplier.",
    sourceIds: ["java-lang-optional-api", "jvm-spec-se21"],
  },
  {
    id: "java-q16-optional-best-practices",
    moduleId: "java-optional-functional-patterns",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements reflect official Java architecture and design guidelines regarding java.util.Optional? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Optional is designed primarily as a library return type to cleanly convey absent results; it should not be used as JPA entity fields or method parameters because it does not implement java.io.Serializable and adds 16-24 bytes of heap overhead.",
        explanation:
          "Correct: Brian Goetz and the OpenJDK team designed Optional strictly as a return type for libraries. It is not Serializable and incurs unnecessary object allocation overhead if used as fields.",
      },
      {
        id: "b",
        text: "Writing 'if (opt.isPresent()) return opt.get();' is considered a code smell; developers should prefer monadic combinators like .map(), .filter(), .flatMap(), and .orElseGet().",
        explanation:
          "Correct: Imperative isPresent() + get() replicates old-school 'if (x != null)' while paying the memory tax of an Optional wrapper. Functional chaining is the intended idiomatic style.",
      },
      {
        id: "c",
        text: "Optional.of(null) is safe and automatically converts null into Optional.empty() without throwing any exception.",
        explanation:
          "Incorrect: Optional.of(null) immediately throws NullPointerException. To handle nullable values safely, use Optional.ofNullable(val).",
      },
      {
        id: "d",
        text: "Optional replaces all need for primitive collections like IntStream or long arrays.",
        explanation:
          "Incorrect: Wrapping primitive types in Optional adds significant boxing overhead. Primitive specializations (OptionalInt, OptionalLong, OptionalDouble) exist for this reason.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "Optional is meant as a return type (not serializable entity fields) and should be consumed via functional chaining rather than imperative isPresent() + get().",
    sourceIds: ["java-lang-optional-api", "jvm-spec-se21"],
  },
  {
    id: "java-q17-thread-pool-4step-dispatch",
    moduleId: "java-thread-pool-executor",
    domainId: "java",
    type: "single-choice",
    stem: "What is the exact sequence of evaluation when a new task is submitted to a ThreadPoolExecutor with corePoolSize=2, maximumPoolSize=4, and bounded workQueue capacity=10?",
    choices: [
      {
        id: "a",
        text: "1) If active workers < 2, spawn a Core Worker; 2) Else if queue < 10, enqueue in workQueue; 3) Else if active workers < 4, spawn a Non-Core Worker; 4) Else invoke RejectedExecutionHandler.",
        explanation:
          "Correct: This is the fundamental 4-step dispatching algorithm of java.util.concurrent.ThreadPoolExecutor.",
      },
      {
        id: "b",
        text: "1) Spawn workers up to maximumPoolSize (4); 2) Only then enqueue in workQueue; 3) Reject when queue is full.",
        explanation:
          "Incorrect: Standard ThreadPoolExecutor fills the workQueue BEFORE creating non-core threads above corePoolSize.",
      },
      {
        id: "c",
        text: "1) Enqueue all tasks into workQueue first; 2) Spawn workers only when queue capacity exceeds 50%.",
        explanation:
          "Incorrect: Tasks never go to the queue if active workers are below corePoolSize.",
      },
      {
        id: "d",
        text: "1) Check RejectedExecutionHandler; 2) If passed, allocate an OS thread for each incoming task unconditionally.",
        explanation:
          "Incorrect: That is the behavior of unbounded newCachedThreadPool(), which leads to OS thread exhaustion.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "ThreadPoolExecutor always attempts: 1) Core worker spawn -> 2) WorkQueue buffering -> 3) Non-core worker spawn -> 4) Rejection handler invocation.",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q18-thread-pool-rejection-policies",
    moduleId: "java-thread-pool-executor",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements accurately characterize ThreadPoolExecutor saturation rejection policies in production backend architectures? Select TWO.",
    choices: [
      {
        id: "a",
        text: "ThreadPoolExecutor.CallerRunsPolicy executes the rejected task directly on the submitting thread (e.g. Tomcat/HTTP worker), naturally slowing down the ingress rate and providing effective backpressure without dropping tasks.",
        explanation:
          "Correct: CallerRunsPolicy forces the caller thread to do the work, preventing it from accepting new requests until the current task completes, thus creating natural backpressure.",
      },
      {
        id: "b",
        text: "ThreadPoolExecutor.AbortPolicy is the default policy and throws an unchecked RejectedExecutionException, enabling upstream callers to detect saturation and fail fast or trip circuit breakers.",
        explanation:
          "Correct: AbortPolicy fails fast by throwing RejectedExecutionException, allowing error metrics and circuit breakers to trigger immediately.",
      },
      {
        id: "c",
        text: "ThreadPoolExecutor.DiscardPolicy throws a checked InterruptedException so the caller can retry automatically.",
        explanation:
          "Incorrect: DiscardPolicy silently swallows and drops the task without throwing any exception whatsoever.",
      },
      {
        id: "d",
        text: "Executors.newFixedThreadPool(10) uses CallerRunsPolicy by default with a bounded queue of 100 elements.",
        explanation:
          "Incorrect: Executors.newFixedThreadPool() uses an unbounded LinkedBlockingQueue (capacity Integer.MAX_VALUE), which never triggers rejection but can cause OutOfMemoryError.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "CallerRunsPolicy applies natural backpressure by running tasks on the caller thread, while AbortPolicy fails fast by throwing RejectedExecutionException.",
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
  },
  {
    id: "java-q19-threadlocal-memory-leak-mechanics",
    moduleId: "java-references-threadlocal-leaks",
    domainId: "java",
    type: "single-choice",
    stem: "Why does failing to invoke threadLocal.remove() inside worker threads in a thread pool (e.g., Tomcat HTTP workers) cause catastrophic memory leaks, even though ThreadLocalMap uses WeakReference keys?",
    choices: [
      {
        id: "a",
        text: "While the key is a WeakReference that gets collected (key == null) when the strong ThreadLocal reference goes out of scope, the Entry's value is a StrongReference. Because pooled worker threads are reused indefinitely, the path 'Thread -> threadLocals -> Entry -> value' remains strongly reachable from GC Roots, preventing the value from ever being collected.",
        explanation:
          "Correct: This is the exact root cause of ThreadLocal memory leaks in thread pools. The Thread object remains alive forever in the pool, keeping the Entry.value strongly reachable even when the WeakReference key has been collected.",
      },
      {
        id: "b",
        text: "Because WeakReference causes the JVM Garbage Collector to crash with a native segfault whenever an object exceeds 10 MB.",
        explanation:
          "Incorrect: WeakReference is a standard JVM primitive and does not cause GC crashes.",
      },
      {
        id: "c",
        text: "Because ThreadLocal automatically allocates all values directly into native Metaspace memory bypassing the Heap.",
        explanation:
          "Incorrect: ThreadLocal values reside on the standard JVM Heap; the leak is due to strong reachability from the permanent Thread object.",
      },
      {
        id: "d",
        text: "Because ThreadLocal creates an OS-level mutex that locks the Linux kernel scheduler indefinitely.",
        explanation:
          "Incorrect: ThreadLocal uses no OS mutexes; it is a purely thread-local array lookup.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanation:
      "WeakReference only protects the key. The value remains strongly reachable from the permanent Thread object in the pool until threadLocal.remove() is called.",
    sourceIds: ["java-lang-ref-spec", "jvm-spec-se21"],
  },
  {
    id: "java-q20-java-reference-types-reachability",
    moduleId: "java-references-threadlocal-leaks",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements correctly describe the JVM Garbage Collector reachability contracts for java.lang.ref reference types? Select TWO.",
    choices: [
      {
        id: "a",
        text: "A WeakReference referent is reclaimed by the Garbage Collector during the very next GC cycle as soon as all strong references to the referent are cleared.",
        explanation:
          "Correct: An object that is only weakly reachable will be collected by the next GC sweep, making it suitable for canonicalizing mappings and ThreadLocal keys.",
      },
      {
        id: "b",
        text: "A SoftReference referent is retained by the JVM as long as sufficient heap memory is available, and is guaranteed to be reclaimed only when memory pressure is high before an OutOfMemoryError is thrown.",
        explanation:
          "Correct: SoftReferences are cleared based on memory demand, making them ideal for memory-sensitive in-memory caches.",
      },
      {
        id: "c",
        text: "A StrongReference is automatically reclaimed whenever a thread's CPU usage exceeds 80%.",
        explanation:
          "Incorrect: Strong references are never collected as long as they are transitively reachable from any GC Root.",
      },
      {
        id: "d",
        text: "PhantomReference allows calling .get() to resurrect dead objects from the heap at any time.",
        explanation:
          "Incorrect: PhantomReference.get() always returns null by design; it exists solely to be enqueued on a ReferenceQueue for post-mortem resource cleanup.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanation:
      "WeakReferences are cleared on the next GC once strong links are gone, while SoftReferences are reclaimed under memory pressure before OOM.",
    sourceIds: ["java-lang-ref-spec", "jvm-spec-se21"],
  },
];
