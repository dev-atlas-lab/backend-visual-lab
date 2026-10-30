# Overview Dashboard & Exploration Specification
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 4)

---

## 1. Overview Dashboard (`/overview` or `/`)

The Overview dashboard serves as the central mission control for an engineer using the platform.

### Core Sections:
1. **Hero / Active Session Launcher**:
   - Displays "Welcome Back, Engineer".
   - Shows the most recently visited module with a single-click "Resume Lab" button.
2. **Engineering Competency Hexagon**:
   - Pure SVG 6-axis radar displaying real-time mastery score (0-100%) across:
     - JVM & Runtime Internals
     - Concurrency & Threading
     - Storage & Databases
     - Messaging & Event Streams
     - In-Memory Caching
     - Distributed Resilience
3. **Domain Explorer Cards**:
   - Visual cards for all primary domains with badges indicating active lab count, status, and completion rate.
4. **Recommended Next Steps**:
   - Suggests logical next learning pathways based on completed modules (e.g., after completing `HashMap Treeification`, recommends `ConcurrentHashMap Lock Striping`).
5. **Telemetry Bar**:
   - Total Experience Points (XP), Completed Labs Counter, Assessment Accuracy %, Badges Earned.

---

## 2. Explore & Catalog (`/explore`)

### Capabilities:
- **Search Bar**: Instant filter over 14 modules, 5 domains, 40+ key terms.
- **Domain Filter Pills**: `All`, `Java Core & JVM`, `Messaging & Kafka`, `Caching & Redis`, `Databases (PostgreSQL)`.
- **Difficulty Badges**: `Beginner`, `Intermediate`, `Advanced`.
- **Module Grid Cards**:
  - Domain icon and badge.
  - Module title and concise subtitle.
  - Key technical terms pill list (e.g. `KIP-429`, `RangeAssignor`, `MVCC`, `CAS`).
  - Estimated study time (e.g. `20 min`).
  - Interactive "Launch Workbench" action button.
