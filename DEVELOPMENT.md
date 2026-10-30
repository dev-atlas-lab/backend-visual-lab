# Development Guide — Backend Visual Lab

This guide covers running, testing, and verifying both the standalone Frontend Simulation Platform (`frontend/`) and the optional Live Sandbox Backend (`backend/` + `docker-compose.yml`).

---

## 1. Prerequisites

### Required for Frontend & Simulation Development (Mode A — Default)
- **Node.js**: `>=20.19.0` (Node `22 LTS` recommended and pinned in `.nvmrc`)
- **npm**: `10+`
- **Git**: `2.34+`

> [!NOTE]
> If `node` is installed via `nvm`, ensure your shell initializes `nvm` (`source ~/.nvm/nvm.sh && nvm use`).

### Optional for Live Backend Sandbox Mode (Mode B)
- **Java**: `JDK 21 LTS` (e.g., Eclipse Temurin 21)
- **Maven**: `3.9+` (or use `./mvnw`)
- **Docker & Docker Compose**: `Docker Engine 24+` with `docker compose` plugin

---

## 2. Frontend Quickstart (Standalone Deterministic Mode)

All learning modules, simulations (Kafka, Redis, PostgreSQL), visualizations, assessments, and local progress persistence run 100% in the browser without requiring Docker or Java:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Frontend Quality Gates

Run the full verification suite from the repository root (or inside `frontend/`):

```bash
npm --prefix frontend run typecheck    # Strict TypeScript 5.9 check (tsc -b)
npm --prefix frontend run lint         # ESLint 9 check
npm --prefix frontend run test         # Vitest 4 unit & integration suite
npm --prefix frontend run build        # Production bundle build (dist/)
npm --prefix frontend run test:e2e     # Playwright Chromium E2E + axe-core WCAG scan
```

Or run the unified verification script:

```bash
bash .agents/scripts/verify-scaffold.sh
```

---

## 3. Optional Infrastructure & Spring Boot Backend (Live Sandbox Mode)

When Docker and JDK 21 are installed on your workstation:

### Step 1: Start Infrastructure Containers (PostgreSQL 17, Redis 7.4, Kafka 3.8 KRaft)
```bash
docker compose up -d
docker compose ps
```

- **PostgreSQL 17**: `localhost:5432` (`db: bvl_sandbox`, `user: bvl_user`)
- **Redis 7.4**: `localhost:6379`
- **Apache Kafka 3.8 (KRaft, no ZooKeeper)**: `localhost:9092`

### Step 2: Run the Spring Boot 3.4 Modular Monolith
```bash
cd backend
mvn spring-boot:run
```

The backend API listens on `http://localhost:8080/api/v1/catalog/status`.

### Step 3: Run Backend Tests
```bash
cd backend
mvn clean test
```
