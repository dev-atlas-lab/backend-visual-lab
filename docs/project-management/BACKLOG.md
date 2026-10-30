# MVP Implementation Backlog & Phase 5 Tickets

**Status:** `ACCEPTED`

All implementation tickets follow the governance lifecycle: `PROPOSED` → `DISCUSSION` → `ACCEPTED` → `IMPLEMENTED` → `VERIFIED`.

---

## Completed Foundation & MVP Vertical Slice Tickets (Phase 4)

| Ticket ID | Title | Category | Status |
| :--- | :--- | :--- | :--- |
| **BVL-001** | Antigravity Customizations (`.agents/`, `AGENTS.md`, 15 Tier-1 Skills, 8 Workflow Skills, Safety Hooks) | Agent Architecture | `VERIFIED` |
| **BVL-002** | Core Domain Schemas (`learning-module`, `assessment`, `fidelity`, `progress`) with Zod 4 Validation | Domain Engine | `VERIFIED` |
| **BVL-003** | Generic Deterministic Simulation Engine & Immutable Frame Tape Controller | Simulation Engine | `VERIFIED` |
| **BVL-004** | Flagship Lab #1: Apache Kafka Consumer Groups, Partition Assignment & Rebalancing Simulation + 7-Stage Module | Messaging Lab | `VERIFIED` |
| **BVL-005** | Interactive Lab #2: Redis Cache-Aside, TTL Expiration & Cache Stampede Prevention Simulation + Module | Caching Lab | `VERIFIED` |
| **BVL-006** | Interactive Lab #3: PostgreSQL B-Tree Index Scan vs. Seq Scan & MVCC Tuple Visibility Visualizer + Module | Database Lab | `VERIFIED` |
| **BVL-007** | Deterministic Assessment Scorer (`single-choice` + exact-set `multiple-response`) & Versioned Progress Store (`bvl.progress.v1`) | Assessment & Progress | `VERIFIED` |
| **BVL-008** | Java 21 + Spring Boot 3.4 Modular Monolith Backend Scaffold & `docker-compose.yml` (Postgres 17, Redis 7.4, Kafka 3.8 KRaft) | Backend & Infra | `VERIFIED` |
| **BVL-009** | Automated Verification Suite (Vitest Unit/Integration + Playwright E2E + `axe-core` Zero-Violation Audit) | Quality Engineering | `VERIFIED` |

---

## Prioritized Next Phase Tickets (Phase 5 — Ready for Approval)

| Priority | Ticket ID | Title | Preconditions & Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **BVL-101** | **Kafka Replication, ISR & High Watermark (`HW`) Interactive Simulation** | Model Leader + 2 Follower replicas, `FetchRequest` offset propagation, `replica.lag.time.max.ms` ISR shrink, `acks=1` vs `acks=all` + `min.insync.replicas=2` under Leader crash. | `PROPOSED` |
| **P1** | **BVL-102** | **PostgreSQL Lock Modes, Row-Level Locks & Deadlock Wait-For Graph Lab** | Model `FOR UPDATE` vs `FOR SHARE`, table/row lock queues, 2-transaction deadlock cycle detection (`deadlock_timeout`), and victim abort recovery. | `PROPOSED` |
| **P2** | **BVL-103** | **Redis Distributed Lock (`SET NX PX` + Lua Release) & Fencing Token Simulator** | Model GC pause lock expiry race condition, unsafe `DEL` lock stealing vs Lua token check, and monotonic fencing token validation at storage resource. | `PROPOSED` |
| **P2** | **BVL-104** | **Distributed Systems: Circuit Breaker & Retry with Exponential Backoff + Jitter Lab** | Model `CLOSED` → `OPEN` → `HALF_OPEN` state machine, failure rate sliding window, and retry storm amplification without jitter. | `PROPOSED` |
| **P3** | **BVL-105** | **Live Backend Sandbox SSE Bridge (`Mode B` UI Toggle)** | Connect Frontend Lab Workbench to `http://localhost:8080/api/v1/labs/...` when local Spring Boot + Docker Compose stack is running, with automatic fallback to `Mode A`. | `PROPOSED` |
