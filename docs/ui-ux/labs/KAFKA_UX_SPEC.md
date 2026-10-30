# Apache Kafka Domain UX Specification
**Domain:** Messaging & Event Streaming (`messaging`)  
**Status:** COMPLETE (Phase 6)

---

## 1. Domain Mental Model & Topology

Kafka simulation focuses on log-centric commit logs, dynamic partition ownership, and consumer group coordination:
- **Brokers & Partitions**: Ordered, immutable commit log partitions ($P0$ through $P5$) assigned to consumers.
- **Consumer Group Lifecycle**: `Stable` $\rightarrow$ `PreparingRebalance` $\rightarrow$ `CompletingRebalance` $\rightarrow$ `Stable`.
- **Rebalance Protocols**:
  - Eager Rebalance: Revokes all partitions across all consumers, causing a global Stop-The-World pause.
  - KIP-429 Cooperative Sticky: Only revokes migrating partitions; unaffected consumers process messages without interruption.

---

## 2. Canvas & Visual Projections

### Lane 1: Topic Partition Topology
- Renders Partitions $P0 \dots P5$ with color-coded ownership badges.
- Displays High Watermark, Log End Offset, and active message lag.

### Lane 2: Consumer Group Members
- Renders active consumers ($C1, C2, C3$) with assigned partition chips.
- Visual status indicators: `HEALTHY (Heartbeat OK)`, `REVOKED`, `CRASHED (Dead)`.

### Lane 3: Group Coordinator & Protocol Telemetry
- Generation ID counter (increments on every successful Join/Sync).
- Stop-The-World Sentinel: Lights up red when partition processing is frozen.
- Assignor comparison pill: `RangeAssignor` vs `CooperativeStickyAssignor`.

---

## 3. Interactive Fault Injection
- `Crash Consumer C3`: Simulates heartbeat timeout or JVM crash, triggering rebalance.
- `Complete Join/Sync`: Advances coordinator phase to resolve partition reassignment.
- `Switch Assignor`: Toggles between Eager and Cooperative Sticky protocols.
