---
name: technical-research
description: >-
  Guides authoritative technical research, specification verification, source citation
  registration, and fidelity boundary analysis. Activate this skill when researching a
  backend engineering topic, verifying protocol internals, or running /research-topic.
---

# Technical Research Skill

## 1. Clear Purpose
Establish a rigorous, source-grounded research methodology that eliminates technical hallucinations, distinguishes verified protocol behavior from educational models, and produces structured research specifications (`docs/requirements/<topic>-research.md`).

## 2. When to Use It
- Executing the `/research-topic` workflow before designing a new learning module or interactive simulation.
- Verifying specific version behaviors, wire protocol state machines, configuration defaults, or failure edge cases.
- Registering new authoritative sources in `frontend/src/content/sources.ts`.

## 3. Required Technical Knowledge
- **Evidence Hierarchy**:
  1. Primary Specifications, RFCs, KIPs (Kafka Improvement Proposals), JEPs, and official engine documentation (PostgreSQL, Redis, Apache Kafka, Spring).
  2. Official open-source implementation source code (e.g., `apache/kafka`, `postgres/postgres`, `redis/redis`).
  3. Peer-reviewed systems papers (e.g., VLDB, SIGMOD, OSDI, SOSP) and authoritative engineering monographs (e.g., Kleppmann's *Designing Data-Intensive Applications*).
- **Fidelity Classification**: Separating what can be deterministically simulated in discrete logical ticks (`accurateBehaviors`) from what is abstracted (`simplifications`, `assumptions`, `unsupportedEdgeCases`).

## 4. Step-by-Step Workflow
1. **Define Target Scope & Baseline Version**: Pin the exact technology version (e.g., `Apache Kafka 3.8 KRaft`, `PostgreSQL 17`, `Redis 7.4`).
2. **Collect & Verify Primary Sources**: Gather official URLs, document sections, KIP/RFC numbers, and access dates.
3. **Extract the 7 Pedagogical Dimensions**:
   - `WHAT` & `WHY`: Core problem solved and baseline without it.
   - `HOW` & `INTERNALS`: Exact state machine, data structures, wire messages, and invariants.
   - `TRADE-OFFS`: Latency vs. durability, memory vs. CPU, throughput vs. consistency.
   - `FAILURE SCENARIOS`: Process crashes, network partitions, clock drift, slow consumers, thundering herds, deadlocks.
   - `PRODUCTION ENGINEERING`: Critical config knobs, alert metrics, operational pitfalls.
4. **Draft the Fidelity Contract**: Explicitly populate `accurateBehaviors`, `simplifications`, `assumptions`, and `unsupportedEdgeCases`.
5. **Write the Research Specification**: Save to `docs/requirements/<topic>-research.md` with `Status: PROPOSED` and request human review.

## 5. Engineering Constraints
- **Never Invent Protocol Details**: If a sub-behavior is version-dependent or undocumented, record that nuance explicitly rather than guessing.
- **No Uncited Claims**: Every module and question bank entry must reference at least one verified `sourceId` in `sources.ts`.

## 6. Common Mistakes
- **Mistake 1**: Relying on outdated secondary blog posts (e.g., referencing ZooKeeper-based Kafka consumer offsets instead of `__consumer_offsets` and KRaft/KIP-429).
- **Mistake 2**: Over-claiming that a browser state machine is executing actual C/Java kernel syscalls when it is running a deterministic discrete-event model.

## 7. Validation Checklist
- [ ] Pinpoints exact software version and protocol specification.
- [ ] Includes at least 2 primary authoritative sources with URLs and verification dates.
- [ ] Clearly defines state invariants and failure scenarios for simulation modeling.
- [ ] Defines an explicit `SimulationFidelityContract`.

## 8. References to Authoritative Documentation
- Apache Kafka KIP Index: https://cwiki.apache.org/confluence/display/KAFKA/Kafka+Improvement+Proposals
- PostgreSQL Official Documentation: https://www.postgresql.org/docs/current/
- Redis Official Documentation: https://redis.io/docs/latest/
- IETF RFC Editor: https://www.rfc-editor.org/
