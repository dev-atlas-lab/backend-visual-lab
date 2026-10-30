import type { LearningModule } from "../domain";

export const learningModules: LearningModule[] = [
  // 1. Java Core & JVM Internals: Memory Management & Generational GC
  {
    id: "java-memory-heap-stack-gc",
    slug: "java-memory-heap-stack-gc",
    domainId: "java",
    title: "Java Memory Management — Stack Frames, Heap Layout & Generational Garbage Collection",
    subtitle:
      "Deconstruct Call Stack vs Heap, Young Gen lifecycles (Eden, S0/S1), Tenured Promotion, and HotSpot Garbage Collection",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "java-memory-gc",
    keyTerms: [
      {
        term: "JVM Stack Frame",
        definition:
          "Memory allocated on a Thread Stack whenever a method is invoked. Contains the Local Variable Table (primitives and reference pointers), Operand Stack, and Frame Data. Automatically deallocated upon method return with 0 ns GC cost.",
      },
      {
        term: "GC Roots",
        definition:
          "Special references that serve as starting anchors for Garbage Collector reachability analysis. Includes active local variables in thread stack frames, static fields of loaded classes, and active JNI global/local pointers.",
      },
      {
        term: "Weak Generational Hypothesis",
        definition:
          "Empirical finding that 95% to 98% of objects allocated in Java applications die shortly after creation. Forms the foundational rationale for partitioning Heap into Young and Old Generations.",
      },
      {
        term: "Tenuring Threshold",
        definition:
          "The maximum number of Minor GC evacuation cycles an object can survive within Survivor spaces (S0/S1) before being promoted by the HotSpot GC into the Old Generation (Tenured).",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "In the Java Virtual Machine runtime architecture (JVM Runtime Data Areas), execution memory is split into two primary areas with fundamentally different lifecycles and concurrency behaviors: Thread Call Stacks and the Shared Heap Memory.",
          "Each Thread Stack stores Stack Frames representing active method invocations. Every Stack Frame holds primitive variables (int, long, boolean, double) and 4-byte/8-byte reference pointers pointing to actual object instances on the Heap. When a method returns, its Stack Frame is popped and all local variables are destroyed instantaneously with zero Garbage Collector intervention.",
          "Conversely, the Heap Memory is shared across all application threads, acting as the dynamic allocation pool for all Object instances (e.g., new Order(), new User()) and array buffers. Because Heap memory cannot be reclaimed synchronously upon method exit, the JVM employs automated Garbage Collection (GC) to reclaim memory that is no longer reachable from any GC Root.",
        ],
        bulletPoints: [
          "Thread Stack: Thread-isolated, ultra-fast L1/L2 cache locality, small fixed footprint (default 1MB), deallocated automatically on return.",
          "Shared Heap: Multithreaded access, managed by HotSpot GC, divided into Young Generation (Eden + S0/S1) and Old Generation (Tenured).",
          "Metaspace: Resides in off-heap native memory (replacing PermGen in Java 8+), storing Class metadata, bytecode definitions, and the Constant Pool.",
        ],
      },
      why: {
        heading: "2. Why HotSpot Partitions Heap into Generations (WHY)",
        paragraphs: [
          "If the Java Heap were a single contiguous monolithic space, every garbage collection event would force the JVM to scan tens of gigabytes of memory to distinguish live objects from garbage (Mark-Sweep-Compact). This would inflict Stop-The-World (STW) pauses lasting seconds or even minutes, crippling backend latency SLA guarantees.",
          "To resolve this bottleneck, JVM architects leveraged the Weak Generational Hypothesis:",
        ],
        bulletPoints: [
          "The vast majority of objects (>95%) die almost immediately: temporary computation artifacts (StringBuilder buffers, JSON parser tokens, DTOs) become garbage as soon as their enclosing method scope pops.",
          "A small fraction of objects live long: long-lived singletons (Spring @Service, @Repository beans), database connection pools, and long-term caches persist across the application lifespan.",
        ],
        callout: {
          tone: "note",
          title: "Generational Partitioning Benefit",
          body: "By routing new allocations to the Young Generation (Eden), Minor GC collections need only inspect a tiny fraction of total heap space using high-speed Mark-Copy evacuation in a few milliseconds. Only proven survivors crossing the Tenuring Threshold ever advance to the Old Generation.",
        },
      },
      how: {
        heading: "3. Object Lifecycle & Generational Evacuation (HOW)",
        paragraphs: [
          "A Java object traverses a strictly sequenced series of memory stages:",
          "1. Allocation in Eden: When 'new' executes, memory is reserved directly in Eden. HotSpot uses Thread-Local Allocation Buffers (TLAB) to enable lock-free bump-the-pointer allocations without thread contention.",
          "2. Minor GC Triggered (Eden Full): When Eden lacks sufficient space for an incoming allocation, the JVM pauses application threads briefly (Stop-The-World) to execute a Minor GC.",
          "3. GC Roots Traversal & Evacuation Copy: The GC traces reachability from GC Roots (active stack frame references). Live objects from Eden and the active From-Survivor space are copied into the To-Survivor space, incrementing their tenuring age by 1. Eden and From-Survivor are wiped clean instantly.",
          "4. Survivor Role Swap: S0 and S1 swap logical roles. The recipient space becomes the new From-Survivor, leaving the counterpart completely empty as To-Survivor for the subsequent collection.",
          "5. Promotion to Old Generation: Once an object's tenuring age reaches the TenuringThreshold (default 15, or dynamically adapted), it is promoted into the Old Generation (Tenured).",
          "6. Major / Full GC: When Old Gen approaches capacity thresholds, the JVM initiates a Major or Full GC cycle to compact memory and eliminate tenured garbage, consuming substantially more CPU cycles and incurring longer STW pauses.",
        ],
      },
      internals: {
        heading: "4. Internals: Object Header, Mark Word & Card Table (INTERNALS)",
        paragraphs: [
          "Every object instance on the Java Heap is prefixed with an Object Header containing two machine words:",
          "1. Mark Word (32-bit or 64-bit): Encodes the identity hashCode, lock state flags (Biased, Lightweight, Heavyweight monitor), GC age (4 bits, capping the maximum tenuring threshold at 15: 2^4 - 1), and CMS/G1 marking metadata.",
          "2. Klass Word: A direct pointer (or compressed class pointer via +UseCompressedClassPointers) referencing the instance's Class metadata in native Metaspace.",
          "To prevent Minor GC cycles from scanning the entire Old Generation to discover inter-generational pointers (Old-to-Young references), HotSpot uses a Card Table structure paired with JIT write barriers. Each byte in the Card Table corresponds to a 512-byte card in the Old Generation. Whenever an Old Gen field is updated to reference a Young Gen object, the JIT-compiled write barrier marks the corresponding card as 'dirty'. Minor GC scans only dirty cards rather than gigabytes of Old Generation memory.",
        ],
        codeSnippet: {
          language: "bash",
          caption: "Production JVM flags for memory tuning and unified GC logging",
          code: `# Pin minimum and maximum heap equally to prevent runtime heap resizing pauses
java -Xms4g -Xmx4g \\
     -XX:+UseG1GC \\
     -XX:MaxGCPauseMillis=200 \\
     -XX:InitiatingHeapOccupancyPercent=45 \\
     -XX:SurvivorRatio=8 \\
     -XX:MaxTenuringThreshold=15 \\
     -Xlog:gc*,gc+phases=debug:file=/var/log/app/gc.log:time,uptime,pid:filecount=5,filesize=50m \\
     -jar backend-service.jar`,
        },
      },
      tradeOffs: {
        heading: "5. Garbage Collector Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "No single Garbage Collector fits every operational profile. Engineers must balance Throughput (CPU time spent on business logic) against Latency (P99 Stop-The-World pause durations):",
        ],
        bulletPoints: [
          "Parallel GC (-XX:+UseParallelGC): Maximizes raw CPU throughput for offline batch processing (99%+ CPU utilization), but STW pauses scale with heap size and can range from hundreds of milliseconds to several seconds.",
          "G1 GC (-XX:+UseG1GC): Default since Java 9. Partitions the heap into thousands of equal-sized Regions (~1MB to 32MB). Accepts a target pause SLA (-XX:MaxGCPauseMillis=200) and evacuates highest-garbage regions first. Ideal default for microservices.",
          "ZGC (-XX:+UseZGC -XX:+ZGenerational in Java 21): Ultra-low latency collector utilizing Colored Pointers and JIT Load Barriers to perform marking, evacuation, and compaction concurrently. Guarantees sub-millisecond pauses even on multi-terabyte heaps at the cost of 2-5% additional CPU overhead.",
        ],
      },
      failureScenarios: {
        heading: "6. Real-World Memory Failure Modes (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Memory Leak via Unbounded Static Collections: Appending objects to a static List, Map, or unbounded internal cache lacking eviction policies. Because static fields are rooted in the ClassLoader (a permanent GC Root), these references can never be reclaimed, causing steady Old Gen growth and terminating in java.lang.OutOfMemoryError: Java heap space.",
          "2. GC Overhead Limit Exceeded: The JVM spends over 98% of total CPU time executing GC cycles while reclaiming less than 2% of heap capacity. HotSpot proactively raises OutOfMemoryError to halt thrashing.",
          "3. Premature Promotion: Under-provisioned Eden spaces or sudden allocation spikes overflow Survivor spaces, forcing short-lived objects directly into Old Gen before their time. This triggers frequent, costly Full GC cycles.",
        ],
        callout: {
          tone: "warning",
          title: "ThreadLocal Leak Hazard in Servlet Containers",
          body: "In application servers (Tomcat, Jetty) using worker thread pools, pooled threads persist indefinitely. Calling ThreadLocal.set() without invoking ThreadLocal.remove() within a finally block retains the referenced objects in the worker thread's ThreadLocalMap, causing silent cross-request memory leaks.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Follow these industry best practices to ensure production JVM memory stability:",
          "1. Always set -Xms equal to -Xmx to eliminate runtime heap expansion pauses and allow OS virtual memory pre-faulting.",
          "2. Enable unified GC logging (-Xlog:gc*) to monitor P99 pause times, allocation rates, and tenuring age distributions via tools like GCeasy or JDK Mission Control.",
          "3. Configure automated crash diagnostic captures: -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/dumps/app_oom.hprof.",
          "4. For Java 21+, evaluate Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) for latency-critical financial, trading, or API gateway systems requiring strict sub-5ms P99 SLAs.",
        ],
      },
    },
    sourceIds: ["jvm-spec-se21"],
    questionIds: ["java-q1-stack-vs-heap", "java-q2-generational-promotion"],
  },

  // 2. Java Core Collections: HashMap Internals & Treeification
  {
    id: "java-hashmap-treeification",
    slug: "java-hashmap-treeification",
    domainId: "java",
    title: "Java Collections — HashMap Internals, Hash Collisions & Red-Black Treeification",
    subtitle:
      "Dissect Node<K,V>[] tables, the Bitwise Perturbation function, Treeify Threshold 8, and the High-Bit Resize Split algorithm",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "java-hashmap-treeification",
    keyTerms: [
      {
        term: "Perturbation Function",
        definition:
          "Bit spreading function: (h = key.hashCode()) ^ (h >>> 16). XORs the upper 16 bits down onto the lower 16 bits to prevent upper-bit information loss when tables have small capacities.",
      },
      {
        term: "Bitwise Indexing",
        definition:
          "Bucket indexing formula: (capacity - 1) & hash. Because capacity is strictly a power of two, this bitwise AND is mathematically equivalent to hash % capacity while executing in sub-nanosecond CPU cycles.",
      },
      {
        term: "TREEIFY_THRESHOLD (8)",
        definition:
          "The collision depth threshold in a single bucket that triggers conversion from a Singly-Linked List into a Red-Black Tree (TreeNode), reducing worst-case search complexity from O(n) to O(log n).",
      },
      {
        term: "Load Factor (0.75)",
        definition:
          "The default trade-off parameter balancing memory overhead against lookup latency, derived from Poisson distribution probability models under uniform hashing.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "java.util.HashMap is the cornerstone associative key-value data structure in Java. It provides average O(1) time complexity for put(), get(), and remove() operations across large volumes of data.",
          "Internally, HashMap is backed by an array of buckets: Node<K,V>[] table. Each bucket acts as the anchor for a Singly-Linked List or a balanced Red-Black Tree, accommodating Hash Collisions when distinct keys produce the same bucket index.",
        ],
        bulletPoints: [
          "Default Initial Capacity (DEFAULT_INITIAL_CAPACITY): 16 slots.",
          "Default Load Factor (DEFAULT_LOAD_FACTOR): 0.75.",
          "Resize Threshold: capacity * loadFactor (16 * 0.75 = 12 elements before doubling).",
          "Treeify Threshold: 8 elements in a single bucket combined with a minimum total table capacity of 64.",
        ],
      },
      why: {
        heading: "2. Why Java 8 Introduced Red-Black Treeification (WHY)",
        paragraphs: [
          "Prior to Java 8, all hash collisions within a bucket were chained into a standard singly-linked list. Attackers exploited this by crafting thousands of distinct strings designed to produce identical 32-bit hash codes (Hash Collision DoS / HashDOS attacks), routing all entries into a single bucket.",
          "Under this degradation, get() and put() search complexity collapsed from O(1) to O(n). An incoming HTTP request with 10,000 colliding form parameters could pin CPU utilization at 100% for minutes, halting service availability.",
        ],
        callout: {
          tone: "warning",
          title: "Java 8 Red-Black Tree Defense",
          body: "Starting with Java 8 (JEP 180), when collision chain depth reaches 8 and table capacity is at least 64, the bucket automatically treeifies into a Red-Black Tree (TreeNode). This bounds worst-case lookup latency strictly to O(log n), neutralizing Hash Collision DoS exploits.",
        },
      },
      how: {
        heading: "3. Hashing & Entry Insertion Pipeline (HOW)",
        paragraphs: [
          "When put(key, value) is invoked, HashMap executes a 4-step sequence:",
          "1. Perturbation Hashing: Invokes key.hashCode() to retrieve 32-bit integer h, then XORs it with its own upper 16 bits: hash = (h ^ (h >>> 16)).",
          "2. Bucket Index Mapping: Computes array index via bitwise masking: index = (n - 1) & hash (where n is the current capacity).",
          "3. Bucket Traversal & Collision Handling: If bucket[index] is null, a new Node is instantiated as head. If occupied, HashMap traverses the chain: if an existing key matches (p.hash == hash && (p.key == key || key.equals(p.key))), the value is updated. Otherwise, the new node is appended to the tail.",
          "4. Treeification & Resizing Evaluation: If chain length reaches 8, treeifyBin() is triggered. Next, if overall size exceeds threshold, resize() doubles table capacity and redistributes elements.",
        ],
      },
      internals: {
        heading: "4. Internals: Bitwise Arithmetic & High-Bit Resize Splitting (INTERNALS)",
        paragraphs: [
          "Two standout algorithmic techniques define OpenJDK's java.util.HashMap implementation:",
          "1. Power-of-Two Capacity Invariant: When capacity n is a power of 2, (n - 1) produces a contiguous sequence of binary 1s (e.g., n = 16 = 0001 0000 -> n - 1 = 15 = 0000 1111). Bitwise ANDing (n - 1) & hash acts as a bitmask, isolating the lowest bits. This achieves the exact arithmetic result of hash % n at ALU hardware speed.",
          "2. High-Bit Splitting on Resize: Java 7 recomputed bucket indices and inserted nodes via head-insertion, which caused infinite loop deadlocks during concurrent resize. In Java 8+, HashMap uses tail-insertion and checks a single bit: (e.hash & oldCap) == 0. If zero, the node stays at its original index. If non-zero, it shifts to (index + oldCap). Zero hash recomputations required!",
        ],
        codeSnippet: {
          language: "java",
          caption: "Perturbation spread and high-bit split logic from OpenJDK HashMap source",
          code: `// 1. Bitwise perturbation spread function
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 2. Bucket index calculation via bitmask
int index = (capacity - 1) & hash;

// 3. High-bit chain split during table doubling (Java 8+)
Node<K,V> loHead = null, loTail = null; // Stays at old index
Node<K,V> hiHead = null, hiTail = null; // Moves to (oldIndex + oldCap)
do {
    next = e.next;
    if ((e.hash & oldCap) == 0) {
        if (loTail == null) loHead = e; else loTail.next = e;
        loTail = e;
    } else {
        if (hiTail == null) hiHead = e; else hiTail.next = e;
        hiTail = e;
    }
} while ((e = next) != null);`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "Treeification provides security and latency predictability, accompanied by specific trade-offs:",
        ],
        bulletPoints: [
          "Memory Footprint: A standard Node stores 4 references (hash, key, value, next). A TreeNode requires parent, left, right, prev pointers and a red/black color boolean, consuming twice the heap memory. This is why Java treeifies only when collision depth reaches 8.",
          "Load Factor 0.75: Lowering loadFactor to 0.5 minimizes collisions but wastes 50% table memory. Increasing to 1.0 reduces memory overhead at the cost of higher collision frequency and increased lookup latency.",
          "Concurrency Boundary: HashMap is NOT thread-safe. In multithreaded environments, developers must use ConcurrentHashMap rather than Collections.synchronizedMap() to achieve scalable throughput via lock-free CAS on bucket heads and fine-grained per-bucket synchronization.",
        ],
      },
      failureScenarios: {
        heading: "6. Real-World HashMap Failure Modes (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Broken equals() and hashCode() Contract: Overriding equals() while omitting hashCode(). Result: Two logically identical objects produce different 32-bit hash codes, causing map.get(key) to return null immediately after map.put(key, val).",
          "2. Mutable Objects as Keys: Using a mutable object as a map key and modifying its fields post-insertion. The object's calculated hash changes, causing HashMap to look in the wrong bucket and rendering the entry unretrievable—a silent in-memory leak.",
          "3. Concurrency Data Loss: Invoking put() on a standard HashMap across concurrent threads. Simultaneous resize operations corrupt internal pointers and trigger silent data loss.",
        ],
        callout: {
          tone: "warning",
          title: "Enforce Immutable Keys",
          body: "Always use immutable types such as String, Integer, UUID, or Java 17+ Records as HashMap keys to guarantee that hashCode() values remain invariant throughout the map lifecycle.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Key engineering rules when utilizing Collections in high-scale backends:",
          "1. Pre-size HashMap Capacities: If you expect a map to hold ~1,000 entries, instantiate it with: new HashMap<>(Math.ceil(1000 / 0.75) + 1) -> 1,334 (rounded to power-of-two capacity 2,048). This completely avoids expensive rehash and table allocation during runtime.",
          "2. In Java 8+ ConcurrentHashMap, bucket locking transitioned from coarse Segment locks to lock-free CAS on empty heads and synchronization only on colliding chain heads, achieving massive parallel read performance.",
          "3. Use LinkedHashMap when insertion or access order must be preserved (e.g., LRU cache implementations). Use TreeMap when keys must remain naturally sorted.",
        ],
      },
    },
    sourceIds: ["openjdk-hashmap-source"],
    questionIds: ["java-q3-hashmap-indexing", "java-q4-treeify-threshold"],
  },

  // 3. Java 8+ Functional & Stream API Internals
  {
    id: "java-streams-lazy-evaluation",
    slug: "java-streams-lazy-evaluation",
    domainId: "java",
    title: "Java 8+ — Stream API Internals, Lazy Evaluation & Pipeline Fusion",
    subtitle:
      "Spliterator mechanics, Intermediate vs Terminal ops, Loop Fusion, and the dangers of ForkJoinPool.commonPool",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 20,
    difficulty: "Foundational",
    keyTerms: [
      {
        term: "Functional Interface",
        definition:
          "An interface containing exactly one Single Abstract Method (SAM), annotated with @FunctionalInterface (e.g., Function<T,R>, Predicate<T>, Consumer<T>, Supplier<T>), enabling Lambda expression syntax.",
      },
      {
        term: "Lazy Evaluation",
        definition:
          "The processing paradigm of the Stream API: intermediate operations (filter, map) do not execute upon declaration. Computation begins only when a Terminal Operation is invoked on the pipeline.",
      },
      {
        term: "Loop Fusion",
        definition:
          "Stream engine optimization: rather than iterating across a collection multiple times and creating intermediate collections, Stream fuses filter and map stages into a single pass per element.",
      },
      {
        term: "Short-Circuiting Operation",
        definition:
          "Terminal or intermediate operations that truncate pipeline traversal as soon as a condition is satisfied (e.g., findFirst, anyMatch, limit), enabling safe operation on infinite data streams.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "Introduced in Java 8 (JSR 335), the Stream API transformed Java backend engineering from imperative styles characterized by nested for/while loops and mutating state into declarative, functional pipelines.",
          "A Java Stream represents a sequence of elements supporting sequential or parallel aggregate computations. Crucially: a Stream is not an in-memory data structure and does not own data; it is a computational pipeline that pulls data from a source (Collection, Array, I/O channel) and routes it to a sink destination.",
        ],
        bulletPoints: [
          "Data Sources: Collection.stream(), Arrays.stream(), Stream.of(), Files.lines().",
          "Intermediate Operations: filter, map, flatMap, distinct, sorted, peek. Always return a new Stream and remain completely LAZY.",
          "Terminal Operations: forEach, collect, toList, reduce, count, findFirst, anyMatch. Triggers pipeline execution and consumes the stream.",
        ],
      },
      why: {
        heading: "2. Why the Stream API Outperforms Imperative Loops (WHY)",
        paragraphs: [
          "When processing datasets across multiple transformation stages using traditional loops:",
          "1. Intermediate Memory Bloat: Imperative code frequently allocates temporary collections at each step (e.g., filtered list -> new ArrayList -> mapped list -> new ArrayList). For large datasets, this puts intense allocation pressure on Eden and triggers frequent GC cycles.",
          "2. Complex Short-Circuiting: Halting execution at the first valid match across three filtering conditions requires verbose break/return control flow.",
          "The Stream API solves both issues via Pipeline Fusion: elements are pulled through stages individually (element-by-element), eliminating intermediate collection allocations entirely.",
        ],
      },
      how: {
        heading: "3. Architecture: Spliterator & Sink Chains (HOW)",
        paragraphs: [
          "Inside OpenJDK, a Stream pipeline is driven by three core pillars:",
          "1. Spliterator (Splittable Iterator): Traverses and partitions source elements. The tryAdvance() method steps sequentially through elements, while trySplit() divides data partitions to enable parallel processing.",
          "2. ReferencePipeline: Each .filter() or .map() call instantiates a StatelessOp or StatefulOp linked into a doubly-linked pipeline descriptor chain.",
          "3. Sink Chain: When a terminal operation (e.g., collect) is invoked, the JVM constructs a nested chain of Sink objects. Elements from the Spliterator are pushed through each Sink stage. If a stage rejects an item (e.g., filter returns false), processing immediately advances to the next source element without traversing downstream sinks.",
        ],
      },
      internals: {
        heading: "4. Internals & The Hazard of ForkJoinPool.commonPool (INTERNALS)",
        paragraphs: [
          "One of the Stream API's most accessible features is seamless parallelization via list.parallelStream().",
          "However, parallelStream() conceals a critical architectural pitfall: By default, every parallel stream across the entire JVM process shares a single static thread pool: ForkJoinPool.commonPool(), sized to (Runtime.getRuntime().availableProcessors() - 1) worker threads.",
          "ForkJoinPool is optimized strictly for CPU-bound divide-and-conquer workloads. If an engineer executes blocking I/O calls (HTTP requests, JDBC queries, third-party RPCs) inside a parallelStream, the commonPool worker threads become pinned and stalled. This starves all other parallel streams and asynchronous CompletableFuture tasks application-wide.",
        ],
        codeSnippet: {
          language: "java",
          caption: "Short-circuiting lazy stream pipeline and custom ForkJoinPool isolation",
          code: `// 1. Lazy evaluation with short-circuiting (Zero intermediate lists allocated)
Optional<String> firstVip = customers.stream()
    .filter(Customer::isActive)        // StatelessOp
    .filter(Customer::isVip)           // StatelessOp
    .map(Customer::getEmail)          // StatelessOp
    .findFirst();                     // Terminal short-circuit: stops immediately on first match

// 2. Safe parallel execution isolated in a dedicated ForkJoinPool
ForkJoinPool customPool = new ForkJoinPool(4);
try {
    List<OrderResult> results = customPool.submit(() ->
        orders.parallelStream()
            .map(this::heavyCpuCalculation)
            .toList()
    ).get();
} finally {
    customPool.shutdown();
}`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "Comparing Stream pipelines against traditional imperative for-loops:",
        ],
        bulletPoints: [
          "Micro-Benchmark Overhead: For tiny collections (<1,000 primitive elements), traditional for-loops run 10-20% faster due to zero pipeline object instantiation and polymorphic method call overhead.",
          "Readability & Maintainability: The Stream API delivers superior clarity for business logic transformations, eliminating index out-of-bounds bugs and enabling clean function composition.",
          "Debugging Complexity: Stepping through complex Stream pipelines using standard line breakpoints is more difficult than in imperative loops (though modern IDEs provide Stream Trace tooling).",
        ],
      },
      failureScenarios: {
        heading: "6. Real-World Stream Failure Modes (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Reusing a Consumed Stream: Invoking a terminal operation twice on the same Stream instance throws java.lang.IllegalStateException: stream has already been operated upon or closed.",
          "2. Shared Mutable State in Parallel Streams: Appending to non-thread-safe collections from within parallelStream(): list.parallelStream().forEach(result::add). This causes race conditions, corrupted sizing, or ArrayIndexOutOfBoundsException.",
          "3. Unbounded Streams Missing Limit: Pairing Stream.iterate() or Stream.generate() with stateful operations like sorted() or toList() without limit(). Because sorted() requires collecting all elements to order them, the JVM immediately runs out of memory.",
        ],
        callout: {
          tone: "production",
          title: "Golden Rule for Parallel Streams",
          body: "NEVER execute network, database, or disk I/O operations inside parallelStream(). Reserve parallelStream() strictly for CPU-intensive computations over large in-memory collections (>10,000 items).",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Best practices for designing backend services with the Stream API:",
          "1. In Java 16+, prefer .toList() over .collect(Collectors.toList()) because .toList() produces an unmodifiable list with optimized internal array sizing.",
          "2. Use Primitive Streams (IntStream, LongStream, DoubleStream) for numeric operations to avoid auto-boxing and unboxing overhead that burdens Young Gen GC.",
          "3. In asynchronous architectures, combine Streams with CompletableFuture: map futures to streams and aggregate completion non-blockingly using CompletableFuture.allOf().",
        ],
      },
    },
    sourceIds: ["jsr-335-streams"],
    questionIds: ["java-q5-stream-lazy-fusion", "java-q6-parallel-stream-pitfall"],
  },

  // 4. Java 21 Modern Internals: Virtual Threads (Project Loom)
  {
    id: "java-virtual-threads-loom",
    slug: "java-virtual-threads-loom",
    domainId: "java",
    title: "Java 21 — Virtual Threads (Project Loom), Carrier Scheduling & Concurrency Internals",
    subtitle:
      "M:N threading model, Continuation Yield mechanics during blocking I/O, and the Thread Pinning synchronized pitfall",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 30,
    difficulty: "Senior / Staff",
    simulationId: "java-virtual-threads",
    keyTerms: [
      {
        term: "Virtual Thread (JEP 444)",
        definition:
          "Lightweight user-mode thread managed directly by the JVM runtime rather than the OS. Features near-zero creation overhead and dynamic heap-allocated stack frames (~few KB), enabling millions of concurrent threads.",
      },
      {
        term: "Carrier Thread",
        definition:
          "An actual OS Platform Thread within an internal JVM ForkJoinPool that acts as the physical vehicle to mount and execute Virtual Thread bytecode on CPU cores.",
      },
      {
        term: "Continuation.yield()",
        definition:
          "Core mechanism of Project Loom: when a Virtual Thread executes blocking I/O (Socket read/write, sleep), the JVM suspends the continuation, stashes stack frames on the Heap, and unmounts from the Carrier Thread.",
      },
      {
        term: "Thread Pinning",
        definition:
          "Adverse state where a Virtual Thread performs blocking operations inside a synchronized block or native JNI call. The JVM cannot unmount call frames, pinning the Carrier Thread and starving the worker pool.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "For 25 years, java.lang.Thread maintained a direct 1:1 mapping with Operating System Kernel Threads (Platform Threads). Every thread creation forced the OS to allocate a dedicated call stack (default 1MB) and execute kernel-space context switches.",
          "Consequently, in traditional Thread-per-Request web servers (Tomcat, Spring Boot MVC), a server could sustain only 2,000 to 5,000 concurrent threads before exhausting memory and suffering CPU thrashing.",
          "Java 21 LTS officially introduced Virtual Threads (Project Loom - JEP 444). Virtual Threads adopt an M:N threading model: millions of lightweight user-mode Virtual Threads are multiplexed dynamically across a small pool of OS Carrier Threads.",
        ],
        bulletPoints: [
          "Platform Threads: 1:1 OS thread mapping, 1MB fixed stack memory, constrained to ~2,000-5,000 threads per node.",
          "Virtual Threads: M:N user-mode mapping, 1-2 KB dynamic heap stack, easily scaling to 1,000,000+ concurrent threads.",
          "Zero Codebase Rewrites: Write straightforward, sequential blocking code without the complexity of Reactive paradigms (WebFlux/RxJava).",
        ],
      },
      why: {
        heading: "2. Why Virtual Threads Supersede Reactive Programming (WHY)",
        paragraphs: [
          "To achieve high concurrency across thousands of open connections on legacy threads, backend architectures previously shifted to Reactive frameworks (Spring WebFlux, Project Reactor, Vert.x) based on non-blocking event loops.",
          "However, Reactive Programming exacted a heavy toll on Developer Experience:",
        ],
        bulletPoints: [
          "Fragmented Stack Traces: When exceptions occur, stack traces contain dozens of Reactor internal frames (Flux.publishOn, Mono.flatMap) that obscure the real business sequence.",
          "Loss of ThreadLocal Context: Thread-bound context mechanisms (Spring Security context, MDC logging, Zipkin/OpenTelemetry distributed tracing) broke without specialized context propagation.",
          "Steep Learning Curve: Developers were forced to abandon standard if/else logic, try/catch/finally blocks, and straightforward unit testing.",
        ],
        callout: {
          tone: "note",
          title: "The Project Loom Revolution",
          body: "Virtual Threads deliver the best of both worlds: preserve simple, sequential, debuggable code with complete stack traces, while achieving throughput parity with or exceeding Reactive systems.",
        },
      },
      how: {
        heading: "3. Carrier Scheduling & Continuation Yield (HOW)",
        paragraphs: [
          "How Virtual Threads operate within the HotSpot JVM:",
          "1. Mount: When a Virtual Thread transitions to Runnable, the JVM schedules it on an idle Carrier Thread from its internal ForkJoinPool. The Virtual Thread stack pointer is mounted to the Carrier stack, and the CPU begins execution.",
          "2. Blocking Call Interception: When the Virtual Thread invokes a blocking operation (Socket.read, JDBC query, Thread.sleep, LockSupport.park), JDK internal networking libraries intercept the call.",
          "3. Continuation Yield & Unmount: Instead of parking the OS thread, HotSpot invokes Continuation.yield(): current stack frames are copied to the JVM heap, and the Virtual Thread unmounts from its Carrier Thread.",
          "4. Carrier Thread Release: The Carrier Thread is immediately freed to pick up and execute the next waiting Virtual Thread from the run queue.",
          "5. Unpark & Resume: An internal background Poller thread (leveraging Linux epoll or macOS kqueue) monitors the socket descriptor. When network data arrives, the Poller wakes the Virtual Thread, queuing it as Runnable to be mounted on ANY available Carrier Thread.",
        ],
      },
      internals: {
        heading: "4. Internals & The Threat of Thread Pinning (INTERNALS)",
        paragraphs: [
          "While Virtual Threads dramatically expand concurrency, backend engineers must understand and prevent Thread Pinning.",
          "Thread Pinning occurs when a Virtual Thread executes a blocking operation under either of two conditions:",
          "1. Inside a synchronized block or synchronized method.",
          "2. Inside a native method call (via JNI or the Foreign Function & Memory API).",
          "When pinned, HotSpot cannot cleanly unmount the execution stack from the OS thread. The Virtual Thread pins the Carrier Thread in an OS BLOCKED state. If 10 Virtual Threads are pinned simultaneously while waiting on database calls, an 8-core Carrier Pool is completely starved. All remaining Virtual Threads in the application stall.",
        ],
        codeSnippet: {
          language: "java",
          caption: "Resolving Thread Pinning: Replacing synchronized with ReentrantLock",
          code: `// HAZARDOUS: Causes Thread Pinning and starves the Carrier Thread Pool!
public synchronized String fetchLegacyData(String url) {
    return restTemplate.getForObject(url, String.class); // Blocking I/O inside synchronized
}

// RECOMMENDED IN JAVA 21: ReentrantLock unmounts cleanly on blocking I/O
private final ReentrantLock lock = new ReentrantLock();

public String fetchModernData(String url) {
    lock.lock();
    try {
        return restTemplate.getForObject(url, String.class); // Clean Continuation unmount!
    } finally {
        lock.unlock();
    }
}

// Enabling Virtual Threads per Task in Spring Boot 3.2+
@Bean(TomcatProtocolHandlerCustomizer.class)
public TomcatProtocolHandlerCustomizer<?> protocolHandlerVirtualThreadExecutorCustomizer() {
    return protocolHandler -> {
        protocolHandler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    };
}`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "Virtual Threads are not a silver bullet for all performance workloads:",
        ],
        bulletPoints: [
          "I/O-Bound Workloads (Optimal): Web APIs, microservices calling databases, Kafka producers/consumers, external REST services. Throughput increases by 200% to 500% with minimal extra RAM.",
          "CPU-Bound Workloads (Zero Benefit): Video transcoding, cryptographic hashing, machine learning matrix math. Because compute is physically bounded by CPU cores, Virtual Threads add scheduling overhead without throughput gains.",
          "Never Pool Virtual Threads: Creating a Virtual Thread Pool (such as ThreadPoolExecutor(200)) is an anti-pattern. Virtual Threads are ephemeral and designed to be instantiated per task (Task-per-Thread) and discarded upon completion.",
        ],
      },
      failureScenarios: {
        heading: "6. Real-World Virtual Thread Failure Modes (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Carrier Pool Starvation via Pinning: Outdated JDBC drivers or legacy third-party libraries enclosing socket calls in synchronized methods. Under load spikes, all Carrier Threads become pinned, causing application-wide deadlocks.",
          "2. Database Connection Pool Exhaustion: When Tomcat can spawn 50,000 concurrent requests via Virtual Threads, if all 50,000 attempt to acquire a database connection from HikariCP (configured with maximumPoolSize=20), connection pool queues overflow and requests timeout.",
          "3. Heap Bloat from Unbounded ThreadLocal Storage: If each Virtual Thread stores a 1MB buffer in ThreadLocal, spawning 100,000 concurrent Virtual Threads consumes 100GB of Heap, triggering rapid OutOfMemoryError.",
        ],
        callout: {
          tone: "warning",
          title: "Detecting Thread Pinning in Production",
          body: "Always launch production services with the JVM diagnostic flag: -Djdk.tracePinnedThreads=full. HotSpot will print detailed stack traces whenever a Virtual Thread pins its Carrier Thread during blocking calls.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Golden rules for deploying Virtual Threads in production backends:",
          "1. Enable Virtual Threads in Spring Boot 3.2+: Set spring.threads.virtual.enabled=true in application.yml.",
          "2. Implement Concurrency Limiting (Backpressure): Use Semaphores to throttle concurrent access to downstream finite resources (such as database connection pools or payment gateways).",
          "3. Adopt Scoped Values (JEP 446 / Java 21 preview) to replace ThreadLocal for sharing immutable context across tasks cleanly and efficiently.",
          "4. Upgrade all database drivers to Loom-compatible versions (PostgreSQL JDBC driver 42.6+, MySQL Connector/J 8.2+).",
        ],
      },
    },
    sourceIds: ["jep-444-virtual-threads"],
    questionIds: ["java-q7-virtual-threads-yield", "java-q8-thread-pinning-hazard"],
  },

  // Existing Flagship Deep-Dive: Kafka Consumer Groups & Rebalancing
  {
    id: "kafka-consumer-groups-rebalance",
    slug: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    title: "Apache Kafka — Consumer Groups, Partition Assignment & Rebalance Internals",
    subtitle:
      "Deep dive into Partition assignment, Stop-The-World vs Cooperative Sticky (KIP-429), and the GroupCoordinator state machine",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "kafka-consumer-group",
    keyTerms: [
      {
        term: "Consumer Group",
        definition:
          "A set of consumer instances cooperating to consume data in parallel from one or more Topics. Each Partition in a Topic is assigned to exactly one Consumer member at any time.",
      },
      {
        term: "GroupCoordinator",
        definition:
          "A designated Broker (determined by hashing the groupId to the internal __consumer_offsets topic) responsible for managing membership, heartbeats, and rebalance lifecycles.",
      },
      {
        term: "CooperativeStickyAssignor (KIP-429)",
        definition:
          "Incremental cooperative assignment protocol that avoids global Stop-The-World partition revocation when consumers join or leave the group.",
      },
      {
        term: "generationId",
        definition:
          "Monotonically increasing integer maintained by the GroupCoordinator. Incremented on each rebalance completion to fence off stale offset commit requests from older generations.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "Apache Kafka achieves high-throughput horizontal consumption scalability via Consumer Groups. Instead of requiring a single consumer instance to process an entire high-volume Topic, Kafka shards the Topic into parallel Partitions and distributes these partitions across group members.",
          "The core invariant: within a single Consumer Group, each Partition is consumed by at most one Consumer at any point in time. This guarantees strict in-order message processing per partition while enabling parallel throughput across the entire topic.",
        ],
        bulletPoints: [
          "Consumers < Partitions: A single Consumer is assigned multiple Partitions.",
          "Consumers == Partitions: Optimal 1-to-1 mapping with balanced processing load.",
          "Consumers > Partitions: Excess Consumers remain idle on standby, receiving zero partitions.",
        ],
      },
      why: {
        heading: "2. Why Rebalances Are Necessary (WHY)",
        paragraphs: [
          "In production microservices environments, consumer instances experience unexpected node crashes, Out-Of-Memory errors, network partitions, or autoscaling events (Kubernetes Pod scaling).",
          "When group membership changes, the system must execute a Rebalance: revoking partitions from dead instances and redistributing load across active or newly joined members. Without rebalances, unassigned partitions would stall indefinitely, causing unbounded Consumer Lag.",
        ],
        callout: {
          tone: "warning",
          title: "The Problem with Classic Eager Rebalancing",
          body: "Under the classic Eager Rebalance protocol (RangeAssignor / RoundRobinAssignor), whenever a consumer joins or leaves, ALL consumers must relinquish their assigned partitions (Stop-The-World), freezing consumption for seconds to minutes and generating severe Consumer Lag spikes.",
        },
      },
      how: {
        heading: "3. Protocol Execution Stages (HOW)",
        paragraphs: [
          "The lifecycle of a Kafka Consumer Group is coordinated by a designated Broker (GroupCoordinator) through four primary phases:",
          "1. FindCoordinator: A consumer queries any bootstrap broker to discover which Broker manages its groupId (based on the hash of groupId modulo __consumer_offsets partitions).",
          "2. JoinGroup: Consumers dispatch JoinGroupRequests. The Coordinator designates the first respondent as Group Leader and increments generationId. The Leader receives the full active member list.",
          "3. SyncGroup: The Group Leader executes the client-side PartitionAssignor algorithm and returns the assignment plan via SyncGroupRequest. The Coordinator distributes customized assignments back to each consumer.",
          "4. Heartbeat: Consumers periodically emit background HeartbeatRequests (heartbeat.interval.ms) to assert liveness. If no heartbeat arrives within session.timeout.ms, the Coordinator declares the consumer dead and triggers a rebalance.",
        ],
      },
      internals: {
        heading: "4. Internals: Eager vs Cooperative Sticky Rebalancing (INTERNALS)",
        paragraphs: [
          "The most pivotal distinction in modern Kafka engineering is between Eager Rebalance (Range/RoundRobin) and Incremental Cooperative Rebalance (KIP-429).",
          "Under KIP-429 (CooperativeStickyAssignor), when a consumer joins, active members DO NOT revoke their healthy partitions. Instead, they retain uninterrupted consumption of steady partitions, revoking only the migrating partitions across two short targeted assignment rounds.",
        ],
        codeSnippet: {
          language: "java",
          caption: "Production-ready Kafka Consumer configuration",
          code: `Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-billing-cg");
// Use CooperativeStickyAssignor to eliminate Stop-The-World rebalance pauses
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
// Separate heartbeat liveness from the application processing loop
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 45000);   // Heartbeat thread failure detection
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);  // Send heartbeat every 3s
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 5 minutes max for app processing`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "Partition assignors balance algorithmic simplicity against throughput stability:",
        ],
        bulletPoints: [
          "RangeAssignor: Simple; preserves co-partitioning across topics sharing partition counts. Drawback: Induces partition assignment imbalance favoring earlier members when subscribed to multiple topics.",
          "RoundRobinAssignor: Uniformly distributes partitions across members. Drawback: Remains an Eager protocol that triggers cluster-wide Stop-The-World pauses.",
          "CooperativeStickyAssignor: Preserves P99 throughput without global pauses; retains existing assignments. Drawback: Requires two successive rebalance rounds to complete partition migration.",
        ],
      },
      failureScenarios: {
        heading: "6. Real-World Kafka Failure Modes (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Heartbeat Timeout (session.timeout.ms): Background heartbeat threads stall due to long JVM Full GC pauses or transient network partitions, causing the Coordinator to evict the consumer.",
          "2. Processing Hang (max.poll.interval.ms): The application thread blocks on an external downstream call or slow batch computation and misses the poll() deadline, prompting the Coordinator to kick the consumer and trigger a destructive Rebalance Loop.",
        ],
        callout: {
          tone: "warning",
          title: "The Rebalance Storm Hazard",
          body: "When max.poll.interval.ms is exceeded, the Coordinator evicts the consumer -> Rebalance occurs -> The partition migrates to another consumer -> The new consumer encounters the exact same poison pill batch and also times out -> A continuous Rebalance Storm paralyzes the consumer group.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Follow these production standards for reliable Kafka consumer groups:",
          "1. Always configure CooperativeStickyAssignor on Kafka 2.4+.",
          "2. Set heartbeat.interval.ms <= 1/3 of session.timeout.ms to withstand dropped heartbeat packets.",
          "3. Reduce max.poll.records (e.g., from 500 to 50 or 100) when records trigger slow I/O, ensuring processing completes well under max.poll.interval.ms.",
          "4. Configure Prometheus alerts on kafka_consumergroup_lag > 0 and monitor kafka_server_GroupCoordinator_RebalanceRateAndTimeMs.",
        ],
      },
    },
    sourceIds: ["kafka-design-doc", "kip-429", "kip-848"],
    questionIds: ["kafka-q1-rebalance-protocol", "kafka-q2-cooperative-sticky"],
  },

  // 2. Interactive Lab: Redis Cache Stampede & TTL Expiration
  {
    id: "redis-cache-stampede-ttl",
    slug: "redis-cache-stampede-ttl",
    domainId: "caching",
    title: "Redis — Cache-Aside, TTL Expiration & Cache Stampede Mitigation",
    subtitle:
      "Database connection pool exhaustion on hot key expiration and mitigation via Mutex Locking (Singleflight) and Logical TTL",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 20,
    difficulty: "Intermediate",
    simulationId: "redis-stampede",
    keyTerms: [
      {
        term: "Cache Stampede (Thundering Herd)",
        definition:
          "Failure cascade occurring when a high-traffic Hot Key expires or is evicted, causing thousands of concurrent requests to experience Cache Misses and hammer the database simultaneously.",
      },
      {
        term: "Passive vs Active Expiration",
        definition:
          "Redis key eviction mechanics: Passive (lazy deletion when a read command hits an expired key) combined with Active (probabilistic background sampling at 10 Hz).",
      },
      {
        term: "Mutex Lock / Singleflight",
        definition:
          "Request coalescing pattern: Only the single thread that acquires a distributed lock (SET NX PX) is permitted to query the database and repopulate cache; other threads wait for the refreshed value.",
      },
      {
        term: "Logical TTL (Probabilistic / Early Refresh)",
        definition:
          "Embedding a logical expiration timestamp within the cached JSON payload; near expiration, stale data is returned immediately in 1ms while an asynchronous background task recomputes fresh cache.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "The Cache-Aside (Lazy Loading) pattern is the predominant caching strategy in backend architectures: the application queries Redis first; on a Cache Hit, data returns in ~1ms; on a Cache Miss, the backend fetches data from PostgreSQL/MySQL, populates Redis with a Time-To-Live (TTL), and returns the payload.",
          "However, when read traffic reaches thousands of requests per second on a single Hot Key (e.g., flash-sale homepages, trending news, financial pricing tables), natural TTL expiration can trigger a catastrophic failure cascade known as a Cache Stampede (Thundering Herd).",
        ],
      },
      why: {
        heading: "2. The Connection Pool Collapse Hazard (WHY)",
        paragraphs: [
          "When a Hot Key expires at time T, during the subsequent 200ms window while PostgreSQL is computing an expensive SQL aggregation, all incoming concurrent requests encounter Cache Misses.",
          "If 500 requests arrive concurrently, all 500 threads request connections from PostgreSQL. Because connection pools (e.g., HikariCP) are typically sized to 20-50 connections, the pool exhausts instantly. Threads stall in connection queues, P99 latency spikes from 2ms to over 10,000ms, and cascading timeouts bring down downstream microservices.",
        ],
      },
      how: {
        heading: "3. Stampede Mitigation Strategies (HOW)",
        paragraphs: [
          "Two battle-tested architectural patterns eliminate Cache Stampede risks:",
          "1. Mutex Lock / Singleflight (SET NX PX): Upon a Cache Miss, worker threads attempt to acquire an atomic distributed lock via SET lock:key token NX PX 5000. Exactly one worker acquires the lock to query the database, while remaining workers wait or retry against the newly populated cache.",
          "2. Logical TTL (Serve Stale + Background Refresh): Set a long physical Redis TTL (e.g., 24 hours), but embed a logical_expire_at timestamp (e.g., 5 minutes) within the payload. Once 5 minutes pass, serve the existing (99% accurate) cached value in 1ms while initiating an asynchronous background job to recompute and update cache.",
        ],
      },
      internals: {
        heading: "4. Redis Internals: Atomic Locking & Safe Release (INTERNALS)",
        paragraphs: [
          "Distributed lock acquisition in Redis must use a single atomic command:",
          "SET resource_name unique_random_token NX PX 30000",
          "Splitting into separate SETNX and EXPIRE commands introduces a race condition: if the process crashes between commands, the key persists indefinitely without TTL, causing permanent deadlocks.",
        ],
        codeSnippet: {
          language: "lua",
          caption: "Safe lock release preventing Lock Stealing via Lua script",
          code: `-- Atomic token verification before deletion
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Off Analysis (TRADE-OFFS)",
        paragraphs: [
          "Comparing caching strategies under heavy concurrent load:",
        ],
        bulletPoints: [
          "Naive Cache-Aside: Minimal complexity; cache is strictly updated on demand. Severe drawback: Highly vulnerable to database outages on Hot Key expiration.",
          "Mutex Lock (Singleflight): Guarantees 100% database protection with exactly 1 query executed. Drawback: Concurrent requests incur waiting latency while the winning worker recomputes.",
          "Logical TTL / Background Refresh: P99 latency stays constant at ~1ms; completely shields database. Drawback: Embraces Eventual Consistency—clients receive slightly stale data during refresh windows.",
        ],
      },
      failureScenarios: {
        heading: "6. Failure Mode: Lock Stealing from GC Pauses (FAILURE SCENARIOS)",
        paragraphs: [
          "A subtle hazard in managed runtime applications: Worker 1 acquires a lock with a 5-second TTL. Suddenly, Worker 1 encounters a 7-second Stop-The-World Full GC pause. The lock expires in Redis, and Worker 2 acquires it. When Worker 1 recovers, it finishes its database query and calls DEL lock without verifying ownership, inadvertently deleting Worker 2's active lock! This is why atomic Lua script token verification is mandatory.",
        ],
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Inject Randomized TTL Jitter: Instead of static 300s TTLs, apply TTL = 300 + rand(-30, 30) seconds to prevent Cache Avalanches where hundreds of keys expire simultaneously.",
          "2. For Tier-1 Hot Keys, implement Singleflight request coalescing (such as golang.org/x/sync/singleflight or Guava LoadingCache in Java).",
          "3. Monitor Redis metrics: instantaneous_ops_per_sec, keyspace_hits vs keyspace_misses, and HikariCP ActiveConnections.",
        ],
      },
    },
    sourceIds: ["redis-eviction-spec", "redis-distlock-spec", "cache-stampede-vldb"],
    questionIds: ["redis-q1-stampede-root-cause", "redis-q2-mutex-lock-pattern"],
  },

  // 3. Interactive Lab: PostgreSQL B-Tree & MVCC
  {
    id: "postgres-btree-mvcc-visibility",
    slug: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    title: "PostgreSQL — B-Tree Index Scan, Visibility Map & MVCC Tuple Visibility",
    subtitle:
      "Explore 8 KB slotted pages, CTID pointers, nbtree traversal, and Snapshot differences between READ COMMITTED and REPEATABLE READ",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "postgres-mvcc-btree",
    keyTerms: [
      {
        term: "Slotted Page (8 KB)",
        definition:
          "The fundamental disk block unit in PostgreSQL. Contains PageHeaderData (24 bytes), an array of Line Pointers (ItemIdData) growing downwards, and Tuple data growing upwards from the bottom of the page.",
      },
      {
        term: "CTID (block_number, item_offset)",
        definition:
          "The physical tuple address on disk, such as (0, 1) indicating Block 0, Line Pointer 1.",
      },
      {
        term: "MVCC (t_xmin & t_xmax)",
        definition:
          "Multi-Version Concurrency Control: Tuple header fields storing the inserting transaction ID (xmin) and deleting/updating transaction ID (xmax). An UPDATE never overwrites in-place; it appends a new tuple version with a new CTID.",
      },
      {
        term: "Visibility Map (VM)",
        definition:
          "A disk bitmap tracking an all_visible bit for each 8 KB page. Enables Index-Only Scans to bypass heap fetches (Heap Fetches = 0) when all tuples on the page are visible to all running transactions.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "PostgreSQL is recognized worldwide for robust multi-version concurrency control (MVCC) and high-performance B-Tree index structures (nbtree).",
          "The foundational difference between PostgreSQL and engines like MySQL InnoDB or Oracle is that PostgreSQL does not use an Undo Log to reconstruct historical row versions. Instead, all row versions (past and present) reside directly on 8 KB Heap Pages, and tuple visibility is evaluated dynamically by comparing t_xmin and t_xmax against transaction Snapshots.",
        ],
      },
      why: {
        heading: "2. Why Writers Do Not Block Readers (WHY)",
        paragraphs: [
          "In traditional databases using pessimistic locking (Two-Phase Locking like SQL Server default), a transaction executing an UPDATE acquires an Exclusive Lock that blocks concurrent SELECT queries on that row until COMMIT.",
          "PostgreSQL's MVCC decouples these operations: Readers never block Writers, and Writers never block Readers. Concurrent readers observe a point-in-time Snapshot of committed data without ever stalling behind active write transactions.",
        ],
      },
      how: {
        heading: "3. Index Scan & Snapshot Visibility Evaluation (HOW)",
        paragraphs: [
          "When a SELECT query executes via a B-Tree Index:",
          "1. The query engine traverses from the Index Root Page -> Internal Pages -> Leaf Pages to locate the target key.",
          "2. The leaf index page returns physical CTID pointers (e.g., (0, 1), (0, 3)).",
          "3. The engine uses each CTID to fetch the 8 KB Heap Page into shared_buffers and inspects each tuple header:",
          "   - If xmin is uncommitted or xmin >= Snapshot xmax -> Invisible.",
          "   - If xmax is committed and xmax <= Snapshot -> Invisible (Dead Tuple).",
          "   - A tuple is returned to the client only when it satisfies all active Snapshot visibility rules.",
        ],
      },
      internals: {
        heading: "4. Snapshot Isolation: READ COMMITTED vs REPEATABLE READ (INTERNALS)",
        paragraphs: [
          "The fundamental distinction between PostgreSQL transaction isolation levels is Snapshot creation timing:",
          "- READ COMMITTED: Generates a NEW Snapshot at the start of EACH individual SQL statement. If an external transaction commits an update between two SELECT queries within the same transaction, the second SELECT sees the updated row.",
          "- REPEATABLE READ: Captures a SINGLE Snapshot at the beginning of the transaction's first statement and retains it until commit/rollback. Concurrent modifications committed by other transactions remain invisible throughout.",
        ],
        codeSnippet: {
          language: "sql",
          caption: "Inspecting raw MVCC tuple headers using the pageinspect extension",
          code: `CREATE EXTENSION IF NOT EXISTS pageinspect;

-- Inspect raw MVCC header bytes for tuples in Heap Block 0
SELECT lp, t_ctid, t_xmin, t_xmax,
       (t_infomask & 256)::bool AS xmin_committed,
       (t_infomask & 1024)::bool AS xmax_invalid
FROM heap_page_items(get_raw_page('accounts', 0));`,
        },
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs of the Append-Only Model (TRADE-OFFS)",
        paragraphs: [
          "PostgreSQL's append-only MVCC architecture delivers exceptional read concurrency with specific trade-offs:",
        ],
        bulletPoints: [
          "Table Bloat: UPDATE and DELETE operations leave dead tuples on disk. Without ongoing cleanup, table bloat inflates disk usage and degrades sequential scan performance.",
          "Index Pointer Bloat: Updates that do not qualify for HOT (Heap-Only Tuples) require inserting new CTID pointers across every index on the table.",
          "Requires continuous background Autovacuum daemon processes to prune dead tuples, reclaim space, and maintain Visibility Maps.",
        ],
      },
      failureScenarios: {
        heading: "6. Failure Mode: Autovacuum Lagging Under High Write Volume (FAILURE SCENARIOS)",
        paragraphs: [
          "On tables with millions of rows subjected to rapid continuous UPDATEs, if autovacuum_vacuum_cost_limit is under-configured, VACUUM cannot keep pace with dead tuple accumulation. Table and index sizes expand 5x, Visibility Map all_visible bits clear to 0, and Index-Only Scans degrade into expensive heap fetches reading thousands of unnecessary disk blocks.",
        ],
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Optimize Autovacuum for Write-Heavy Tables: Lower autovacuum_vacuum_scale_factor from default 0.2 (20%) to 0.05 (5%) and increase autovacuum_vacuum_cost_limit to 1000-2000.",
          "2. Ensure frequently updated columns are excluded from secondary indexes where possible to maximize HOT (Heap-Only Tuple) optimization, reusing pages without modifying B-Trees.",
          "3. Monitor n_dead_tup vs n_live_tup in pg_stat_user_tables and track pg_database transaction age to prevent Transaction ID (XID) Wraparound outages.",
        ],
      },
    },
    sourceIds: ["postgres-page-layout", "postgres-mvcc-concurrency", "postgres-btree-nbtree"],
    questionIds: ["postgres-q1-update-ctid-internals", "postgres-q2-index-only-scan-vm"],
  },
];
