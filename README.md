# Backend Visual Lab — Interactive Backend Engineering Laboratory

[![CI Quality Gates](https://github.com/dev-atlas-lab/backend-visual-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-atlas-lab/backend-visual-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Organization](https://img.shields.io/badge/Dev%20Atlas%20Lab-backend--visual--lab-emerald.svg)](https://github.com/dev-atlas-lab)

**Backend Visual Lab** (`backend-visual-lab`) is an interactive learning and deterministic simulation platform for Backend Engineering under the **Dev Atlas Lab** organization ([https://github.com/dev-atlas-lab](https://github.com/dev-atlas-lab)).

It turns complex, opaque distributed systems, database engines, caching architectures, and messaging protocols into inspectable, step-by-step interactive laboratories.

---

## 1. Pedagogical Engineering Philosophy

Every learning module and interactive lab strictly follows the 7-stage engineering pedagogy:

$$\text{WHAT} \rightarrow \text{WHY} \rightarrow \text{HOW} \rightarrow \text{INTERNALS} \rightarrow \text{TRADE-OFFS} \rightarrow \text{FAILURE SCENARIOS} \rightarrow \text{PRODUCTION ENGINEERING}$$

1. **WHAT**: Crisp conceptual definition, system role, and mental models.
2. **WHY**: Architectural motivation and what breaks at scale without this mechanism.
3. **HOW**: End-to-end execution lifecycle and protocol message exchange.
4. **INTERNALS**: Engine internals, 8 KB slotted page layouts, memory encodings, state machines, and annotated source snippets.
5. **TRADE-OFFS**: Quantitative and qualitative engineering trade-off matrices.
6. **FAILURE SCENARIOS**: Interactive chaos and fault injection (crashes, split-brain, thundering herds, deadlocks).
7. **PRODUCTION ENGINEERING**: Real-world tuning parameters, metric alerts, and incident response runbooks.

---

## 2. Core Learning Domains

| Domain | Key Topics | Status |
| :--- | :--- | :--- |
| **Messaging & Event Streaming** | Apache Kafka, Consumer Groups, Rebalancing (KIP-429), Partition Assignment, Replication, ISR, Exactly-Once Semantics, Transactional Outbox | **Active Interactive Labs** |
| **Caching & Redis** | Redis In-Memory Encodings, Passive/Active Expiration, Eviction Policies, Cache-Aside, Cache Stampede Mitigation (Mutex / PER), Lua Distributed Locks | **Active Interactive Labs** |
| **Databases (PostgreSQL)** | 8 KB Slotted Pages, CTID Tuples, B-Tree (nbtree) Index Traversal, Seq Scan vs Index Scan, Visibility Map, MVCC (xmin/xmax), Snapshot Isolation | **Active Interactive Labs** |
| **Distributed Systems & Microservices** | Circuit Breaker, Exponential Backoff + Jitter, Bulkhead, Saga (Orchestration/Choreography), Distributed Transactions (2PC), CAP / PACELC | Planned Expansion |
| **Backend Design Patterns** | CQRS, Unit of Work, Repository, Specification Pattern, Strategy, Decorator, Mediator | Planned Expansion |
| **Production System Design** | Back-of-the-Envelope Capacity Estimator, L4/L7 Load Balancing, Database Sharding, High Availability Topologies | Planned Expansion |

---

## 3. Dual-Mode Architecture

The platform separates **Simulation Logic** from **Visualization Logic** and supports dual execution:

- **Mode A (Deterministic Browser Simulation — Default)**:
  - 100% pure TypeScript state machine (`frontend/src/engines/simulation/`) with zero UI or backend dependencies.
  - Supports deterministic stepping, $O(1)$ history rewind (`Step Back`), timeline replay, and fault injection offline or on static Vercel hosts.
- **Mode B (Live Backend Sandbox — Optional)**:
  - Connects to the `Java 21` + `Spring Boot 3.4` Modular Monolith (`backend/`) backed by `docker-compose.yml` (PostgreSQL 17, Redis 7.4, Apache Kafka 3.8 KRaft) to stream real infrastructure execution traces into the same visual adapter.

---

## 4. Google Antigravity Agent Architecture

Engineered specifically for **Google Antigravity**:
- Root instructions: [`AGENTS.md`](file:///home/anhltn/projects/backend-visual-lab/AGENTS.md) (<24 KB context limit).
- Native customizations: `.agents/` registered via `.agents/skills.json`.
- 15 Tier-1 Essential Skills across Engineering, Domains, Learning, and Quality.
- 8 Reusable Workflows (`/research-topic`, `/design-learning-module`, `/design-visualization`, `/implement-feature`, `/review-architecture`, `/review-technical-accuracy`, `/run-quality-checks`, `/update-documentation`).
- Strict Engineering Governance: $\text{PROPOSED} \rightarrow \text{DISCUSSION} \rightarrow \text{ACCEPTED} \rightarrow \text{IMPLEMENTED} \rightarrow \text{VERIFIED}$.

---

## 5. Quickstart

### Frontend Simulation Platform (Standalone Mode)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

### Optional Live Sandbox Infrastructure
```bash
docker compose up -d
cd backend
mvn spring-boot:run
```

---

## 6. Quality & Verification Gates

```bash
npm --prefix frontend run typecheck    # Strict TypeScript check (tsc -b)
npm --prefix frontend run lint         # ESLint 9 check
npm --prefix frontend run test         # Vitest unit & integration tests
npm --prefix frontend run build        # Production bundle build
npm --prefix frontend run test:e2e     # Playwright Chromium E2E + axe-core WCAG scan
```

---

## 7. Documentation Index

- [`SPEC.md`](file:///home/anhltn/projects/backend-visual-lab/SPEC.md) — Product & Pedagogical Specification
- [`ARCHITECTURE.md`](file:///home/anhltn/projects/backend-visual-lab/ARCHITECTURE.md) — System, Simulation & Backend Architecture
- [`ROADMAP.md`](file:///home/anhltn/projects/backend-visual-lab/ROADMAP.md) — Phased Engineering Roadmap
- [`DEVELOPMENT.md`](file:///home/anhltn/projects/backend-visual-lab/DEVELOPMENT.md) — Local Development & Infrastructure Guide
- [`CONTRIBUTING.md`](file:///home/anhltn/projects/backend-visual-lab/CONTRIBUTING.md) — Governance Lifecycle & PR Guidelines
- [`docs/adr/`](file:///home/anhltn/projects/backend-visual-lab/docs/adr/) — Architecture Decision Records (ADR-0001..0005)
- [`docs/project-management/PROGRESS.md`](file:///home/anhltn/projects/backend-visual-lab/docs/project-management/PROGRESS.md) — Phase Log & Verification State
- [`docs/project-management/BACKLOG.md`](file:///home/anhltn/projects/backend-visual-lab/docs/project-management/BACKLOG.md) — Implementation Tickets
