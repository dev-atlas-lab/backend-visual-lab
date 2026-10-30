---
name: kafka-internals
description: >-
  Provides authoritative technical knowledge, protocol specifications, and simulation
  constraints for Apache Kafka (Producers, Brokers, Partitions, Offsets, Consumer Groups,
  Rebalancing, KIP-429 Cooperative Sticky, KIP-848, ISR, Idempotence, Transactions, Outbox).
  Activate this skill when researching, designing, implementing, or reviewing Kafka labs.
---

# Apache Kafka Internals Skill

## 1. Clear Purpose
Ensure 100% protocol and architectural accuracy across all Apache Kafka learning modules, deterministic state machine simulations, and assessment questions in `backend-visual-lab`.

## 2. When to Use It
- Designing or implementing the Kafka Consumer Group & Rebalance simulation, Partition/Offset visualizers, ISR/Replication simulations, Idempotent/Transactional Producer flows, or Retry/DLQ/Outbox labs.
- Performing `/research-topic` or `/review-technical-accuracy` on any Messaging & Event Streaming module.

## 3. Required Technical Knowledge
- **Storage & Log Layout**: Topics split into append-only ordered Partitions (`0..N-1`); segment files (`.log`, `.index`, `.timeindex`); monotonic per-partition `offset` (`Log End Offset (LEO)` vs. `High Watermark (HW)`).
- **Consumer Group Protocol (Classic & KIP-429 / KIP-848)**:
  - `GroupCoordinator` state machine: `Empty` → `PreparingRebalance` → `CompletingRebalance` → `Stable` → `Dead`.
  - Protocol phases: `FindCoordinator` → `JoinGroup` (elects group leader among consumers, increments `generationId`) → `SyncGroup` (leader computes partition assignment via `PartitionAssignor`, coordinator broadcasts to members) → `Heartbeat` loop (`heartbeat.interval.ms` vs. `session.timeout.ms`) + `poll()` loop (`max.poll.interval.ms`).
  - Assignor algorithms: `RangeAssignor` (co-partitioning bias toward low-numbered consumers), `RoundRobinAssignor` (uniform distribution across subscriptions), `StickyAssignor`, and `CooperativeStickyAssignor` (KIP-429 incremental cooperative rebalancing that avoids stop-the-world revocation of unchanged partitions).
- **Replication & Durability**:
  - Leader replica + Follower replicas fetching via `FetchRequest`.
  - `ISR` (In-Sync Replicas) controlled by `replica.lag.time.max.ms`.
  - `acks=0`, `acks=1`, `acks=-1 (all)` paired with broker/topic `min.insync.replicas`. `High Watermark (HW)` is the offset replicated to all members of the current ISR; consumers only read up to `HW` (or `LSO` — Last Stable Offset for `read_committed`).
- **Delivery Semantics & Transactions**:
  - Idempotent Producer (`enable.idempotence=true`): Broker tracks `(ProducerId (PID), Partition, SequenceNumber)` to deduplicate retries across up to 5 `max.in.flight.requests.per.connection`.
  - Transactions (`transactional.id`): `TransactionCoordinator`, `__transaction_state` topic, 2PC protocol with control batch markers (`COMMIT` / `ABORT`), consumer `isolation.level=read_committed` vs `read_uncommitted`.

## 4. Step-by-Step Workflow
1. **Specify Exact Kafka Version & Protocol Baseline**: State clearly whether the simulation models Apache Kafka `3.8.x` (KRaft mode, Classic Group Protocol with `Eager` vs `CooperativeStickyAssignor` KIP-429, or Next-Gen Consumer Rebalance Protocol KIP-848).
2. **Model Explicit State Invariants in Simulations**:
   - Invariant 1 (Single Consumer Ownership per Group): Within a single Consumer Group in `Stable` state, a partition $P_i$ is assigned to **at most one** active consumer member at a given `generationId`.
   - Invariant 2 (Idle Consumers): If `consumers.length > partitions.length`, exactly `consumers.length - partitions.length` consumers receive an empty assignment (`[]`) and remain idle standbys.
   - Invariant 3 (Rebalance Fencing): Any `OffsetCommitRequest` carrying a stale `generationId` (less than the coordinator's active `generationId`) is rejected with `ILLEGAL_GENERATION`.
3. **Separate Eager vs. Cooperative Rebalance Steps**:
   - For **Eager (`Range`/`RoundRobin`)**: Step 1 revokes ALL partitions across all members (`onPartitionsRevoked`); Step 2 (`JoinGroup`/`SyncGroup`) assigns the full new map (`onPartitionsAssigned`).
   - For **Cooperative (`CooperativeStickyAssignor`)**: Rebalance #1 only revokes partitions that must move while unaffected partitions continue processing; Rebalance #2 assigns the revoked partitions to their new owners.
4. **Document Fidelity Contract**: Explicitly list protocol details modeled (`generationId`, `GroupCoordinator` state, assignor math, `HW` vs `LEO`) and educational simplifications (discrete logical ticks instead of wall-clock TCP socket jitter).

## 5. Engineering Constraints
- **Never Claim Cross-Partition Ordering**: Kafka guarantees message ordering **only within a single partition**, never across an entire multi-partition topic.
- **Never Confuse `acks=all` Alone with Zero Data Loss**: Always show that `acks=all` requires `min.insync.replicas >= 2` and `replication.factor >= 3` (with `unclean.leader.election.enable=false`) to survive a broker crash without data loss.
- **Distinguish `session.timeout.ms` from `max.poll.interval.ms`**: Background heartbeat thread checks liveness (`session.timeout.ms`), whereas application processing thread stalls trigger rebalance via `max.poll.interval.ms`.

## 6. Common Mistakes
- **Mistake 1**: Drawing multiple consumers in the *same* Consumer Group reading the *same* partition simultaneously.
- **Mistake 2**: Stating that the Broker `GroupCoordinator` executes the partition assignment algorithm in the Classic protocol (in reality, the `GroupCoordinator` elects a **Consumer Leader** in `JoinGroup`, and that consumer runs the `ConsumerPartitionAssignor` and sends the assignment back in `SyncGroup`; server-side assignment only arrived in KIP-848).
- **Mistake 3**: Claiming `enable.idempotence=true` deduplicates application-level duplicate `send()` calls with new payloads (it only deduplicates network-level producer retries using sequence numbers within a producer session).

## 7. Validation Checklist
- [ ] Does the partition assignment math match official `RangeAssignor`, `RoundRobinAssignor`, and `CooperativeStickyAssignor` formulas for all $(N \text{ partitions}, M \text{ consumers})$ combinations?
- [ ] Does the explanation accurately distinguish Consumer Leader assignment (`SyncGroup`) from `GroupCoordinator` orchestration?
- [ ] Are `generationId`, `High Watermark (HW)`, and `Log End Offset (LEO)` accurately tracked in the state inspector?
- [ ] Are KIP numbers (e.g., KIP-98, KIP-429, KIP-500, KIP-848) cited where relevant?

## 8. References to Authoritative Documentation
- Apache Kafka 3.8 Official Documentation — Design & Implementation: https://kafka.apache.org/documentation/#design
- KIP-98: Exactly Once Delivery and Transactional Messaging: https://cwiki.apache.org/confluence/display/KAFKA/KIP-98+-+Exactly+Once+Delivery+and+Transactional+Messaging
- KIP-429: Kafka Consumer Incremental Rebalance Protocol: https://cwiki.apache.org/confluence/display/KAFKA/KIP-429%3A+Kafka+Consumer+Incremental+Rebalance+Protocol
- KIP-848: The Next Generation of the Consumer Rebalance Protocol: https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol
