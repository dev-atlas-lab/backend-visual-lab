# Agent Instructions — Backend Visual Lab (Antigravity Edition)

## 1. Mission & Product Vision

Build and evolve **Backend Visual Lab** (`backend-visual-lab`), an interactive learning and simulation platform for Backend Engineering under the **Dev Atlas Lab** organization (`https://github.com/dev-atlas-lab`).

Every learning module and interactive lab MUST follow the 7-stage engineering pedagogy:

`WHAT` → `WHY` → `HOW` → `INTERNALS` → `TRADE-OFFS` → `FAILURE SCENARIOS` → `PRODUCTION ENGINEERING`

This repository must NEVER become a static documentation site. Technical accuracy and interactive visualization are the primary differentiators.

## 2. Non-Negotiable Architecture Rules

1. **Simulation Logic vs. Visualization Logic Separation**:
   - The **Simulation Engine** (`frontend/src/engines/simulation/`) MUST be a 100% pure, deterministic TypeScript state machine with zero React, DOM, XYFlow, or D3 imports.
   - The **Visualization Engine** (`frontend/src/engines/visualization/`) projects pure simulation frames (`SimulationStepFrame<TState, TEvent>`) into visual models (nodes, edges, packets, timelines, inspector trees).
2. **Explicit Technical Fidelity Disclosure**:
   - Every simulation and visualization MUST declare a Zod-validated `SimulationFidelityContract` distinguishing:
     - `accurateBehaviors`: Real protocol/engine behaviors faithfully modeled.
     - `simplifications`: Educational simplifications (e.g., logical ticks vs. wall-clock jitter).
     - `assumptions`: Explicit system assumptions.
     - `unsupportedEdgeCases`: Out-of-scope failure modes or edge cases.
   - Never present educational simplifications or unverified assumptions as real infrastructure behavior.
3. **Dual-Mode Execution Architecture**:
   - **Mode A (Deterministic Browser Simulation — Default)**: Runs entirely in the browser so every lab works offline, on static hosts (Vercel), and on machines without Docker or Java running.
   - **Mode B (Live Backend Sandbox — Optional)**: Connects to the `Java 21` + `Spring Boot 3` Modular Monolith (`backend/`) backed by `docker-compose.yml` (PostgreSQL 17, Redis 7.4, Apache Kafka 3.8 KRaft) to stream real infrastructure execution traces into the same Visualization Adapter.
4. **Content & Language Policy**:
   - **Lesson prose, simulation step narrations, internals notes, and answer rationales**: Naturalized **Vietnamese**, preserving industry-standard **English technical terminology** (e.g., *Consumer Group*, *Rebalance*, *CooperativeStickyAssignor*, *MVCC*, *WAL*, *B-Tree*, *Cache Stampede*).
   - **Assessment question stems, answer choices, and code/protocol identifiers**: **English**.

## 3. Engineering Governance Lifecycle

Human remains the final decision-maker. Every requirement, module spec, simulation design, ADR, and implementation ticket follows:

`PROPOSED` → `DISCUSSION` → `ACCEPTED` → `IMPLEMENTED` → `VERIFIED`

- **No silent architectural commitments**: Agents may propose architecture (`PROPOSED`), but must wait for human approval (`ACCEPTED`) before finalizing major architectural changes. Every major architectural decision requires an ADR in `docs/adr/`.
- **Read-only review enforcement**: When executing `/review-architecture` or `/review-technical-accuracy`, agents operate in strictly read-only mode and must NOT modify application source code.
- **Diagnostic QA enforcement**: When executing `/run-quality-checks`, QA checks report defects with reproduction details and must NOT silently patch implementation bugs without reporting them.
- **No dead UI controls**: Every visible button, playback control, preset selector, and inspector tab must be functional and tested.

## 4. Antigravity Skills & Workflows Routing

Workspace customizations live in `.agents/` and are registered via `.agents/skills.json` and `.agents/hooks.json`. Do NOT create `.opencode/` or `.claude/` directories.

When the user invokes any of the following workflow commands in chat, you MUST read and execute the corresponding Workflow Skill in `.agents/skills/workflows/`:

| Workflow Command | Workflow Skill Path | Primary Purpose |
| :--- | :--- | :--- |
| `/research-topic` | `.agents/skills/workflows/research-topic/SKILL.md` | Research authoritative specs/RFCs/KIPs/source docs and produce a verified topic research spec. |
| `/design-learning-module` | `.agents/skills/workflows/design-learning-module/SKILL.md` | Design a 7-stage learning module spec (`WHAT` → `PRODUCTION`) and scenario assessment blueprint. |
| `/design-visualization` | `.agents/skills/workflows/design-visualization/SKILL.md` | Design a deterministic state machine, transition table, fidelity contract, and visual projection spec. |
| `/implement-feature` | `.agents/skills/workflows/implement-feature/SKILL.md` | Implement an `ACCEPTED` specification across domain/simulation/UI/backend with full test coverage. |
| `/review-architecture` | `.agents/skills/workflows/review-architecture/SKILL.md` | Perform a read-only architectural boundary, decoupling, and ADR compliance review. |
| `/review-technical-accuracy` | `.agents/skills/workflows/review-technical-accuracy/SKILL.md` | Perform a read-only audit of protocol/engine accuracy, fidelity disclosures, and assessment keys. |
| `/run-quality-checks` | `.agents/skills/workflows/run-quality-checks/SKILL.md` | Run typecheck, lint, unit/integration tests, E2E + axe accessibility checks, and backend checks. |
| `/update-documentation` | `.agents/skills/workflows/update-documentation/SKILL.md` | Synchronize `README.md`, `ROADMAP.md`, `docs/project-management/PROGRESS.md`, and ADRs. |

## 5. Safety, Git & Credentials Rules

- Inspect repository status, branch, and existing files before making changes.
- Never run destructive commands (`rm`, `git rm`, `git clean`, `git reset --hard`, `git push --force`) or overwrite protected files without explicit user confirmation (enforced by `.agents/hooks.json`).
- Do not use GitHub CLI (`gh`).
- Never print, log, or commit secrets, tokens, or `.env` files.
- Always run quality checks (`npm --prefix frontend run typecheck`, `lint`, `test`, `build`) after meaningful frontend changes.
