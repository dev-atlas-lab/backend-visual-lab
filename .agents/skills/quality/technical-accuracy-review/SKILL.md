---
name: technical-accuracy-review
description: >-
  Performs strict, read-only technical accuracy audits of learning modules, simulation
  state machines, fidelity disclosures, and assessment answer keys against official protocol
  specifications. Activate when running /review-technical-accuracy.
---

# Technical Accuracy Review Skill

## 1. Clear Purpose
Act as an independent Principal Technical Reviewer to verify that all explanations, simulation state transitions, fidelity contracts, and quiz answer keys in `backend-visual-lab` match real infrastructure behavior and official specifications.

## 2. When to Use It
- Executing `/review-technical-accuracy` on a learning module, simulation engine, or question bank.
- Auditing whether a feature is ready to transition from `IMPLEMENTED` to `VERIFIED`.

## 3. Required Technical Knowledge
- Authoritative domain rules from `kafka-internals`, `redis-internals`, and `postgresql-internals`.
- Fidelity boundary verification (`accurateBehaviors` vs. `simplifications` vs. `assumptions` vs. `unsupportedEdgeCases`).

## 4. Step-by-Step Workflow
1. **Enforce Read-Only Mode**: Do NOT edit files in `frontend/src/` or `backend/src/` during the review.
2. **Audit Simulation State Transitions**:
   - Inspect every state transition in `frontend/src/engines/simulation/<domain>.ts`.
   - Verify that invariants hold at every tick (e.g., Kafka `generationId` monotonic increments on rebalance; Redis TTL expiration state transitions; PostgreSQL `xmin`/`xmax` snapshot visibility rules).
3. **Audit Fidelity Contract Honesty**:
   - Check that any simplified behavior (e.g., synchronous logical ticks, fixed page capacity in visual diagrams) is explicitly declared in `simplifications` or `assumptions`.
4. **Audit Module Prose & Code Snippets**:
   - Check all 7 stages (`WHAT` through `PRODUCTION ENGINEERING`) for subtle misconceptions or ambiguous phrasing.
5. **Audit Assessment Items**:
   - Verify that every question has a single unambiguous correct key (`single-choice` or exact-set `multiple-response`) and that distractor rationales are technically sound.
6. **Produce Structured Audit Report**:
   - Classify findings as `CRITICAL (Technical Inaccuracy)`, `MAJOR (Missing Fidelity Disclosure / Ambiguity)`, or `MINOR (Clarity / Terminology)` with exact file/line links.

## 5. Engineering Constraints
- **Strictly Read-Only on Source Code**: Never silently fix technical bugs during a review; report them clearly and wait for human approval to run `/implement-feature`.
- **Zero Tolerance for Hallucinated Specs**: Every critique or approval must cite specific protocol mechanisms or official docs.

## 6. Common Mistakes
- **Mistake 1**: Rubber-stamping a simulation because its tests pass without checking whether the test expectations themselves reflect real Kafka/Redis/PostgreSQL semantics.
- **Mistake 2**: Editing source code directly during a review turn instead of outputting a review report.

## 7. Validation Checklist
- [ ] All simulation state transitions verified against domain invariants.
- [ ] `SimulationFidelityContract` verified for completeness and honesty.
- [ ] All assessment answer keys and per-option Vietnamese explanations verified.
- [ ] Zero source files modified during the review execution.

## 8. References to Authoritative Documentation
- `.agents/rules/governance.md` — Engineering Governance & Read-Only Review Rules
- Domain Skills: `kafka-internals`, `redis-internals`, `postgresql-internals`
