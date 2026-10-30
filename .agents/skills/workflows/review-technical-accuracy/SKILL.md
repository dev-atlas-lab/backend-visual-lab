---
name: review-technical-accuracy
description: >-
  Executes the /review-technical-accuracy workflow in strictly READ-ONLY mode to audit
  protocol state transitions, fidelity contracts, Vietnamese/English module explanations,
  and assessment answer keys against official specifications.
---

# Workflow: `/review-technical-accuracy`

## 1. Clear Purpose
Verify that every technical claim, simulation state transition, fidelity disclosure, and quiz item in a learning module accurately reflects real infrastructure behavior.

## 2. When to Use It
- When the user invokes `/review-technical-accuracy <module-or-domain>`.
- Before transitioning an `IMPLEMENTED` learning module or simulation to `VERIFIED`.

## 3. Preconditions & Required Inputs
- **Preconditions**: **Strictly Read-Only Mode**. Do NOT modify source files during the audit.
- **Required Inputs**: Target module slug, simulation engine file, or question bank file.

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `technical-accuracy-review` and the corresponding domain skill (`kafka-internals`, `redis-internals`, `postgresql-internals`).
2. **Audit Simulation State Machine**:
   - Verify transition rules, mathematical formulas (e.g., partition assignment, TTL/eviction counters, MVCC visibility rules), and step narrations.
3. **Audit `SimulationFidelityContract`**:
   - Verify that `accurateBehaviors`, `simplifications`, `assumptions`, and `unsupportedEdgeCases` are honest and complete.
4. **Audit Module Content & Question Bank**:
   - Check all 7 pedagogical stages (`WHAT` → `PRODUCTION ENGINEERING`) and verify every question stem, answer key, and per-option Vietnamese rationale.
5. **Produce Expected Output**:
   - Output a structured **Technical Accuracy Audit Report** with severity-graded findings (`CRITICAL`, `MAJOR`, `MINOR`, `VERIFIED`).

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Read-only execution—never silently fix defects in code without reporting them first.
- **Common Mistake**: Overlooking subtle protocol inaccuracies in distractor explanations.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] Every simulation preset and command transition audited against primary specs.
  - [ ] Every question answer key and option explanation verified.
  - [ ] Zero source files modified during the audit.
- **Human Approval Checkpoint**: Present the audit report. If 0 Critical/Major issues exist, request human sign-off to mark the module `VERIFIED`.

## 7. Authoritative References
- `.agents/skills/quality/technical-accuracy-review/SKILL.md`
- `.agents/rules/governance.md`
