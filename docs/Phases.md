# Phases — CollabDocs build plan

Work one phase at a time. A phase is done only when its **acceptance criteria** pass. After each phase, update `Memory.md`.

---

## Phase 0 — Project setup

- Django project (`config`) + `api` app, DRF, CORS, PostgreSQL wired via `.env` (`.env.example` committed).
- Pinned `requirements.txt`, `.gitignore`, empty `README.md` scaffold, git repo initialized.

**Accept:** `python manage.py runserver` boots; DB connection works; `/api/` routes file exists (empty router).

## Phase 1 — Models & migrations (rubric: 20)

- All 8 models exactly per PRD §5.1: UUID PKs, TextChoices, UniqueConstraint, self-referential Comment FK, Tag M2M, correct on_delete rules.
- Migrations generated and committed.

**Accept:** `migrate` runs cleanly on a fresh DB; `makemigrations --check` clean; models verified in `shell` (create a user, workspace, document, tag; duplicate WorkspaceMember raises IntegrityError).

## Phase 2 — Users & Workspaces (5 endpoints)

- `UserViewSet`: POST `/api/users/`, GET `/api/users/{id}/` (validation on email/phone uniqueness → 400).
- `WorkspaceViewSet`: POST (atomic create + owner as admin member, override `create()`), GET detail with member_count (`annotate`), `@action members` (POST add member — 409 on duplicate; GET list with `select_related`), `@action summary` (doc/member/comment counts).

**Accept:** All 5 endpoints correct in Postman; creating a workspace produces exactly one admin WorkspaceMember; duplicate member returns 409 with a message; a forced failure mid-creation rolls back both rows.

## Phase 3 — Documents & versions (6 endpoints)

- `DocumentViewSet`: POST create + first version (atomic), PUT update → new version (atomic), GET list with filters (workspace, status, `tags__name`, title `__icontains`, `Q` OR search), `@action versions` (ordered), `@action stats` (version/comment/contributor counts), `@action tags` (POST, M2M `.add()`).
- ≥2 `SerializerMethodField`s live across serializers by end of this phase (e.g., `version_count`, `member_count`).

**Accept:** Create → version 1; two updates → versions 2, 3 with correct content snapshots; filters and search verified; stats numbers match reality; rollback test: failure during version creation leaves document unchanged.

## Phase 4 — Comments, Tags, Audit read (4 endpoints)

- `CommentViewSet`: POST (top-level or reply; validate parent belongs to same document → 400), GET `?document={id}` threaded with `select_related`.
- `TagViewSet`: POST (unique name → 400/409 handled).
- `AuditLogViewSet` (read-only): GET with `actor` and `timestamp__gte/lte` query params.

**Accept:** Reply nests under parent in response; cross-document parent rejected; tag duplicate handled; audit list filters work (will be empty until Phase 5 — seed manually to test filters).

## Phase 5 — Middleware & signals (rubric: 10)

- `RequestLoggingMiddleware` in `api/middleware.py`: prints method, path, status, duration ms; registered in `settings.py` MIDDLEWARE.
- `post_save` signal on Document in `signals.py`, connected in `AppConfig.ready()`; writes AuditLog (actor=created_by, action created/updated via `_state.adding`, model_name='Document', object_id) inside the same atomic block.

**Accept:** Console shows a log line for every request; document create writes AuditLog 'created', update writes 'updated'; failed save writes no AuditLog (rollback).

## Phase 6 — Hardening & query audit

- Sweep all endpoints: `select_related` present, no N+1 (check with `django.db.connection.queries` or debug toolbar locally — remove before commit), `values_list` where applicable, error responses per Rules §3, ≥2 custom serializer validations confirmed.

**Accept:** Checklist in Rules §2–§4 fully green; every rubric line item traceable to code.

## Phase 7 — Submission package

- Postman collection: 17 endpoints, folders (Users, Workspaces, Documents, Comments, Tags, Audit Logs), sample bodies for all POST/PUT; export JSON to repo root.
- README: setup, run, migrations, env vars, demo-video link placeholder.
- Fresh-clone test: clone → install → migrate → run → all 17 endpoints pass.
- Record demo video (5–10 min): atomic rollback on failure, middleware logs, an aggregation endpoint, AuditLog after document update. Upload to Loom/Drive, link in README.

**Accept:** All submission requirements in PRD §7 met.

## Phase 8 — Frontend: shell & workspaces

- Vite + React + Tailwind scaffold, router, API client, acting-user context.
- Screens: SelectUser (list/create users), Workspaces (list/create), WorkspaceDetail (members + roles, add member, summary stats).

**Accept:** Full workspace flow works in browser against local API; 409 duplicate-member surfaces as a friendly error; loading/error states everywhere.

## Phase 9 — Frontend: documents, comments, audit

- Documents list with filters (status, tag, search), create document.
- DocumentEditor: edit content → Save (creates version), status change, tag add, version history panel, threaded comments with reply.
- AuditLogs page with actor/date filters.

**Accept:** Editing a doc twice shows 3 versions; comment reply nests; audit page reflects edits; matches Design.md.

---

**Dependency graph:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7; frontend (8 → 9) can start any time after Phase 4, but Phase 7 is the graded deadline — prioritize it.
