# Product & Engineering Roadmap — Backend Visual Lab

**Status:** `ACCEPTED`

---

## Phase 1 & Phase 2 — Research & Architecture Proposal (`COMPLETED`)
- [x] Inspect `claude-associate-foundations-lab` conventions, design system, and quality gates.
- [x] Verify Google Antigravity native customization conventions (`.agents/`, `AGENTS.md`, `skills.json`, `hooks.json`).
- [x] Design decoupled 6-engine architecture and Dual-Mode execution model.

## Phase 3 — Human Architectural Approval (`COMPLETED`)
- [x] Architecture Proposal reviewed and approved by Human Architect (`Status: ACCEPTED`).

## Phase 4 — Repository & Antigravity Foundation Scaffold (`COMPLETED`)
- [x] Root documentation (`AGENTS.md`, `README.md`, `SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DEVELOPMENT.md`, `CONTRIBUTING.md`).
- [x] Antigravity `.agents/` customization hierarchy:
  - [x] `.agents/hooks.json` + `.agents/scripts/safety-check.sh`
  - [x] `.agents/skills.json` + `.agents/rules/governance.md`
  - [x] 15 Tier-1 MVP Essential Skills across Engineering, Technical Domains, Learning/Visualization, and Quality/Review.
  - [x] 8 Reusable Workflow Skills (`/research-topic`, `/design-learning-module`, `/design-visualization`, `/implement-feature`, `/review-architecture`, `/review-technical-accuracy`, `/run-quality-checks`, `/update-documentation`).
- [x] Architecture Decision Records (`ADR-0001` through `ADR-0005` in `docs/adr/`).
- [x] Frontend foundation (`frontend/`) with React 19, TypeScript 5.9, Vite 6, Zod 4, pure Simulation Engine, Visualization Workbench, Assessment Engine, and Progress Tracking.
- [x] Flagship Interactive Lab #1 (**Apache Kafka Consumer Groups & Rebalancing**) + Interactive Simulation #2 (**Redis Cache Stampede & TTL**) + Interactive Visualization #3 (**PostgreSQL B-Tree & MVCC Visibility**).
- [x] Backend foundation (`backend/`) with Java 21 + Spring Boot 3.4 Modular Monolith + `docker-compose.yml` (PostgreSQL 17, Redis 7.4, Kafka 3.8 KRaft).
- [x] Automated verification suite (Vitest unit/integration tests + Playwright E2E + `axe-core` accessibility checks).

## Phase 5 — MVP Backlog Execution & Deepening (`CURRENT`)
Prioritized tickets tracked in [`docs/project-management/BACKLOG.md`](file:///home/anhltn/projects/backend-visual-lab/docs/project-management/BACKLOG.md):
- **BVL-101**: Expand Kafka Consumer Group lab with KIP-848 Next-Gen Consumer Rebalance Protocol comparison mode.
- **BVL-102**: Add Kafka Replication, ISR Shrink/Expand, High Watermark (`HW`), and `acks=all` + `min.insync.replicas` simulation module.
- **BVL-103**: Expand Redis Cache-Aside lab with Write-Through, Write-Behind, and Lua Distributed Lock token-fencing simulation.
- **BVL-104**: Expand PostgreSQL lab with interactive Lock Compatibility Matrix & Deadlock Detection (`Wait-For Graph`) simulation.
- **BVL-105**: Live Backend Sandbox SSE bridge connecting `frontend/` Mode B switch to `backend/` Testcontainers/Docker endpoints.

## Phase 6 — Domain Expansion Wave 1 (Messaging, Databases, Caching Depth)
- Kafka Idempotent Producer (`PID` + Sequence Numbers), Transactions (2PC Markers), Retry Topics & Dead Letter Queues (DLQ), and Transactional Outbox Pattern.
- PostgreSQL WAL (`LSN` + Checkpoints), Join Algorithms (`Nested Loop`, `Hash Join`, `Merge Join`), and Connection Pooling (`HikariCP` + `PgBouncer`).
- Redis Cluster (`16384` Hash Slots, `MOVED`/`ASK` redirections) and Persistence (`RDB` fork copy-on-write vs. `AOF` rewrite).

## Phase 7 — Domain Expansion Wave 2 (Distributed Systems, Design Patterns, System Design)
- Distributed Systems: Circuit Breaker state machine, Saga Orchestrator vs. Choreography, Rate Limiting (`Token Bucket`, `Leaky Bucket`, `Sliding Window Log/Counter`), CAP/PACELC interactive trade-off explorer.
- Design Patterns: CQRS, Unit of Work, Specification, Strategy, Chain of Responsibility, Decorator.
- System Design: Interactive Capacity & Bandwidth Estimator, Multi-Region Read/Write Topology Lab.
