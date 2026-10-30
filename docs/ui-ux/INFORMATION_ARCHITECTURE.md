# Information Architecture Specification
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Role:** Principal Product Designer & Senior Frontend Architect  
**Status:** COMPLETE (Phase 1)

---

## 1. Product Positioning & Mental Model

Backend Visual Lab is positioned as **An Interactive Engineering Workbench for Understanding Backend Systems** (60% Workbench, 40% Learning Platform).

The mental model shifts away from static article reading or video watching toward an **active engineering testbed**:
```
DISCOVER  ──────►  EXPERIMENT  ──────►  INSPECT  ──────►  BREAK & REPLAY  ──────►  MASTER
 (Explore)        (Workbench)          (Telemetry)       (Fault Injection)      (Assessment)
```

---

## 2. Global Navigation Structure

The primary application navigation is organized into 5 primary destinations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRIMARY NAVIGATION                               │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   OVERVIEW   │   EXPLORE    │  WORKBENCH   │  KNOWLEDGE   │    SETTINGS     │
│  (/overview) │  (/explore)  │ (/workbench) │ (/knowledge) │   (/settings)   │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

### 1. Overview (`/` or `/overview`)
- **Intent**: Situational awareness for the engineer.
- **Key Modules**:
  - *Active Session Banner*: Continue learning where left off with one click.
  - *Engineering Competency Radar*: 6-axis SVG hexagon displaying mastery across Concurrency, Storage, Caching, Streaming, JVM, and Resilience.
  - *Domain Velocity*: Quick access to active engineering domains.
  - *Recommended Labs*: Next logical step based on current progression.
  - *Quick Telemetry*: Cumulative XP, completed labs, and assessment accuracy.

### 2. Explore (`/explore`)
- **Intent**: Hierarchical technical catalog and search.
- **Hierarchy**: `Domain` $\rightarrow$ `Topic` $\rightarrow$ `Lab` $\rightarrow$ `Learning Stage`.
- **Key Capabilities**:
  - Real-time full-text search across titles, key terms, and protocols.
  - Faceted filters: Domain (Java, Messaging, Caching, Databases), Difficulty (Beginner, Intermediate, Advanced), Lab Status (Active, Completed, Bookmarked).
  - Topic cards displaying prerequisites, learning objectives, estimated time, and simulation type.

### 3. Workbench (`/workbench` & `/domains/:domainId/:moduleSlug`)
- **Intent**: The core engineering execution canvas.
- **Key Capabilities**:
  - Direct entry into any of the 14 deterministic simulation state machines.
  - Multi-panel layout: Learning Context, Simulation Canvas, State Inspector, Event Timeline, Configuration & Fault Injection.
  - Responsive layout modes: Dual-Pane Split Workspace vs Single-Column Focus Mode.

### 4. Knowledge & Assessments (`/knowledge`)
- **Intent**: Synthesis of technical principles, trade-offs, and scenario assessments.
- **Key Capabilities**:
  - Cross-domain index of 7-stage engineering knowledge: Internals, Trade-offs, Failure Scenarios, Production Engineering.
  - Question bank browser: Practice scenario-based single-choice and multiple-response challenges with instant rationale inspection.
  - Authoritative source citations registry (RFCs, KIPs, JVM SE Specs, PostgreSQL source references).

### 5. Settings (`/settings`)
- **Intent**: Personalization, keyboard shortcut mastery, and data management.
- **Key Capabilities**:
  - Appearance: Adaptive Dark Mode / Light Mode with instant preview.
  - Audio FX: Mechanical click synthesizer and alert tones toggle.
  - Keyboard Shortcuts Cheatsheet: Full reference of engineering shortcuts (`Space`, `P`, `R`, `F`, `1-3`, `Cmd+K`).
  - Progress Storage: Export/Import progress JSON, reset learning state.

---

## 3. Route Map & URL Taxonomy

| Route | View Component | Description |
| :--- | :--- | :--- |
| `/` | `OverviewView` | Default landing page; learning dashboard and quick start. |
| `/explore` | `ExploreView` | Hierarchical catalog with search, filters, and topic cards. |
| `/domains/:domainId` | `DomainDetailView` | Deep-dive into a specific domain (e.g. Java, Messaging, Postgres). |
| `/domains/:domainId/:moduleSlug` | `WorkbenchView` | Dedicated interactive lab workbench with dual-pane layout. |
| `/knowledge` | `KnowledgeView` | Cross-domain knowledge base, key terms, and assessments. |
| `/progress` | `ProgressView` | Detailed competency radar, mastery badges, and activity history. |
| `/settings` | `SettingsView` | Preferences, shortcuts cheatsheet, and data management. |

---

## 4. Breadcrumb & Contextual Navigation Hierarchy

Breadcrumb patterns adapt contextually based on the active route:
- *Home / Overview*: `Backend Visual Lab > Overview`
- *Explore Catalog*: `Explore > All Domains`
- *Domain Detail*: `Explore > Messaging & Kafka`
- *Lab Workbench*: `Messaging & Kafka > Consumer Groups > Rebalance (KIP-429)`
- *Knowledge Base*: `Knowledge > Assessment & Key Terms`
- *Progress*: `Engineer Profile > Competency & Badges`
