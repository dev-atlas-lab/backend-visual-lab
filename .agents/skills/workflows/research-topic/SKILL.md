---
name: research-topic
description: >-
  Executes the /research-topic workflow to investigate official specifications, RFCs, KIPs,
  and engine internals for a backend topic, producing a verified research specification in
  docs/requirements/<topic>-research.md with Status: PROPOSED.
---

# Workflow: `/research-topic`

## 1. Clear Purpose
Conduct authoritative technical research on a Backend Engineering topic before any module or simulation is designed, establishing verified protocol facts, failure modes, and explicit simulation fidelity boundaries.

## 2. When to Use It
- When the user invokes `/research-topic <topic-name>`.
- Before designing any new learning module (`/design-learning-module`) or simulation (`/design-visualization`).

## 3. Preconditions & Required Inputs
- **Preconditions**: None (entry point of the engineering governance pipeline).
- **Required Inputs**:
  1. `topicSlug`: Kebab-case identifier (e.g., `kafka-consumer-groups`, `redis-cache-stampede`, `postgres-btree-mvcc`).
  2. `domainSlug`: Target domain (`messaging`, `distributed-systems`, `databases`, `caching`, `design-patterns`, `system-design`).
  3. `targetVersion`: Baseline engine/protocol version (e.g., `Apache Kafka 3.8`, `Redis 7.4`, `PostgreSQL 17`).

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `technical-research` and the relevant domain skill (`kafka-internals`, `redis-internals`, or `postgresql-internals`).
2. **Gather Primary Sources**: Verify official documentation, KIPs/RFCs, source code algorithms, and academic papers.
3. **Analyze the 7 Pedagogical Dimensions**:
   - Document verified facts for `WHAT`, `WHY`, `HOW`, `INTERNALS`, `TRADE-OFFS`, `FAILURE SCENARIOS`, and `PRODUCTION ENGINEERING`.
4. **Define the Simulation Fidelity Boundary**:
   - Explicitly list `accurateBehaviors`, `simplifications`, `assumptions`, and `unsupportedEdgeCases`.
5. **Write Expected Output**:
   - Create `docs/requirements/<topicSlug>-research.md` with header `Status: PROPOSED`.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Never cite secondary blog posts as authoritative proof of internal protocol behavior.
- **Common Mistake**: Jumping into writing React components or module prose during `/research-topic` instead of stopping at the research specification checkpoint.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] `docs/requirements/<topicSlug>-research.md` exists and carries `Status: PROPOSED`.
  - [ ] Every core claim cites an official documentation URL, KIP, RFC, or source file.
  - [ ] `SimulationFidelityContract` fields are explicitly defined.
- **Human Approval Checkpoint**: Present the research summary and wait for human sign-off to transition `Status: PROPOSED` → `ACCEPTED` before proceeding to `/design-learning-module`.

## 7. Authoritative References
- `.agents/skills/learning/technical-research/SKILL.md`
- `.agents/rules/governance.md`
