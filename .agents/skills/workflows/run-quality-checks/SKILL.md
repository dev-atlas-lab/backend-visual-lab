---
name: run-quality-checks
description: >-
  Executes the /run-quality-checks workflow in diagnostic QA mode to run typecheck, ESLint,
  Vitest unit/integration suites, production build, Playwright E2E + axe-core accessibility
  audits, and backend verification.
---

# Workflow: `/run-quality-checks`

## 1. Clear Purpose
Run the complete automated verification suite across `backend-visual-lab` and report an honest, reproducible quality gate summary.

## 2. When to Use It
- When the user invokes `/run-quality-checks [frontend|backend|all]`.
- Before committing changes or transitioning a ticket from `IMPLEMENTED` to `VERIFIED`.

## 3. Preconditions & Required Inputs
- **Preconditions**: **Diagnostic QA Mode**. If a test or check fails, report the exact failure and root cause to the user before silently modifying implementation code.
- **Required Inputs**: Target scope (`frontend`, `backend`, or `all`; defaults to `all`).

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `testing-engineering` and `code-review`.
2. **Execute Frontend Quality Gates**:
   - Run `npm --prefix frontend run typecheck` (`tsc -b`).
   - Run `npm --prefix frontend run lint` (`eslint .`).
   - Run `npm --prefix frontend run test` (`vitest run`).
   - Run `npm --prefix frontend run build` (`tsc -b && vite build`).
   - Run `npm --prefix frontend run test:e2e` (`playwright test` including `axe-core` scans) when browser binaries are available.
3. **Execute Architectural Decoupling Check**:
   - Verify zero UI imports inside `frontend/src/domain/` and `frontend/src/engines/simulation/`.
4. **Execute Backend Quality Gates (Environment-Aware)**:
   - Check if `java` (JDK 21) is installed on the host. If installed, run `./mvnw -f backend/pom.xml test`; if not installed, verify `backend/pom.xml` and Java source structure integrity and explicitly report that JDK 21 runtime execution is deferred to CI/JDK installation.
5. **Produce Expected Output**:
   - Output a structured **Quality Gate Matrix** with command statuses, test counts, bundle sizes, and any detected defects.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: QA checks must NEVER silently fix implementation defects or weaken test assertions to force a green status.
- **Common Mistake**: Claiming a check passed when it was skipped or when `node`/`java` was not on `PATH`.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] All executed commands and exit codes are reported transparently.
  - [ ] Zero silent code edits occurred during the diagnostic run.
- **Human Approval Checkpoint**: If any check fails, present the diagnostic report and ask for approval to apply fixes.

## 7. Authoritative References
- `.agents/skills/engineering/testing-engineering/SKILL.md`
- `.agents/scripts/verify-scaffold.sh`
