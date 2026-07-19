# CollabDocs — Backend API

A collaborative document platform API built with Django REST Framework. Users can create workspaces, invite collaborators, write versioned documents, leave threaded comments, and control access with role-based permissions.

## Tech Stack

- Python 3.11+
- Django 5.1
- Django REST Framework 3.15
- PostgreSQL
- python-dotenv

## Setup

### 1. Clone & create a virtual environment

```bash
git clone <repo-url>
cd collabdocs/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 4. Create the PostgreSQL database

If the local `psql` client is not installed on your machine, use the Docker PostgreSQL service that ships with this project:

```bash
docker compose up -d db
docker compose exec -T db psql -U postgres -d postgres -c "CREATE DATABASE collabdocs;"
```

If you already have `psql` installed locally, the shorter command also works:

```bash
psql -U postgres -c "CREATE DATABASE collabdocs;"
```

### 5. Apply migrations

```bash
python manage.py migrate
```

### 6. Load shared seed data

Postgres itself isn't something git can track, so the repo carries `api/fixtures/seed_data.json` — a Django fixture dump of the current data (users, workspaces, documents, versions, tags) instead. On a **fresh** clone, load it once, right after migrating:

```bash
python manage.py loaddata api/fixtures/seed_data.json
```

Run this exactly once against an empty database. `AuditLog` is deliberately left out of the fixture: `Document`'s `post_save` signal writes an audit-log row on every save, including the ones `loaddata` performs while deserializing — so loading it into a fresh DB naturally (and correctly) produces one `created` entry per document. Re-running `loaddata` against a DB that already has this data re-triggers that signal for every document again (Django's deserializer always looks like a fresh save), which piles up extra `created` audit-log rows each time — so don't re-run it once your local DB already has the seed data loaded.

**Keeping it up to date:** whenever you've changed data locally that teammates should see (new users, workspaces, documents, etc.), re-export before you push:

```bash
python scripts/update_seed.py
```

Then commit the updated `api/fixtures/seed_data.json` along with your other changes. This should become routine at the end of any session that touched data — otherwise a fresh clone will pull stale seed data.

### 7. Run the development server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.

---

## API Endpoints (17 total)

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/` | Create a user |
| GET | `/api/users/{id}/` | Get user by ID |

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces/` | Create workspace (owner auto-added as admin) |
| GET | `/api/workspaces/{id}/` | Get workspace with member count |
| POST | `/api/workspaces/{id}/members/` | Add a member with a role |
| GET | `/api/workspaces/{id}/members/` | List all members |
| GET | `/api/workspaces/{id}/summary/` | Doc count, member count, total comments |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/` | Create document + first version (atomic) |
| PUT | `/api/documents/{id}/` | Update document → saves new version (atomic) |
| GET | `/api/documents/` | List docs (filter: workspace, status, tag, search) |
| GET | `/api/documents/{id}/versions/` | All versions in order |
| GET | `/api/documents/{id}/stats/` | Version count, comment count, contributor count |
| POST | `/api/documents/{id}/tags/` | Add tags to a document |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments/` | Add top-level comment or reply |
| GET | `/api/comments/?document={id}` | List threaded comments for a document |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tags/` | Create a tag |
| GET | `/api/tags/` | List all tags |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs/` | Logs filtered by actor, date range, model |

---

## Query parameters

**GET /api/documents/**
- `workspace` — filter by workspace UUID
- `status` — `draft`, `published`, or `archived`
- `tag` — filter by tag name (case-insensitive contains)
- `search` — full-text search on title and content

**GET /api/audit-logs/**
- `actor` — filter by user UUID
- `from` — ISO date string (e.g. `2024-01-01`)
- `to` — ISO date string
- `model` — filter by model name (e.g. `Document`)

---

## Architecture highlights

- **Transactions** — workspace creation and document save/version creation each wrapped in `transaction.atomic()`
- **Signals** — `post_save` on `Document` auto-writes `AuditLog` entries via `signals.py`, connected in `ApiConfig.ready()`
- **Middleware** — `RequestLoggingMiddleware` logs method, path, status code, and duration (ms) for every request
- **Constraints** — `UniqueConstraint` on `WorkspaceMember(workspace, user)`; `IntegrityError` caught and returns `409`
- **Query optimisation** — `select_related` on all nested serialisers, `annotate(Count(...))` on workspace/document endpoints, `Q` objects for OR filtering on document list

---

## Running the tests

```bash
python manage.py test api --settings=config.settings_test
```

Runs the full suite (71 tests) on in-memory SQLite — no Postgres server needed.
Dev and production always use PostgreSQL via `.env`.

---

## Demo Video

> 📹 **[Demo video link — add before submission]** (Loom / Google Drive)
>
> Shows: Postman walkthrough, one atomic transaction rolling back on failure,
> middleware logs in the console, an aggregation endpoint, and the AuditLog
> entry written by the signal after a document update.

---

## Postman Collection

Import `collabdocs_postman.json` from the repository root into Postman. Set the `base_url` variable to `http://localhost:8000/api` and update `user_id`, `workspace_id`, `document_id` as you create resources.
