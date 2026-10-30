# ADR-0005: Bilingual Pedagogical Content & Mandatory Simulation Fidelity Contract

- **Status**: `ACCEPTED`
- **Date**: 2026-10-30

## Context
Consistent with the organization's established learning lab (`claude-associate-foundations-lab`), learners benefit most when deep conceptual explanations and step-by-step narrations are written in naturalized Vietnamese while preserving exact English engineering terminology, and when assessments use international English stems/choices with Vietnamese per-option rationales. Furthermore, educational simulations must never mislead engineers about real protocol edge cases.

## Decision
1. **Language Standard**: Lesson prose, simulation step narrations (`summaryVi`, `internalsNoteVi`, `productionWarningVi`), and assessment explanations are authored in naturalized **Vietnamese** with preserved **English** technical terms; assessment question stems and choices are authored in **English**.
2. **Fidelity Standard**: Every simulation must include a Zod-validated `SimulationFidelityContract` rendered visibly in the UI inspector (`accurateBehaviors`, `simplifications`, `assumptions`, `unsupportedEdgeCases`).

## Consequences
- **Positive**: High conceptual clarity, strong preparation for English technical interviews/architectural reviews, and zero ambiguity between real protocol behavior and simplified educational models.
