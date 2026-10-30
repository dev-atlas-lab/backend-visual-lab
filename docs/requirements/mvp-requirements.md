# MVP Functional & Pedagogical Requirements

**Status:** `VERIFIED`  
**Baseline Date:** 2026-10-30

## 1. Scope Summary
The initial MVP validates the core **Backend Visual Lab** platform through:
1. **Domain & Module Catalog** covering all 6 core backend engineering domains.
2. **7-Stage Structured Module Page** (`WHAT` → `WHY` → `HOW` → `INTERNALS` → `TRADE-OFFS` → `FAILURE SCENARIOS` → `PRODUCTION ENGINEERING`).
3. **Reusable Deterministic Simulation Engine** with step-by-step history tape (`Step Forward`, `Step Back`, `Play/Pause`, `Reset`, `Seek`, `Preset Selection`, `Interactive Fault Injection`, and `SimulationFidelityContract`).
4. **Lab #1 (Flagship Deep-Dive)**: Apache Kafka Consumer Groups, Partition Assignment (`Range`, `RoundRobin`, `CooperativeSticky` KIP-429) & Rebalance State Machine.
5. **Lab #2 (Interactive Simulation)**: Redis Cache-Aside, TTL Expiration & Cache Stampede Prevention (`Naive Cache-Aside` vs. `Mutex Lock / Singleflight` vs. `Probabilistic Early Expiration`).
6. **Lab #3 (Interactive Database Visualization)**: PostgreSQL B-Tree Index Scan vs. Sequential Scan vs. Index-Only Scan (Visibility Map) & MVCC Tuple Visibility (`xmin`/`xmax`/CTID).
7. **Deterministic Assessment Engine** (`single-choice` and exact-set `multiple-response`) + **Versioned Progress Tracking** (`bvl.progress.v1`).

## 2. Verification Criteria
- Zero UI imports inside `frontend/src/domain/` and `frontend/src/engines/simulation/`.
- All simulation state transitions covered by deterministic Vitest unit tests.
- All routes pass Playwright E2E and `axe-core` WCAG AA accessibility scans in both Dark and Light themes.
