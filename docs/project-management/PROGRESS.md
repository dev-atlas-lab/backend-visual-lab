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

## Phase 7 — Java Core Curriculum Completion & Interactive Lab Guidance (2026-10-30)
- [x] **Fixed Cross-Domain Navigation Blank Screen Bug**:
  - Identified root cause: synchronous visual projector invocation with stale previous-module state frames when routing between modules.
  - Hardened with 4 defense layers:
    1. Defensive array/state guards across all 10 projector functions in `frontend/src/engines/visualization/projectors.ts`.
    2. Enforced unique React component keys (`key={moduleData.slug}` and `key={moduleData.simulationId}`) in `ModuleReaderPage.tsx`.
    3. Added `ErrorBoundary.tsx` wrapping router `<Outlet />` in `AppShell.tsx` for graceful render crash interception.
    4. Added engine change detection inside `InteractiveWorkbench.tsx` to automatically reinitialize frame tapes.
- [x] **Built Interactive Lab Guidance & Tooltip System**:
  - Added dismissible first-time onboarding banner (`.lab-welcome-callout`) in `InteractiveWorkbench.tsx` introducing transport controls and fault injection.
  - Added dedicated toolbar `[How to Use?]` button with keyboard hints.
  - Built full `LabGuideModal` explaining:
    1. *Controls & Shortcuts*: `Space` (step), `P` (play), `R` (reset), `F` (fullscreen), `1-3` (presets).
    2. *Visual Tone Codes*: Green (normal/in-sync), Amber (warning/rebalance), Red (starvation/deadlock/exception), Blue (active inspection).
    3. *Fault Injection & Actions*: Domain buttons pushing commands into the state machine.
    4. *Lab Missions*: Goal descriptions and automated completion detection.
- [x] **Implemented Java Stream API Simulation Engine** (`java-streams-pipeline`):
  - Created `frontend/src/engines/simulation/java-streams.ts` modeling:
    - Lazy evaluation: zero elements traversed until terminal operation is invoked.
    - Loop fusion: single-pass element traversal across `filter` and `map` with zero intermediate `List` allocations.
    - Short-circuiting: `limit(n)` early termination via `Sink.cancellationRequested()`.
    - Stateful barrier: `sorted()` interrupting loop fusion by requiring upstream buffering before downstream emission.
  - Added visual lane projector `projectJavaStreamsFrameToLanes`.
  - Added custom workbench controls and 2 lab missions in `missions.ts`.
- [x] **Implemented Java CompletableFuture Simulation Engine** (`java-completable-future`):
  - Created `frontend/src/engines/simulation/java-completable-future.ts` modeling:
    - CompletionStage DAG asynchronous orchestration across `ForkJoinPool.commonPool()` and custom thread pools.
    - Thread handoff semantics: non-async inline execution vs `.thenApplyAsync()` executor handoffs.
    - Anti-pattern: `.join()` / `.get()` thread pool starvation deadlock.
    - Exception propagation & `.exceptionally()` fallback circuit resilience.
    - `CompletableFuture.allOf()` non-blocking branch barrier.
  - Added 7-stage learning module `java-completable-future-async` in `modules.ts`.
  - Added 2 scenario assessment questions in `questions.ts`.
  - Added visual lane projector `projectJavaCompletableFutureFrameToLanes`.
  - Added custom workbench controls and 2 lab missions in `missions.ts`.
- [x] **Sequenced Java Core Curriculum in Sidebar**:
  - 1. JVM Memory & GC (`java-memory-heap-stack-gc`)
  - 2. Exceptions & Stack (`java-exceptions-stack-unwinding`)
  - 3. HashMap Treeification (`java-hashmap-treeification`)
  - 4. JMM & Lock Upgrades (`java-concurrency-jmm-locks`)
  - 5. Stream API & Fusion (`java-streams-lazy-evaluation`)
  - 6. Virtual Threads (`java-virtual-threads-loom`)
  - 7. CompletableFuture (`java-completable-future-async`)
- [x] **Full Quality Verification**:
  - Vitest: 37/37 unit tests passing (0 failures).
  - Playwright E2E: 4/4 suites passing, including automated cross-domain navigation without page reload and modal testing.
  - Strict TypeScript (`tsc -b`): 0 errors.
  - Strict ESLint: 0 warnings, 0 errors.
  - Production build (`vite build`): clean bundle output.

## Phase 8 — Java Core Finalization: ConcurrentHashMap, Optional & ThreadPoolExecutor (2026-10-30)
- [x] **Implemented ConcurrentHashMap Simulation Engine** (`java-concurrenthashmap`):
  - Created `frontend/src/engines/simulation/java-concurrenthashmap.ts` modeling:
    - Lock-free atomic `casTabAt` insertions on unpopulated bins with zero monitor overhead.
    - Fine-grained striped bucket locking (`synchronized(binHead)`) on hash collisions while keeping all (N - 1) peer bins 100% accessible.
    - Multi-threaded cooperative table resizing via `ForwardingNode` (`hash = -1 / MOVED`) and `helpTransfer()`.
    - Completely lock-free read operations (`get()`) traversing `volatile Node.val` and `Node.next` references.
  - Added visual lane projector `projectJavaConcurrentHashMapFrameToLanes`.
  - Added 7-stage learning module `java-concurrenthashmap-locking` and 2 assessment questions.
  - Added custom controls and 2 lab missions in `missions.ts`.
- [x] **Implemented Java Optional Simulation Engine** (`java-optional-patterns`):
  - Created `frontend/src/engines/simulation/java-optional.ts` modeling:
    - The Eager Evaluation Hazard: `orElse(expensiveDbQuery())` evaluates unconditionally on cache hits vs lazy `orElseGet(() -> expensiveDbQuery())`.
    - Monadic functional composition (`.map()`, `.filter()`, `.flatMap()`, `.orElseGet()`) eliminating nested null-check pyramids.
    - Code smell sentinel: detecting and flagging `opt.isPresent()` + `opt.get()` anti-pattern.
    - Heap memory footprint: 16-24 byte wrapper box allocation and non-serializable constraint.
  - Added visual lane projector `projectJavaOptionalFrameToLanes`.
  - Added 7-stage learning module `java-optional-functional-patterns` and 2 assessment questions.
  - Added custom controls and 2 lab missions in `missions.ts`.
- [x] **Implemented ThreadPoolExecutor Simulation Engine** (`java-thread-pool-executor`):
  - Created `frontend/src/engines/simulation/java-thread-pool.ts` modeling:
    - Invariant 4-step task dispatching algorithm: Core Worker spawn -> BlockingQueue buffer -> Non-Core Worker spawn -> Saturation Rejection.
    - Saturation Rejection Policies: `AbortPolicy` (fails fast with exception), `CallerRunsPolicy` (natural backpressure on submitting thread), `DiscardPolicy`, `DiscardOldestPolicy`.
    - Worker thread lifecycle: `Worker.runWorker()`, queue polling, and non-core worker termination via `keepAliveTime`.
  - Added visual lane projector `projectJavaThreadPoolFrameToLanes`.
  - Added 7-stage learning module `java-thread-pool-executor` and 2 assessment questions.
  - Added custom controls and 2 lab missions in `missions.ts`.
- [x] **Complete 10-Lesson Sequenced Java Core Curriculum in Sidebar**:
  - 1. JVM Memory & GC (`java-memory-heap-stack-gc`)
  - 2. Exceptions & Stack Unwinding (`java-exceptions-stack-unwinding`)
  - 3. HashMap Treeification (`java-hashmap-treeification`)
  - 4. ConcurrentHashMap (`java-concurrenthashmap-locking`)
  - 5. Java Optional (`java-optional-functional-patterns`)
  - 6. JMM & Lock Upgrades (`java-concurrency-jmm-locks`)
  - 7. ThreadPoolExecutor (`java-thread-pool-executor`)
  - 8. Stream API & Fusion (`java-streams-lazy-evaluation`)
  - 9. Virtual Threads (`java-virtual-threads-loom`)
  - 10. CompletableFuture (`java-completable-future-async`)
- [x] **Quality Verification**:
  - Vitest: 45/45 unit tests passing (100% pass rate).
  - Playwright E2E: 4/4 passing.
  - TypeScript (`tsc -b`): 0 errors.
  - ESLint: 0 warnings, 0 errors.
  - Production build: clean bundle output.

## Phase 9 — Java Deep-Dive: ThreadLocal, WeakReference & Memory Leaks in Thread Pools (2026-10-30)
- [x] **Implemented ThreadLocal & Java Reference Types Simulation Engine** (`java-threadlocal-leak`):
  - Created `frontend/src/engines/simulation/java-threadlocal.ts` modeling:
    - `Thread.threadLocals` table structure: `Entry extends WeakReference<ThreadLocal<?>>` with weak key and strong value.
    - Thread Pool Memory Leak Hazard: Worker threads live indefinitely in pool; when outer strong key reference drops, GC clears the weak key (`key == null`), leaving `Entry.value` strongly reachable indefinitely via `Thread (GC Root) -> threadLocals -> table -> Entry -> value`.
    - Mandatory Remedy: Strict `try { ... } finally { threadLocal.remove(); }` lifecycle completely scrubbing table entries.
    - Reference Types Hierarchy & Reachability:
      1. `StrongReference`: Never collected while reachable from GC root.
      2. `SoftReference`: Survives normal GC; collected only under memory pressure / OutOfMemory hazard.
      3. `WeakReference`: Cleared eagerly on next Garbage Collection cycle once strong references disappear.
      4. `PhantomReference`: Target collected immediately; reference is enqueued in `ReferenceQueue` for post-mortem native/off-heap cleanup.
  - Added visual lane projector `projectJavaThreadLocalFrameToLanes`:
    1. *Worker Threads & ThreadLocalMap*: Visual table showing slots, weak key status (`LIVE` vs `NULL (COLLECTED)`), strong value references, and GC root paths.
    2. *Reference Types Reachability Graph*: Comparing Strong vs Soft vs Weak vs Phantom references and `ReferenceQueue` state.
    3. *Memory Leak Sentinel & GC Telemetry*: Real-time leaked heap meter, stale entries counter, and OOM warning alert.
  - Added 7-stage learning module `java-references-threadlocal-leaks` in `modules.ts`.
  - Added 2 scenario assessment questions (`java-q19-threadlocal-memory-leak-mechanics`, `java-q20-java-reference-types-reachability`) in `questions.ts`.
  - Added custom controls and 2 lab missions in `missions.ts`.
- [x] **Curriculum Integration & Sidebar Sequence (11 Sequential Lessons)**:
  - 1. JVM Memory & GC (`java-memory-heap-stack-gc`)
  - 2. Exceptions & Stack Unwinding (`java-exceptions-stack-unwinding`)
  - 3. HashMap Treeification (`java-hashmap-treeification`)
  - 4. ConcurrentHashMap (`java-concurrenthashmap-locking`)
  - 5. Java Optional (`java-optional-functional-patterns`)
  - 6. JMM & Lock Upgrades (`java-concurrency-jmm-locks`)
  - 7. ThreadPoolExecutor (`java-thread-pool-executor`)
  - 8. Stream API & Fusion (`java-streams-lazy-evaluation`)
  - 9. Virtual Threads (`java-virtual-threads-loom`)
  - 10. CompletableFuture (`java-completable-future-async`)
  - 11. References & ThreadLocal (`java-references-threadlocal-leaks`)
- [x] **Quality Verification**:
  - Vitest: 48/48 unit tests passing (100% pass rate).
  - Playwright E2E: 4/4 passing.
  - TypeScript (`tsc -b`): 0 errors.
  - ESLint: 0 warnings, 0 errors.
  - Production build: clean bundle output.

