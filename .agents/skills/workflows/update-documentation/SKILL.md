---
name: update-documentation
description: >-
  Executes the /update-documentation workflow to synchronize README.md, SPEC.md,
  ARCHITECTURE.md, ROADMAP.md, DEVELOPMENT.md, ADRs, PROGRESS.md, and BACKLOG.md with the
  verified repository state.
---

# Workflow: `/update-documentation`

## 1. Clear Purpose
Ensure all project documentation, architecture records, roadmaps, and governance logs stay accurate and synchronized with implemented features and test metrics.

## 2. When to Use It
- When the user invokes `/update-documentation`.
- At the conclusion of a scaffold phase, feature implementation, or technical audit.

## 3. Preconditions & Required Inputs
- **Preconditions**: Quality checks have been run so reported metrics (test counts, routes, statuses) are verified facts.
- **Required Inputs**: Summary of completed changes or target documentation files.

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skill**: Read `documentation-maintenance`.
2. **Audit Current Repository State**:
   - Check implemented modules, simulations, question counts, test file counts, and governance statuses.
3. **Update Project Management Logs**:
   - Update `docs/project-management/PROGRESS.md` with date-stamped verification results.
   - Update ticket statuses in `docs/project-management/BACKLOG.md`.
4. **Synchronize Root & Architecture Documentation**:
   - Update `README.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and `docs/adr/` as needed.
5. **Verify Links & Formatting**:
   - Ensure all relative Markdown links and Mermaid diagrams are valid.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Never document planned or unbuilt modules as `IMPLEMENTED` or `VERIFIED`.
- **Common Mistake**: Leaving stale test counts or outdated directory trees in `README.md`.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] `PROGRESS.md`, `BACKLOG.md`, `README.md`, and `ROADMAP.md` agree on statuses and metrics.
  - [ ] All file links resolve cleanly.
- **Human Approval Checkpoint**: Present a concise summary of updated documentation files.

## 7. Authoritative References
- `.agents/skills/quality/documentation-maintenance/SKILL.md`
- `CONTRIBUTING.md`
