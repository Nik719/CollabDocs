# CollabDocs

A collaborative document management platform designed as a simplified, high-performance hybrid of Notion and Google Docs. It allows users to manage workspaces with role-based member permissions, create versioned documents with full history, write threaded nested comments, organize documents via tags, and automatically log system events using audit logs.

The project is structured as a monorepo consisting of:
1. A **Django REST Framework API** backend.
2. A **React SPA** (Vite-powered) frontend.

---

## Tech Stack

| Layer | Technology | Version / Details |
|---|---|---|
| **Backend** | Python, Django, Django REST Framework | Python 3.11+, Django 5.1, DRF 3.15 |
| **Database** | PostgreSQL | PostgreSQL 16 (Local / Cloud) |
| **Frontend** | React, Vite | React 18, Vite Dev Server |
| **Styling** | Vanilla CSS | Custom design tokens (Typography, Grids, Indigo theme) |
| **API Client** | Postman | Pre-configured environment & collection |

---

## Key Architecture & Features

- **Auth-Less Role Switcher**: To keep the system lightweight and API-focused, explicit auth is bypassed in favor of an **Acting User Switcher** in the UI. The frontend sends the selected user's UUID in payloads (`created_by`, `saved_by`, `author`) to simulate permissions and roles.
- **Transaction Atomicity**: Document creation/updating and Workspace creation are executed inside Django `transaction.atomic()` blocks. If any sub-operation fails (e.g., version creation fails, or signal crashes), the entire transaction rolls back to prevent database corruption.
- **Automated Audit Logging via Signals**: A custom Django signal fires `post_save` on `Document`. It determines whether the document was created or updated using the `instance._state.adding` flag, writing a row to the `AuditLog` table within the same transaction.
- **Custom Request Logging Middleware**: `RequestLoggingMiddleware` intercepts every incoming HTTP request and outputs a structured log string: `[Timestamp] METHOD path status_code duration_ms` to the console for real-time traffic monitoring.
- **N+1 Query Optimizations**: Heavy endpoints like listing workspaces or documents use prefetching, `select_related`, and database annotations (`Count`) to compile all workspace stats, members, and documents in a minimal number of queries.

---

## Data Model (Entity Relationship Summary)

```
       ┌──────────┐ 1      * ┌───────────┐
       │   User   │─────────►│  AuditLog │ (Logged automatically by signals)
       └────┬─────┘          └───────────┘
            │ 1
            │
            ├───────────────┐
            │ *             │ *
       ┌────▼─────┐ 1     * │
       │Workspace │◄────────┼────────────────────────┐
       └────▲─────┘         │                        │
            │ 1             │                        │
            │               │                        │
            │ *             │ *                      │ *
     ┌──────┴──────┐  ┌─────▼────┐ 1        * ┌──────┴──────┐
     │  Workspace  │  │ Document │───────────►│   Comment   │ (Threaded replies
     │   Member    │  └─────▲────┘            └──────┬──────┘  via parent_id self-ref)
     └─────────────┘        │ 1                      │ *
                            │                        ▼
                            │ *               ┌─────────────┐
                      ┌─────┴─────┐           │   Comment   │ (Child Reply)
                      │  Document │           └─────────────┘
                      │  Version  │
                      └───────────┘
                            * \             / *
                               \┌─────────┐/
                                │   Tag   │ (ManyToMany association)
                                └─────────┘
```

---

## Project Directory Layout

```
CollabDocs/
├── collabdocs_postman.json      # Postman API Collection (19 requests / 17 endpoints)
├── .gitignore                   # Excludes caches, builds, environments & dev assets
├── README.md                    # Root project documentation (this file)
│
├── backend/                     # Django REST Framework Monolith
│   ├── manage.py                # Django CLI entrypoint
│   ├── requirements.txt         # Production runtime dependencies
│   ├── requirements-dev.txt     # Development/testing dependencies
│   ├── .env.example             # Template for local environment variables
│   │
│   ├── config/                  # Settings, routing, and WSGI/ASGI configuration
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py          # Primary backend config (PostgreSQL, custom middleware)
│   │   ├── settings_test.py     # SQLite setting overrides for fast testing suites
│   │   ├── urls.py              # Root router mapping `/api/`
│   │   └── wsgi.py
│   │
│   ├── api/                     # Main Django Application
│   │   ├── apps.py              # Application config & Signal wiring
│   │   ├── models.py            # All 8 Django DB Models
│   │   ├── serializers.py       # DRF serializers (custom validation, calculations)
│   │   ├── views.py             # DRF ViewSets & custom actions
│   │   ├── urls.py              # DefaultRouter configurations
│   │   ├── middleware.py        # Request logging middleware
│   │   ├── signals.py           # post_save hooks generating AuditLog records
│   │   ├── filters.py           # Custom parsing & validation for GET filters
│   │   └── tests/               # 71 Unit and Integration tests
│   │
│   └── scripts/                 # Utility scripts (smoke testing & database seeding)
│       ├── seed_data.py         # Seeds DB with workspaces, users, docs, & comments
│       └── smoke_test.py        # Automated API checks against running server
│
└── frontend/                    # Vite + React Client
    ├── index.html               # Main index file
    ├── package.json             # Package scripts & dependencies
    ├── vite.config.js           # Vite dev server configurations & API Proxy
    │
    └── src/                     # React Source
        ├── main.jsx             # React DOM entry
        ├── App.jsx              # Routing, layout, pages, and active user context
        ├── index.css            # Base typography & CSS custom variable utility classes
        ├── services/
        │   └── api.js           # Customized fetch API client wrapper
        ├── components/
        │   └── Sidebar.jsx      # Navigation, Active user card, role switcher
        └── pages/
            ├── UsersPage.jsx      # Create users, copy UUIDs, switch active identity
            ├── WorkspacesPage.jsx # Manage workspaces, add members, view summary stats
            ├── DocumentsPage.jsx  # Card grids, full-text search, state/tag filters
            ├── DocumentEditor.jsx # Content updates, version timeline, threaded commenting
            └── AuditLogsPage.jsx  # System activities logs list with actor/date filters
```

---

## API Documentation (17 Endpoints)

The API is fully structured around standard REST verbs and handles JSON payloads.

### 1. Users
*   **POST** `/api/users/` - Creates a new user profile.
*   **GET** `/api/users/{id}/` - Fetches profile details of a user by UUID.

### 2. Workspaces
*   **POST** `/api/workspaces/` - Creates a workspace. The creator is automatically added as an `Admin` member.
*   **GET** `/api/workspaces/{id}/` - Retrieves detailed information about a workspace (including member counts).
*   **GET** `/api/workspaces/{id}/members/` - Lists all members of a workspace.
*   **POST** `/api/workspaces/{id}/members/` - Adds a user to a workspace with a designated role (`admin`, `editor`, `viewer`).
*   **GET** `/api/workspaces/{id}/summary/` - Aggregates stats (document count, member count, total comment count).

### 3. Documents
*   **POST** `/api/documents/` - Creates a document. Automatically creates Version 1 inside an atomic transaction.
*   **GET** `/api/documents/` - Retrieves a list of documents. Supports complex querying.
*   **PUT** `/api/documents/{id}/` - Updates a document. Creates a new version snapshot (`version_number = count + 1`) atomically.
*   **GET** `/api/documents/{id}/versions/` - Returns the chronological list of all saved snapshots for the document.
*   **GET** `/api/documents/{id}/stats/` - Aggregates document statistics (version count, comments, unique contributors).
*   **POST** `/api/documents/{id}/tags/` - Assigns tags to a document.

### 4. Comments
*   **POST** `/api/comments/` - Adds a comment. Supports root comments or replies to existing threads.
*   **GET** `/api/comments/?document={id}` - Retrieves all threaded comments for a document in hierarchical tree format.

### 5. Tags
*   **POST** `/api/tags/` - Creates a global tag.
*   **GET** `/api/tags/` - Lists all global tags.

### 6. Audit Logs
*   **GET** `/api/audit-logs/` - Fetches system audit trails.

---

### Query Filters

*   **GET /api/documents/**:
    *   `workspace` — (UUID) Filter documents belonging to a workspace.
    *   `status` — (`draft`, `published`, `archived`) Filter by state.
    *   `tag` — (String) Filter by tag name (case-insensitive contains).
    *   `search` — (String) Searches text in both `title` and `content` fields.
*   **GET /api/audit-logs/**:
    *   `actor` — (UUID) Logs initiated by a specific user.
    *   `from` — (ISO Date: `YYYY-MM-DD`) Start time boundary.
    *   `to` — (ISO Date: `YYYY-MM-DD`) End time boundary.
    *   `model` — (String) Filter by model class name (e.g. `Document`).

---

## Local Development Setup

### Prerequisites
- Python 3.11 or higher
- Node.js (v18+) & npm
- PostgreSQL 16

---

### Backend Setup

1.  **Navigate into the backend directory**:
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv
    # Windows (PowerShell):
    venv\Scripts\Activate.ps1
    # macOS/Linux:
    source venv/bin/activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Create your local `.env` configuration**:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in your PostgreSQL credentials. Ensure you have created the DB:
    ```bash
    psql -U postgres -c "CREATE DATABASE collabdocs;"
    ```

5.  **Run migrations**:
    ```bash
    python manage.py migrate
    ```

6.  **Seed the Database (Optional but recommended)**:
    ```bash
    python manage.py shell < scripts/seed_data.py
    ```

7.  **Start the development API server**:
    ```bash
    python manage.py runserver 127.0.0.1:8000
    ```
    The API will run at `http://127.0.0.1:8000/api/`.

---

### Frontend Setup

1.  **Navigate into the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install node packages**:
    ```bash
    npm install
    ```

3.  **Start the Vite development server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser. Vite is pre-configured to proxy `/api/` traffic automatically to the local Django server running on port `8000`.

---

## Running the Test Suites

### Backend Unit Tests
We use an in-memory SQLite database configuration to run tests rapidly without polluting your local PostgreSQL instance:
```bash
cd backend
python manage.py test api --settings=config.settings_test
```
This runs the full suite containing **71 test cases** covering model integrity, atomic rollbacks, version increments, audit signals, and middleware output format.

### Smoke Tests
To verify live API responses against a running development server:
1. Ensure the Django server is running locally (`python manage.py runserver`).
2. Open another terminal and execute:
   ```bash
   cd backend
   python scripts/smoke_test.py
   ```
This script validates **26 distinct acceptance checks** directly calling the endpoints and confirming response codes.

---

## Postman Integration

A ready-to-import Postman collection is located at the root of the project: [collabdocs_postman.json](file:///c:/Users/nikhi/OneDrive/Desktop/CollabDocs/collabdocs_postman.json).

1.  Import `collabdocs_postman.json` into Postman.
2.  Add a Postman Environment containing the following variable:
    -   `base_url`: `http://127.0.0.1:8000/api`
3.  As you perform requests, dynamically save returned UUIDs as environment variables (`user_id`, `workspace_id`, `document_id`) to run successive requests seamlessly.

---

## Aesthetics & Styling

The frontend does not rely on heavy CSS frameworks like Tailwind. Instead, it utilizes clean **Vanilla CSS** coupled with semantic design tokens in [index.css](file:///c:/Users/nikhi/OneDrive/Desktop/CollabDocs/frontend/src/index.css):
-   **Grid & Layout**: Follows an 8pt layout grid ensuring alignment.
-   **Color Palette**: Harmonious indigo theme (indigo-600 accents, background shades, badge tints).
-   **Typography**: Clean typeface settings using modern web-safe fonts (Inter/System Sans-Serif).
-   **Interactive states**: Smooth transitions, hover cards, clear validation badges, and distinct "Acting User" panels.

---

## Production Build & Git Hygiene

For production environments, all non-runtime development artifacts, caches, and local configurations are ignored.

To prepare the React application for production deployment:
```bash
cd frontend
npm run build
```
This creates a optimized, minified bundle inside the `dist/` directory.

To prepare the Django API backend for production:
1. Turn off `DEBUG` mode in `.env` (`DEBUG=False`).
2. Run standard static asset collection:
   ```bash
   python manage.py collectstatic
   ```


## Demo Video

Insert a demo video demonstrating core functionality (e.g. role switching, version control, nested comments, and middleware audit logs in the terminal console) before final submission:

> 📹 **[Click here to view the CollabDocs walkthrough demo video]** *(Add URL here)*
