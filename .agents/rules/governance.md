# Engineering Governance & Technical Accuracy Rules

## 1. Governance Status Lifecycle

All requirement specs (`docs/requirements/`), visualization specs (`docs/visualization/`), ADRs (`docs/adr/`), and backlog items (`docs/project-management/BACKLOG.md`) MUST carry an explicit status header:

`Status: PROPOSED | DISCUSSION | ACCEPTED | IMPLEMENTED | VERIFIED`

### Transition Rules
1. `PROPOSED`: Initial draft created by an agent or contributor.
2. `DISCUSSION`: Under active review; open architectural or pedagogical questions exist.
3. `ACCEPTED`: Explicitly approved by the Human Architect/Product Owner. **Precondition for `/implement-feature`.**
4. `IMPLEMENTED`: Feature code, deterministic simulation logic, visual projection, and automated tests are complete and passing.
5. `VERIFIED`: Passed `/review-technical-accuracy` and `/run-quality-checks` with human sign-off.

## 2. Role Separation Rules

- **Architecture Proposals**: Agents may propose ADRs and specifications (`PROPOSED`), but must never silently treat unapproved architecture changes as `ACCEPTED`.
- **Read-Only Reviews**: During `/review-architecture` and `/review-technical-accuracy`, the agent MUST NOT edit source code in `frontend/src/` or `backend/src/`.
- **QA & Diagnostic Integrity**: During `/run-quality-checks`, the agent must report all test, lint, type, or accessibility failures transparently before applying fixes.

## 3. Technical Fidelity & Source Verification

- Never fabricate protocol behaviors, configuration defaults, or benchmark numbers.
- Cite primary sources (official Apache Kafka KIPs/docs, PostgreSQL documentation/source, Redis command documentation/source, IETF RFCs, or peer-reviewed papers) in module definitions.
- Every simulation MUST expose its `SimulationFidelityContract` in the UI so learners can distinguish real protocol mechanics from educational simplifications.
