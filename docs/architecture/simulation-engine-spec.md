# Simulation Engine Specification

**Status:** `VERIFIED`

## 1. Core Design Invariant
Simulation logic is 100% independent of visualization logic. Every simulation in `frontend/src/engines/simulation/` is a pure TypeScript module operating on immutable state frames:

```ts
export interface SimulationStepFrame<TState, TEvent = SimulationProtocolEvent> {
  tick: number;
  phase: string;
  title: string;
  state: TState;
  events: TEvent[];
  invariants: SimulationInvariantCheck[];
  narration: {
    summaryVi: string;
    internalsNoteVi: string;
    productionWarningVi?: string;
  };
  metrics: Record<string, string | number>;
}
```

## 2. Deterministic Playback Tape
A simulation session holds an ordered array `frames: SimulationStepFrame<TState>[]` and `currentIndex: number`:
- `Step Forward`: increments `currentIndex` (or executes the next command in the active preset).
- `Step Back`: decrements `currentIndex` in $O(1)$ without re-running previous steps.
- `Reset`: resets `currentIndex` to `0` and restores the preset's initial frame tape.
- `Dispatch Interactive Command`: slices `frames[0..currentIndex]`, applies the pure reducer `applyCommand(currentFrame, command, config)`, and appends the resulting frame as the new head.
