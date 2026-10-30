# ADR-0001: Strict Separation of Simulation Logic and Visualization Logic

- **Status**: `ACCEPTED`
- **Date**: 2026-10-30

## Context
Interactive technical learning platforms often entangle protocol simulation rules (such as Kafka partition assignment or PostgreSQL MVCC visibility evaluation) inside React component state or animation callbacks. This makes deterministic replay, step-backward debugging, unit testing, and cross-renderer reuse impossible.

## Decision
We enforce a strict architectural boundary between:
1. **Simulation Engine (`frontend/src/engines/simulation/`)**: 100% pure TypeScript state machines (`SimulationEngineSpec<TConfig, TState, TCommand>`) with zero imports from `react`, `react-dom`, `@xyflow/react`, `d3-*`, or browser DOM globals.
2. **Visualization Engine (`frontend/src/engines/visualization/`)**: Pure projection adapters that map a `SimulationStepFrame<TState>` into renderer-ready view models (`VisualProjection`).

## Consequences
- **Positive**: Every simulation step is deterministically testable in Vitest in milliseconds, supports $O(1)$ `Step Back` and timeline scrubbing via an immutable frame tape, and can be driven either by in-browser reducers or backend execution traces.
- **Trade-off**: Requires defining explicit TypeScript state/command/frame contracts before building visual components.
