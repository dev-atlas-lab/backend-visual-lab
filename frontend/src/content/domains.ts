import type { DomainCatalogEntry } from "../domain";

export const domainCatalog: DomainCatalogEntry[] = [
  {
    id: "java",
    title: "Java Core & JVM Internals",
    tagline: "Memory Layout, Garbage Collection, Collections, Stream API & Virtual Threads",
    descriptionVi:
      "Làm chủ toàn diện hệ sinh thái Java: Từ kiến trúc JVM Runtime (Stack vs Heap, Metaspace), giải thuật Garbage Collection thế hệ, cấu trúc dữ liệu cốt lõi (HashMap treeification), đến Stream API lười biếng (lazy evaluation) và đột phá Virtual Threads (Project Loom) trong Java 21.",
    status: "Active Interactive Labs",
    topics: [
      "JVM Runtime Memory (Stack Frames, Heap, Metaspace & GC Roots)",
      "Generational Garbage Collection (Eden, Survivor S0/S1, Tenured & STW Pauses)",
      "Java Collections: HashMap Hashing, Collisions & Red-Black Treeification",
      "Java 8+ Functional Interfaces, Lambda & Stream Pipeline Fusion",
      "CompletableFuture & Asynchronous Non-blocking Pipelines",
      "Java 21 Virtual Threads (Project Loom), Carrier Scheduling & Thread Pinning",
    ],
    featuredModuleSlugs: [
      "java-memory-heap-stack-gc",
      "java-hashmap-treeification",
      "java-streams-lazy-evaluation",
      "java-virtual-threads-loom",
    ],
  },
  {
    id: "messaging",
    title: "Messaging & Event Streaming",
    tagline: "Apache Kafka, Event Logs, Consumer Groups & Exactly-Once Semantics",
    descriptionVi:
      "Làm chủ kiến trúc Log-centric, cơ chế phân bổ Partition, giao thức Rebalance (Eager vs Cooperative Sticky KIP-429), ISR Replication, và mẫu thiết kế Transactional Outbox trong Apache Kafka.",
    status: "Active Interactive Labs",
    topics: [
      "Apache Kafka Architecture & Broker Internals",
      "Topic, Partition & Offset Semantics",
      "Consumer Groups & Partition Rebalancing (KIP-429)",
      "Replication, ISR & High Watermark (HW)",
      "Idempotent Producer & Kafka Transactions (2PC)",
      "Dead Letter Queue (DLQ) & Transactional Outbox Pattern",
    ],
    featuredModuleSlugs: ["kafka-consumer-groups-rebalance"],
  },
  {
    id: "caching",
    title: "Caching & Redis",
    tagline: "In-Memory Encodings, Eviction Mechanics, TTL & Stampede Mitigation",
    descriptionVi:
      "Khám phá kiến trúc Single-threaded Event Loop của Redis, cơ chế Passive/Active Expiration, thuật toán xấp xỉ LRU/LFU, các chiến lược dập tắt bão truy vấn (Cache Stampede) và khóa phân tán an toàn.",
    status: "Active Interactive Labs",
    topics: [
      "Redis Object Encodings (SDS, listpack, dict, skiplist)",
      "TTL Expiration (Passive vs Active Sampling)",
      "Memory Eviction Policies (LRU, LFU, maxmemory-samples)",
      "Cache-Aside, Write-Through & Write-Behind",
      "Cache Stampede Mitigation (Mutex Lock vs Probabilistic Early Refresh)",
      "Distributed Locks (SET NX PX + Lua Script) & Fencing Tokens",
    ],
    featuredModuleSlugs: ["redis-cache-stampede-ttl"],
  },
  {
    id: "databases",
    title: "Databases (PostgreSQL Internals)",
    tagline: "8 KB Slotted Pages, B-Tree Indexes, MVCC Snapshots & Isolation Anomalies",
    descriptionVi:
      "Mổ xẻ tầng lưu trữ vật lý của PostgreSQL: Cấu trúc trang đĩa 8 KB, địa chỉ con trỏ CTID, thuật toán duyệt cây B-Tree (nbtree), cơ chế đa phiên bản MVCC (xmin/xmax), và các cấp độ cô lập giao dịch.",
    status: "Active Interactive Labs",
    topics: [
      "8 KB Slotted Page Layout & Heap Tuples (CTID)",
      "B-Tree (nbtree) Index Internals & Page Traversal",
      "Sequential Scan vs Index Scan vs Index-Only Scan (Visibility Map)",
      "MVCC & Snapshot Visibility Rules (xmin, xmax, txid)",
      "Transaction Isolation Levels & Anomalies (Dirty Read, Non-Repeatable Read, Phantom, Write Skew)",
      "Write-Ahead Logging (WAL) & Crash Recovery Checkpoints",
    ],
    featuredModuleSlugs: ["postgres-btree-mvcc-visibility"],
  },
  {
    id: "distributed-systems",
    title: "Distributed Systems & Microservices",
    tagline: "Resilience Patterns, Consensus, Consistency Models & Distributed Transactions",
    descriptionVi:
      "Mô phỏng trực quan các mẫu thiết kế cốt lõi trong hệ thống phân tán: Circuit Breaker, Exponential Backoff có Jitter, Bulkhead, Saga Choreography/Orchestration, và định lý CAP/PACELC.",
    status: "Planned Expansion",
    topics: [
      "Circuit Breaker, Retry with Jitter & Bulkhead Isolation",
      "Distributed Saga (Orchestration vs Choreography)",
      "Two-Phase Commit (2PC) vs Raft Consensus",
      "Rate Limiting Algorithms (Token Bucket, Leaky Bucket, Sliding Window)",
      "CAP & PACELC Trade-off Simulator",
      "Distributed Tracing & Correlation Context Propagation",
    ],
    featuredModuleSlugs: [],
  },
  {
    id: "design-patterns",
    title: "Backend Design Patterns",
    tagline: "Enterprise Patterns, Decoupling & Clean Domain Modeling",
    descriptionVi:
      "Áp dụng các mẫu thiết kế kinh điển vào tầng dịch vụ Backend: CQRS, Unit of Work, Specification, Outbox Pattern, Mediator, và Strategy Pattern giải quyết bài toán nghiệp vụ phức tạp.",
    status: "Planned Expansion",
    topics: [
      "Command Query Responsibility Segregation (CQRS)",
      "Unit of Work & Repository Pattern",
      "Transactional Outbox Pattern with Debezium CDC",
      "Specification Pattern & Dynamic Query Builders",
      "Pipeline & Chain of Responsibility Processing",
      "Strategy & Factory Patterns in Extensible Domain Engines",
    ],
    featuredModuleSlugs: [],
  },
  {
    id: "system-design",
    title: "Production System Design",
    tagline: "Capacity Estimation, High Availability, Scalability & Failure Modes",
    descriptionVi:
      "Phân tích yêu cầu, ước lượng dung lượng định lượng (Back-of-the-envelope), kiến trúc cân bằng tải L4/L7, Sharding cơ sở dữ liệu và thiết kế kiến trúc chịu lỗi cho hệ thống hàng triệu người dùng.",
    status: "Planned Expansion",
    topics: [
      "Quantitative Back-of-the-Envelope Capacity Estimator",
      "L4 (TCP) vs L7 (HTTP) Load Balancing & Consistent Hashing",
      "Database Scaling: Read Replicas vs Range/Hash Sharding",
      "Multi-Tier Caching Architecture (CDN, Gateway, In-Memory)",
      "High Availability, Disaster Recovery & Multi-Region Topology",
      "Production Runbooks & Observability Metrics for Incident Response",
    ],
    featuredModuleSlugs: [],
  },
];
