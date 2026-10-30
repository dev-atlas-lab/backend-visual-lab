---
name: review-architecture
description: >-
  Executes the /review-architecture workflow in strictly READ-ONLY mode to audit engine
  decoupling (Simulation vs. Visualization), Modular Monolith package boundaries, ADR
  compliance, and dependency hygiene.
---

# Workflow: `/review-architecture`

## 1. Clear Purpose
Perform an objective, read-only architectural review of `backend-visual-lab` to ensure strict adherence to engine boundaries, ADR decisions, and Modular Monolith principles.

## 2. When to Use It
- When the user invokes `/review-architecture [target-scope]`.
- Before approving an architectural change or marking a major milestone `VERIFIED`.

## 3. Preconditions & Required Inputs
- **Preconditions**: **Strictly Read-Only Mode**. The agent MUST NOT modify any application source code (`frontend/src/`, `backend/src/`) during this workflow.
- **Required Inputs**: Target module, directory, or ADR scope (defaults to full repository).

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `software-architecture` and `code-review`.
2. **Audit Simulation vs. Visualization Decoupling**:
   - Inspect `frontend/src/domain/` and `frontend/src/engines/simulation/` to confirm zero imports from `react`, `react-dom`, `@xyflow/react`, `d3-*`, or DOM APIs.
3. **Audit Backend Modular Monolith Boundaries**:
   - Inspect `backend/src/main/java/com/devatlaslab/bvl/` to verify clean separation across `catalog`, `messaging`, `database`, `caching`, `progress`, and `shared`.
4. **Audit ADR & Governance Compliance**:
   - Check that all major architectural decisions are documented in `docs/adr/` with accurate status headers.
5. **Produce Expected Output**:
   - Output a structured **Architecture Review Report** listing verified invariants, boundary violations (if any), and ADR recommendations.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Never edit source code during `/review-architecture`.
- **Common Mistake**: Reporting generic style suggestions instead of concrete boundary and coupling analysis.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] Zero source files modified (`git status` remains clean regarding application code).
  - [ ] Report includes concrete file links and dependency verification output.
- **Human Approval Checkpoint**: Present the Architecture Review Report and wait for human decision on any proposed remediations or ADRs.

## 7. Authoritative References
- `.agents/skills/engineering/software-architecture/SKILL.md`
- `ARCHITECTURE.md`
