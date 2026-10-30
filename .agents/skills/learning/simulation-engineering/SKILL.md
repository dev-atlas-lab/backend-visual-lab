---
name: simulation-engineering
description: >-
  Guides the design and implementation of pure, deterministic, event-driven TypeScript
  simulation state machines in frontend/src/engines/simulation/. Activate this skill
  when building domain simulations, step reducers, scenario presets, or running
  /design-visualization.
---

# Simulation Engineering Skill

## 1. Clear Purpose
Design and build deterministic, step-by-step, replayable simulation state machines in `frontend/src/engines/simulation/` that remain 100% independent of UI rendering logic.

## 2. When to Use It
- Designing state machines, command sets, and transition tables during `/design-visualization`.
- Implementing domain simulation engines (Kafka Consumer Group Rebalance, Redis Cache Stampede & TTL, PostgreSQL B-Tree & MVCC) in `frontend/src/engines/simulation/`.
- Adding interactive chaos/fault injection commands and scenario presets.

## 3. Required Technical Knowledge
- **Deterministic Finite-State & Extended State Machines**:
  - Pure transition signature: `(currentState: TState, command: TCommand, config: TConfig) => SimulationStepResult<TState, TEvent>`
  - History Tape / Event Sourcing: Maintaining an ordered array of `SimulationStepFrame<TState, TEvent>` frames (`frames[0..N]`) and a `currentFrameIndex` pointer so `Step Forward`, `Step Back`, `Seek(tick)`, `Pause/Resume`, `Reset`, and `Replay` are $O(1)$ deterministic index operations.
- **Explicit Invariant Verification**: Every frame computes and exposes domain invariants (e.g., *"No partition is assigned to more than 1 consumer in the same group"*, *"Total cache hits + misses == total completed requests"*).

## 4. Step-by-Step Workflow
1. **Define Domain Types (`TConfig`, `TState`, `TCommand`, `TEvent`)**:
   - Declare strict TypeScript interfaces for configuration parameters, entity states, user/scenario commands, and emitted protocol events.
2. **Implement Scenario Presets (`SimulationPreset<TConfig, TCommand>`)**:
   - Provide curated, multi-step scripted scenarios (e.g., *"Eager Rebalance on Consumer Crash"*, *"Cooperative Sticky Incremental Rebalance"*, *"Cache Stampede vs. Mutex Lock"*, *"Index Scan vs. Seq Scan & MVCC Visibility"*) alongside free-form interactive user commands (`Add Consumer`, `Kill Consumer`, `Publish Batch`, `Expire TTL`).
3. **Implement Pure Step Reducer**:
   - Never mutate `currentState` in place; produce a clean snapshot for the new frame.
   - Generate rich step narration (`summaryVi`, `internalsNoteVi`, `productionWarningVi`) and quantitative `metrics` for each frame.
4. **Declare `SimulationFidelityContract`**:
   - Attach verified `accurateBehaviors`, `simplifications`, `assumptions`, and `unsupportedEdgeCases`.
5. **Write Deterministic Unit Tests**:
   - Test every preset and interactive command in Vitest (`frontend/src/test/simulation.test.ts`).

## 5. Engineering Constraints
- **Zero UI or Browser API Imports**: Files in `frontend/src/engines/simulation/` must NOT import `react`, `@xyflow/react`, `d3-*`, `window`, `document`, or `localStorage`.
- **No Unseeded Randomness or Wall-Clock Calls**: Never call `Math.random()` or `Date.now()` inside a simulation reducer. Use logical `tick` counters and deterministic formulas so replaying a sequence produces the exact same state every time.

## 6. Common Mistakes
- **Mistake 1**: Computing step transitions inside a React `useEffect` or button `onClick` handler instead of dispatching a typed command to the pure simulation engine.
- **Mistake 2**: Making `Step Back` impossible because previous state frames were overwritten instead of appended to the immutable frame tape.
- **Mistake 3**: Omitting explanatory step narration (`narration.summaryVi` / `internalsNoteVi`), leaving the learner watching nodes move without understanding *why* the transition happened.

## 7. Validation Checklist
- [ ] Engine implements `SimulationEngine<TConfig, TState, TCommand, TEvent>` cleanly.
- [ ] Supports `Step Forward`, `Step Back`, `Play/Pause`, `Reset`, `Seek`, `Preset Selection`, and `Interactive Commands`.
- [ ] Exposes live state tree, emitted events, quantitative metrics, and `SimulationFidelityContract`.
- [ ] Covered by deterministic Vitest unit tests verifying state invariants across all steps.

## 8. References to Authoritative Documentation
- `ARCHITECTURE.md` — Section 4: Simulation & Visualization Engine Architecture
- `frontend/src/engines/simulation/types.ts` — Core Simulation Engine Contracts
