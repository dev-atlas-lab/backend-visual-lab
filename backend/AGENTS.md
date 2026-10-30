# Backend Agent Instructions (`backend/`)

## 1. Architecture & Stack
- **Language & Runtime**: Java 21 LTS (`record` DTOs, sealed interfaces, pattern matching, Virtual Threads).
- **Framework**: Spring Boot 3.4 Modular Monolith (`com.devatlaslab.bvl`).
- **Package Structure**:
  - `com.devatlaslab.bvl.shared`: Common response envelopes, RFC 9457 `ProblemDetail` error handlers, CORS config.
  - `com.devatlaslab.bvl.catalog`: Domain and module catalog endpoints (`/api/v1/catalog/...`).
  - `com.devatlaslab.bvl.messaging`: Apache Kafka partition assignment and rebalance simulation trace endpoints (`/api/v1/labs/kafka/...`).
  - `com.devatlaslab.bvl.caching`: Redis TTL expiration, stampede, and lock simulation trace endpoints (`/api/v1/labs/redis/...`).
  - `com.devatlaslab.bvl.database`: PostgreSQL B-Tree scan and MVCC visibility trace endpoints (`/api/v1/labs/postgres/...`).

## 2. Engineering Rules
- Never expose JPA entities directly in REST controllers; always use immutable Java 21 `record` DTOs.
- Use constructor injection exclusively (no `@Autowired` field injection).
- Enforce strict parameter validation (`@Valid`) and execution timeouts on all sandbox endpoints.
- Do not split into separate microservices without an accepted ADR.
