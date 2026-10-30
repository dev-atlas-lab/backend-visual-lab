# Contributing & Engineering Governance — Backend Visual Lab

Contributions to **Backend Visual Lab** follow a strict, human-governed engineering lifecycle designed for Google Antigravity agentic collaboration.

---

## 1. Governance Status Lifecycle

Every specification (`docs/requirements/`), visualization design (`docs/visualization/`), ADR (`docs/adr/`), and implementation ticket (`docs/project-management/BACKLOG.md`) must progress through:

$$\text{PROPOSED} \rightarrow \text{DISCUSSION} \rightarrow \text{ACCEPTED} \rightarrow \text{IMPLEMENTED} \rightarrow \text{VERIFIED}$$

### Governance Rules
1. **Human Is the Final Decision-Maker**: Agents may draft proposals (`Status: PROPOSED`), but only the Human Architect can approve transitions to `ACCEPTED` or `VERIFIED`.
2. **No Implementation Without Acceptance**: `/implement-feature` requires an `ACCEPTED` requirement specification or backlog ticket with explicit acceptance criteria.
3. **Read-Only Reviews**: `/review-architecture` and `/review-technical-accuracy` must never modify source code.
4. **Diagnostic QA**: `/run-quality-checks` reports defects transparently and must never silently hide or bypass failing tests.
5. **Mandatory ADRs**: Any change to engine boundaries, state machine contracts, or technology stack requires an ADR in `docs/adr/`.

---

## 2. Antigravity Workflow Commands

Use the project's 8 standard workflow commands in chat:

1. `/research-topic <topic>` — Verify official specs/KIPs/RFCs and author `docs/requirements/<topic>-research.md`.
2. `/design-learning-module <topic>` — Design the 7-stage module (`WHAT` → `PRODUCTION`) and quiz blueprint.
3. `/design-visualization <topic>` — Specify the pure state machine, presets, fidelity contract, and visual projection.
4. `/implement-feature <ticket-or-spec>` — Build pure simulation logic, visual projection, UI, and automated tests.
5. `/review-architecture [scope]` — Perform a read-only architectural boundary and decoupling audit.
6. `/review-technical-accuracy <module>` — Perform a read-only technical accuracy audit against primary specs.
7. `/run-quality-checks [scope]` — Run `typecheck`, `lint`, `test`, `build`, and `test:e2e`.
8. `/update-documentation` — Synchronize `README.md`, `ROADMAP.md`, `PROGRESS.md`, and `BACKLOG.md`.

---

## 3. Definition of Done (DoD) for Learning Modules

A learning module is ready for `VERIFIED` status only when:
- [ ] All 7 pedagogical stages (`WHAT`, `WHY`, `HOW`, `INTERNALS`, `TRADE-OFFS`, `FAILURE SCENARIOS`, `PRODUCTION ENGINEERING`) are complete in naturalized Vietnamese with preserved English technical terms.
- [ ] Its simulation state machine in `frontend/src/engines/simulation/` is 100% pure TypeScript (zero UI imports) and tested in Vitest.
- [ ] Its `SimulationFidelityContract` accurately discloses modeled mechanics vs. educational simplifications.
- [ ] Its interactive workbench supports `Preset Selection`, `Step Forward`, `Step Back`, `Play/Pause`, `Reset`, `Interactive Fault Injection`, and `State Inspection`.
- [ ] Its scenario question bank (English stems/choices + Vietnamese per-option explanations) passes Zod schema validation.
- [ ] All automated checks (`typecheck`, `lint`, `vitest`, `vite build`, `playwright + axe-core`) pass with 0 violations.
