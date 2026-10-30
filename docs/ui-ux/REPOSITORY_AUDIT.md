# Repository Discovery & Architectural Audit
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Role:** Principal Product Designer, Senior Frontend Architect, Staff Frontend Engineer  
**Date:** October 30, 2026  
**Status:** COMPLETE (Phase 0 Audit)

---

## 1. Executive Summary

Backend Visual Lab is an interactive learning and simulation platform for backend engineering. Unlike static documentation sites or video courses, its core differentiator is **deterministic state-machine simulation coupled with domain-specific visual telemetry**.

This audit establishes the baseline architectural state, technical dependencies, layout mechanisms, and interaction boundaries prior to the full product UI/UX redesign and frontend refactoring.

---

## 2. Frontend Framework & Build System

| Dimension | Current Implementation | Architectural Evaluation |
| :--- | :--- | :--- |
| **Runtime / Library** | React 19.3.1 (`react`, `react-dom`) | Modern concurrent React runtime. |
| **Language** | TypeScript 5.9.3 with strict type checking (`tsc -b`) | Strict typing across domain models and simulation state machines. |
| **Bundler / Dev Server** | Vite 6.4.5 with `@vitejs/plugin-react` 5.2.0 | Ultra-fast HMR and Rollup production build (`dist/`). |
| **Schema Validation** | Zod 4.6.7 (`zod`) | Validates `SimulationFidelityContract`, `ContentPack`, modules, questions, and sources. |
| **Icons** | Lucide React 1.61.0 (`lucide-react`) | Consistent stroke-based icon library. |
| **Node.js Environment** | Node `>= 20.19.0` (active: `v22.23.4`) | Native ESM, modern standard APIs. |

---

## 3. Routing & Application Shell

- **Router**: React Router 7.18.4 (`react-router-dom`).
- **Route Manifest** (`frontend/src/main.tsx`):
  - `/`: `CatalogPage` (domain catalog, roadmap, featured labs).
  - `/domains/:domainId/:moduleSlug`: `ModuleReaderPage` (dual-pane interactive workbench + 7-stage learning module).
  - `/progress`: `ProgressPage` (competency radar, module progress, quiz scores, engineering mastery badges).
  - `*`: Redirect to `/`.
- **Application Shell Structure** (`frontend/src/components/layout/AppShell.tsx`):
  - `AppShell`: Scaffolds `Sidebar`, `Topbar`, `ErrorBoundary`, and router `<Outlet />`.
  - Drawer backdrop on mobile (`< 960px`) with focus trapping and `Escape` key handling.
  - Collapsible desktop sidebar via `sidebar-collapsed` CSS class with `localStorage` persistence (`bvl.sidebar-collapsed`).
- **Topbar** (`frontend/src/components/layout/Topbar.tsx`):
  - Hamburger toggle (`.nav-toggle`), breadcrumb trail, keyboard shortcut HUD trigger, theme switcher (`Sun`/`Moon`), audio SFX toggle (`Volume2`/`VolumeX`).

---

## 4. State Management & Data Flow Architecture

1. **Simulation State Machine** (`frontend/src/engines/simulation/`):
   - 100% pure, deterministic state machines with zero DOM, React, or browser window imports.
   - Each engine conforms to `SimulationEngineSpec<TConfig, TState, TCommand, TEvent>`:
     - `createInitialFrame(config)` $\rightarrow$ `SimulationStepFrame<TState, TEvent>`
     - `applyCommand(frame, command)` $\rightarrow$ `SimulationStepFrame<TState, TEvent>`
     - `evaluateInvariants(state)` $\rightarrow$ `SimulationInvariantCheck[]`
     - `presets`: Pre-configured script tapes (`buildPresetTape`).
2. **Visual Projection State**:
   - `frontend/src/engines/visualization/projectors.ts` projects pure simulation frames into `VisualLaneViewModel[]` containing nodes, badges, metrics, and memory gauges.
   - Defensive guards prevent null-pointer dereferences during cross-engine transitions.
3. **Progress Store** (`frontend/src/engines/progress/progress-store.ts`):
   - Reactive pub-sub listener backed by `localStorage` (`bvl.user-progress`).
   - Tracks module completion, stage checkmarks, lab mission milestones, quiz attempts, and computed Experience Points (XP).
4. **Theme Preference**:
   - `localStorage` key `bvl.theme` (`dark` / `light`), synchronizing `data-theme` attribute on `<html>`.

---

## 5. Styling Architecture & Design Tokens

- **CSS Strategy**: Vanilla modular CSS with custom properties (`tokens.css`, `layout.css`, `catalog.css`, `workbench.css`).
- **Existing Semantic Tokens** (`frontend/src/styles/tokens.css`):
  - Color palette: Slate surfaces (`surface-0` through `surface-4`), primary accents (`cyan-500` / `blue-500`), semantic alerts (`ok`, `warn`, `danger`).
  - Typography: System font stack for UI, `ui-monospace` / JetBrains Mono for technical values.
  - Spacing & radius: 4px base grid (`--space-1` through `--space-16`), radius `sm` (4px), `md` (6px), `lg` (8px), `full` (9999px).
- **Current Deficiencies**:
  - Light mode support is implemented, but contrast on technical diagrams and lane cards requires refinement to meet professional standards.
  - Missing unified Command Palette primitives.
  - Responsive layout relies on media-query overrides that need consolidation into a clean responsive grid system.

---

## 6. Testing & Quality Verification

| Test Suite | Tooling | Coverage & Results |
| :--- | :--- | :--- |
| **Unit & Integration** | Vitest 4.1.12 | 48/48 tests passing across all 14 simulation state machines, content pack schemas, and assessment scoring. |
| **E2E & Accessibility** | Playwright 1.64.1 + `axe-core` | 4/4 passing test suites (catalog render, Kafka simulation stepping, quiz grading, cross-domain navigation, WCAG accessibility). |
| **Type Checking** | `tsc -b` | 0 TypeScript errors under strict mode. |
| **Linting** | ESLint 9.39.5 | 0 errors, 0 warnings. |

---

## 7. Audit Conclusions & Architecture Constraints

1. **Simulation Separation Invariant**: UI components must NEVER mutate simulation states directly. All modifications must dispatch commands through `applyCommand` or step along pre-built tapes.
2. **Deterministic Replay Guarantee**: Time-travel scrubbing, stepping forward, and stepping back must consistently yield identical state frames without side effects.
3. **Language Unification**: The entire application must be presented strictly in natural, professional English. Any remaining Vietnamese strings must be migrated.
4. **Adaptive Workbench Framework**: All 14 interactive labs must share a cohesive workspace frame (Context, Canvas, Inspector, Timeline/Controls, Config/Faults) while maintaining their specialized domain visualizations.
