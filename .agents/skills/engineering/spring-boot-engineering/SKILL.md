---
name: spring-boot-engineering
description: >-
  Guides Java 21 and Spring Boot 3.4 Modular Monolith backend engineering in backend/.
  Activate this skill when creating or modifying backend REST APIs, live infrastructure
  sandbox services, Flyway migrations, or Spring configuration.
---

# Spring Boot Engineering Skill

## 1. Clear Purpose
Establish production-grade Java 21 and Spring Boot 3.4 engineering standards for the `backend/` Modular Monolith, powering optional live sandbox execution (Kafka, PostgreSQL, Redis) and API services.

## 2. When to Use It
- Implementing or updating Java 21 classes, REST controllers, sandbox execution services, or configurations in `backend/`.
- Designing REST API contracts (`/api/v1/...`) that emit structured execution traces compatible with the frontend `SimulationStepFrame` schema.
- Adding database migrations (`src/main/resources/db/migration/`) or Testcontainers integration tests.

## 3. Required Technical Knowledge
- **Java 21 LTS**: `record` DTOs, sealed interfaces (`permits`), pattern matching for `switch`, and Virtual Threads (`spring.threads.virtual.enabled=true`).
- **Spring Boot 3.4**: `RestController`, `ProblemDetail` (RFC 9457 error responses), `JdbcClient` / Spring Data JPA, Spring for Apache Kafka (`KafkaTemplate`, `ConsumerFactory`), Spring Data Redis (`StringRedisTemplate`, `RedisScript`).
- **Modular Monolith Structure**: Package-by-domain (`catalog`, `messaging`, `database`, `caching`, `progress`, `shared`).

## 4. Step-by-Step Workflow
1. **Check Package Boundaries**: Place code inside its bounded domain package (`com.devatlaslab.bvl.<domain>`). Keep internal domain repositories package-private where possible.
2. **Use Immutable Java 21 Records for Contracts**: Define request/response DTOs and simulation trace events as Java `record` types with Jakarta Bean Validation (`@Valid`, `@NotBlank`, `@Min`, `@Max`).
3. **Enforce Sandbox Safety**:
   - Live sandbox endpoints (such as PostgreSQL `EXPLAIN` or Redis command runners) MUST NEVER allow arbitrary unrestricted SQL/shell execution from untrusted strings. Use parameterized queries, allowlisted templates, read-only transactions (`@Transactional(readOnly = true)`), and strict statement timeouts (`SET LOCAL statement_timeout = '2000ms'`).
4. **Standardize Error Handling**: Return RFC 9457 `ProblemDetail` payloads for validation or infrastructure errors so the frontend can display clear diagnostic messages.
5. **Verify Build & Tests**: Run `./mvnw clean test` (when JDK 21 is available on the host or in CI).

## 5. Engineering Constraints
- **No Premature Microservices**: Everything runs in a single deployable Spring Boot application (`backend/pom.xml`).
- **Graceful Infrastructure Degradation**: If Kafka, Redis, or PostgreSQL containers are not running, health and status endpoints must report infrastructure availability cleanly without crashing the JVM startup when running in lightweight profile mode.
- **No Field Injection**: Always use constructor injection.

## 6. Common Mistakes
- **Mistake 1**: Exposing JPA `@Entity` classes directly in `@RestController` responses instead of mapping to immutable Java `record` DTOs.
- **Mistake 2**: Running blocking sandbox operations without timeouts, risking thread pool exhaustion.
- **Mistake 3**: Using `spring.jpa.hibernate.ddl-auto=update` in production configuration instead of explicit Flyway migrations (`validate`).

## 7. Validation Checklist
- [ ] All DTOs are immutable Java 21 `record` types with validation annotations.
- [ ] Sandbox endpoints enforce strict allowlists and execution timeouts.
- [ ] No cyclic dependencies exist between domain packages (`catalog`, `messaging`, `database`, `caching`, `progress`).
- [ ] `backend/pom.xml` uses pinned, compatible Spring Boot 3.4 and Java 21 settings.

## 8. References to Authoritative Documentation
- Spring Boot 3.4 Reference Documentation: https://docs.spring.io/spring-boot/index.html
- Java 21 Language Specification & JEPs (JEP 440 Record Patterns, JEP 441 Pattern Matching for switch, JEP 444 Virtual Threads): https://openjdk.org/projects/jdk/21/
- RFC 9457 — Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
