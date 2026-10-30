# Repository & Application Discovery Inventory

**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Audit Pass:** Phase 0 — Comprehensive Application Inventory  
**Date:** October 30, 2026  
**Status:** COMPLETE

---

## 1. Application Routing & Page Entry Points

| Route Path | Component | Purpose | Key Content / Features |
| :--- | :--- | :--- | :--- |
| `/` | `CatalogPage` | Explore & Catalog Dashboard | Resume Active Simulation card, Search & Domain filters (All, Java, Messaging, Caching, Databases), 14 Module cards with difficulty, time estimate, key concepts, and interactive launch actions. |
| `/domains/:domainId/:moduleSlug` | `ModuleReaderPage` | Interactive Learning & Simulation Workbench | 7-Stage Curriculum Reader (What &rarr; Production), Key Terms pill list, Interactive Workbench simulation frame with live canvas, inspector, timeline, fault injector, and Scenario Assessment Quiz. |
| `/progress` | `ProgressPage` | Engineering Competency & Progress | Competency Radar chart across 4 engineering domains, module completion statistics, quiz accuracy records, and recently visited simulation history. |
| `/knowledge` | `KnowledgePage` | Knowledge Hub & Assessment Bank | Searchable Key Terms Directory (MVCC, CAS, KIP-429, JMM, etc.), Scenario Assessment Bank challenge runner with immediate explanation rationales, and Authoritative Specification library. |
| `/settings` | `SettingsPage` | Workbench Preferences & Telemetry | Adaptive theme switcher (Light/Dark), Web Audio synthesizer sound FX toggle, comprehensive keyboard shortcuts HUD table, and progress export / reset. |
| `*` | Redirect to `/` | Fallback catch-all | Graceful redirect for invalid paths. |

---

## 2. Interactive Labs Inventory (14 Modules)

| # | Domain | Module Slug | Simulation ID | Visual Projection | Interactive Capabilities |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `java` | `java-memory-heap-stack-gc` | `java-memory-gc` | JVM Heap & Generational Layout | Allocate objects, Survivor space copy, Tenured promotion, Trigger Full GC, Replay execution. |
| 2 | `java` | `java-exceptions-stack-unwinding` | `java-exceptions-stack-unwinding` | JVM Call Stack Frame Hierarchy | Push method frames, throw checked/unchecked exceptions, table catch match, stack unwinding. |
| 3 | `java` | `java-hashmap-treeification` | `java-hashmap-treeification` | Hash Table Buckets & Red-Black Trees | Insert keys, induce hash collisions, bucket threshold treeification (TREEIFY_THRESHOLD = 8), Untreeify. |
| 4 | `java` | `java-concurrenthashmap-locking` | `java-concurrenthashmap` | CAS & Striped Bucket Bin Locks | Compare-And-Swap inserts, synchronized bin locks, concurrent reader non-blocking traverses, resize transfer. |
| 5 | `java` | `java-optional-functional-patterns` | `java-optional-patterns` | Optional Container Box & Monadic Pipeline | Wrap empty/present values, map/flatMap transforms, filter predicates, anti-pattern `.get()` on empty check. |
| 6 | `java` | `java-concurrency-jmm-locks` | `java-concurrency-jmm-locks` | CPU Caches, Cache Lines & JMM Visibility | Volatile writes, acquire/release memory barriers, ReentrantLock uncontended vs contended mutex upgrades. |
| 7 | `java` | `java-thread-pool-executor` | `java-thread-pool-executor` | Core/Max Pool Workers & BlockingQueue | Enqueue tasks, spin up core workers, queue buffer saturation, max worker burst, CallerRuns/Abort rejection. |
| 8 | `java` | `java-streams-lazy-evaluation` | `java-streams-pipeline` | Stream Pipeline Stage DAG & Fusion | Push intermediate ops (filter, map), terminal op trigger, lazy pull traversal, short-circuit termination. |
| 9 | `java` | `java-virtual-threads-loom` | `java-virtual-threads` | Carrier Thread Pool & Virtual Thread Queue | Mount/unmount virtual threads on carrier workers, unpark upon I/O completion, detect synchronized carrier pinning. |
| 10 | `java` | `java-completable-future-async` | `java-completable-future` | Async Pipeline Stage Graph & Worker Pools | ForkJoinPool commonPool vs custom executor, `.thenApply()`, `.thenCompose()`, `.join()` thread starvation alert. |
| 11 | `java` | `java-references-threadlocal-leaks` | `java-threadlocal-leak` | Worker ThreadLocalMap & Reference Graph | ThreadLocal set/get, weak key GC reclamation, dangling strong value leak detection, `remove()` cleanup. |
| 12 | `messaging` | `kafka-consumer-groups-rebalance` | `kafka-consumer-group` | Broker Topic Partitions & Consumer Group | Assign partitions, commit offsets, trigger heartbeat failure, Eager vs CooperativeSticky incremental rebalance. |
| 13 | `caching` | `redis-cache-stampede-ttl` | `redis-stampede` | Redis Key-Value Store & Memory Footprint | Set TTLs, simulate hot-key expiration, cache stampede thundering herd, Mutex lock & XFetch probabilistic mitigation. |
| 14 | `databases` | `postgres-btree-mvcc-visibility` | `postgres-mvcc-btree` | B-Tree Index Pages & 8KB Heap Tuples | Insert records, update with CTID pointer chains, concurrent transactions (xmin/xmax), visibility map, vacuuming. |

---

## 3. Shared Component Inventory

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| `AppShell` | `frontend/src/components/layout/AppShell.tsx` | Master layout wrapper, reactive theme binding (`data-theme`), responsive layout grid, mobile backdrop overlay, Command Palette mount. |
| `Sidebar` | `frontend/src/components/layout/Sidebar.tsx` | Fixed left desktop sidebar / mobile drawer with collapsible domain accordions, navigation links, pedagogy flow links, close button (`X`). |
| `Topbar` | `frontend/src/components/layout/Topbar.tsx` | Global header with mobile hamburger trigger, breadcrumbs, `⌘K` quick search trigger, simulation mode indicator, shortcuts modal trigger, theme toggle. |
| `CommandPalette` | `frontend/src/components/layout/CommandPalette.tsx` | Global `Cmd+K` / `Ctrl+K` searchable dialog with instant lab search, domain filtering, theme toggling, and keyboard navigation (`↑`/`↓`/`Enter`). |
| `InteractiveWorkbench` | `frontend/src/components/workbench/InteractiveWorkbench.tsx` | Simulation execution engine frame with playback controls (play/pause, step forward/backward, reset, speed), timeline slider, inspector tabs, fault injector, fidelity modal, onboarding field guide modal. |
| `AssessmentRunner` | `frontend/src/components/assessment/AssessmentRunner.tsx` | Interactive quiz widget with single-choice and multiple-response evaluation, submission scoring, detailed explanations, and progress saving. |
| `CompetencyRadar` | `frontend/src/components/progress/CompetencyRadar.tsx` | Dynamic SVG radar polygon visualizing mastery across Java, Messaging, Caching, and Databases. |
| `ErrorBoundary` | `frontend/src/components/layout/ErrorBoundary.tsx` | React error boundary capturing unexpected lifecycle errors with user-friendly recovery UI. |

---

## 4. Theme Support

- **Theme Engine:** Pure CSS variables with `data-theme="dark"` (default) and `data-theme="light"` on document root.
- **Dark Theme Tokens:** Anthropic signature warm charcoal palette (`--surface-0: #0b0c0e`, `--surface-1: #121418`, `--surface-2: #181a20`, `--text-primary: #ecebe7`, `--accent: #e2a173`).
- **Light Theme Tokens:** Clean warm paper palette (`--surface-0: #f6f5f1`, `--surface-1: #ffffff`, `--surface-2: #eeece6`, `--text-primary: #18191b`, `--accent: #b05a26`).
- **Persistence:** LocalStorage key `bvl.theme.v1` with system `prefers-color-scheme` fallback.

---

## 5. Existing Responsive Breakpoints

| Breakpoint | File | Rules / Behavior |
| :--- | :--- | :--- |
| `@media (max-width: 1100px)` | `workbench.css` | Workbench grid shifts from two-column (`1fr 380px`) to single-column stacked layout (`1fr`). |
| `@media (max-width: 959px)` | `layout.css` | Desktop sidebar hides off-screen (`transform: translateX(-100%)`); hamburger menu button appears in Topbar; main content padding adjusts; search trigger text hides `⌘K`. |
| `@media (max-width: 640px)` | `layout.css` | Padding tightens to `var(--space-2)`, topbar action buttons collapse or hide labels, breadcrumbs truncate prefix. |

---

## 6. Critical Interaction Flows

1. **Lab Discovery & Execution Flow:**
   - User lands on `/` &rarr; Searches or filters by domain &rarr; Selects a Lab &rarr; Navigates to `/domains/:domainId/:moduleSlug` &rarr; Inspects 7-stage curriculum &rarr; Steps through simulation &rarr; Observes state transitions in Inspector.
2. **Keyboard-Driven Power Flow:**
   - User hits `Cmd+K` / `Ctrl+K` &rarr; Types query (e.g., "MVCC" or "Loom") &rarr; Uses Arrow keys &rarr; Presses Enter &rarr; Instantly navigates to target Lab without clicking.
3. **Assessment & Knowledge Check Flow:**
   - User completes reading & simulation &rarr; Scrolls to Scenario Assessment &rarr; Selects single/multiple choice options &rarr; Submits &rarr; Observes score percentage and reads per-option rationales &rarr; Progress is recorded in LocalStorage.
4. **Theme Toggle Flow:**
   - User clicks Theme button in Topbar, Settings, or Command Palette &rarr; `data-theme` attribute flips instantly without page reload &rarr; All colors, graphs, and inspectors adjust.
