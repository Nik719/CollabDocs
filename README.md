# CollabDocs

A collaborative document management platform with workspaces, version history, threaded comments, tags, and audit logging.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios |
| Backend | Django 4.2, Django REST Framework |
| Database | PostgreSQL 16 (Docker) |
| Container | Docker + Docker Compose |

---

## Project Structure

```
CollabDocs/
├── docker-compose.yml          # PostgreSQL + backend containers
├── .gitignore
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                    # Local env vars (git-ignored)
│   ├── .env.example            # Reference env template
│   │
│   ├── collabdocs/             # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── middleware.py       # Request logging middleware
│   │   └── wsgi.py
│   │
│   └── api/                    # Main application
│       ├── models.py           # User, Workspace, Document, Comment, Tag, AuditLog
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── admin.py
│       ├── signals.py          # Auto audit log on Document save
│       └── migrations/
│
└── frontend/
    ├── vite.config.js          # Dev server + /api proxy to :8000
    ├── package.json
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx             # Router, global context providers
        ├── index.css
        ├── components/
        │   ├── Sidebar.jsx
        │   └── ui.jsx          # Shared UI primitives (Card, Badge, Avatar…)
        ├── hooks/
        │   └── useToast.js
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── WorkspacesPage.jsx
        │   ├── DocumentsPage.jsx
        │   ├── DocumentEditor.jsx
        │   ├── UsersPage.jsx
        │   └── AuditLogsPage.jsx
        └── services/
            └── api.js          # Axios client, all API call functions
```

---

## Data Models

```
User ──< WorkspaceMember >── Workspace ──< Document ──< DocumentVersion
                                               │
                                               ├──< Comment (threaded)
                                               └──>── Tag (M2M)

Document ──> AuditLog (via post_save signal)
```

---

## API Endpoints

### Users
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/` | Create user |
| GET | `/api/users/{id}/` | Get user by ID |

### Workspaces
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/workspaces/` | Create workspace (owner auto-added as admin) |
| GET | `/api/workspaces/` | List all workspaces |
| GET | `/api/workspaces/{id}/` | Get workspace |
| POST | `/api/workspaces/{id}/members/` | Add member |
| GET | `/api/workspaces/{id}/members/` | List members |
| GET | `/api/workspaces/{id}/summary/` | Doc count, member count, comment count |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents/` | Create document + auto version 1 |
| GET | `/api/documents/` | List (filter: `workspace`, `status`, `tag`, `search`) |
| GET | `/api/documents/{id}/` | Get document |
| PUT | `/api/documents/{id}/` | Update document + new version |
| GET | `/api/documents/{id}/versions/` | Version history |
| GET | `/api/documents/{id}/stats/` | Version count, comment count, contributor count |
| POST | `/api/documents/{id}/tags/` | Add tags |

### Comments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/comments/` | Create top-level or reply comment |
| GET | `/api/comments/?document={id}` | List threaded comments for a document |

### Tags
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tags/` | Create tag |
| GET | `/api/tags/` | List all tags |

### Audit Logs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/audit-logs/` | List logs (filter: `actor`, `from`, `to`, `model`) |

---

## Getting Started

### Prerequisites
- Docker Desktop
- Python 3.11+ with `venv`
- Node.js 18+

### 1. Clone and set up environment

```bash
git clone <repo-url>
cd CollabDocs

cp backend/.env.example backend/.env
# Edit backend/.env and set DB_PASSWORD
```

### 2. Start the PostgreSQL database

```bash
docker compose up -d db
```

### 3. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at **http://localhost:8000**

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

Vite proxies all `/api/*` requests to `http://localhost:8000`, so no CORS issues in development.

---

## Running with Docker (full stack)

```bash
docker compose up -d --build
docker exec collabdocs_backend python manage.py migrate
```

| Service | URL |
|---|---|
| Frontend (local) | http://localhost:3000 |
| Backend | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | — | Django secret key |
| `DEBUG` | `True` | Django debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DB_NAME` | `collabdocs` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_HOST` | `127.0.0.1` | Database host (`db` inside Docker) |
| `DB_PORT` | `5432` | Database port |

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
