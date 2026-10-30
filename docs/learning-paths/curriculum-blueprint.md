# Learning Paths & Curriculum Blueprint

**Status:** `ACCEPTED`

## 1. Domain Progression Map

```mermaid
flowchart TD
    D1["1. Messaging & Event Streaming\n(Apache Kafka Internals)"]
    D2["2. Caching & Redis\n(Memory, TTL, Stampede, Locks)"]
    D3["3. Databases\n(PostgreSQL B-Tree, MVCC, WAL, Locks)"]
    D4["4. Distributed Systems & Microservices\n(Saga, Circuit Breaker, Rate Limiting, CAP)"]
    D5["5. Backend Design Patterns\n(CQRS, Outbox, Unit of Work, Specification)"]
    D6["6. Production System Design\n(Capacity, Scaling, HA, Multi-Tenancy)"]

    D1 --> D4
    D2 --> D4
    D3 --> D4
    D3 --> D5
    D1 --> D5
    D4 --> D6
    D5 --> D6
```

## 2. MVP Published & Preview Labs

| Module Slug | Domain | Pedagogical Depth | Interactive Simulation Engine | Status |
| :--- | :--- | :--- | :--- | :--- |
| `kafka-consumer-groups-rebalance` | `messaging` | Full 7-Stage Flagship Module + 6 Scenario Questions | `kafkaConsumerGroupSimulation` (Partitions, Consumers, Assignors, Coordinator State Machine) | `VERIFIED` |
| `redis-cache-stampede-ttl` | `caching` | Full 7-Stage Module + 3 Scenario Questions | `redisStampedeSimulation` (Concurrent Workers, TTL Expiry, Stampede Surge vs. Mutex Lock vs. PER) | `VERIFIED` |
| `postgres-btree-mvcc-visibility` | `databases` | Full 7-Stage Module + 3 Scenario Questions | `postgresMvccBtreeSimulation` (8 KB B-Tree Pages, Heap CTIDs, Visibility Map, `xmin`/`xmax` Snapshots) | `VERIFIED` |
