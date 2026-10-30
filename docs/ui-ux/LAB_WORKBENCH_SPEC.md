# Shared Lab Workbench Framework Specification
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 5)

---

## 1. Multi-Panel Workbench Architecture

The Interactive Workbench is the heart of Backend Visual Lab. It combines a 60% engineering tool with a 40% structured learning system across 5 coordinated regions:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ [TOPBAR]: Breadcrumb | Dual-Pane View Switcher | Lab Guide | Theme | Keyboard HUD     │
├───────────────────────────────────────────┬───────────────────────────────────────────┤
│         REGION A: LEARNING CONTEXT        │        REGION B: SIMULATION CANVAS        │
│                                           │                                           │
│ • Sticky 7-Stage Pedagogy Stepper         │ • Visual Lanes (3 Domain-Specific Lanes)  │
│   [WHAT->WHY->HOW->INTERNALS->TRADE-OFFS->│ • Animated Node & Packet Transitions      │
│    FAILURES->PRODUCTION]                  │ • Interactive Node Selection              │
│                                           │                                           │
│ • Rich Technical Lesson Content           │───────────────────────────────────────────│
│ • Code Snippets with Copy Action          │         REGION C: STATE INSPECTOR         │
│ • Architecture Comparison Tables          │                                           │
│ • Key Terms Definition Cards              │ • Selected Element Properties             │
│ • Interactive Lab Missions HUD            │ • Protocol Flags & Internal Counters      │
│ • Scenario Assessment Runner              │───────────────────────────────────────────│
│                                           │         REGION D: EVENT TIMELINE          │
│                                           │                                           │
│                                           │ • Step Ledger (Tick, Actor, Action, Tone) │
│                                           │ • Step Back / Forward / Play / Reset      │
│                                           │───────────────────────────────────────────│
│                                           │       REGION E: CONFIG & FAULTS           │
│                                           │                                           │
│                                           │ • Scenario Preset Selector (1-3)          │
│                                           │ • Fault Injection Controls (Crash, Expire)│
│                                           │ • Fidelity Contract Disclosure            │
└───────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 2. Five Coordinated Regions

### Region A: Learning Context
- **7-Stage Pedagogy Navigation**: Sticky anchor bar allowing direct jumping or smooth sequential reading through `WHAT`, `WHY`, `HOW`, `INTERNALS`, `TRADE-OFFS`, `FAILURE SCENARIOS`, and `PRODUCTION ENGINEERING`.
- **Lab Mission Quest HUD**: Actionable tasks with automated detection (e.g. "Trigger Rebalance Storm", "Provoke Lock Contention").
- **Knowledge Assessment Check**: Scenario questions with instant rationale evaluation.

### Region B: Simulation Canvas
- Renders the primary system model across domain-specific lanes (e.g. Partition Topology in Kafka, 8 KB Slotted Page in Postgres, Mark Word in JMM).
- Interactive element selection: Clicking any node highlights its data in the State Inspector.

### Region C: State Inspector
- Key-value inspector displaying runtime properties (e.g. `generationId`, `xmin/xmax`, `carrierThread`, `tenuringAge`, `leakMb`).
- Visual tone badges indicating health (`OK`, `WARN`, `DANGER`).

### Region D: Event Timeline & Controls
- **Transport Controls**:
  - `Step Back` (reverts to previous frame in history).
  - `Play / Pause` (toggles automated tick loop).
  - `Step Forward` (advances state machine by 1 tick).
  - `Reset` (reverts to initial state frame).
- **Step Ledger**: Chronological log of recent state transitions with timestamp and actor tags.

### Region E: Configuration & Fault Injection
- **Scenario Presets**: Pre-scripted tapes modeling healthy states and real-world incidents.
- **Domain Action Buttons**: Push commands directly into the pure state machine (`applyCommand`).
- **Simulation Fidelity**: Discloses modeled behaviors vs educational simplifications.

---

## 3. Responsive Adaptations

| Viewport | Layout Strategy |
| :--- | :--- |
| **Desktop ($\ge 1200px$)** | Full Split Cockpit: 50% Theory Reader on left, 50% Workbench pinned on right. |
| **Laptop ($960px - 1199px$)** | Split Cockpit with collapsible sidebar and compact inspector. |
| **Tablet ($640px - 959px$)** | Stacked view: Simulation Workbench at top, Theory Reader underneath. |
| **Mobile ($< 640px$)** | Tabbed Workbench view (Canvas / Inspector / Timeline / Theory) with floating transport bar. |
