# Primary User Journeys & Interaction Workflows
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 1)

---

## Journey 1: The Systems Explorer (First-Time Discovery)
**Goal:** Understand how a complex backend mechanism actually functions under the hood.

1. **Arrival**: Lands on `/` (Overview) or `/explore`. Notes clear technical clarity with zero sales fluff.
2. **Browsing**: Enters `/explore`, filters by Domain = `Databases`, selects `PostgreSQL — B-Tree Index Scan & MVCC Tuple Visibility`.
3. **Onboarding**: Arrives in the Workbench. Sees the dual-pane layout: on the left, the structured 7-stage pedagogy (`WHAT` $\rightarrow$ `WHY` $\rightarrow$ `HOW`); on the right, the interactive simulation canvas displaying 8 KB Slotted Page items and Heap Tuples.
4. **Interactive Stepping**:
   - Presses `Space` to step forward.
   - Observes query execution moving from B-Tree root page down to leaf node and reading physical CTID `(0, 1)`.
   - Clicks on a tuple node: the State Inspector updates with `xmin`, `xmax`, and visibility bitmap flags.
5. **Comprehension**: Connects the visual memory layout directly to production query execution costs.

---

## Journey 2: The Incident Investigator (Fault Injection & Break Mode)
**Goal:** Break the system to observe failure modes and verify recovery behavior.

1. **Scenario Selection**: Opens `Redis — Cache-Aside & Stampede Mitigation`.
2. **Healthy Baseline**: Runs the baseline preset to see cache hits served at 100 QPS with 0 DB connections.
3. **Fault Injection**:
   - Clicks `Expire TTL (0ms)` while traffic is running.
   - Observes the dogpile stampede: all 100 requests miss simultaneously and flood the database.
   - Telemetry alarm turns red: `DB Connection Pool Exhausted (50/50)` and latency spikes to 850 ms.
4. **Remedy Comparison**:
   - Switches configuration to `Distributed Mutex (SET NX PX)`.
   - Replays the same TTL expiration.
   - Observes mutex acquisition: exactly 1 worker acquires the lock lease and recomputes the cache while peer requests wait in queue; DB connections stay clamped at 1.
5. **Takeaway**: Directly internalizes why distributed locking prevents cascading outages.

---

## Journey 3: The Returning Practitioner (Competency & Mastery)
**Goal:** Track progress, complete pending missions, and test retention.

1. **Dashboard Check-in**: Returns to `/overview`. Sees the `Continue Learning` card pointing directly to `ConcurrentHashMap Internals (Stage 4 / 7)`.
2. **Mission Execution**:
   - Completes the lab mission: "Provoke Lock Contention on Collided Bin".
   - Audible success chime plays; mission badge unlocks in the Quest HUD.
3. **Assessment Check**:
   - Scrolls to Stage 7 (Assessment) or visits `/knowledge`.
   - Solves 2 scenario-based engineering questions.
   - Reads the in-depth rationales referencing authoritative KIPs and RFCs.
4. **Radar Verification**: Visits `/progress`, reviews their updated 6-axis Competency Radar, and views newly earned badge: `Lock-Free Artisan`.

---

## Journey 4: The Power User (Keyboard & Command Palette)
**Goal:** Navigate, inspect, and simulate at the speed of thought without mouse friction.

1. **Global Search**: Hits `Cmd+K` (or `Ctrl+K`) anywhere in the application.
2. **Command Palette**:
   - Types `ThreadLocal` $\rightarrow$ presses `Enter`. Immediately routes to `Java References & ThreadLocal`.
3. **Workbench Hotkeys**:
   - `1`, `2`, `3`: Instantly selects Scenario Presets.
   - `Space`: Steps single tick forward.
   - `P`: Toggles play / pause simulation playback.
   - `R`: Resets to initial steady frame.
   - `F`: Toggles fullscreen lab mode for focused debugging.
   - `[`: Toggles sidebar visibility to maximize canvas width.
