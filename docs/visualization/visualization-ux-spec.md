# Visualization & Workbench UX Specification

**Status:** `VERIFIED`

## 1. Theme & Visual Hierarchy
- **Default Theme**: Dark (`data-theme="dark"`), with full Light (`data-theme="light"`) and System (`prefers-color-scheme`) switching persisted in `localStorage` (`bvl.theme`).
- **Typography**: `Inter` system stack for prose and UI controls; `JetBrains Mono` for offsets, `generationId`, `CTID (block, item)`, `xmin`/`xmax`, latency metrics, and configuration keys.

## 2. Interactive Lab Workbench Layout
Every simulation workbench renders four synchronized zones:
1. **Scenario & Fault Injection Toolbar**:
   - Curated scenario preset selector (`Eager Rebalance`, `Cooperative Sticky KIP-429`, `Consumer Crash`, etc.).
   - Interactive parameter & chaos buttons (e.g., `+ Add Consumer`, `⚡ Kill Consumer`, `📦 Publish Batch`, `🔄 Switch Assignor`).
2. **Deterministic Playback Bar**:
   - `Reset`, `Step Back`, `Play / Pause`, `Step Forward`, timeline step indicator (`Tick k / N`), and phase badge.
3. **Visual Topology & Structure Stage**:
   - Accessible semantic node/lane visualization with explicit text status badges (`STABLE`, `PREPARING_REBALANCE`, `REVOKED`, `CACHE_HIT`, `STAMPEDE_SURGE`, `VISIBLE_TUPLE`, `DEAD_TUPLE`).
   - Live step narration banner (`summaryVi`, `internalsNoteVi`, and `productionWarningVi`).
4. **Tabbed State & Fidelity Inspector**:
   - **Tab 1 — State & Invariants**: Live entity state table + boolean invariant verification checks (`PASS` / `WARN`).
   - **Tab 2 — Protocol Event Log**: Chronological wire protocol events emitted up to the current tick.
   - **Tab 3 — Fidelity & Assumptions**: Renders the `SimulationFidelityContract` (`Accurate Protocol Behaviors`, `Educational Simplifications`, `Assumptions`, `Unsupported Edge Cases`).
