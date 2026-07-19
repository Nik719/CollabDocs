# PRD — CollabDocs

**Version:** 1.0 · **Date:** 2026-07-19 · **Source:** Airtribe Backend-Python Module 10 project brief
**Status:** Approved for build

---

## 1. Overview

CollabDocs is a collaborative document platform — a simplified Notion/Google Docs. Users create **workspaces**, invite **members with roles**, write **documents that are versioned on every save**, leave **threaded comments**, organize with **tags**, and every document change is recorded in an **audit log**.

The core deliverable is the **backend API** (Django REST Framework + PostgreSQL), which is graded against the rubric in §8. A **simple React frontend** is an additional, ungraded deliverable that consumes the same API.

## 2. Goals & Non-Goals

**Goals**

1. Ship all 17 API endpoints, fully working and Postman-tested.
2. Data integrity: atomic transactions for workspace creation and document save + version.
3. Automatic audit trail via Django signals.
4. Request logging via custom middleware.
5. A minimal frontend demonstrating the full workflow end to end.

**Non-Goals**

- Authentication / login (out of scope per brief — the frontend uses an "acting user" switcher instead, see §5.3).
- Real-time collaboration (websockets, live cursors).
- File uploads, rich-text/WYSIWYG editing (plain text content only).
- Notifications, email, search beyond `icontains` filtering.
- Permission *enforcement* middleware — roles are stored data (admin/editor/viewer); the API validates membership constraints but does not gate every action by role.

## 3. Target Users

| Persona | Description | Primary needs |
|---|---|---|
| **Workspace owner** | Creates a workspace, administers members | Create workspace, add/remove members with roles, see workspace summary |
| **Editor** | Writes and maintains documents | Create/edit documents, see version history, tag documents |
| **Viewer / reviewer** | Reads and gives feedback | Browse documents, filter/search, comment and reply |
| **Grader / API consumer** | Evaluates via Postman | Predictable REST endpoints, correct status codes, meaningful errors |

## 4. Core User Stories

1. As a user, I can create a workspace and I'm automatically its admin member (single atomic operation).
2. As an admin, I can add members with a role (admin / editor / viewer); adding the same user twice returns a clear 409 error.
3. As an editor, every time I save a document a new immutable version is created, numbered per document (1, 2, 3…).
4. As any user, I can view a document's full version history in order.
5. As a user, I can comment on a document and reply to comments (one level of threading via parent).
6. As a user, I can tag documents and filter the document list by tag, status, workspace, or title search.
7. As a stakeholder, I can view workspace summary stats (doc count, member count, total comments) and document stats (version count, comment count, contributor count).
8. As an auditor, every document create/update is automatically logged (actor, action, model, object id, timestamp), filterable by actor and date range.

## 5. Feature Requirements

### 5.1 Data models (8 — all PKs are `UUIDField`, `uuid.uuid4`, `editable=False`)

| # | Model | Key fields | Constraints / behavior |
|---|---|---|---|
| 1 | **User** | first_name, last_name (CharField 50), email (CharField 254, unique — *not* EmailField), phone (CharField 15, unique), created_at | |
| 2 | **Workspace** | name (255), owner → User (CASCADE), is_active (default True), created_at | On creation, owner auto-added as WorkspaceMember with role=admin, inside one `transaction.atomic()` |
| 3 | **WorkspaceMember** | workspace → Workspace (CASCADE), user → User (CASCADE), role (TextChoices: admin/editor/viewer), joined_at | `UniqueConstraint(fields=['workspace','user'], name='unique_workspace_member')` in Meta |
| 4 | **Document** | title (255), content (TextField), workspace → Workspace (CASCADE), created_by → User (SET_NULL, null=True), status (TextChoices: draft/published/archived), updated_at (auto_now) | Every save creates a DocumentVersion in the same `transaction.atomic()` block |
| 5 | **DocumentVersion** | document → Document (CASCADE), content (snapshot), version_number (PositiveIntegerField), saved_by → User (SET_NULL, null=True), saved_at | version_number = `Document.versions.count() + 1` computed inside the atomic block (per-document numbering) |
| 6 | **Comment** | document → Document (CASCADE), author → User (SET_NULL, null=True), content, parent → self (null=True, blank=True, SET_NULL, related_name='replies'), created_at | parent=None ⇒ top-level comment |
| 7 | **Tag** | name (100, unique), documents = `ManyToManyField(Document, related_name='tags', blank=True)` — declared on Tag | |
| 8 | **AuditLog** | actor → User (SET_NULL, null=True), action (50, e.g. 'created'/'updated'), model_name (100), object_id (100, UUID as string), timestamp | Written automatically by a `post_save` signal on Document; use `instance._state.adding` to distinguish created vs updated |

### 5.2 API endpoints (17 — DRF ModelViewSets + `@action`)

All endpoints return correct HTTP status codes and meaningful error messages.

**Users**

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/users/` | Create user (validation) |
| GET | `/api/users/{id}/` | Get user by ID |

**Workspaces**

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/workspaces/` | Create workspace + auto-add owner as admin member (atomic, override `create()`) |
| GET | `/api/workspaces/{id}/` | Workspace detail with member count (`annotate` + `Count`) |
| POST | `/api/workspaces/{id}/members/` | Add member with role (handle UniqueConstraint → 409) |
| GET | `/api/workspaces/{id}/members/` | List members with roles (`select_related`, nested serializer) |
| GET | `/api/workspaces/{id}/summary/` | Doc count, member count, total comments (`@action`, `aggregate`/`annotate`) |

**Documents**

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/documents/` | Create document + first version (atomic) |
| PUT | `/api/documents/{id}/` | Update content — saves a new version (atomic, override `update()`) |
| GET | `/api/documents/` | List — filter by workspace, status, tag name; search title (`Q` objects, `__icontains`) |
| GET | `/api/documents/{id}/versions/` | All versions in order (`filter`, `order_by`) |
| GET | `/api/documents/{id}/stats/` | Version count, comment count, contributor count (`@action`, aggregation) |
| POST | `/api/documents/{id}/tags/` | Add one or more tags (`@action`, M2M `.add()`) |

**Comments**

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/comments/` | Add top-level comment or reply (self-referential FK validation) |
| GET | `/api/comments/?document={id}` | List all comments for a document, threaded (`select_related`) |

**Tags & Audit Logs**

| Method | Endpoint | Behavior |
|---|---|---|
| POST | `/api/tags/` | Create tag (unique-constraint handling) |
| GET | `/api/audit-logs/` | Filter by actor ID and date range (`__gte`/`__lte` query params) |

### 5.3 Frontend (additional scope, ungraded)

A minimal React SPA consuming the API above. Since there is no auth, the app has an **"acting user" switcher**: the user selects who they are from `/api/users/`; that user's ID is sent as `created_by` / `saved_by` / `author` on writes and persisted in app state.

Screens: user select, workspace list + create, workspace detail (members, summary stats, add member), document list (filters: status/tag/search), document editor (edit → save = new version), version history, comments panel (threaded, reply), tags, audit log viewer. Details in `Design.md`.

## 6. Technical Requirements (from brief §4)

- PostgreSQL via `.env` — never hardcode credentials; commit `.env.example` only.
- All enums via TextChoices; no raw strings.
- `select_related` on every endpoint returning nested user/workspace/document data.
- `filter()` lookups (`gte`, `lte`, `in`, `icontains`) on all filterable list endpoints; `Q` objects for OR on the document list.
- `aggregate()`/`annotate()` with `Count` in at least 3 endpoints; `values_list()` where only IDs are needed.
- At least two `SerializerMethodField` uses and custom validation in at least two serializers.
- Transactions: workspace+member, document+version, and AuditLog in the same atomic block as the action it records.
- Handle `DoesNotExist` and `IntegrityError` explicitly (duplicate member → 409).
- Custom request-logging middleware: method, path, status code, duration ms — registered in settings.
- `post_save` signal on Document in `signals.py`, connected in `AppConfig.ready()`.
- All migrations committed and applying cleanly from scratch.

## 7. Deliverables & Acceptance

1. **GitHub repo (public):** full source, `.env.example`, pinned `requirements.txt`, clean migrations, README (setup, run, migrate), Postman collection at repo root.
2. **Postman collection:** all 17 endpoints, sample bodies for every POST/PUT, organized in folders (Users, Workspaces, Documents, Comments, Tags, Audit Logs).
3. **Demo video (5–10 min, Loom/Drive link in README):** Postman walkthrough showing an atomic transaction rollback on failure, middleware logs in console, an aggregation endpoint, and AuditLog written by the signal after a document update.
4. **Frontend app** (extra): runs locally, exercises the full workflow.

## 8. Success Metrics (marking rubric, /100)

| Area | Marks |
|---|---|
| Models & migrations (UUID PKs, TextChoices, UniqueConstraint, self-ref FK, M2M, clean migrations) | 20 |
| Serializers & validation (2× SerializerMethodField, custom validators, error messages, status codes) | 15 |
| ViewSets & routing (ModelViewSet, @action, override create/update, DefaultRouter) | 15 |
| QuerySets & filtering (select_related, lookups, Q objects, values_list, query params) | 15 |
| Aggregations (aggregate/annotate + Count in ≥3 endpoints) | 10 |
| Transactions & integrity (atomic flows, AuditLog same block, DoesNotExist/IntegrityError) | 10 |
| Middleware & signals (working logger, post_save AuditLog, correct registration) | 10 |
| Code quality & setup (README, .env.example, requirements.txt, structure) | 5 |

## 9. Open Questions

- None blocking. Frontend styling decisions delegated to `Design.md`; technical decisions to `Architecture.md`.
