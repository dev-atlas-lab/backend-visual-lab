# Design System Specification — Backend Visual Lab
**Design Language:** Premium Dark/Light Engineering Workbench  
**Status:** COMPLETE (Phase 2)

---

## 1. Design Direction & Aesthetic Philosophy

Backend Visual Lab delivers an aesthetic modeled after professional engineering workbenches:
- **Clarity over Clutter**: Low visual noise, crisp boundaries, monospaced tabular figures for telemetry.
- **Layered Spatial Depth**: Subtle elevations (`surface-0` through `surface-4`) with glassmorphism overlays and fine 1px borders (`rgba(255,255,255,0.08)` dark / `rgba(0,0,0,0.08)` light).
- **Engine-Grade Density**: Compact padding, high information density, dedicated status dots, and telemetry pills.
- **Dual-Theme Parity**: Light Mode and Dark Mode are treated as first-class citizens. Dark mode uses slate/obsidian backgrounds; light mode uses crisp documentation surfaces with high-contrast text and warm neutral borders.

---

## 2. Semantic Design Tokens

### 2.1 Color Palette & Surface Tokens

| Token Name | Dark Mode Value | Light Mode Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--surface-0` | `#090d16` (Deep Obsidian) | `#f8fafc` (Slate 50) | App canvas / root background |
| `--surface-1` | `#0f172a` (Slate 900) | `#ffffff` (Pure White) | Primary cards, panels, sidebar |
| `--surface-2` | `#1e293b` (Slate 800) | `#f1f5f9` (Slate 100) | Secondary surfaces, hover states |
| `--surface-3` | `#334155` (Slate 700) | `#e2e8f0` (Slate 200) | Inset inputs, tabs, badge backgrounds |
| `--surface-4` | `#475569` (Slate 600) | `#cbd5e1` (Slate 300) | Active highlights, elevated tags |
| `--text-primary` | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) | Headings, primary labels, values |
| `--text-secondary` | `#94a3b8` (Slate 400) | `#475569` (Slate 600) | Body copy, descriptions, icons |
| `--text-tertiary` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Metadata, timestamps, placeholders |
| `--border-subtle` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Outer cards, divider lines |
| `--border-strong` | `rgba(255,255,255,0.18)` | `rgba(0,0,0,0.18)` | Focused inputs, card borders on hover |
| `--accent` | `#38bdf8` (Sky 400) | `#0284c7` (Sky 600) | Interactive links, active tab lines |
| `--accent-subtle` | `rgba(56,189,248,0.12)` | `rgba(2,132,199,0.10)` | Active pills, selection backgrounds |
| `--ok` | `#10b981` (Emerald 500) | `#059669` (Emerald 600) | Healthy, in-sync, passing assertions |
| `--warn` | `#f59e0b` (Amber 500) | `#d97706` (Amber 600) | Rebalance in progress, cache stale |
| `--danger` | `#ef4444` (Rose 500) | `#dc2626` (Rose 600) | Starvation, deadlocks, memory leaks |
| `--focus-ring` | `rgba(56,189,248,0.4)` | `rgba(2,132,199,0.4)` | Visible keyboard outline (:focus-visible) |

---

## 3. Typography Hierarchy

- **UI Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif`.
- **Code & Telemetry Font Stack**: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`.

| Role | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Display Heading (H1)** | UI | `1.75rem` (28px) | 700 (Bold) | 1.2 |
| **Section Heading (H2)** | UI | `1.25rem` (20px) | 600 (Semibold) | 1.3 |
| **Panel Heading (H3)** | UI | `0.9375rem` (15px) | 600 (Semibold) | 1.4 |
| **Body Primary** | UI | `0.875rem` (14px) | 400 (Regular) | 1.55 |
| **Body Secondary** | UI | `0.8125rem` (13px) | 400 (Regular) | 1.5 |
| **Technical Label (Mono)** | Mono | `0.75rem` (12px) | 500 (Medium) | 1.4 |
| **Micro Telemetry** | Mono | `0.6875rem` (11px) | 600 (Semibold) | 1.2 |

---

## 4. Engineering Component Primitives

### 4.1 Buttons & Controls
- `.btn-primary`: Vibrant accent background, high contrast, active click shrink (`scale(0.98)`).
- `.btn-secondary`: Bordered glass button with subtle hover elevation.
- `.btn-danger`: Red tinted border and text for fault injection actions (`Crash Consumer`, `Expire TTL`).
- `.icon-button`: 32x32px or 36x36px square with centered Lucide icon and tooltip.

### 4.2 Badges & Telemetry Pills
- `.badge`: Inline-flex capsule with monospaced text and 1px border.
- `.status-dot`: 7px circular indicator with pulsing ring animation for live running simulations.
- `.metric-card`: Compact stat box with small uppercase title and large tabular value.

### 4.3 Simulation Workbench Suite
1. **SimulationToolbar**: Floating or docked bar housing Scenario selector, transport buttons (Step Back, Play/Pause, Step Forward, Reset), Speed multiplier, and Fullscreen toggle.
2. **SimulationCanvas**: Domain-specific SVG/HTML grid rendering visual lanes, partition blocks, memory pages, or thread queues.
3. **StateInspector**: Structured key-value tree showing selected node details, configuration, and internal protocol flags.
4. **EventTimeline**: Chronological step ledger with tone badges (`info`, `ok`, `warn`, `danger`).
5. **FidelityDisclosure**: Expandable alert disclosing what is accurately modeled vs educational simplifications.
