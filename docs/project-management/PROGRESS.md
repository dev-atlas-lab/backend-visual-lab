# Progress Log — Backend Visual Lab

## Phase 1 & Phase 2 — Research & Architecture Proposal (2026-10-30)
- [x] Inspected `claude-associate-foundations-lab` architecture, design system, language conventions, and quality gates.
- [x] Verified Google Antigravity native customization conventions (`AGENTS.md`, `.agents/skills.json`, `.agents/hooks.json`).
- [x] Produced comprehensive Architecture Proposal (`architecture_proposal.md`).

## Phase 3 — Human Approval (2026-10-30)
- [x] Architecture Proposal approved by Human Architect (`Status: ACCEPTED`).

## Phase 4 — Foundation & MVP Vertical Slice Scaffold (2026-10-30)
- [x] Created repository documentation structure (`AGENTS.md`, `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DEVELOPMENT.md`, `CONTRIBUTING.md`, `docs/adr/ADR-0001..0005`).
- [x] Created Google Antigravity native customizations in `.agents/`:
  - [x] `.agents/hooks.json` + `.agents/scripts/safety-check.sh`
  - [x] `.agents/skills.json` + `.agents/rules/governance.md`
  - [x] 15 Tier-1 MVP Essential Skills (`software-architecture`, `react-engineering`, `spring-boot-engineering`, `testing-engineering`, `kafka-internals`, `redis-internals`, `postgresql-internals`, `technical-research`, `learning-module-design`, `simulation-engineering`, `visualization-engineering`, `knowledge-assessment`, `technical-accuracy-review`, `code-review`, `documentation-maintenance`).
  - [x] 8 Reusable Workflow Skills (`research-topic`, `design-learning-module`, `design-visualization`, `implement-feature`, `review-architecture`, `review-technical-accuracy`, `run-quality-checks`, `update-documentation`).
- [x] Created `docker-compose.yml` (PostgreSQL 17, Redis 7.4, Apache Kafka 3.8 KRaft) and `backend/` Java 21 + Spring Boot 3.4 Modular Monolith scaffold.
- [x] Created `frontend/` React 19 + TypeScript 5.9 + Vite 6 application with decoupled Simulation Engine, Visualization Workbench, 3 interactive labs (Kafka Consumer Groups, Redis Cache Stampede, PostgreSQL B-Tree & MVCC), Assessment Engine, and Progress Tracking.

## Phase 5 — Java Core & JVM Internals Curriculum (2026-10-30)
- [x] Designed and integrated the **Java Core & JVM Internals** (`java`) domain into catalog and type definitions.
- [x] Implemented comprehensive 7-stage learning modules organized in strict pedagogical sequence:
  - **Module 1**: `java-memory-heap-stack-gc` (Stack Frames, Young Gen Eden & Survivor S0/S1, Tenuring Age Threshold, GC Roots reachability, and Minor/Full GC).
  - **Module 2**: `java-exceptions-stack-unwinding` (Throwable hierarchy, Checked vs Unchecked vs Error, JVM Exception Table `(from, to, target, type)`, Stack Unwinding `athrow`, and Try-with-Resources AutoCloseable suppressed exceptions).
  - **Module 3**: `java-hashmap-treeification` (Bitwise perturbation `(h ^ (h >>> 16))`, `(n - 1) & hash` slot mapping, collision handling, `TREEIFY_THRESHOLD = 8`, and power-of-two resize doubling).
  - **Module 4**: `java-concurrency-jmm-locks` (JMM JSR-133 Memory Model, volatile visibility & CPU memory barriers, HotSpot 64-bit Mark Word lock inflation: Unlocked -> Biased -> Lightweight CAS -> Heavyweight ObjectMonitor OS mutex).
  - **Module 5**: `java-streams-lazy-evaluation` (Stream API pipeline architecture, Spliterator, Lazy evaluation, Loop Fusion, short-circuiting, and `ForkJoinPool.commonPool()` thread starvation pitfalls).
  - **Module 6**: `java-virtual-threads-loom` (Java 21 JEP 444 Project Loom, M:N user-mode threads, Continuation yield on blocking socket/DB I/O, OS Carrier thread scheduling, and `synchronized` block Thread Pinning hazards).
- [x] Created 5 pure, deterministic in-browser TypeScript simulation state machines:
  - `frontend/src/engines/simulation/java-memory-gc.ts`
  - `frontend/src/engines/simulation/java-exceptions.ts`
  - `frontend/src/engines/simulation/java-hashmap.ts`
  - `frontend/src/engines/simulation/java-concurrency.ts`
  - `frontend/src/engines/simulation/java-virtual-threads.ts`
- [x] Created visual lane projectors in `frontend/src/engines/visualization/projectors.ts` and interactive workbench controls in `frontend/src/pages/ModuleReaderPage.tsx`.
- [x] Authored 12 scenario-based assessment questions with English stems/choices and detailed Vietnamese rationales.
- [x] Sequenced and numbered all curriculum learning pathways in Sidebar navigation and domain registries for progressive, structured pedagogy.
- [x] Verified full Vitest unit test coverage (29 passing tests), Playwright E2E & axe-core accessibility checks (3/3 passing), strict TypeScript compilation (`tsc -b`), and zero-defect ESLint production build.

## Phase 6 — UI/UX Observability Cockpit & Interactive Playground Enhancement (2026-10-30)
- [x] **Dual-Pane Cockpit Layout**: Built split-screen workspace with responsive viewport switcher (Dual-Pane Split Cockpit vs Single Column Focused Reading) keeping the Interactive Workbench pinned side-by-side with 7-stage lesson theory.
- [x] **Sticky 7-Stage Pedagogy Stepper**: Integrated frosted-glass progress bar with smooth anchor scrolling and `IntersectionObserver` active stage tracking.
- [x] **Interactive Lab Missions & Challenges**: Designed actionable quest HUD across all 8 simulation engines (`kafka-consumer-group`, `redis-stampede`, `postgres-mvcc-btree`, `java-memory-gc`, `java-hashmap-treeification`, `java-virtual-threads`, `java-exceptions-stack-unwinding`, `java-concurrency-jmm-locks`) with automatic completion verification.
- [x] **Web Audio API Micro-Sound Synthesizer**: Implemented pure synthesized mechanical clicks, simulation step ticks, mission success chimes, and failure warning tones with Topbar audio toggle.
- [x] **Engineering Shortcuts HUD**: Added keyboard controls (`Space` to Step, `P` to Play/Pause, `R` to Reset, `F` for Fullscreen Lab, `1-3` for Scenario Presets) and keyboard shortcuts modal.
- [x] **Competency Radar & Engineer Mastery**: Built pure SVG 6-axis Competency Hexagon, Experience Point (XP) leveling progression, and 6 Engineering Mastery Badges on `ProgressPage.tsx`.
- [x] **Blueprint Dot-Grid Aesthetic**: Applied subtle `radial-gradient` engineering background grid, card hover glows, and tabular figures for telemetry readability.
