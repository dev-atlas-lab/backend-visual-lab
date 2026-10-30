# ADR-0002: Dual-Mode Execution Architecture (Deterministic Browser + Spring Boot Sandbox)

- **Status**: `ACCEPTED`
- **Date**: 2026-10-30

## Context
Learners and contributors need instant, zero-setup access to interactive backend simulations (including when hosted statically on Vercel or on machines without Docker/JDK running), while also benefiting from a real `Java 21 + Spring Boot 3.4` backend capable of running live PostgreSQL, Redis, and Kafka experiments.

## Decision
We adopt a **Dual-Mode Execution Architecture**:
- **Mode A (Deterministic Browser Simulation — Default)**: Runs pure TypeScript state machines in the browser with zero backend dependency.
- **Mode B (Live Backend Sandbox — Optional)**: Connects to the `backend/` Spring Boot 3.4 Modular Monolith and `docker-compose.yml` infrastructure (PostgreSQL 17, Redis 7.4, Kafka 3.8 KRaft), returning trace envelopes that conform to the same visual projection interface.

## Consequences
- **Positive**: 100% offline/static availability and fast E2E verification, with a clean upgrade path to live container experimentation.
- **Trade-off**: Simulation contracts must include an explicit `SimulationFidelityContract` so learners always know whether they are viewing the deterministic model or a live trace.
