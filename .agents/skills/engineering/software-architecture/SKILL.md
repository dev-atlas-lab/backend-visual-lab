---
name: software-architecture
description: >-
  Enforces modular architecture, engine decoupling (Simulation vs. Visualization),
  ADR documentation, and boundary rules across Backend Visual Lab. Activate this skill
  when designing system components, reviewing module boundaries, creating ADRs, or
  running /review-architecture.
---

# Software Architecture Skill

## 1. Clear Purpose
Enforce clean architectural boundaries across `backend-visual-lab`, guaranteeing that the 6 core platform engines (Learning Content, Visualization, Simulation, Playground, Assessment, Progress Tracking) remain decoupled and that the Java 21 Spring Boot backend adheres strictly to a Modular Monolith architecture.

## 2. When to Use It
- Designing a new subsystem, engine interface, or cross-cutting concern.
- Authoring or updating an Architecture Decision Record (`docs/adr/ADR-XXXX-*.md`).
- Reviewing pull requests or feature implementations via `/review-architecture`.
- Evaluating whether a dependency or abstraction belongs in `domain`, `engines`, `features`, or `backend`.

## 3. Required Technical Knowledge
- **Clean / Hexagonal Architecture**: Pure domain and simulation cores isolated from UI frameworks and I/O adapters.
- **Deterministic Event-Driven State Machines**: Immutable state snapshots, command/event reducers, and replayable event logs.
- **Spring Modulith / Modular Monolith**: Bounded package contexts (`catalog`, `messaging`, `database`, `caching`, `progress`) communicating via well-defined public interfaces or application events rather than cross-package repository access.
- **ADR Conventions**: Michael Nygard ADR format (`Status`, `Context`, `Decision`, `Consequences`, `Trade-offs`).

## 4. Step-by-Step Workflow
1. **Verify Governance Preconditions**: Check whether the architectural change alters core boundaries. If so, draft or update an ADR in `docs/adr/` with `Status: PROPOSED` and request human approval.
2. **Audit Engine Dependency Direction**:
   - `frontend/src/domain/` → depends ONLY on `zod` and pure TypeScript types.
   - `frontend/src/engines/simulation/` → depends ONLY on `frontend/src/domain/`. Zero imports from `react`, `@xyflow/react`, `d3-*`, or `framer-motion`.
   - `frontend/src/engines/visualization/` → projects `SimulationStepFrame` into renderer-ready structures (`VisualProjection`).
   - `frontend/src/features/` & `pages/` → wire Zustand playback controllers, XYFlow/SVG canvases, and UI controls together.
3. **Audit Backend Module Boundaries**:
   - Ensure each top-level package under `com.devatlaslab.bvl.<module>` only exposes DTOs and service interfaces needed by REST controllers or shared orchestration.
   - Do not introduce microservices, distributed service meshes, or separate deployable backend units prematurely.
4. **Verify Dual-Mode Execution Compatibility**:
   - Confirm that any new interactive lab has a working Mode A (in-browser deterministic simulation) before adding optional Mode B (live backend trace execution).

## 5. Engineering Constraints
- **Zero UI Leakage in Simulation Core**: Any import of `react`, `react-dom`, `window`, `document`, `localStorage`, or `@xyflow/react` inside `frontend/src/engines/simulation/` or `frontend/src/domain/` is a hard architectural violation.
- **No Unapproved Dependencies**: Do not add new npm or Maven dependencies without documenting their bundle size, Node/JDK compatibility, and architectural justification.
- **Immutable State Frames**: Simulation reducers must return new state snapshots (or structurally shared clones) so step-backward (`Step Back`) and timeline scrubbing work deterministically without re-executing from tick 0.

## 6. Common Mistakes
- **Mistake 1**: Storing pixel coordinates (`x, y`) or CSS class names directly inside the domain simulation state instead of computing layout in the Visualization Adapter.
- **Mistake 2**: Mixing `setInterval` or `requestAnimationFrame` timers inside the simulation state machine instead of keeping playback scheduling in the UI controller store.
- **Mistake 3**: Making a frontend learning module fail to render when the Spring Boot backend (`localhost:8080`) is offline.

## 7. Validation Checklist
- [ ] Does `grep -rn "from ['\"]react" frontend/src/domain frontend/src/engines/simulation` return 0 matches?
- [ ] Is there an accepted ADR in `docs/adr/` for any non-trivial structural decision?
- [ ] Does the feature work 100% offline in Deterministic Browser Mode?
- [ ] Are all schema contracts validated via Zod at runtime load?

## 8. References to Authoritative Documentation
- Martin Fowler — *Patterns of Enterprise Application Architecture* & *MonolithFirst*: https://martinfowler.com/bliki/MonolithFirst.html
- Spring Modulith Reference Documentation: https://docs.spring.io/spring-modulith/reference/
- Documenting Architecture Decisions (Michael Nygard): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
