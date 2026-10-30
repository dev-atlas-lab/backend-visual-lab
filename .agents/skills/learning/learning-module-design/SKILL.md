---
name: learning-module-design
description: >-
  Guides the pedagogical architecture and authoring of structured 7-stage Backend Visual Lab
  learning modules (WHAT -> WHY -> HOW -> INTERNALS -> TRADE-OFFS -> FAILURE SCENARIOS ->
  PRODUCTION ENGINEERING) in naturalized Vietnamese with preserved English technical terms.
  Activate when designing or authoring curriculum modules or running /design-learning-module.
---

# Learning Module Design Skill

## 1. Clear Purpose
Transform verified technical research into deeply engaging, interactive 7-stage learning modules that build senior-level backend engineering intuition rather than passive textbook definitions.

## 2. When to Use It
- Executing `/design-learning-module` to create a module specification (`docs/requirements/<topic>-module-spec.md`).
- Authoring or updating structured module content in `frontend/src/content/modules/`.
- Writing step-by-step Vietnamese narrations and internals callouts for interactive simulations.

## 3. Required Technical Knowledge
- **The 7-Stage Pedagogical Pipeline**:
  1. `WHAT`: Concise architectural definition and mental model.
  2. `WHY`: What breaks at scale without this mechanism?
  3. `HOW`: End-to-end execution lifecycle and protocol message sequence.
  4. `INTERNALS`: Under-the-hood data structures, memory layout, state machines, and annotated code/config snippets.
  5. `TRADE-OFFS`: Quantitative and qualitative engineering trade-off matrix.
  6. `FAILURE SCENARIOS`: Interactive fault injection cases (crashes, timeouts, stampedes, split-brain, deadlocks) and how the engine recovers or degrades.
  7. `PRODUCTION ENGINEERING`: Battle-tested tuning parameters, SLIs/SLOs, observability metrics, and production runbook rules.
- **Bilingual Technical Style**: Naturalized Vietnamese prose for explanations, analogies, and trade-off discussions, while keeping standard English technical nouns intact (*Broker*, *Partition*, *Offset*, *Consumer Group*, *Rebalance*, *High Watermark*, *MVCC*, *Tuple*, *CTID*, *WAL*, *Cache Stampede*, *TTL*).

## 4. Step-by-Step Workflow
1. **Verify Research Prerequisite**: Confirm the topic research spec is `ACCEPTED` or verified against primary sources.
2. **Design Interactive Checkpoints**: Pair every theoretical section with an observable action in the embedded Simulation Lab (e.g., *"Hãy bấm nút 'Kill Consumer C3' trên bảng điều khiển để quan sát GroupCoordinator chuyển từ trạng thái Stable sang PreparingRebalance"*).
3. **Author Annotated Internals & Code Walk-throughs**: Include real configuration examples (e.g., Kafka `ConsumerConfig`, PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` output, Redis Lua script) with line-by-line explanations.
4. **Author Failure & Production Runbooks**: Detail concrete failure symptoms, root causes, and mitigation steps.
5. **Validate with Zod**: Ensure the module object conforms strictly to `learningModuleSchema` in `frontend/src/domain/learning-module.ts`.

## 5. Engineering Constraints
- **No Wall-of-Text Static Pages**: Every published learning module MUST embed an interactive simulation/visualization workbench and scenario-based knowledge checks.
- **Strict Schema Validation**: Every stage of the 7-stage pedagogy must be populated and validated at runtime load.

## 6. Common Mistakes
- **Mistake 1**: Awkwardly translating standard English protocol states or config keys into Vietnamese (e.g., keep `PreparingRebalance`, `session.timeout.ms`, `READ COMMITTED`, `CTID` in English).
- **Mistake 2**: Writing generic high-level summaries for `INTERNALS` and `PRODUCTION ENGINEERING` instead of concrete byte/offset/page/config details.

## 7. Validation Checklist
- [ ] All 7 pedagogical stages (`WHAT` through `PRODUCTION ENGINEERING`) are complete and substantive.
- [ ] Prose is written in natural Vietnamese with accurate English technical terminology preserved.
- [ ] Directly guides the learner through specific interactive simulation presets and fault injections.
- [ ] Passes Zod `learningModuleSchema` validation with resolved `sourceIds` and `questionIds`.

## 8. References to Authoritative Documentation
- `SPEC.md` — Backend Visual Lab Product & Pedagogical Specification
- `frontend/src/domain/learning-module.ts` — Learning Module Zod Schema Contract
