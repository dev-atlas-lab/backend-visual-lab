---
name: documentation-maintenance
description: >-
  Maintains synchronization across README.md, SPEC.md, ARCHITECTURE.md, ROADMAP.md,
  DEVELOPMENT.md, ADRs, and docs/project-management/PROGRESS.md. Activate when running
  /update-documentation or completing a milestone.
---

# Documentation Maintenance Skill

## 1. Clear Purpose
Keep all project documentation, governance statuses (`PROPOSED` → `VERIFIED`), architectural diagrams, and progress logs 100% synchronized with the actual implemented state of the repository.

## 2. When to Use It
- Executing `/update-documentation` after completing a scaffold, feature slice, or review.
- Recording new Architecture Decision Records in `docs/adr/`.
- Updating `docs/project-management/PROGRESS.md`, `docs/project-management/BACKLOG.md`, `ROADMAP.md`, or `README.md`.

## 3. Required Technical Knowledge
- GitHub-Flavored Markdown (GFM), Mermaid.js diagram conventions (quoted node labels for special characters), ADR numbering and lifecycle tracking.

## 4. Step-by-Step Workflow
1. **Verify Actual Repository State First**: Check passing test counts, implemented routes, simulation modules, and governance statuses before writing documentation claims.
2. **Update `docs/project-management/PROGRESS.md` & `BACKLOG.md`**:
   - Record completed deliverables, exact verification results (`typecheck`, `lint`, `vitest`, `playwright`, `build`), and update ticket statuses (`PROPOSED` → `ACCEPTED` → `IMPLEMENTED` → `VERIFIED`).
3. **Synchronize Top-Level Docs**:
   - Update `README.md` feature summary and test metrics if changed.
   - Update `ARCHITECTURE.md` or `docs/adr/` if new modules or architectural decisions were accepted.
4. **Verify All Links & Mermaid Blocks**:
   - Ensure all relative links resolve to existing files in the repository.

## 5. Engineering Constraints
- **Never Claim Unverified Features Are Done**: Clearly distinguish implemented features from planned roadmap items.
- **Preserve Existing Historical Logs**: Append to `PROGRESS.md` and keep ADR history intact rather than deleting historical context.

## 6. Common Mistakes
- **Mistake 1**: Updating code without updating `docs/project-management/PROGRESS.md` or ticket statuses in `BACKLOG.md`.
- **Mistake 2**: Writing unquoted parentheses `id[Label (Info)]` in Mermaid flowcharts (always quote as `id["Label (Info)"]`).

## 7. Validation Checklist
- [ ] `README.md`, `ROADMAP.md`, `PROGRESS.md`, and `BACKLOG.md` reflect exact current repository status.
- [ ] All governance status headers (`Status: ...`) are accurate.
- [ ] All Mermaid diagrams use valid syntax with quoted special-character labels.

## 8. References to Authoritative Documentation
- `CONTRIBUTING.md` — Governance Lifecycle & Documentation Standards
- `docs/adr/` — Architecture Decision Records Index
