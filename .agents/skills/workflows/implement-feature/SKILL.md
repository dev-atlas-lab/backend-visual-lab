---
name: implement-feature
description: >-
  Executes the /implement-feature workflow to build an ACCEPTED learning module, simulation
  engine, visualization component, or backend service with full automated test coverage.
---

# Workflow: `/implement-feature`

## 1. Clear Purpose
Implement an approved (`Status: ACCEPTED`) specification across domain schemas, pure simulation engines, visual projection adapters, UI components, and automated tests.

## 2. When to Use It
- When the user invokes `/implement-feature <feature-or-ticket-id>`.
- Only after the corresponding specification or ticket has reached `Status: ACCEPTED`.

## 3. Preconditions & Required Inputs
- **Preconditions**: Target requirement, visualization spec, or backlog ticket MUST have `Status: ACCEPTED`. Never implement unapproved major architectural changes.
- **Required Inputs**:
  1. Target spec path or ticket ID in `docs/project-management/BACKLOG.md`.
  2. Acceptance criteria defined in the spec/ticket.

## 4. Step-by-Step Execution Workflow
1. **Verify Governance Precondition**: Confirm the target spec/ticket is `ACCEPTED`. Activate `software-architecture`, `react-engineering` (or `spring-boot-engineering`), and `testing-engineering`.
2. **Implement Pure Domain & Simulation Layer First**:
   - Build or update schemas in `frontend/src/domain/` and deterministic state machines in `frontend/src/engines/simulation/`.
   - Write Vitest unit tests verifying all state transitions and invariants.
3. **Implement Visual Projection & Interactive UI**:
   - Build projection adapters in `frontend/src/engines/visualization/` and interactive components in `frontend/src/features/`.
   - Register module content and verified question banks in `frontend/src/content/`.
4. **Run Full Quality Gates**:
   - Run `npm --prefix frontend run typecheck`, `lint`, `test`, `build`, and `test:e2e`.
5. **Update Status**:
   - Mark the spec/ticket as `Status: IMPLEMENTED` (awaiting review/verification before `VERIFIED`).

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Do not leave dead buttons, unimplemented presets, or failing tests.
- **Common Mistake**: Skipping straight to `Status: VERIFIED` without running quality checks and human review.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] All acceptance criteria in the spec/ticket are met.
  - [ ] Zero UI imports exist inside `frontend/src/domain/` or `frontend/src/engines/simulation/`.
  - [ ] `typecheck`, `lint`, `test`, and `build` pass with 0 errors.
- **Human Approval Checkpoint**: Present the implemented feature summary and test results for human review and transition to `VERIFIED`.

## 7. Authoritative References
- `.agents/skills/engineering/react-engineering/SKILL.md`
- `.agents/skills/engineering/testing-engineering/SKILL.md`
