---
name: testing-engineering
description: >-
  Enforces comprehensive unit, integration, E2E, and WCAG accessibility testing across
  Vitest, React Testing Library, Playwright + axe-core, and JUnit 5 + Testcontainers.
  Activate this skill when writing tests, verifying features, or running /run-quality-checks.
---

# Testing Engineering Skill

## 1. Clear Purpose
Guarantee that every simulation state machine, domain schema, assessment scorer, interactive visualization, and backend sandbox endpoint is verified through deterministic automated tests and zero-violation accessibility scans.

## 2. When to Use It
- Writing unit tests for pure simulation state machines (`frontend/src/test/`).
- Writing component integration tests with React Testing Library (`frontend/src/test/`).
- Writing end-to-end browser and `axe-core` accessibility tests with Playwright (`frontend/tests/e2e/`).
- Writing backend unit and Testcontainers integration tests (`backend/src/test/`).
- Executing `/run-quality-checks`.

## 3. Required Technical Knowledge
- **Vitest 4 + React Testing Library**: Pure reducer testing, user-event interactions (`@testing-library/user-event`), DOM assertions (`@testing-library/jest-dom`).
- **Playwright + Axe-Core (`axe-core`)**: Multi-viewport E2E verification (`1440x900` desktop, `390x844` mobile), theme switching verification (`dark` and `light`), automated WCAG AA scans.
- **JUnit 5 + Mockito + Testcontainers**: Isolated unit testing and ephemeral Docker container integration testing for PostgreSQL, Redis, and Kafka.

## 4. Step-by-Step Workflow
1. **Test Pure Simulation Engines First (Highest Leverage)**:
   - For every simulation (Kafka, Redis, PostgreSQL), test initial state invariants, every command transition (`step()`), edge cases (e.g., removing the last consumer, TTL reaching 0), determinism (same seed + commands = identical frame), and reset/replay fidelity.
2. **Test Schema & Content Registry Integrity**:
   - Verify that all registered learning modules, simulation presets, citations, and question banks pass Zod cross-reference validation (`content-pack` integrity).
3. **Test Interactive Workbench & UI Journeys**:
   - Verify that clicking `Step Forward`, `Step Back`, `Reset`, and switching `Scenario Presets` updates both the visual canvas and the State Inspector panel.
   - Verify Knowledge Check single-choice and multiple-response exact-set scoring and explanation rendering.
4. **Run Playwright E2E + Axe Accessibility Audits**:
   - Scan every primary route in both Dark and Light modes using `axe-core` and assert `violations.length === 0`.

## 5. Engineering Constraints
- **Deterministic Tests Only**: Never use arbitrary `sleep()` or unseeded `Math.random()` in unit or simulation tests. Inject timestamps and seeds explicitly.
- **No Silent Test Skipping**: Never add `.skip` or relax assertions to make a failing check pass.
- **QA Governance Rule**: When running `/run-quality-checks`, report any discovered defects clearly before modifying implementation files.

## 6. Common Mistakes
- **Mistake 1**: Testing implementation details (internal CSS class names) instead of accessible roles, labels, and observable domain state.
- **Mistake 2**: Forgetting to clear `localStorage` between tests in `beforeEach()`, causing cross-test state pollution.
- **Mistake 3**: Skipping `axe-core` scans on interactive modal/drawer states or secondary tabs.

## 7. Validation Checklist
- [ ] Pure simulation state machines have 100% transition coverage in Vitest.
- [ ] Content registry cross-references (module IDs, question IDs, citation IDs) are validated by automated tests.
- [ ] `npm --prefix frontend run test` passes with 0 failures.
- [ ] `npm --prefix frontend run test:e2e` passes with 0 `axe-core` accessibility violations.

## 8. References to Authoritative Documentation
- Vitest Documentation: https://vitest.dev/
- Testing Library Guiding Principles: https://testing-library.com/docs/guiding-principles
- Playwright Test Documentation: https://playwright.dev/docs/intro
- Deque axe-core Rules Description: https://dequeuniversity.com/rules/axe/4.10
