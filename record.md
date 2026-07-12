
---

## Demo Recording — Terminal Commands

Exact commands for this machine. Run each block in its own terminal tab/pane.

> **Note on ports:** this machine has a system-level PostgreSQL already listening on
> `5432`, so the project's root `.env` pins `DB_PORT=5433` for Docker Compose (the
> `${DB_PORT:-5432}:5432` mapping in `docker-compose.yml` picks it up automatically).
> Nothing to do here — `docker compose up -d db` just works. On a clean machine with
> `5432` free, you can delete the root `.env` and it'll default to `5432`.

### 1. Fresh state (optional — do this if you want a clean/empty demo)

```bash
cd /Users/nikhil/Desktop/CollabDocs
docker compose down -v
docker compose up -d db
cd backend && source venv/bin/activate && python manage.py migrate
```

### 2. Start the database (skip if already running from step 1)

```bash
cd /Users/nikhil/Desktop/CollabDocs
docker compose up -d db
```

### 3. Start the backend

```bash
cd /Users/nikhil/Desktop/CollabDocs/backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```

Backend runs at **http://localhost:8000** — keep this terminal visible on screen; the
custom middleware (`collabdocs/middleware.py`) logs every request here as
`[CollabDocs] METHOD /path/ → status (Xms)`.

### 4. (Optional) start the frontend, if showing the UI as well as Postman

```bash
cd /Users/nikhil/Desktop/CollabDocs/frontend
npm run dev
```

Frontend runs at **http://localhost:3000**.

### 5. Import Postman collection

Import `collabdocs_postman.json` from the repo root. It already has:
- `base_url` variable set to `http://localhost:8000/api` (matches step 3, no edits needed)
- All 20 documented endpoints across 6 folders (Users, Workspaces, Documents, Comments, Tags, Audit Logs)
- Auto-chaining: the 5 "Create" requests (User, Workspace, Document, Comment, Tag) save
  the new `id` into the matching collection variable automatically — no manual copy/paste
- A **"Seed Data (20 Indian Users)"** folder — optional, run it via Collection Runner if
  you want a populated demo instead of starting from an empty list

### 6. Rehearse the rollback demo once before recording

In `backend/api/services.py`, inside `create_workspace_with_owner`, temporarily add
`raise Exception("simulating mid-transaction failure")` right after `workspace = serializer.save()`,
save (the dev server auto-reloads), fire the `POST /api/workspaces/` request to see the
500 + rollback, then remove the line, save again, and re-fire to show it succeeding.

### 7. Stop everything after recording

```bash
docker compose down          # keep data
docker compose down -v       # or wipe the volume entirely
```

---

## Demo Video

_Link goes here after recording — upload to Loom or Google Drive with link-sharing on._

📺 **[Watch the demo](#)** _(replace this link)_

---

## Testing & Code Quality

The test suite runs against in-memory SQLite — no database container needed:

```bash
cd backend
python manage.py test api        # 72 unit/integration tests

python scripts/smoke_test.py     # end-to-end check of every endpoint

pip install -r requirements-dev.txt
ruff check api collabdocs manage.py   # lint
```

---

## Useful Commands

```bash
# Run migrations
python manage.py migrate

# Create Django superuser
python manage.py createsuperuser

# Django admin panel
open http://localhost:8000/admin

# View container logs
docker compose logs -f

# Stop all containers
docker compose down

# Stop and wipe database volume
docker compose down -v
```
