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
    simulationId: "java-streams-pipeline",
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

  // 7. Java Core: Exceptions, Throwable Hierarchy & Stack Unwinding
  {
    id: "java-exceptions-stack-unwinding",
    slug: "java-exceptions-stack-unwinding",
    domainId: "java",
    title: "Java Exceptions — Throwable Hierarchy, JVM Exception Tables & Call Stack Unwinding",
    subtitle:
      "Deep dive into Error vs Checked vs Unchecked, bytecode athrow, Exception Table range lookups, Try-with-Resources, and Suppressed Exceptions",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "java-exceptions-stack-unwinding",
    keyTerms: [
      {
        term: "Throwable Hierarchy",
        definition:
          "The root class java.lang.Throwable branches into Error (fatal VM conditions like OutOfMemoryError, StackOverflowError) and Exception. Exception divides into Unchecked (RuntimeException subclasses) and Checked (all other Exception subclasses enforced by javac at compile time).",
      },
      {
        term: "JVM Exception Table",
        definition:
          "Metadata stored in compiled class file method bytecodes containing entries [fromPc, toPc, targetPc, catchType]. When an exception occurs, the JVM searches this table in linear order to determine where to transfer execution control.",
      },
      {
        term: "Stack Unwinding",
        definition:
          "The process by which the JVM discards the active stack frame and transfers control to the caller frame when no matching handler is found in the current method's Exception Table, repeating up the call chain until a matching handler is found or the thread terminates.",
      },
      {
        term: "Try-with-Resources & Suppressed Exceptions",
        definition:
          "Introduced in Java 7, automatically invokes AutoCloseable.close() in reverse order of resource declaration. If both the try block and close() throw exceptions, the close() exception is attached as a Suppressed Exception via Throwable.addSuppressed() rather than masking the primary failure.",
      },
      {
        term: "fillInStackTrace() Overhead",
        definition:
          "A native JVM method called during Throwable instantiation that walks the native and Java call frames to record class, method, file, and line numbers. Accounts for 90%+ of the CPU cost of throwing an exception in high-throughput backend services.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "In the Java Virtual Machine architecture, exceptions are first-class execution events represented by object instances descending from the root class java.lang.Throwable.",
          "The Throwable hierarchy is bifurcated into two foundational branches with distinct operational semantics: java.lang.Error and java.lang.Exception.",
          "Error subclasses (such as OutOfMemoryError, StackOverflowError, InternalError) represent catastrophic JVM-level failures that normal application code cannot recover from. Standard backend services must never attempt to catch or suppress java.lang.Error.",
          "Exception subclasses represent application-level conditions and are further split into Checked Exceptions (direct subclasses of Exception, enforced at compile-time by javac) and Unchecked Exceptions (subclasses of RuntimeException, such as NullPointerException, IllegalArgumentException, and IllegalStateException, indicating programming or state invariants violations).",
        ],
        bulletPoints: [
          "Throwable: Root ancestor providing stack trace capture (getStackTrace(), fillInStackTrace()), cause chaining (getCause(), initCause()), and suppressed exception aggregation (addSuppressed(), getSuppressed()).",
          "Error (Unchecked): Unrecoverable system-level failures (JVM crash, native memory exhaustion).",
          "Exception (Checked): Anticipated environmental recoverable conditions (e.g., IOException, SQLException) requiring explicit throws declarations or try-catch enclosures.",
          "RuntimeException (Unchecked): Unanticipated logical, state, or contract violations that can occur at any point in program execution.",
        ],
      },
      why: {
        heading: "2. The Evolution of Checked vs Unchecked in Backend Engineering (WHY)",
        paragraphs: [
          "Java is one of the very few industrial languages to implement Checked Exceptions. The original architectural intention of Java designers in 1995 was to force developers to deliberately consider and handle every recoverable failure mode (such as a missing file or disconnected socket) at compile time.",
          "However, over three decades of enterprise backend evolution (Spring Framework, Hibernate, Jakarta EE, reactive engines), Checked Exceptions created severe architectural liabilities:",
        ],
        bulletPoints: [
          "Interface Leaks: Declaring throws SQLException or throws IOException in clean domain interfaces (e.g., UserRepository.findById()) couples the domain API to specific infrastructure driver details.",
          "Exception Swallowing: Frustrated developers frequently wrote empty catch blocks (catch (Exception e) {}) or generic logging without rethrowing, silently losing critical diagnostic telemetry.",
          "Functional Programming Incompatibility: Java 8+ Stream API and Lambda functional interfaces (Function<T,R>, Predicate<T>, Consumer<T>) do not permit checked exceptions in their method signatures, requiring boilerplate unchecked wrappers.",
          "Modern Industry Standard: Modern frameworks (Spring Boot @Transactional, JPA, Resilience4j) almost exclusively leverage Unchecked RuntimeExceptions, allowing errors to cleanly propagate up the call stack to a centralized Global Exception Handler (@RestControllerAdvice).",
        ],
        callout: {
          tone: "note",
          title: "Modern Architectural Best Practice",
          body: "Translate low-level driver checked exceptions into strongly-typed domain unchecked exceptions at infrastructure boundaries (e.g. catch SQLException and throw OrderPersistenceException extends RuntimeException). Preserve the original cause chain!",
        },
      },
      how: {
        heading: "3. Try-with-Resources & AutoCloseable Cleanup Mechanics (HOW)",
        paragraphs: [
          "Prior to Java 7, resource cleanup in finally blocks was notoriously bug-prone. Closing a database ResultSet, Statement, and Connection required nested try-catch blocks in finally. If an exception occurred during the first close(), subsequent resources leaked.",
          "Java 7 introduced the Try-with-Resources statement, binding to the java.lang.AutoCloseable interface. Any object implementing close() declared in the try header is guaranteed to be closed upon exiting the block, whether completion was normal or abrupt.",
        ],
        bulletPoints: [
          "Reverse Declaration Order (LIFO): Resources declared in try (ResourceA a = ...; ResourceB b = ...) are closed in reverse order: b.close() executes first, followed by a.close(). This preserves dependency hierarchies (e.g., closing a Stream before closing its underlying FileChannel).",
          "Suppressed Exceptions: If the try block throws an exception (e.g., QueryExecutionException) and b.close() also throws an exception (e.g., SocketCloseException), the try-block exception remains the primary thrown exception. The JVM attaches the close() failure to the primary exception via Throwable.addSuppressed().",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: athrow, Exception Tables & Stack Unwinding (INTERNALS)",
        paragraphs: [
          "Unlike conditional branch instructions (ifeq, goto), Java exceptions do not use run-time if checks on method returns. In normal error-free execution, try-catch blocks incur ZERO execution time overhead (Zero-Cost Exception Handling model).",
          "When an exception is thrown, the compiler emits the bytecode instruction 'athrow'. The JVM searches the compiled method's Exception Table attribute:",
        ],
        codeSnippet: {
          language: "java",
          caption: "HotSpot Compiled Bytecode Exception Table Structure",
          code: `// Method: OrderService.processPayment(LOrder;)V
// Code:
//   0: aload_0
//   1: invokevirtual #4  // Method PaymentClient.charge:()V
//   4: return
//   5: astore_1          // Catch block starts at PC 5
//   6: aload_1
//   7: invokestatic  #7  // Method logError:(LPaymentException;)V
//   10: return

Exception table:
   from    to  target type
      0     4       5 Class PaymentException
      0     4      12 any  // Generated for finally block`,
        },
        bulletPoints: [
          "Exception Table Resolution: HotSpot scans entries matching from <= PC < to. If the thrown object is an instance of the entry's type, PC jumps to 'target'.",
          "Stack Unwinding: If no matching entry exists in the current method's Exception Table, HotSpot pops the current Stack Frame (deallocating local variables and operand stack) and inspects the caller frame's Exception Table at the call site PC. This repeats recursively until a handler is found or the thread terminates.",
          "The Cost of fillInStackTrace(): When new MyException() is constructed, the JVM performs an expensive native frame-pointer traversal to populate the stack trace. In microservices processing 50,000 req/sec, throwing exceptions for business logic flow control causes severe CPU saturation.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs of Error Handling Paradigms (TRADE-OFFS)",
        paragraphs: [
          "Backend architects evaluate three competing error handling strategies across latency, type safety, and ergonomic dimensions:",
        ],
        bulletPoints: [
          "Exceptions (Unchecked): Clean code separation between happy path and recovery logic. High ergonomics with centralized handlers. Trade-off: High CPU cost if used as control flow; exceptions are invisible in method signatures.",
          "Result / Either Types (e.g., Result<T, Error>): Functional monadic approach (popular in Rust and Kotlin). Forces explicit handling of success and failure without JVM stack unwinding. Trade-off: Requires monadic flatMap chaining; verbose in standard Java.",
          "Pre-allocated / Stackless Exceptions: Overriding Throwable.fillInStackTrace() to return 'this' without native stack walking. Reduces CPU overhead by 95% for high-frequency lightweight domain signals. Trade-off: Loss of line-number debugging context.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "In production distributed microservices, incorrect exception handling leads to insidious failure modes:",
        ],
        callout: {
          tone: "warning",
          title: "Critical Production Anti-Patterns",
          body: "1. Swallowing Exceptions: 'catch (Exception e) { log.error(\"failed\"); }' without rethrowing or returning an error causes the caller to assume success, corrupting downstream transactional state.\n2. Lost Cause Chain: 'catch (SQLException e) { throw new ServiceException(\"Failed\"); }' strips the root cause. Without passing 'e' into the constructor, database root cause error codes (e.g. ORA-00060 Deadlock) are lost forever.\n3. Catching java.lang.Error: Catching Throwable or Error in application threads intercepts OutOfMemoryError and ThreadDeath, preventing the JVM or container from restarting a broken process.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Centralized Global Exception Handling: Use Spring Boot's @RestControllerAdvice with @ExceptionHandler to map domain RuntimeExceptions into standard RFC 7807 (Problem Details for HTTP APIs) responses with uniform error codes, timestamps, and correlation IDs.",
          "2. Diagnostic Context Propagation (MDC): Ensure correlation/trace IDs (traceId, spanId) from OpenTelemetry / SLF4J MDC are injected into every exception log entry before stack unwinding occurs.",
          "3. Thread.setDefaultUncaughtExceptionHandler: Always register a global uncaught exception handler on application startup to ensure thread crashes in asynchronous Executors and ScheduledExecutorServices are logged with full stack traces rather than dying silently.",
        ],
      },
    },
    sourceIds: ["jvm-spec-se21", "jvms-21-exceptions"],
    questionIds: ["java-q1-exception-table-unwinding", "java-q2-suppressed-exceptions"],
  },

  // 8. Java Core: Concurrency, Java Memory Model & Lock Inflation
  {
    id: "java-concurrency-jmm-locks",
    slug: "java-concurrency-jmm-locks",
    domainId: "java",
    title: "Java Concurrency — Java Memory Model (JMM), Volatile Visibility & Synchronized Lock Upgrades",
    subtitle:
      "Deep dive into CPU cache coherency, Happens-Before, StoreLoad memory barriers, and HotSpot Mark Word lock inflation (Biased -> CAS -> Heavyweight)",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 30,
    difficulty: "Senior / Staff",
    simulationId: "java-concurrency-jmm-locks",
    keyTerms: [
      {
        term: "Java Memory Model (JMM / JSR-133)",
        definition:
          "The formal specification defining how threads interact through memory, dictating when writes by one thread become visible to reads by another, and defining the legal boundaries of compiler and hardware instruction reordering.",
      },
      {
        term: "Happens-Before Relationship",
        definition:
          "A partial ordering constraint in the JMM: if action A happens-before action B, the memory effects of A are guaranteed to be visible to B. Includes Program Order, Volatile Variable Rule, and Monitor Lock Rule.",
      },
      {
        term: "Volatile Memory Barrier",
        definition:
          "Low-level CPU instructions (e.g., mfence, lock addl on x86, dmb on ARM) emitted by HotSpot to enforce memory ordering. Prevents reordering around volatile reads/writes and forces CPU store buffers to drain into main memory.",
      },
      {
        term: "HotSpot Mark Word",
        definition:
          "The 64-bit header of every Java object instance. Encodes object hashcode, GC generational age (4 bits), bias epoch, and the 2-bit tag defining lock status: 001 (Unlocked), 101 (Biased), 00 (Lightweight), 10 (Heavyweight).",
      },
      {
        term: "Lock Inflation / Escalation",
        definition:
          "HotSpot's progressive optimization: starts with zero-cost Biased Locking for single-threaded usage, escalates to user-space CAS spin (Lightweight Lock) under light contention, and inflates to an OS Mutex (Heavyweight ObjectMonitor) under heavy contention.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "In modern multi-core server hardware architectures, CPUs do not read and write directly to physical RAM for every instruction. Each CPU core possesses private ultra-fast L1 and L2 caches, Store Buffers, and Invalidate Queues.",
          "When multiple Java threads execute concurrently across different CPU cores, reading and modifying shared state without explicit synchronization creates severe visibility and ordering anomalies: a thread running on Core 1 may write a new value into its local Store Buffer, while Core 2 continues reading a stale value from its local L1 cache indefinitely.",
          "To provide reliable cross-platform multithreading guarantees without sacrificing native hardware optimization, Java introduces the Java Memory Model (JMM, standardized in JSR-133) and the HotSpot Object Synchronization Engine.",
        ],
        bulletPoints: [
          "Shared Main Memory vs Thread Local Cache: Heap memory represents shared state, but threads operate on local copies in CPU registers and cache lines.",
          "Instruction Reordering: Compilers (javac, HotSpot C1/C2 JIT) and CPUs reorder instructions to maximize pipeline utilization unless constrained by Memory Barriers.",
          "Synchronization Primitives: 'volatile' guarantees visibility and ordering without mutual exclusion; 'synchronized' and Locks guarantee atomicity, mutual exclusion, and visibility.",
        ],
      },
      why: {
        heading: "2. Why the Java Memory Model (JSR-133) is Essential (WHY)",
        paragraphs: [
          "Without the formal Happens-Before rules defined by JSR-133, multi-threaded Java applications would suffer from catastrophic, non-deterministic bugs that only manifest under heavy production load:",
        ],
        bulletPoints: [
          "Infinite Loops from Stale Caches: A background worker thread executing 'while (!stopped)' may never terminate if 'stopped' is a non-volatile boolean, because the JIT compiler hoists the read outside the loop (loop invariant hoisting: if (!stopped) while(true)).",
          "Partially Initialized Objects (Double-Checked Locking bug): In 'if (instance == null) { synchronized { if (instance == null) instance = new Singleton(); } }', the instruction sequence (1. allocate memory, 2. invoke constructor, 3. assign pointer to instance) can be reordered by the CPU into (1, 3, 2). Another thread can observe a non-null pointer before the constructor finishes, crashing on uninitialized fields! Declaring 'private static volatile Singleton instance;' prevents this reordering.",
          "Word Tearing: JMM guarantees that 32-bit primitive reads/writes are atomic, but unaligned 64-bit values (long and double) were historically susceptible to split 32-bit tearing unless declared volatile.",
        ],
        callout: {
          tone: "note",
          title: "The JMM Happens-Before Invariants",
          body: "1. Monitor Lock Rule: An unlock on a monitor lock happens-before every subsequent lock on the same monitor.\n2. Volatile Variable Rule: A write to a volatile variable happens-before every subsequent read of that same volatile variable.",
        },
      },
      how: {
        heading: "3. How HotSpot Optimizes Locks: The Lock Inflation Pathway (HOW)",
        paragraphs: [
          "Acquiring a traditional operating system mutex (pthread_mutex on Linux) requires transitioning from CPU user mode (Ring 3) to kernel mode (Ring 0). This causes a full context switch, saving and restoring CPU registers, flushing TLB caches, and costing 1,000 to 5,000 CPU cycles (1-5 microseconds).",
          "Because 80%+ of Java synchronized blocks in real applications are executed by only a single thread or experience zero contention, HotSpot implements an adaptive 4-stage Lock Escalation state machine recorded inside the 64-bit Mark Word of the object header:",
        ],
        bulletPoints: [
          "1. UNLOCKED (001): Normal uncontested object. Mark Word stores Identity HashCode, 4-bit GC age, and biased lock flag = 0.",
          "2. BIASED LOCKING (101): Object is biased toward the first thread that acquires it. HotSpot writes the thread ID into the Mark Word. Subsequent synchronizations by the same thread incur ZERO atomic instructions (0 nanoseconds overhead).",
          "3. LIGHTWEIGHT LOCK (00): When a second thread attempts to acquire the biased lock, the bias is revoked. The thread allocates a BasicObjectLock record on its own Call Stack and uses atomic CAS (cmpxchg) to swap the Mark Word pointer. If uncontested, locking takes ~10-15 ns.",
          "4. HEAVYWEIGHT MONITOR (10): If contention is high and user-space CAS spin loops exceed threshold (Adaptive Spinning), the lock inflates into a native ObjectMonitor. Contending threads are parked into OS wait queues (futex/mutex), incurring context switches.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: Mark Word Layout & Memory Barriers (INTERNALS)",
        paragraphs: [
          "The internal representation of synchronization state in OpenJDK HotSpot 64-bit architecture is encoded within the Mark Word:",
        ],
        codeSnippet: {
          language: "c++",
          caption: "OpenJDK HotSpot 64-bit Mark Word Bit Layout (markWord.hpp)",
          code: `//  64-bit Mark Word bit patterns:
//  [-------------------------------------------------------------|---|--]
//  [                     Unused (25 bits) | HashCode (31) | Age (4) | 0 | 01]  -> UNLOCKED
//  [     ThreadID (54 bits) | Epoch (2)   | Unused (4)    | Age (4) | 1 | 01]  -> BIASED
//  [        Pointer to BasicObjectLock record in Thread Stack      | 00]  -> LIGHTWEIGHT (CAS)
//  [        Pointer to native ObjectMonitor in Native C++ Heap     | 10]  -> HEAVYWEIGHT (Mutex)
//  [        Pointer to Forwarding Address during GC Evacuation     | 11]  -> MARKED (GC)

// Hardware Memory Barriers generated by JIT compiler for volatile:
// Volatile Write: StoreStore Barrier -> [volatile store] -> StoreLoad Barrier (lock addl $0,(%rsp))
// Volatile Read:  [volatile load]   -> LoadLoad Barrier  -> LoadStore Barrier`,
        },
        bulletPoints: [
          "Adaptive Spinning: When a thread fails to acquire a Lightweight Lock, it doesn't sleep immediately. It executes a loop of CPU 'PAUSE' instructions in user space. HotSpot adaptively adjusts the spin count based on whether previous spins succeeded.",
          "Monitorenter and Monitorexit Bytecode: javac translates synchronized(obj) into monitorenter at entry and duplicate monitorexit instructions (one on normal exit, one on exception handler table) to ensure locks are never leaked.",
          "Lock Deflation: In HotSpot, once a lock inflates to Heavyweight (10), it almost never deflates back to Lightweight during normal application execution; deflation occurs only during Stop-The-World Safepoints during Garbage Collection.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs of Synchronization Paradigms (TRADE-OFFS)",
        paragraphs: [
          "Backend engineers choose between three concurrency models based on latency and contention profiles:",
        ],
        bulletPoints: [
          "Synchronized Blocks: Reentrant, built-in JVM runtime optimizations (Lock Elision via Escape Analysis, Lock Coarsening). Trade-off: Cannot specify timeouts; cannot be interrupted while waiting (lock acquisition is uninterruptible).",
          "java.util.concurrent.locks.ReentrantLock: Advanced features (tryLock with timeout, lockInterruptibly, fair scheduling, multiple Condition queues). Trade-off: Requires manual 'try { ... } finally { lock.unlock(); }'; slightly higher heap overhead.",
          "Lock-Free CAS (AtomicInteger, VarHandle, StampedLock optimistic reads): Highest throughput under low-to-medium contention; zero thread parking. Trade-off: High CPU consumption under heavy contention due to busy spin retry loops; vulnerable to the ABA problem unless using AtomicStampedReference.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Concurrency bugs in distributed backend services are notoriously difficult to reproduce in development environments:",
        ],
        callout: {
          tone: "warning",
          title: "Critical Production Concurrency Hazards",
          body: "1. Lock Contention Cascades: A single heavily contended synchronized block (e.g. synchronized access to a legacy cache) inflates to Heavyweight Monitor, parking hundreds of Tomcat worker threads. Thread pool starvation triggers HTTP 504 Gateway Timeouts across the entire cluster.\n2. Volatile Compound Mutation Race: 'volatile int count; count++;' is NOT atomic! 'count++' is a read-modify-write (3 bytecodes: getfield, iadd, putfield). Two threads executing count++ concurrently will overwrite each other's increments. Must use AtomicInteger.incrementAndGet().\n3. Deadlock via Lock Inversion: Thread A acquires Lock 1 then attempts Lock 2; Thread B acquires Lock 2 then attempts Lock 1. Both threads freeze forever. Always acquire locks in a globally consistent order.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Diagnose Lock Contention via JFR and async-profiler: Run JDK Flight Recorder with 'jdk.JavaMonitorEnter' events to measure total lock wait duration and identify offending monitor addresses.",
          "2. Minimize Lock Scope: Keep critical sections as small as possible. Never invoke remote network RPCs, database queries, or disk I/O inside a synchronized block or lock.",
          "3. Modern Java 21 Consideration (Virtual Threads): In Java 21 LTS, a Virtual Thread executing a 'synchronized' block that performs blocking I/O will PIN its OS Carrier Thread, degrading scalability. Migrate blocking synchronized blocks to ReentrantLock to allow Virtual Threads to unmount cleanly.",
        ],
      },
    },
    sourceIds: ["jvm-spec-se21", "jsr-133-jmm"],
    questionIds: ["java-q1-volatile-jmm-visibility", "java-q2-hotspot-lock-inflation"],
  },

  // 7. Java 8+ Asynchronous Orchestration: CompletableFuture
  {
    id: "java-completable-future-async",
    slug: "java-completable-future-async",
    domainId: "java",
    title: "Java 8+ — Asynchronous Pipelines: CompletableFuture & Non-blocking Orchestration",
    subtitle:
      "CompletionStage DAG, ForkJoinPool handoffs, .join() thread starvation hazards, and error recovery",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "java-completable-future",
    keyTerms: [
      {
        term: "CompletableFuture",
        definition:
          "An implementation of Future and CompletionStage introducing non-blocking callback chaining, monadic functional transformations, and asynchronous task coordination in modern Java.",
      },
      {
        term: "CompletionStage",
        definition:
          "A contract representing a node in an asynchronous computation graph (DAG) that performs an action or computes a value when another stage completes.",
      },
      {
        term: "ForkJoinPool.commonPool()",
        definition:
          "The default JVM-wide work-stealing thread pool used by CompletableFuture when no explicit Executor is passed. Default parallelism is (CPU cores - 1).",
      },
      {
        term: "Thread Starvation Deadlock",
        definition:
          "A critical concurrency failure where worker threads inside a bounded pool are blocked waiting for dependent subtasks that cannot execute because all pool threads are occupied.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "Prior to Java 8, java.util.concurrent.Future allowed asynchronous task execution, but lacked any mechanism to combine results or attach callbacks. Developers were forced to call future.get(), which blocked the calling OS thread until the computation completed, completely nullifying non-blocking throughput.",
          "CompletableFuture implements both Future<T> and CompletionStage<T>, allowing backend engineers to construct complex Asynchronous Directed Acyclic Graphs (DAGs). Stages execute reactively upon the completion of upstream dependencies without holding OS threads in waiting states.",
        ],
        bulletPoints: [
          "Non-blocking Pipeline: Chains stages using fluent functional combinators (thenApply, thenCompose, thenCombine).",
          "Explicit Error Channels: Encapsulates exceptions within the stage, routing failures through exceptionally() or handle() handlers.",
          "Dual Execution Modes: Supports synchronous completion on the completing thread or asynchronous dispatch via dedicated Executor pools.",
        ],
      },
      why: {
        heading: "2. Why CompletableFuture in Distributed Systems (WHY)",
        paragraphs: [
          "In modern distributed architectures, serving a single client request frequently requires aggregating data from multiple downstream microservices (e.g., User Profile, Order Catalog, Pricing Engine, Fraud Detection).",
          "Executing these RPC calls sequentially results in unacceptable latency (Latency = T1 + T2 + T3). Using CompletableFuture enables firing all RPC requests concurrently and non-blockingly joining results: Latency = max(T1, T2, T3) + overhead.",
        ],
        bulletPoints: [
          "Elimination of Thread-per-Request Bottlenecks: A small pool of worker threads can orchestrate thousands of concurrent in-flight RPC requests.",
          "Resilience & Circuit Fallbacks: If an individual dependency fails or times out, the pipeline can emit a cached or degraded response via exceptionally() without cascading failure.",
          "Coordination Primitives: CompletableFuture.allOf() and anyOf() provide robust primitives for fan-out / fan-in aggregation patterns.",
        ],
      },
      how: {
        heading: "3. Implementation Patterns & Stage Combinators (HOW)",
        paragraphs: [
          "Designing high-throughput asynchronous pipelines requires choosing the correct CompletionStage combinator based on dependency topology:",
        ],
        codeSnippet: {
          language: "java",
          caption: "Production CompletableFuture Orchestration Pipeline",
          code: `// 1. Fan-out independent remote calls to dedicated I/O pool
CompletableFuture<User> userFuture = CompletableFuture
    .supplyAsync(() -> userService.fetchUser(userId), ioThreadPool);

CompletableFuture<List<Order>> ordersFuture = CompletableFuture
    .supplyAsync(() -> orderService.fetchRecentOrders(userId), ioThreadPool);

// 2. Non-blocking fan-in zip combination
CompletableFuture<UserDashboard> dashboardFuture = userFuture
    .thenCombineAsync(ordersFuture, (user, orders) -> {
        return new UserDashboard(user, orders, pricingEngine.calculateDiscounts(user, orders));
    }, cpuThreadPool)
    // 3. Graceful degradation on remote timeout
    .exceptionally(ex -> {
        log.warn("Failed to build dashboard for user {}, serving cached view", userId, ex);
        return UserDashboard.fallback(userId);
    });`,
        },
        bulletPoints: [
          "thenApply vs thenCompose: Use thenApply for simple synchronous transformations (T -> R). Use thenCompose when the transformation itself returns a CompletableFuture<R> to avoid nested CompletableFuture<CompletableFuture<R>> (monadic flatMap).",
          "Sync vs Async Suffix: methods without Async (thenApply) run on whichever thread completed the previous future. Methods with Async (thenApplyAsync) dispatch execution to a specified Executor.",
          "CompletableFuture.allOf: Synchronizes completion across an arbitrary array of futures. Note: allOf returns CompletableFuture<Void>; results must be gathered individually after resolution.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: CompletionStage State Machine (INTERNALS)",
        paragraphs: [
          "Under the hood, java.util.concurrent.CompletableFuture is implemented as a lock-free, atomic state machine backed by a Treiber stack of Completion dependency records:",
        ],
        bulletPoints: [
          "Treiber Stack of Callbacks: Each CompletableFuture holds a volatile Object result field and a volatile Completion stack head. When you invoke thenApply() on an uncompleted future, a UniApply node is pushed onto the stack via atomic CAS (Compare-And-Swap).",
          "Completion Cascades: When complete(result) is invoked, it atomically sets the result field and pops callback nodes from the Treiber stack, executing them or scheduling them on their target Executor in LIFO order.",
          "Work-Stealing ForkJoinPool: When using commonPool(), tasks enter a WorkQueue array. Idle carrier threads steal tasks from the deques of busy threads using atomic CAS on queue head/tail pointers, maximizing CPU core utilization.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs: CompletableFuture vs Alternatives (TRADE-OFFS)",
        paragraphs: [
          "Comparing asynchronous orchestration options in Java backend services:",
        ],
        bulletPoints: [
          "CompletableFuture vs Project Reactor (Mono/Flux): CompletableFuture is built into the JDK with zero external dependencies, perfect for 1-to-1 asynchronous RPC orchestration. Reactive Streams (Reactor) provide superior streaming, backpressure, and operators, but introduce steep learning curves and debugging complexity.",
          "CompletableFuture vs Virtual Threads (Java 21+): Virtual Threads allow writing simple, imperative blocking code (e.g. response = httpClient.send()) with the scalability of async I/O. However, CompletableFuture remains essential for complex parallel DAG branch joins (allOf, anyOf) where multiple operations must proceed simultaneously.",
          "ForkJoinPool.commonPool vs Dedicated Thread Pools: commonPool() is convenient but shared across the entire JVM (including parallel streams). Submitting slow, blocking I/O to commonPool() risks starving the entire application.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Asynchronous pipelines introduce subtle failure modes that can silently degrade backend reliability:",
        ],
        callout: {
          tone: "warning",
          title: "Critical Production Pitfalls in CompletableFuture",
          body: "1. Thread Pool Starvation via Worker .join(): Calling subtask.join() inside a task running on ForkJoinPool.commonPool() ties up a worker thread while waiting. Under load, all pool workers become blocked waiting for tasks that cannot run because no workers are free — resulting in a complete thread starvation freeze!\n2. Silent Swallowed Exceptions: If an exception is thrown in supplyAsync() and the pipeline terminates without exceptionally(), handle(), or a downstream reader calling get()/join(), the exception is swallowed silently and never logged to stdout or APM.\n3. CommonPool Saturation: Never run JDBC or blocking REST calls on ForkJoinPool.commonPool(). Always supply a custom ThreadPoolExecutor with bounded capacity and descriptive thread names.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Production rules for high-availability CompletableFuture pipelines:",
          "1. Always Provide Dedicated Executors: Separate thread pools for CPU-bound tasks (size = CPU cores) from I/O-bound tasks (size = 50-200 threads depending on downstream capacity).",
          "2. Configure Explicit Timeouts (Java 9+): Always append .orTimeout(500, TimeUnit.MILLISECONDS) or .completeOnTimeout(fallback, 500, TimeUnit.MILLISECONDS) to prevent hanging futures from leaking memory.",
          "3. MDC Context Propagation: SLF4J MDC is stored in ThreadLocal. When execution hops between threads via thenApplyAsync(), MDC is lost. Use an MDC-aware Executor decorator to copy trace IDs across asynchronous boundaries.",
        ],
      },
    },
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
    questionIds: ["java-q11-cf-join-starvation", "java-q12-cf-async-handoff"],
  },

  // 8. Java Core: Concurrent Collections (ConcurrentHashMap)
  {
    id: "java-concurrenthashmap-locking",
    slug: "java-concurrenthashmap-locking",
    domainId: "java",
    title: "Java 8+ — Concurrent Collections: ConcurrentHashMap Internals & Lock Striping",
    subtitle:
      "casTabAt on empty bins, synchronized head locking, ForwardingNode cooperative transfer, and lock-free reads",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "java-concurrenthashmap",
    keyTerms: [
      {
        term: "ConcurrentHashMap",
        definition:
          "A thread-safe hash table implementation designed for highly concurrent multi-core reads and writes without global table locks or coarse segment blocking.",
      },
      {
        term: "casTabAt (CAS Bin Head)",
        definition:
          "Lock-free atomic Compare-And-Swap operation used by ConcurrentHashMap to initialize a previously empty table bucket without acquiring any monitor lock.",
      },
      {
        term: "Striped Bin Locking",
        definition:
          "Fine-grained locking mechanism: on hash collisions, synchronization is acquired strictly on the first node (head) of that individual bucket (synchronized(binHead)).",
      },
      {
        term: "ForwardingNode (hash = -1 / MOVED)",
        definition:
          "A special sentinel node placed into old table buckets during resize. It routes concurrent readers to the nextTable and prompts mutating threads to help transfer bins cooperatively.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "In Java 7 and earlier, ConcurrentHashMap achieved thread safety via Segment Locking (ReentrantLock arrays partitioning the table into 16 segments). While far superior to a globally locked Hashtable or Collections.synchronizedMap(), concurrency was fundamentally bounded by the number of segments.",
          "In Java 8+ (JSR 166 rewrite by Doug Lea), Segment locks were completely replaced with lock-free atomic CAS for empty bucket insertions and fine-grained synchronized locking on the head node of individual collided buckets. This increases effective lock striping to the entire table capacity (thousands of independent bins).",
        ],
        bulletPoints: [
          "Lock-Free Reads: get() operations never acquire any locks, traversing volatile Node.val and Node.next references without contention.",
          "Lock-Free Empty Writes: If a bucket is empty, a new node is installed via atomic casTabAt with zero monitor overhead.",
          "Collided Bucket Locking: synchronized(binHead) locks only the collided bucket chain. All remaining bins accept concurrent mutations.",
        ],
      },
      why: {
        heading: "2. Why Fine-Grained Striping Matters for Backend Systems (WHY)",
        paragraphs: [
          "High-throughput backend architectures (e.g. real-time rate limiters, session caches, metrics counters) encounter thousands of concurrent requests per second. Under heavy multi-threaded access, coarse table locks become crippling bottlenecks.",
        ],
        bulletPoints: [
          "Elimination of Stop-The-World Resizing: Instead of freezing the table during capacity doubling, resizing is progressive and cooperative: threads encounter ForwardingNodes and assist via helpTransfer().",
          "Near Linear Read Scalability: 100% lock-free reads scale across 128+ CPU cores without CPU cache coherence invalidation storm.",
          "Prevention of Deadlocks: Locking is strictly restricted to individual bucket heads, preventing cross-bin lock inversion deadlocks.",
        ],
      },
      how: {
        heading: "3. Implementation Patterns & Atomic Mechanics (HOW)",
        paragraphs: [
          "ConcurrentHashMap exposes powerful atomic methods that eliminate the need for external synchronization:",
        ],
        codeSnippet: {
          language: "java",
          caption: "Atomic ConcurrentHashMap Mutation Patterns",
          code: `ConcurrentHashMap<String, LongAdder> metrics = new ConcurrentHashMap<>();

// 1. Atomic computeIfAbsent: executes mappingFunction only once per key atomically
metrics.computeIfAbsent("orders.checkout.success", k -> new LongAdder()).increment();

// 2. Atomic putIfAbsent: thread-safe insertion check
ConcurrentHashMap<String, Session> activeSessions = new ConcurrentHashMap<>();
Session existing = activeSessions.putIfAbsent(sessionId, newSession);
if (existing != null) {
    // Session already registered concurrently
}`,
        },
        bulletPoints: [
          "computeIfAbsent / compute: Atomically computes the value for a key while holding the bin head lock, preventing race conditions during factory initialization.",
          "Never Use Collections.synchronizedMap: Wrapping ConcurrentHashMap in synchronizedMap() destroys its concurrent capabilities by forcing a single reentrant lock.",
          "Null Values Forbidden: Neither keys nor values can be null (throws NullPointerException) to eliminate ambiguity between 'key mapped to null' and 'key not found'.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: ForwardingNodes & Cooperative Transfer (INTERNALS)",
        paragraphs: [
          "The internal architecture of java.util.concurrent.ConcurrentHashMap relies on specialized sentinel node hierarchies:",
        ],
        bulletPoints: [
          "ForwardingNode: Has hash = -1 (MOVED) and points to nextTable. When a thread encounters this during put(), it immediately invokes helpTransfer() to assist migrating remaining bins.",
          "TreeBin (hash = -2): Encapsulates Red-Black tree root when bucket chain length reaches TREEIFY_THRESHOLD (8). Locks the TreeBin root rather than individual tree nodes.",
          "CounterCell (Striped LongAdder): Table size is not stored in a single volatile counter (which would suffer cache line bouncing). It is striped across an array of CounterCell instances.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs: ConcurrentHashMap vs Alternatives (TRADE-OFFS)",
        paragraphs: [
          "Comparing thread-safe map structures in Java backend engineering:",
        ],
        bulletPoints: [
          "ConcurrentHashMap vs Collections.synchronizedMap: synchronizedMap locks the entire map for every read and write. ConcurrentHashMap allows N concurrent writes (across N bins) and infinite concurrent reads.",
          "ConcurrentHashMap vs CopyOnWriteArrayList: CopyOnWrite makes a full array clone on every write (ideal for 99.9% read-heavy configs). ConcurrentHashMap is optimized for high-volume concurrent writes and reads.",
          "Weakly Consistent Iterators: ConcurrentHashMap iterators reflect the state of the map at or since creation without throwing ConcurrentModificationException. Trade-off: size() is an estimate, not a point-in-time freeze.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Common pitfalls when employing ConcurrentHashMap in production:",
        ],
        callout: {
          tone: "warning",
          title: "Critical ConcurrentHashMap Pitfalls",
          body: "1. Compound Action Race Condition: 'if (!map.containsKey(k)) map.put(k, v);' is NOT atomic! Between containsKey() and put(), another thread can insert key k. Always use map.putIfAbsent() or computeIfAbsent()!\n2. Blocking I/O inside computeIfAbsent: computeIfAbsent holds the bucket head lock while computing the lambda. If the lambda performs a slow remote HTTP or DB call, all operations targeting that bucket freeze completely!\n3. Expecting Strict Snapshot Semantics: size() and isEmpty() compute estimations across striped CounterCells. Do not rely on them for strict transactional invariant checks.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Keep computeIfAbsent Lambdas Pure and In-Memory: Never perform network RPCs or disk writes inside computeIfAbsent or compute.",
          "2. Pre-size Capacity with InitialCapacity: When expecting millions of keys, initialize capacity = expectedItems / 0.75f + 1 to avoid massive cooperative resize transfers during peak traffic.",
          "3. Combine with LongAdder: For high-frequency counters, use ConcurrentHashMap<Key, LongAdder> rather than AtomicLong to eliminate CAS spin contention on the counter value.",
        ],
      },
    },
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
    questionIds: ["java-q13-chm-locking-internals", "java-q14-chm-forwarding-nodes"],
  },

  // 9. Java Core: Optional & Functional Null-Safety
  {
    id: "java-optional-functional-patterns",
    slug: "java-optional-functional-patterns",
    domainId: "java",
    title: "Java 8+ — Java Optional: Functional Null-Safety & Eager orElse Anti-Patterns",
    subtitle:
      "Memory footprint boxing, eager orElse vs lazy orElseGet traps, and monadic pipeline composition",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 20,
    difficulty: "Foundational",
    simulationId: "java-optional-patterns",
    keyTerms: [
      {
        term: "java.util.Optional<T>",
        definition:
          "A value-based container object introduced in Java 8 which may or may not contain a non-null value, designed as a library return type to explicitly signal absent results.",
      },
      {
        term: "Eager Evaluation (orElse)",
        definition:
          "Java method parameters evaluate eagerly before the method body runs. Therefore, opt.orElse(expensive()) always evaluates the expensive argument even when the Optional contains a value.",
      },
      {
        term: "Lazy Evaluation (orElseGet)",
        definition:
          "orElseGet(Supplier<T>) accepts a functional lambda. The supplier is evaluated lazily only when the Optional is verified to be empty.",
      },
      {
        term: "Value-Based Class",
        definition:
          "A class whose instances are immutable, lack identity (== comparisons are discouraged), do not implement Serializable, and should not be synchronized upon.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "Invented by Tony Hoare in 1965, the null reference has famously been called the 'billion-dollar mistake'. In Java, NullPointerException (NPE) is the most frequent runtime exception, often crashing production services when unexpected nulls propagate across service layers.",
          "Java 8 introduced java.util.Optional<T> not as a general-purpose replacement for every null in the codebase, but specifically as a library return type to force calling code to explicitly consider and handle the possibility of an absent result.",
        ],
        bulletPoints: [
          "Explicit Return Type: Signatures like Optional<User> findUser(id) make absence explicit in the API contract without requiring JavaDoc inspection.",
          "Monadic Chaining: Supports map, flatMap, filter, and orElseGet to transform values cleanly without nested null checks.",
          "Boxing Overhead: An Optional instance allocates a separate 16-24 byte container on the JVM Heap wrapping the reference.",
        ],
      },
      why: {
        heading: "2. Why Optional in High-Fidelity Domain Services (WHY)",
        paragraphs: [
          "In enterprise backend architectures, defensive programming using nested 'if (user != null && user.getAddress() != null)' quickly leads to brittle, unreadable code.",
          "Optional enables concise, declarative pipelines that cleanly express business logic flow while safeguarding against NPE cascades.",
        ],
        bulletPoints: [
          "Defensive Clarity: Eliminates defensive boilerplate and reduces cyclomatic complexity.",
          "Guaranteed Handling: Forces developers at compile-time to handle absence rather than silently passing null to downstream services.",
          "Functional Composition: Integrates seamlessly with Java Streams and reactive pipelines.",
        ],
      },
      how: {
        heading: "3. Implementation Patterns: Idiomatic Monadic Chaining (HOW)",
        paragraphs: [
          "Modern Java backend services consume Optional through functional combinators:",
        ],
        codeSnippet: {
          language: "java",
          caption: "Idiomatic Optional Monadic Composition",
          code: `// Clean monadic pipeline: transforms, filters, and resolves with zero null checks
String postalCode = userRepository.findById(userId)
    .filter(User::isActive)
    .map(User::getAddress)
    .map(Address::getPostalCode)
    .orElseGet(() -> defaultPostalService.getDefaultCode());

// Anti-pattern: DO NOT write imperative isPresent() + get()
// if (opt.isPresent()) { return opt.get(); } // SMELL! Defeats Optional's purpose`,
        },
        bulletPoints: [
          "map vs flatMap: Use map(T -> R) for simple transformations. Use flatMap(T -> Optional<R>) when the transformer itself returns an Optional.",
          "orElse vs orElseGet: NEVER use orElse(heavyComputation()) for expensive operations. ALWAYS use orElseGet(() -> heavyComputation()).",
          "Optional.ofNullable: Use ofNullable(val) to wrap potentially null inputs safely. Optional.of(null) throws NullPointerException immediately.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: Memory Footprint & Value-Based Class (INTERNALS)",
        paragraphs: [
          "The internal representation of java.util.Optional in OpenJDK HotSpot 64-bit architecture:",
        ],
        bulletPoints: [
          "Memory Layout: An Optional object on 64-bit JVM with compressed OOPs contains: Mark Word (8 bytes) + Klass Word (4 bytes) + value reference (4 bytes) = 16 bytes. Without compressed OOPs, it occupies 24 bytes.",
          "No Serialization: Optional does NOT implement java.io.Serializable. Using Optional as fields in Hibernate/JPA entities or Spring DTOs causes serialization exceptions in distributed caches (Redis) and RMI.",
          "Identity-less Semantics: In Project Valhalla (future Java), Optional is slated to migrate to a primitive value class with zero allocation overhead.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs: Optional vs Null References (TRADE-OFFS)",
        paragraphs: [
          "Evaluating when to use Optional and when to return primitive/empty collections:",
        ],
        bulletPoints: [
          "Optional vs Empty Collections: Never return Optional<List<T>>! Return an empty immutable list (Collections.emptyList() or List.of()). Empty collections are already safe and cost zero boxing overhead.",
          "Optional vs Primitive Nulls: For high-throughput numeric crunching, wrapping integers in Optional<Integer> incurs auto-boxing and heap allocations. Use OptionalInt, OptionalLong, or sentinel values (-1).",
          "Method Arguments: Do not use Optional<T> as method parameters. It forces callers to wrap values (Optional.of(...)) and complicates null checking (param could itself be null). Use method overloading instead.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Classic production bugs caused by improper Optional usage:",
        ],
        callout: {
          tone: "warning",
          title: "Critical Optional Production Hazards",
          body: "1. The Eager orElse() Trap: 'cache.find(id).orElse(remoteService.fetch(id))'. In Java, parameters evaluate eagerly before the method runs. Even when cache hits 100%, the remote service is invoked on every single request!\n2. NoSuchElementException via .get(): Calling opt.get() without checking or without fallback throws java.util.NoSuchElementException: No value present, resulting in HTTP 500 crashes.\n3. NotSerializableException in Redis/Session: Storing an entity with an 'Optional<String> middleName' field into Redis or HTTP session breaks serialization because Optional is not Serializable.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Enforce Static Analysis Rules: Enable ErrorProne or SonarQube rules: 'OptionalNotPresentCheck' and 'OptionalAsField' in CI/CD pipeline.",
          "2. Standardize on orElseThrow(): When an absent value represents an exceptional business scenario, use .orElseThrow(() -> new EntityNotFoundException(id)).",
          "3. Java 9+ Modern Enhancements: Leverage .ifPresentOrElse(Consumer, Runnable) for clean side-effect branching and .or(() -> fallbackOptional) for chaining fallback providers.",
        ],
      },
    },
    sourceIds: ["java-lang-optional-api", "jvm-spec-se21"],
    questionIds: ["java-q15-optional-orelse-trap", "java-q16-optional-best-practices"],
  },

  // 10. Java Concurrency: ThreadPoolExecutor & Saturation Policies
  {
    id: "java-thread-pool-executor",
    slug: "java-thread-pool-executor",
    domainId: "java",
    title: "Java Concurrency — ThreadPoolExecutor: Worker Lifecycle & Saturation Policies",
    subtitle:
      "4-step task dispatching, bounded workQueue capacity, Worker keepAlive, and Rejection Policies",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "java-thread-pool-executor",
    keyTerms: [
      {
        term: "ThreadPoolExecutor",
        definition:
          "The core extensible thread pool implementation in java.util.concurrent that manages a pool of worker threads, a task queue, and rejection handlers for asynchronous task execution.",
      },
      {
        term: "4-Step Task Dispatching",
        definition:
          "The invariant dispatching sequence: 1) Active < corePoolSize -> spawn Core Worker; 2) workQueue not full -> enqueue; 3) Active < maximumPoolSize -> spawn Non-Core Worker; 4) Queue & Max full -> reject.",
      },
      {
        term: "CallerRunsPolicy",
        definition:
          "A saturation rejection handler where the rejected task executes directly on the submitting caller thread, effectively slowing down request ingress and creating natural backpressure.",
      },
      {
        term: "Worker keepAliveTime",
        definition:
          "The duration for which non-core worker threads wait for new tasks in the workQueue before timing out and terminating, shrinking the pool back to corePoolSize.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "Operating system threads are expensive resources. Each Java platform thread consumes 1 MB of native stack memory, requires kernel scheduler coordination, and costs 1-5 microseconds per context switch. Creating a new thread per request (Thread-per-Request) quickly exhausts OS file handles and leads to OutOfMemoryError: unable to create new native thread.",
          "ThreadPoolExecutor solves this by decoupling task submission from thread execution. It maintains a managed pool of reusable worker threads, a bounded BlockingQueue buffer, and a configurable RejectedExecutionHandler for handling traffic saturation.",
        ],
        bulletPoints: [
          "Core vs Maximum Pool Size: corePoolSize threads remain active even when idle; maximumPoolSize caps total worker threads during traffic surges.",
          "WorkQueue Buffering: BlockingQueue (e.g. ArrayBlockingQueue) buffers tasks when core workers are busy.",
          "KeepAlive Worker Reaping: Non-core worker threads terminate when idle longer than keepAliveTime.",
        ],
      },
      why: {
        heading: "2. Why Thread Pool Sizing and Rejection Policies Matter (WHY)",
        paragraphs: [
          "Under production load spikes (e.g. Black Friday flash sales, marketing push notifications), backend microservices experience traffic surges 10x normal volume. An improperly configured thread pool will either exhaust JVM heap memory (unbounded queue) or crash with thread exhaustion.",
        ],
        bulletPoints: [
          "Fail-Fast vs Backpressure: Rejection policies allow architects to either fail fast (AbortPolicy) to trip circuit breakers or slow down callers (CallerRunsPolicy) to absorb bursts gracefully.",
          "Bounded Resource Safety: Enforcing strict maximumPoolSize and bounded queue capacities prevents catastrophic OutOfMemoryError.",
          "Predictable Latency: Queued tasks experience queuing delay. Sizing the queue correctly ensures tasks are processed within SLA limits.",
        ],
      },
      how: {
        heading: "3. Implementation Patterns: Production ThreadPool Sizing (HOW)",
        paragraphs: [
          "Configuring a robust ThreadPoolExecutor in Java backend services:",
        ],
        codeSnippet: {
          language: "java",
          caption: "Production ThreadPoolExecutor Configuration",
          code: `int cpuCores = Runtime.getRuntime().availableProcessors();

// Sizing rule of thumb:
// CPU-bound tasks: Pool size = cpuCores (+ 1 to absorb page faults)
// I/O-bound tasks: Pool size = cpuCores * (1 + WaitTime / ServiceTime)

ThreadPoolExecutor executor = new ThreadPoolExecutor(
    cpuCores * 2,                         // corePoolSize
    cpuCores * 4,                         // maximumPoolSize
    60L, TimeUnit.SECONDS,                // keepAliveTime for non-core
    new ArrayBlockingQueue<>(500),         // BOUNDED queue capacity!
    new CustomNamedThreadFactory("order-worker"),
    new ThreadPoolExecutor.CallerRunsPolicy() // Natural backpressure!
);`,
        },
        bulletPoints: [
          "Never Use Executors.newFixedThreadPool(): It creates an unbounded LinkedBlockingQueue (Integer.MAX_VALUE capacity). Under load, the queue buffers millions of tasks until Heap OOM crashes the JVM.",
          "Never Use Executors.newCachedThreadPool(): It sets maximumPoolSize = Integer.MAX_VALUE. Traffic bursts spawn thousands of OS threads, crashing the operating system.",
          "Name Your Threads: Always provide a custom ThreadFactory that names threads (e.g. 'order-worker-1') to make stack traces identifiable in profilers and logs.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: The 4-Step Dispatch Algorithm & ctl AtomicInteger (INTERNALS)",
        paragraphs: [
          "ThreadPoolExecutor encodes both its run state (RUNNING, SHUTDOWN, STOP, TIDYING, TERMINATED) and worker count into a single 32-bit atomic integer: ctl (3 bits for state, 29 bits for worker count).",
        ],
        bulletPoints: [
          "Step 1: If workerCountOf(ctl) < corePoolSize -> invoke addWorker(task, true).",
          "Step 2: If pool is RUNNING and workQueue.offer(task) succeeds -> task buffered.",
          "Step 3: If workQueue was full, check if workerCountOf(ctl) < maximumPoolSize -> invoke addWorker(task, false) to create temporary worker.",
          "Step 4: If addWorker fails (pool saturated) -> invoke reject(task).",
          "Worker.runWorker() Loop: Workers repeatedly call getTask() on the queue. Non-core workers poll with keepAliveTime timeout; if timeout expires and queue is empty, getTask() returns null and the worker terminates.",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs: Saturation Rejection Policies (TRADE-OFFS)",
        paragraphs: [
          "Comparing the 4 built-in RejectedExecutionHandler strategies:",
        ],
        bulletPoints: [
          "CallerRunsPolicy: Runs the task on the submitting thread. Pros: Zero task loss, automatically slows down the caller thread creating natural backpressure. Trade-off: Slows down web server request threads.",
          "AbortPolicy: Throws RejectedExecutionException immediately. Pros: Fails fast, lets callers immediately detect overload and redirect traffic. Trade-off: Drops requests unless caught by retry/circuit-breaker logic.",
          "DiscardOldestPolicy: Drops the oldest unhandled task in the queue and retries execution. Pros: Prioritizes fresh real-time data. Trade-off: Stale tasks vanish without notification.",
          "DiscardPolicy: Silently swallows and drops the task. Warning: Almost never appropriate for business transactions.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Classic production incidents involving Java thread pools:",
        ],
        callout: {
          tone: "warning",
          title: "Critical Thread Pool Incidents",
          body: "1. Unbounded Queue OutOfMemoryError: Using Executors.newFixedThreadPool(20) under downstream database slowdown. Tasks queue up endlessly in LinkedBlockingQueue until the 4 GB JVM Heap crashes with OOM.\n2. Thread Leak via Uncaught Exceptions: If a Runnable task throws an uncaught RuntimeException, the Worker thread terminates. While ThreadPoolExecutor creates a replacement worker, rapid failures cause high thread churn.\n3. Synchronous Deadlock via Subtask Queuing: Submitting parent tasks to a pool that spawn child tasks submitted to the same pool. If parent tasks occupy all core workers and wait for child tasks that are queued behind them, the pool permanently deadlocks!",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Expose Micrometer / Prometheus Metrics: Monitor 'executor.active', 'executor.completed', and 'executor.queue.remaining' to trigger alerts before queue reaches 80% saturation.",
          "2. Graceful Shutdown Hook: Always configure graceful shutdown: executor.shutdown(); followed by executor.awaitTermination(30, TimeUnit.SECONDS); to allow in-flight tasks to finish on SIGTERM.",
          "3. Virtual Threads (Java 21): For lightweight, blocking I/O tasks, consider migrating from pooled platform threads to Executors.newVirtualThreadPerTaskExecutor().",
        ],
      },
    },
    sourceIds: ["jsr-166-concurrency", "jvm-spec-se21"],
    questionIds: ["java-q17-thread-pool-4step-dispatch", "java-q18-thread-pool-rejection-policies"],
  },

  // 11. Java Memory & Concurrency: References & ThreadLocal Leaks
  {
    id: "java-references-threadlocal-leaks",
    slug: "java-references-threadlocal-leaks",
    domainId: "java",
    title: "Java Memory & Concurrency — Reference Types (Strong, Soft, Weak, Phantom) & ThreadLocal Leaks",
    subtitle:
      "ThreadLocalMap entry lifecycle, WeakReference key clearing, pooled worker thread value leaks, and try-finally remove() discipline",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "java-threadlocal-leak",
    keyTerms: [
      {
        term: "ThreadLocal",
        definition:
          "A Java construct providing thread-local variables. Each thread accessing a ThreadLocal instance maintains an independently initialized copy of the variable stored within its internal ThreadLocalMap.",
      },
      {
        term: "WeakReference vs SoftReference",
        definition:
          "SoftReference referents are retained until JVM memory pressure requires reclamation before OOM. WeakReference referents are reclaimed on the very next Garbage Collection cycle once strong links vanish.",
      },
      {
        term: "ThreadLocalMap.Entry",
        definition:
          "An entry in the thread's private map that extends WeakReference<ThreadLocal<?>>. The key is weakly referenced, but the associated value is strongly referenced.",
      },
      {
        term: "ThreadPool Memory Leak",
        definition:
          "The severe production failure mode where worker threads in a pool (e.g., Tomcat) retain strong references to Entry.value across multiple request cycles after the WeakReference key has been collected.",
      },
    ],
    stages: {
      what: {
        heading: "1. Core Architectural Concepts (WHAT)",
        paragraphs: [
          "In multi-threaded backend applications, passing contextual information (e.g., SecurityContext, UserContext, TenantId, Database Transaction) through every method signature creates severe parameter coupling. ThreadLocal solves this by binding variables implicitly to the currently executing thread.",
          "Under the hood, variables are not stored inside the ThreadLocal object itself. Instead, each java.lang.Thread instance contains an internal field: ThreadLocal.ThreadLocalMap threadLocals. The ThreadLocal instance merely acts as an accessor key into this thread-owned hash map.",
        ],
        bulletPoints: [
          "Thread-Bound Storage: Thread.currentThread().threadLocals owns the table; zero synchronization or lock contention between threads.",
          "Java Reference Types: Strong (default), Soft (memory sensitive), Weak (next GC sweep), Phantom (ReferenceQueue post-mortem cleanup).",
          "The WeakReference Asymmetry: ThreadLocalMap.Entry extends WeakReference<ThreadLocal<?>>. The key is weak, but the value is STRONG.",
        ],
      },
      why: {
        heading: "2. Why ThreadLocal Leaks in Production Thread Pools (WHY)",
        paragraphs: [
          "In modern web containers (Tomcat, Jetty, Netty, Undertow), threads are NOT created and destroyed per request. A fixed pool of worker threads (e.g. http-nio-8080-exec-1 to 200) runs continuously for months, servicing millions of requests.",
          "When a request completes, if calling code neglects to invoke threadLocal.remove(), the thread returns to the pool with the Entry still in its threadLocals map. When the ThreadLocal class reference is collected, GC clears the weak key (setting key = null), but the large value (UserContext, Session, ByteBuffers) remains strongly reachable from Thread -> threadLocals -> Entry -> value. The payload can NEVER be collected, accumulating silently until OutOfMemoryError!",
        ],
        bulletPoints: [
          "Permanent Thread Lifetime: Pooled threads live indefinitely; any uncleaned ThreadLocal value survives as long as the JVM process.",
          "ClassLoader Pinning: Leaked contexts frequently hold references to application domain classes, preventing the WebAppClassLoader from being unloaded during redeploy and triggering Metaspace OOM.",
          "Cross-Tenant Data Bleed: An uncleaned ThreadLocal may be read by the NEXT request handled by that same worker thread, leaking user A's data to user B!",
        ],
      },
      how: {
        heading: "3. Implementation Patterns: The Bulletproof Lifecycle (HOW)",
        paragraphs: [
          "The only reliable defense against ThreadLocal memory leaks in thread-pooled environments is strict try-finally discipline or framework interceptors:",
        ],
        codeSnippet: {
          language: "java",
          caption: "Bulletproof ThreadLocal try-finally Lifecycle",
          code: `public class SecurityContextHolder {
    private static final ThreadLocal<UserContext> contextHolder = new ThreadLocal<>();

    public static void setContext(UserContext context) {
        contextHolder.set(context);
    }

    public static UserContext getContext() {
        return contextHolder.get();
    }

    // CRITICAL: Must be called in finally block!
    public static void clear() {
        contextHolder.remove();
    }
}

// In HTTP Filter / Interceptor:
public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
    try {
        SecurityContextHolder.setContext(authenticate(req));
        chain.doFilter(req, res);
    } finally {
        // ALWAYS executed, even if chain throws an unhandled RuntimeException!
        SecurityContextHolder.clear();
    }
}`,
        },
        bulletPoints: [
          "Always Call remove(): Never set(null) instead of remove()! set(null) still retains an Entry in the map; remove() expunges both the key and the table slot.",
          "Servlet Filter / HandlerInterceptor: Bind ThreadLocal setup and cleanup to request interceptors so business developers cannot accidentally forget cleanup.",
          "Scoped Values (Java 21 Preview): Modern Java 21 introduces ScopedValue<T>, an immutable, stack-bounded alternative to ThreadLocal designed specifically for Virtual Threads.",
        ],
      },
      internals: {
        heading: "4. HotSpot JVM Internals: ThreadLocalMap & Expunge Mechanics (INTERNALS)",
        paragraphs: [
          "The internal architecture of ThreadLocalMap reveals why automatic cleanup cannot be relied upon in production:",
        ],
        bulletPoints: [
          "Entry extends WeakReference: static class Entry extends WeakReference<ThreadLocal<?>> { Object value; Entry(ThreadLocal<?> k, Object v) { super(k); value = v; } }.",
          "Linear Probing Hash Table: ThreadLocalMap does not use linked list buckets; it uses linear probing with a power-of-two table size. Hash code increments by the golden ratio constant: HASH_INCREMENT = 0x61c88647.",
          "Stale Slot Expunging (expungeStaleEntry): ThreadLocalMap only cleans entries where (key == null) opportunistically when a collision or resize occurs during get(), set(), or cleanSomeSlots(). If a worker thread remains idle, stale values are NEVER purged!",
        ],
      },
      tradeOffs: {
        heading: "5. Technical Trade-Offs: ThreadLocal vs Explicit Parameters (TRADE-OFFS)",
        paragraphs: [
          "Evaluating when to use ThreadLocal and when to pass context explicitly:",
        ],
        bulletPoints: [
          "ThreadLocal vs Explicit Parameters: ThreadLocal provides clean signatures across architectural layers (e.g. auditing, logging MDC). Trade-off: Hidden dependencies, difficult unit testing, and failure to propagate across asynchronous boundaries (CompletableFuture / parallelStream).",
          "InheritableThreadLocal vs TransmittableThreadLocal: InheritableThreadLocal copies state only upon new thread instantiation. In thread pools where threads are pre-allocated, it fails. Use Alibaba's TransmittableThreadLocal or Spring's TaskDecorator.",
          "ThreadLocal in Virtual Threads: Java 21 Virtual Threads support ThreadLocal, but because applications spawn millions of Virtual Threads, storing heavy state in each virtual thread defeats their lightweight memory advantage.",
        ],
      },
      failureScenarios: {
        heading: "6. Production Failure Modes & Anti-Patterns (FAILURE SCENARIOS)",
        paragraphs: [
          "Real-world production disasters caused by ThreadLocal mismanagement:",
        ],
        callout: {
          tone: "warning",
          title: "Critical ThreadLocal Production Incidents",
          body: "1. Tomcat Redeploy Metaspace OOM: A custom logging ThreadLocal retained references to application classes. When Tomcat reloaded the WAR file, the old WebAppClassLoader could not be GC-collected because worker threads still held entries. After 3 redeploys, JVM crashed with java.lang.OutOfMemoryError: Metaspace.\n2. Cross-Tenant Data Leak: In a multi-tenant SaaS application, request A for Tenant 'Alpha' set TenantContext in a worker thread. Request A threw an exception and bypassed cleanup. Request B for Tenant 'Beta' reused the same worker and read Tenant 'Alpha's context, leaking confidential financial records!\n3. ThreadLocal with CompletableFuture: An engineer expected SecurityContext to be available inside .thenApplyAsync(). Because the async stage executed on a different ForkJoinPool worker, context was null, triggering intermittent authorization failures.",
        },
      },
      productionEngineering: {
        heading: "7. Production Operational Guidelines (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Integrate with SLF4J MDC: When storing trace IDs, always invoke MDC.put(key, val) and guarantee MDC.clear() inside a finally block.",
          "2. Configure TaskDecorator in ThreadPoolTaskExecutor: Use Spring's TaskDecorator to propagate security and tracing contexts across asynchronous thread pool boundaries.",
          "3. Heap Dump Analysis for Leaks: In Eclipse Memory Analyzer (MAT), run the 'Thread Overview' and inspect 'threadLocals' to quickly identify leaked byte arrays and classloader roots.",
        ],
      },
    },
    sourceIds: ["java-lang-ref-spec", "jvm-spec-se21"],
    questionIds: ["java-q19-threadlocal-memory-leak-mechanics", "java-q20-java-reference-types-reachability"],
  },
];
