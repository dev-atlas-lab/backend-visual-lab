---
name: knowledge-assessment
description: >-
  Guides the design, validation, and scoring of scenario-based engineering assessments
  (single-choice and exact-set multiple-response questions with English stems/choices and
  Vietnamese per-option rationales). Activate when authoring question banks or assessment logic.
---

# Knowledge Assessment Skill

## 1. Clear Purpose
Ensure all knowledge checks and practice assessments in `backend-visual-lab` test real backend engineering judgment, failure analysis, and architectural trade-offs with deterministic scoring and thorough per-option Vietnamese explanations.

## 2. When to Use It
- Authoring question bank items in `frontend/src/content/questions/`.
- Maintaining or extending the pure assessment scoring engine in `frontend/src/engines/assessment/`.
- Reviewing assessment quality during `/design-learning-module` or `/review-technical-accuracy`.

## 3. Required Technical Knowledge
- **Deterministic Assessment Model**:
  - Question types: `single-choice` (exactly 1 correct option) and `multiple-response` (2 or more correct options, scored via **exact-set match** with explicit selection count instruction in the stem, e.g., *"Select TWO."*).
  - Immutable submitted attempts and derived score calculation (`calculateAssessmentResult`).
- **Bilingual Assessment Standard**:
  - `stem` and `choices[].text`: **English** (matching international engineering interviews and certification standards).
  - `correctExplanation` and `choices[].explanation`: **Vietnamese** (explaining both why the right answer works and the exact technical flaw in each distractor).

## 4. Step-by-Step Workflow
1. **Anchor Every Question in a Concrete Scenario**:
   - Include concrete parameters in the stem (e.g., *"A Kafka topic `payments.v1` has 6 partitions and `replication.factor=3` with `min.insync.replicas=2`..."*).
2. **Design Plausible Engineering Distractors**:
   - Every distractor must represent a real misconception (e.g., confusing `session.timeout.ms` with `max.poll.interval.ms`, or assuming PostgreSQL `Index Scan` skips heap visibility checks without Visibility Map).
3. **Write Per-Option Vietnamese Rationales**:
   - Every choice (`a`, `b`, `c`, `d`, ...) MUST have its own non-empty `explanation` in Vietnamese.
4. **Attach Verified Source References**:
   - Populate `sourceIds` referencing verified entries in `frontend/src/content/sources.ts`.
5. **Validate with Zod & Vitest**:
   - Ensure `questionSchema` super-refinements validate unique choice IDs, valid `correctChoiceIds`, and type-matching answer key counts.

## 5. Engineering Constraints
- **No Trivial Definition Recall**: At least 80% of questions must present a production scenario, failure symptom, or configuration trade-off.
- **Explicit Selection Count for Multiple-Response**: Every `multiple-response` stem must state how many choices to select (e.g., `Select TWO.`).

## 6. Common Mistakes
- **Mistake 1**: Writing multiple-response questions with 1 correct choice, or failing to state the required count in the stem.
- **Mistake 2**: Writing generic distractor explanations like *"Đáp án này sai"* instead of explaining the exact protocol or runtime reason why that option fails.

## 7. Validation Checklist
- [ ] Stems and choices are in clear technical English; explanations are in naturalized Vietnamese.
- [ ] Every option (correct and incorrect) has a specific technical rationale.
- [ ] `questionSchema` passes runtime validation with 0 errors.
- [ ] `sourceIds` resolve to valid authoritative sources in `sources.ts`.

## 8. References to Authoritative Documentation
- `frontend/src/domain/assessment.ts` — Assessment & Question Zod Schemas
- `frontend/src/engines/assessment/scorer.ts` — Deterministic Exact-Set Scoring Engine
