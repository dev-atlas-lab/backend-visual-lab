# Simulation Fidelity & Boundary Disclosure UX
**Product:** Backend Visual Lab (`backend-visual-lab`)  
**Status:** COMPLETE (Phase 7)

---

## 1. Transparency Principle

A key non-negotiable differentiator of Backend Visual Lab is **Intellectual Honesty**:
- Never present educational simplifications or synthetic models as real production kernel behavior without explicit disclosure.
- Distinguish clearly between Mode A (Deterministic Educational Simulation) and Mode B (Live Infrastructure Sandbox).

---

## 2. The Fidelity Contract Disclosure HUD

Every interactive lab renders an expandable **Fidelity Disclosure HUD** containing the four dimensions of the Zod-validated `SimulationFidelityContract`:

1. **Accurate Protocol & Engine Behaviors (`accurateBehaviors`)**:
   - Explicitly lists real-world mechanisms faithfully modeled in the state machine (e.g. RangeAssignor partition distribution, bitwise perturbation in HashMap, `xmin`/`xmax` visibility checks in PostgreSQL).
2. **Educational Simplifications (`simplifications`)**:
   - Discloses pedagogical reductions (e.g. logical discrete clock ticks instead of wall-clock jitter, 2 worker threads in pool to make memory leaks obvious).
3. **Underlying Assumptions (`assumptions`)**:
   - Discloses core environmental assumptions (e.g. worker threads survive indefinitely in thread pool).
4. **Unsupported Edge Cases (`unsupportedEdgeCases`)**:
   - Explicitly lists out-of-scope behaviors (e.g. JNI memory corruption, kernel OOM killer overrides).

---

## 3. Visual Treatment
- Displayed as an engineering callout card with a shield icon.
- Features high-contrast typography, monospace property tags, and links to official specs (KIPs, RFCs, JVM SE 21 Spec, PostgreSQL docs).
