# Memory — CollabDocs (AI session log)

> **Purpose:** persistent context between AI sessions. The AI must read this file at the start of every session and update it after completing each phase (per Rules.md §5). Do not re-read the whole codebase if this file answers your question.
>
> **Status: no coding has started yet.** Docs (PRD, Architecture, Rules, Phases, Design) were finalized 2026-07-19.

## Current state

- **Current phase:** Phase 0 (not started)
- **Last completed phase:** none
- **Repo state:** docs only, no backend/frontend code yet

## How to update this file (template per phase)

```
## Phase N — <name> · <date> · <status: done/partial>
- What was built: ...
- Files touched: ...
- Deviations from spec (and why): ...
- Decisions made not covered by docs: ...
- Known issues / TODOs carried forward: ...
- How it was verified: ...
```

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-07-19 | Backend + simple React frontend; auth explicitly out of scope | User choice; brief is API-only, frontend is extra/ungraded |
| 2026-07-19 | Frontend uses "acting user" switcher instead of login | No auth in spec; user ID sent as created_by/saved_by/author |
| 2026-07-19 | Monorepo: backend/ + frontend/; single `api` Django app | Small tightly-coupled domain |

## Known gotchas (read before coding)

- `User.email` is CharField, not EmailField — intentional, don't fix.
- version_number = `versions.count() + 1` inside the atomic block — no other scheme.
- Tag↔Document M2M declared on Tag, `related_name='tags'`.
- AuditLog signal must fire inside the same transaction as the Document save.
- django-filter is banned — manual filtering only.

## Phase log

*(empty — append entries here as phases complete)*
