---
name: visualization-engineering
description: >-
  Guides the projection of pure simulation state frames into interactive visual diagrams,
  topology canvases (XYFlow / SVG / D3 scales), animated packet flows, and state inspector
  panels in frontend/. Activate when designing or implementing visual components.
---

# Visualization Engineering Skill

## 1. Clear Purpose
Transform pure `SimulationStepFrame` snapshots into clear, high-signal, accessible interactive visualizations (topology graphs, partition matrices, request timelines, B-Tree/Heap page diagrams, and state inspector panels) without coupling domain logic to rendering code.

## 2. When to Use It
- Implementing projection adapters in `frontend/src/engines/visualization/`.
- Building interactive visualization canvases, playback bars, chaos control toolbars, and state inspector panels in `frontend/src/features/visualizations/`.
- Executing `/design-visualization` or `/implement-feature`.

## 3. Required Technical Knowledge
- **Visual Projection Pattern**: Pure projector functions `(frame: SimulationStepFrame<TState, TEvent>) => VisualModel` that calculate node badges, status tones (`healthy`, `warning`, `danger`, `accent`, `muted`), edge highlights, and inspector key-value tables.
- **Accessible SVG & Topology Rendering**: Semantic roles, high-contrast color tokens (`tokens.css`), clear textual status labels alongside color encoding (never rely on color alone), and `prefers-reduced-motion` support.
- **Synchronized Split-View Workbench**:
  1. **Scenario & Parameter Toolbar**: Preset selector + interactive fault/mutation triggers.
  2. **Playback Controller**: `Reset`, `Step Back`, `Play/Pause`, `Step Forward`, `Tick Scrubber`, `Speed Selector`.
  3. **Visual Stage**: Interactive topology / structure diagram + animated step callout banner.
  4. **State & Protocol Inspector**: Tabbed view (`State Inspector`, `Protocol Event Log`, `Fidelity & Assumptions`).

## 4. Step-by-Step Workflow
1. **Design the Projection Adapter (`frontend/src/engines/visualization/`)**:
   - Map domain entities (Brokers, Partitions, Consumers, Cache Keys, Request Workers, B-Tree Pages, Heap Tuples) into strongly typed visual nodes, connections, and metric cards.
2. **Build Semantic Visual Renderers**:
   - Use CSS custom property tokens (`--surface-2`, `--status-ok`, `--status-warn`, `--status-danger`, `--accent-primary`) so every diagram works seamlessly in both Dark and Light themes.
3. **Connect Interactive Controls**:
   - Ensure clicking nodes/tuples or triggering fault buttons updates the simulation frame and highlights the corresponding state in the Inspector panel.
4. **Render the Fidelity Disclosure Tab**:
   - Always render a dedicated **"Fidelity & Assumptions"** panel inside the workbench displaying `accurateBehaviors`, `simplifications`, `assumptions`, and `unsupportedEdgeCases`.

## 5. Engineering Constraints
- **Never Mutate Simulation State in Renderer**: Visualization components are strictly read-only consumers of `currentFrame` and dispatchers of typed `Command` actions.
- **No Unlabeled Icon Buttons**: Every playback button must have visible text or an explicit `aria-label`.
- **Responsive Overflow Handling**: Complex diagrams must sit inside scrollable or responsive containers so they never break mobile (`390px`) page layout.

## 6. Common Mistakes
- **Mistake 1**: Encoding node state (e.g., `Rebalancing` vs `Stable` or `Visible` vs `Dead Tuple`) using only red/green fill colors without a text badge or icon, failing WCAG accessibility.
- **Mistake 2**: Hiding the step narration or wire-protocol event log below the fold where learners cannot see it while stepping through the diagram.

## 7. Validation Checklist
- [ ] Visual state updates deterministically on every `Step Forward`, `Step Back`, `Reset`, and interactive command.
- [ ] Both Dark and Light themes maintain WCAG AA contrast across all diagram nodes and badges.
- [ ] Includes visible text badges for states (not color-only).
- [ ] Displays the `SimulationFidelityContract` clearly in the Inspector.

## 8. References to Authoritative Documentation
- `ARCHITECTURE.md` — Visualization Projection Layer
- WCAG 2.1 SC 1.4.1 (Use of Color) & SC 1.4.11 (Non-text Contrast): https://www.w3.org/WAI/WCAG21/Understanding/
