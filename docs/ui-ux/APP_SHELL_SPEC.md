# Application Shell & Global UX Specification
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 3)

---

## 1. Shell Architecture & Layout Grid

The application shell provides the structural frame for all platform pages:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              TOPBAR                                    │
│ [Collapse] [Logo] [Breadcrumbs]          [Search Cmd+K] [Audio] [Theme]│
├───────────────┬────────────────────────────────────────────────────────┤
│               │                                                        │
│  APP SIDEBAR  │                      MAIN WORKSPACE                    │
│               │                                                        │
│ • Overview    │  <Outlet />                                            │
│ • Explore     │                                                        │
│ • Workbench   │  (Catalog / Domain Detail / Module Reader / Progress)  │
│ • Knowledge   │                                                        │
│ • Settings    │                                                        │
│               │                                                        │
├───────────────┴────────────────────────────────────────────────────────┤
│                              FOOTER                                    │
│ [Offline Engine Status]               [Dev Atlas Lab & GitHub Links]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Global Navigation & Sidebar

### 2.1 Navigation Items
1. **Primary Navigation**:
   - `Overview` (`/` or `/overview`): Dashboard, competency radar, recent activity.
   - `Explore` (`/explore`): Searchable catalog of all domains and labs.
   - `Knowledge` (`/knowledge`): Cross-domain engineering index, key terms, assessment quizzes.
   - `Progress` (`/progress`): Competency matrix, XP leveling, mastery badges.
   - `Settings` (`/settings`): Appearance, shortcuts reference, data export.
2. **Domain Document Groups** (Collapsible Trees):
   - `Java Core & JVM Internals` (11 Labs)
   - `Messaging & Kafka` (1 Lab)
   - `Databases & PostgreSQL` (1 Lab)
   - `Caching & Redis` (1 Lab)
   - *Future*: `Distributed Systems`, `Spring Ecosystem`.

### 2.2 Desktop & Mobile Behaviors
- **Desktop ($\ge 960px$)**:
  - Sidebar width: 260px fixed width with smooth slide collapse.
  - Collapse button (`X`) collapses sidebar offscreen (`margin-left: 0` for main content).
  - Topbar hamburger button expands sidebar back.
  - State persisted to `localStorage` (`bvl.sidebar-collapsed`).
- **Mobile / Tablet ($< 960px$)**:
  - Sidebar acts as an offscreen drawer with backdrop blur.
  - Traps keyboard focus inside drawer when open; closes on `Escape` or outside click.
  - Auto-closes upon navigating to any module route.

---

## 3. Global Command Palette & Search (`Cmd+K`)

- **Shortcut**: `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux).
- **Functionality**:
  - Search all 14 interactive labs, 5 domains, and key terms in real time.
  - Quick action shortcuts: Toggle Dark/Light theme, toggle audio sound FX, reset simulation, go to competency radar.
  - Instant keyboard arrow selection (`ArrowUp`, `ArrowDown`, `Enter`).

---

## 4. Contextual Topbar

- **Breadcrumb Navigation**: Shows path with clickable ancestors:
  - e.g. `Java Core & JVM` $\rightarrow$ `Concurrency` $\rightarrow$ `JMM & Lock Upgrades`.
- **Global Actions**:
  - `Command Palette` trigger button showing shortcut badge (`⌘K`).
  - `Keyboard Shortcuts` modal trigger (`Keyboard` icon).
  - `Sound FX Synthesizer` toggle (`Volume2` / `VolumeX`).
  - `Adaptive Theme Switcher` (`Sun` for light / `Moon` for dark).
