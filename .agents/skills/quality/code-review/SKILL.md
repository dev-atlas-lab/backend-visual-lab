---
name: code-review
description: >-
  Guides engineering code quality reviews across TypeScript/React frontend and Java/Spring Boot
  backend, checking type safety, immutability, accessibility, bundle hygiene, and test coverage.
  Activate when reviewing code changes or running quality audits.
---

# Code Review Skill

## 1. Clear Purpose
Ensure high code quality, strict typing, clean separation of concerns, accessibility compliance, and zero dead controls across `frontend/` and `backend/`.

## 2. When to Use It
- Reviewing code changes before committing or transitioning a ticket to `VERIFIED`.
- Auditing TypeScript/React components, simulation reducers, and Spring Boot services during `/review-architecture` or `/run-quality-checks`.

## 3. Required Technical Knowledge
- TypeScript 5.9 strict mode, Zod 4 runtime validation, React 19 hooks & lifecycle cleanup, WCAG 2.1 AA accessibility, and Java 21 / Spring Boot 3.4 idioms.

## 4. Step-by-Step Workflow
1. **Check Architectural Boundaries**: Confirm zero UI imports inside `frontend/src/domain/` and `frontend/src/engines/simulation/`.
2. **Audit Type Safety & Immutability**:
   - Reject `any`, unsafe type assertions (`as unknown as ...` without validation), and in-place state mutations.
3. **Audit UI & Accessibility Completeness**:
   - Confirm every rendered button, select, tab, and control is wired to working logic.
   - Verify keyboard navigation, `:focus-visible` styling, semantic headings, and `prefers-reduced-motion` handling.
4. **Audit Error & Storage Resilience**:
   - Confirm `localStorage` access is wrapped in `try/catch` and corrupt payloads recover gracefully.
5. **Audit Automated Test Coverage**:
   - Ensure new simulation branches, UI interactions, and bug fixes have corresponding unit/E2E tests.

## 5. Engineering Constraints
- **Read-Only When Invoked as a Review**: Report defects with file and line links rather than making unrequested silent rewrites.
- **Zero Lint or Type Errors Permitted**: Code with TypeScript or ESLint errors cannot be marked `IMPLEMENTED` or `VERIFIED`.

## 6. Common Mistakes
- **Mistake 1**: Leaving placeholder buttons (e.g., `"Export Trace (Coming Soon)"`) in the UI instead of either implementing them or omitting unbuilt controls.
- **Mistake 2**: Duplicating state in React `useState` when it can be deterministically derived from `currentFrame`.

## 7. Validation Checklist
- [ ] Zero `any` types or ESLint suppressions without explicit justification.
- [ ] Simulation reducers are pure functions with immutable return values.
- [ ] All UI controls are functional, keyboard-accessible, and theme-token compliant.
- [ ] All quality gates (`typecheck`, `lint`, `test`, `build`) pass.

## 8. References to Authoritative Documentation
- `AGENTS.md` — Project Engineering Practices & Constraints
- `ARCHITECTURE.md` — System & Engine Boundaries
