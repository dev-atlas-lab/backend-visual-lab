# Advanced Learning Interactions Specification
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 7)

---

## 1. Scenario Presets
Predefined, reproducible starting points modeled in `SimulationEngineSpec.presets`:
- Every lab exposes at least 2 or 3 curated presets (e.g. `Healthy Baseline`, `Failure Scenario`, `Resilience Remedy`).
- Selecting a preset loads a pre-computed command tape, allowing the user to scrub forward and backward through a real-world incident timeline.

---

## 2. Compare Mode
Enables learners to observe contrasting strategies under identical load:
- Sequential Scan vs B-Tree Index Scan.
- Naive Cache-Aside vs Distributed Mutex Lock.
- Eager Rebalance vs Cooperative Sticky Rebalance.
- Eager `orElse()` vs Lazy `orElseGet()`.
- Thread Pinning (`synchronized`) vs Non-Blocking I/O (`ReentrantLock`).

The UI highlights differences in:
1. Internal state transitions.
2. Latency / I/O block reads.
3. System failure alerts.

---

## 3. Challenge Mode & Interactive Lab Missions
Scenario-based hands-on missions defined in `missions.ts`:
- Each mission defines a specific goal (e.g., "Trigger Stop-The-World Rebalance", "Cause DB Pool Exhaustion").
- Real-time automated verification (`checkCompleted(state)`) evaluates whether the simulation frame satisfies the objective.
- On completion, triggers an audible success chime and increments learner XP.

---

## 4. Deep Dive Progressive Disclosure
To avoid cognitive overload:
- Primary view highlights essential conceptual state (nodes, ownership, status tones).
- Clicking any node opens the deep-dive State Inspector showing raw byte offsets, bit-masks, pointers, and underlying Java/C struct equivalents.
