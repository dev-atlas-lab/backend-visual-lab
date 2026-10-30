---
name: design-learning-module
description: >-
  Executes the /design-learning-module workflow to architect a 7-stage learning module
  (WHAT -> WHY -> HOW -> INTERNALS -> TRADE-OFFS -> FAILURE SCENARIOS -> PRODUCTION
  ENGINEERING) and scenario assessment blueprint in docs/requirements/<topic>-module-spec.md.
---

# Workflow: `/design-learning-module`

## 1. Clear Purpose
Transform an accepted topic research document into a structured 7-stage learning module specification and scenario-based assessment blueprint.

## 2. When to Use It
- When the user invokes `/design-learning-module <topic-name>`.
- After `/research-topic` has been reviewed and approved (`Status: ACCEPTED`).

## 3. Preconditions & Required Inputs
- **Preconditions**: `docs/requirements/<topicSlug>-research.md` exists and is `ACCEPTED` (or explicitly approved by the user).
- **Required Inputs**:
  1. `topicSlug`: Target module slug.
  2. Verified research document in `docs/requirements/<topicSlug>-research.md`.

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `learning-module-design` and `knowledge-assessment`.
2. **Design the 7 Pedagogical Stages**:
   - Outline concrete Vietnamese prose structure, preserved English technical terms, annotated code/config walk-throughs, trade-off comparison matrices, failure runbooks, and production tuning checklists.
3. **Design Interactive Checkpoints**:
   - Define how each stage links to presets and fault-injection actions in the companion simulation lab.
4. **Design Scenario Assessment Blueprint**:
   - Specify at least 4–6 scenario-based questions (both `single-choice` and `multiple-response`) testing real production trade-offs and misconceptions.
5. **Write Expected Output**:
   - Create `docs/requirements/<topicSlug>-module-spec.md` with header `Status: PROPOSED`.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Do not omit any of the 7 stages (`WHAT`, `WHY`, `HOW`, `INTERNALS`, `TRADE-OFFS`, `FAILURE SCENARIOS`, `PRODUCTION ENGINEERING`).
- **Common Mistake**: Designing superficial definition-recall questions instead of multi-variable production scenarios.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] `docs/requirements/<topicSlug>-module-spec.md` exists with `Status: PROPOSED`.
  - [ ] All 7 pedagogical stages have detailed outlines and code/config specifications.
  - [ ] Assessment blueprint covers both single-choice and exact-set multiple-response scenarios.
- **Human Approval Checkpoint**: Present the module specification and wait for human approval (`Status: ACCEPTED`) before proceeding to `/design-visualization` or `/implement-feature`.

## 7. Authoritative References
- `.agents/skills/learning/learning-module-design/SKILL.md`
- `.agents/skills/learning/knowledge-assessment/SKILL.md`
