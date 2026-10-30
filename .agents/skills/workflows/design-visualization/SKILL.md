---
name: design-visualization
description: >-
  Executes the /design-visualization workflow to specify the deterministic simulation state
  machine (TConfig, TState, TCommand, TEvent), transition invariants, fidelity contract, and
  visual projection layout in docs/visualization/<topic>-sim-spec.md.
---

# Workflow: `/design-visualization`

## 1. Clear Purpose
Design the complete deterministic simulation state machine and visual projection specification for an interactive lab, strictly separating simulation logic from UI rendering.

## 2. When to Use It
- When the user invokes `/design-visualization <topic-name>`.
- Before implementing a new interactive simulation or visualization workbench.

## 3. Preconditions & Required Inputs
- **Preconditions**: Verified research or module specification for `<topicSlug>`.
- **Required Inputs**:
  1. `topicSlug`: Target simulation identifier.
  2. Domain invariants and failure scenarios from `docs/requirements/`.

## 4. Step-by-Step Execution Workflow
1. **Activate Required Skills**: Read `simulation-engineering`, `visualization-engineering`, and the relevant domain skill (`kafka-internals`, `redis-internals`, `postgresql-internals`).
2. **Specify Pure State Machine Contracts**:
   - Define TypeScript interfaces for `TConfig`, `TState`, `TCommand`, and `TEvent`.
   - Define the deterministic state transition table and mathematical invariants enforced on every tick.
3. **Design Curated Presets & Fault Injectors**:
   - Define at least 2–3 scripted multi-step presets (happy path + failure/recovery path) and interactive user commands.
4. **Specify Visual Projection & Inspector Panels**:
   - Map `TState` entities to visual canvas nodes/edges/tables and define the 3 inspector tabs (`Live State`, `Protocol Event Log`, `Fidelity & Assumptions`).
5. **Write Expected Output**:
   - Create `docs/visualization/<topicSlug>-sim-spec.md` with header `Status: PROPOSED`.

## 5. Engineering Constraints & Common Mistakes
- **Constraint**: Simulation state (`TState`) must never contain DOM references, pixel coordinates, or React component instances.
- **Common Mistake**: Designing an animation-only visualization that cannot step backward (`Step Back`), pause, inspect internal variables, or mutate parameters.

## 6. Validation Criteria & Human Approval Checkpoint
- **Validation Criteria**:
  - [ ] `docs/visualization/<topicSlug>-sim-spec.md` exists with `Status: PROPOSED`.
  - [ ] State machine types (`TConfig`, `TState`, `TCommand`, `TEvent`) and invariants are explicitly specified.
  - [ ] `SimulationFidelityContract` is complete and accurate.
- **Human Approval Checkpoint**: Present the simulation & visualization specification and wait for human approval (`Status: ACCEPTED`) before running `/implement-feature`.

## 7. Authoritative References
- `.agents/skills/learning/simulation-engineering/SKILL.md`
- `.agents/skills/learning/visualization-engineering/SKILL.md`
