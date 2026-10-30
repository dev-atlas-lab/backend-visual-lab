# Product & Pedagogical Specification — Backend Visual Lab

**Status:** `ACCEPTED`  
**Organization:** [dev-atlas-lab](https://github.com/dev-atlas-lab)  
**Repository:** `backend-visual-lab`

---

## 1. Product Vision

**Backend Visual Lab** is an interactive learning and deterministic simulation platform for Backend Engineering. It transforms opaque distributed systems, database internals, caching mechanisms, and messaging protocols into inspectable, step-by-step interactive laboratories.

### Core Differentiators
1. **Interactive State-Machine Simulations**: Learners do not passively read diagrams; they step forward/backward through protocol transitions, trigger node crashes, expire TTLs, inspect wire events, and observe internal invariants.
2. **Engine-Level Technical Accuracy**: Every simulation is grounded in official specifications (Apache Kafka KIPs, PostgreSQL source/docs, Redis internals) and carries a mandatory **Simulation Fidelity Contract** distinguishing real protocol mechanics from educational simplifications.
3. **7-Stage Pedagogical Pipeline**:
   Every module guides the engineer through:
   $$\text{WHAT} \rightarrow \text{WHY} \rightarrow \text{HOW} \rightarrow \text{INTERNALS} \rightarrow \text{TRADE-OFFS} \rightarrow \text{FAILURE SCENARIOS} \rightarrow \text{PRODUCTION ENGINEERING}$$

---

## 2. Target Audience & Language Policy

- **Target Audience**: Backend Engineers, Distributed Systems Engineers, Software Architects, and Senior Developer Candidates mastering production system internals.
- **Language Policy**:
  - **Learning Prose, Step Narrations, Internals Notes, and Answer Explanations**: Naturalized **Vietnamese** with industry-standard **English technical terminology** preserved (*Partition*, *Offset*, *Consumer Group*, *Rebalance*, *CooperativeStickyAssignor*, *High Watermark*, *MVCC*, *CTID*, *WAL*, *Cache Stampede*).
  - **Assessment Question Stems, Answer Choices, Protocol Identifiers, and Code**: **English**.

---

## 3. Learning Domains Taxonomy

| Domain ID | Title | Core Topics Covered |
| :--- | :--- | :--- |
| `messaging` | **Messaging & Event Streaming** | Apache Kafka, Producer/Consumer/Broker, Topic/Partition/Offset, Consumer Groups & Rebalancing (Eager vs. Cooperative Sticky KIP-429), Replication & ISR, Delivery Semantics, Idempotent Producer, Transactions, Retry & DLQ, Transactional Outbox. |
| `distributed-systems` | **Distributed Systems & Microservices** | Service Discovery, API Gateway, Sync vs. Async Communication, Saga (Choreography vs. Orchestration), Distributed Transactions (2PC), Event-Driven Architecture, Circuit Breaker, Retry/Timeout/Jitter, Bulkhead, Rate Limiting, Distributed Locks, Consistency Models, CAP/PACELC. |
| `databases` | **Databases (PostgreSQL Internals)** | SQL Execution Pipeline, 8 KB Slotted Page & Heap Tuples (`CTID`), B-Tree (`nbtree`) Internals, Seq Scan vs. Index Scan vs. Bitmap Scan vs. Index-Only Scan (Visibility Map), Join Algorithms (Nested Loop, Hash, Merge), MVCC (`xmin`/`xmax`/Snapshots), Isolation Levels & SSI, Locks & Deadlocks, WAL & Checkpoints, Connection Pooling, Sharding/Partitioning. |
| `caching` | **Caching & Redis** | Redis Internal Encodings (`SDS`, `listpack`, `dict`, `skiplist`), Passive + Active TTL Expiration, Approximated LRU/LFU Eviction Policies, Cache-Aside, Write-Through / Write-Behind, Cache Invalidation, Cache Stampede (Mutex Lock / PER), Penetration & Avalanche, Lua Distributed Locks, RDB/AOF Persistence, Replication & Cluster Hash Slots (`16384`). |
| `design-patterns` | **Backend Design Patterns** | Creational/Structural/Behavioral in Backend Systems, Dependency Injection, Repository, Unit of Work, Specification, CQRS, Mediator, Strategy, Decorator, Observer, Chain of Responsibility, Factory, Adapter. |
| `system-design` | **Production System Design** | Requirements & SLO Analysis, Back-of-the-Envelope Capacity Estimation, L4/L7 Load Balancing, Horizontal vs. Vertical Scaling, Database Read Replicas & Sharding, Multi-Tier Caching, Async Queues, CDN & Object Storage, High Availability, Fault Tolerance, Observability (Metrics/Logs/Traces), Multi-Tenancy. |

---

## 4. Non-Goals

- **Not a Static Wiki or Blog**: No module may be published as a wall of text without an interactive simulation/visualization and knowledge checks.
- **Not an Unbounded Code Execution Engine**: The backend sandbox executes strictly parameterized, allowlisted, timeout-bounded database/cache/messaging operations—never arbitrary user shell commands.
- **No Fabricated Fidelity**: Educational models must never claim to be cycle-accurate hardware benchmarks; all simplifications are disclosed via `SimulationFidelityContract`.
