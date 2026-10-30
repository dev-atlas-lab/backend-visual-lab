# Frontend Agent Instructions (`frontend/`)

## 1. Stack & Baseline
- **Framework**: React 19 + TypeScript 5.9 (strict) + Vite 6 + React Router 7 + Zod 4.
- **Node Baseline**: `>=20.19.0` (Node 22 LTS pinned in `.nvmrc`).

## 2. Engine Separation Rules
- `src/domain/`: Zod schemas and pure TypeScript interfaces (`learning-module`, `assessment`, `fidelity`, `progress`). **Zero UI imports.**
- `src/engines/simulation/`: Pure deterministic state machines (`kafka-consumer-group`, `redis-stampede`, `postgres-mvcc-btree`). **Zero React, DOM, XYFlow, or D3 imports.**
- `src/engines/visualization/`: Pure projection adapters mapping `SimulationStepFrame` into view models.
- `src/engines/assessment/`: Deterministic exact-set scorer for `single-choice` and `multiple-response` questions.
- `src/engines/progress/`: Versioned `localStorage` persistence (`bvl.progress.v1`) with corruption recovery.

## 3. UI, Accessibility & Language Standards
- Default theme is `dark` (`data-theme="dark"`), with full `light` and `system` support via `bvl.theme`.
- Every button, preset selector, playback control, fault injector, and inspector tab must work and be keyboard-accessible.
- Prose, step narrations, and answer rationales in naturalized **Vietnamese** with preserved **English** technical terms; assessment question stems and choices in **English**.
