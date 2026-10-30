# ADR-0003: Spring Boot 3.4 Modular Monolith Backend Architecture

- **Status**: `ACCEPTED`
- **Date**: 2026-10-30

## Context
The platform spans multiple backend domains (Messaging, Databases, Caching, Distributed Systems, Progress). Introducing separate microservices initially would multiply build, container, and operational complexity without pedagogical benefit.

## Decision
We architect `backend/` as a single **Java 21 + Spring Boot 3.4 Modular Monolith** (`com.devatlaslab.bvl`) organized into bounded domain packages (`catalog`, `messaging`, `database`, `caching`, `progress`, `shared`).

## Consequences
- **Positive**: Single Maven build, shared configuration, fast startup, and clean domain boundaries that can be verified via unit and Testcontainers tests.
- **Trade-off**: Package discipline must be enforced via `/review-architecture` so domain modules do not bypass public service contracts.
