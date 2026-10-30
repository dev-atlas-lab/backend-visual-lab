# ADR-0004: Native Google Antigravity Customizations (`.agents/` & `AGENTS.md`)

- **Status**: `ACCEPTED`
- **Date**: 2026-10-30

## Context
The development environment is **Google Antigravity**. Using non-native folder conventions (such as `.opencode/` or `.claude/`) prevents automatic discovery of rules, skills, and safety hooks.

## Decision
We use exclusively official Google Antigravity conventions:
1. Hierarchical `AGENTS.md` files (`<24 KB` per file) at root, `frontend/AGENTS.md`, and `backend/AGENTS.md`.
2. `.agents/skills.json` registering categorized progressive-disclosure Skills under `.agents/skills/{engineering,domains,learning,quality,workflows}/<name>/SKILL.md`.
3. `.agents/hooks.json` configuring a `PreToolUse` safety script (`.agents/scripts/safety-check.sh`) to guard against destructive commands and unapproved overwrites of protected governance files.

## Consequences
- **Positive**: Native progressive disclosure keeps context token usage minimal while providing deep domain and workflow runbooks on demand.
- **Trade-off**: Custom slash workflows (`/research-topic`, etc.) are routed via `AGENTS.md` to `.agents/skills/workflows/<name>/SKILL.md`.
