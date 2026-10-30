# Architecture Constraints & Non-Negotiable Boundaries
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Scope:** Engineering Governance, Architectural Decoupling & Platform Invariants  
**Status:** COMPLETE (Phase 0 Audit)

---

## 1. Engine Decoupling: Simulation vs Visualization

```
┌────────────────────────────────────────────────────────┐
│            Simulation Engine (Pure TS)                 │
│  - 100% pure deterministic state machines              │
│  - Zero React, DOM, D3, or Canvas imports              │
│  - State + Command -> Next State + Events + Invariants │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ SimulationStepFrame<TState, TEvent>
                            ▼
┌────────────────────────────────────────────────────────┐
│           Visualization Engine (Adapters)              │
│  - Visual Lane Projectors                              │
│  - Node, Edge, Packet, and Metric Models               │
│  - Defensive Array / State Guards                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ VisualLaneViewModel[]
                            ▼
┌────────────────────────────────────────────────────────┐
│            Workbench UI Layer (React 19)               │
│  - InteractiveWorkbench Canvas                         │
│  - State Inspector, Event Timeline, Controls           │
│  - Theme-aware Design Tokens & Accessibility           │
└────────────────────────────────────────────────────────┘
```

### Invariants:
1. **Zero UI Leaks into Simulation**: Files in `frontend/src/engines/simulation/` must NEVER import from React, `react-router-dom`, DOM elements, or visualization libraries.
2. **Pure Determinism**: Given an initial configuration and an identical sequence of commands, the simulation engine MUST produce bit-for-bit identical step frames.
3. **No Direct Mutation**: The UI layer must never mutate simulation state properties directly. All changes occur via `applyCommand` or scripted preset tapes.
4. **Defensive Projection**: Visual projectors in `frontend/src/engines/visualization/projectors.ts` must tolerate missing or transitioning state attributes without throwing uncaught exceptions.

---

## 2. Technical Fidelity & Disclosure Governance

Every simulation engine declares a Zod-validated `SimulationFidelityContract`:
- `accurateBehaviors`: Real protocol/runtime behaviors faithfully modeled (e.g., bitwise hash perturbation in HashMap, cooperative Sticky assignment in Kafka).
- `simplifications`: Pedagogical simplifications made for visual clarity (e.g., logical step ticks vs. wall-clock microseconds, fixed 2-thread worker pool).
- `assumptions`: Explicit environmental preconditions (e.g., permanent pool threads surviving indefinitely).
- `unsupportedEdgeCases`: Explicit boundaries out of scope (e.g., Metaspace heap dump parsing, raw reflection hacks).

The UI must expose this fidelity contract to the learner via a dedicated **Fidelity Disclosure HUD** to maintain complete transparency.

---

## 3. Language & Content Governance

- **English ONLY**: In strict adherence to Non-Negotiable Decision 2.2:
  - All navigation labels, page titles, lab descriptions, lesson paragraphs, inspector headers, metrics, tooltips, validation messages, and error states must be **English**.
  - All assessment question stems, answer choices, and explanatory rationales must be **English**.
  - Industry-standard technical nomenclature must be preserved (*Consumer Group*, *Rebalance*, *CooperativeStickyAssignor*, *MVCC*, *WAL*, *B-Tree*, *Cache Stampede*, *Lock Striping*, *Thread Pinning*).

---

## 4. Theme & Visual Accessibility Constraints

1. **Semantic Token Hierarchy**:
   - Every component must resolve colors through CSS variables defined in `tokens.css`.
   - Never use hardcoded hex colors or arbitrary rgb values in component JSX or styling.
2. **True Adaptive Dual-Theming**:
   - Dark Mode: Layered engineering surfaces (`surface-0` through `surface-4`), high-contrast borders, glowing active accents.
   - Light Mode: Clean technical engineering documentation aesthetic, crisp borders (`#e2e8f0`), legible typography (`#0f172a`), avoiding saturated glare or simple color inversion.
3. **WCAG 2.2 AA Compliance**:
   - Visual status indicators must never rely solely on color (combine color + shape/icon + badge text).
   - All interactive controls must feature visible keyboard focus rings (`:focus-visible`).
   - Dialogs and drawers must implement focus trapping and `Escape` dismissals.

---

## 5. Dual-Mode Execution Architecture

- **Mode A (Deterministic Browser Simulation — Default)**:
  - Runs 100% in the browser. Zero network dependencies. Completely functional offline, on static hosts (Vercel), and in sandboxes without Docker or JVM running.
- **Mode B (Live Backend Sandbox — Optional Future/Live Mode)**:
  - Connects to Spring Boot 3 + PostgreSQL 17 + Redis 7.4 + Kafka 3.8 infrastructure to stream real execution traces into the same visual projection model.
- **Workbench Adaptability**: The frontend workbench layout must be capable of receiving state frames from either Mode A or Mode B seamlessly.
