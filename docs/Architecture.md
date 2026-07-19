# Architecture — CollabDocs

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | Python 3.12 | |
| Backend framework | Django 5.x + Django REST Framework | ModelViewSet + DefaultRouter |
| Database | PostgreSQL 16 | Credentials via `.env` (`python-dotenv` or `django-environ`) |
| API client | Postman | Collection committed at repo root |
| Frontend | React 18 + Vite | Plain JS (no TS) to keep it simple |
| Frontend styling | Tailwind CSS | Tokens defined in Design.md |
| Frontend data | fetch + TanStack Query (optional: plain fetch + useState) | No Redux |
| CORS | `django-cors-headers` | Needed for the React dev server |

No auth layer. The frontend sends an explicit user ID (`created_by`, `saved_by`, `author`) chosen via the acting-user switcher.

## 2. System Overview

```
┌────────────────┐        HTTP/JSON         ┌─────────────────────────────┐       ┌────────────┐
│ React SPA      │ ───────────────────────► │ Django + DRF                │ ────► │ PostgreSQL │
│ (Vite, :5173)  │ ◄─────────────────────── │ (:8000)                     │ ◄──── │            │
└────────────────┘                          │                             │       └────────────┘
     Postman ──────────────────────────────►│  RequestLoggingMiddleware   │
                                            │  → URL router (DefaultRouter)│
                                            │  → ViewSet → Serializer     │
                                            │  → Model / QuerySet         │
                                            │  post_save(Document) signal │
                                            │  → AuditLog (same txn)      │
                                            └─────────────────────────────┘
```

### Request flow (write path, e.g. PUT /api/documents/{id}/)

1. `RequestLoggingMiddleware` records start time.
2. Router dispatches to `DocumentViewSet.update()` (overridden).
3. Serializer validates payload (custom validation).
4. Inside `transaction.atomic()`: document saved → `DocumentVersion` created with `version_number = document.versions.count() + 1` → `post_save` signal fires → `AuditLog` row written (same transaction; rollback on any failure).
5. Response serialized; middleware prints `METHOD path status duration_ms`.

## 3. Data Model (ER summary)

```
User 1──* Workspace (owner)
User 1──* WorkspaceMember *──1 Workspace     [unique (workspace, user)]
Workspace 1──* Document *──1 User (created_by, SET_NULL)
Document 1──* DocumentVersion *──1 User (saved_by, SET_NULL)
Document 1──* Comment *──1 User (author, SET_NULL)
Comment 1──* Comment (parent, self-ref, SET_NULL)   [parent NULL = top-level]
Tag *──* Document (M2M declared on Tag, related_name='tags')
AuditLog *──1 User (actor, SET_NULL)                [written by signal]
```

Full field specs live in `PRD.md` §5.1 — that table is the single source of truth.

## 4. Repository Layout

Monorepo, two top-level apps:

```
collabdocs/
├── docs/                     # These planning docs
├── backend/
│   ├── manage.py
│   ├── requirements.txt      # pinned
│   ├── .env.example          # DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, SECRET_KEY, DEBUG
│   ├── .env                  # gitignored
│   ├── postman_collection.json
│   ├── README.md             # setup, run server, apply migrations, demo video link
│   ├── config/               # Django project
│   │   ├── settings.py       # env-driven DB config, MIDDLEWARE incl. custom logger, CORS
│   │   ├── urls.py           # includes api.urls under /api/
│   │   └── wsgi.py / asgi.py
│   └── api/                  # single Django app (project is small; one app keeps it cohesive)
│       ├── apps.py           # AppConfig.ready() imports signals
│       ├── models.py         # 8 models
│       ├── serializers.py    # ModelSerializers, SerializerMethodFields, custom validation
│       ├── views.py          # ViewSets + @actions
│       ├── urls.py           # DefaultRouter registration
│       ├── middleware.py     # RequestLoggingMiddleware
│       ├── signals.py        # post_save on Document → AuditLog
│       ├── filters.py        # (optional) query-param filter helpers
│       ├── migrations/
│       └── tests.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               # routes
        ├── api/client.js         # base URL + fetch helpers
        ├── context/ActingUser.jsx# acting-user state (persist in memory/localStorage)
        ├── components/           # Button, Badge, Modal, CommentThread, VersionList, ...
        └── pages/
            ├── SelectUser.jsx
            ├── Workspaces.jsx
            ├── WorkspaceDetail.jsx   # members, summary, add member
            ├── Documents.jsx         # list + filters
            ├── DocumentEditor.jsx    # edit/save, versions, comments, tags
            └── AuditLogs.jsx
```

## 5. Key Backend Decisions

| Decision | Rationale |
|---|---|
| Single `api` app | 8 tightly-coupled models; splitting into apps adds import churn with no benefit at this size |
| `ModelViewSet` everywhere, `@action` for stats/summary/versions/tags/members | Required by brief; no raw `APIView` where a ViewSet fits |
| Override `create()`/`update()` in ViewSet (or serializer) for atomic flows | Keeps `transaction.atomic()` at the entry point covering signal writes too |
| version_number = `versions.count() + 1` inside the atomic block | Per-document numbering without a global counter, as specified |
| Signal in `signals.py`, connected in `AppConfig.ready()` | Brief requirement; `instance._state.adding` distinguishes created/updated |
| Email as `CharField(254, unique=True)` not `EmailField` | Explicit brief requirement — do not "fix" this |
| M2M declared on `Tag` with `related_name='tags'` | Brief requirement; `doc.tags` / `tag.documents` both work |
| `IntegrityError` on duplicate member → HTTP 409 | Brief requirement; also pre-check with `exists()` for a clean message |
| `select_related` on member/comment/document list queries | Avoids N+1; rubric item |

## 6. Environment & Run

```
# backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                               # fill DB creds
python manage.py migrate
python manage.py runserver                         # :8000

# frontend
cd frontend
npm install
npm run dev                                        # :5173, proxies /api → :8000
```

`.env` keys: `SECRET_KEY`, `DEBUG`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `CORS_ALLOWED_ORIGINS`.
