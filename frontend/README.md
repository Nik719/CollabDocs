# CollabDocs — Frontend

A React single-page app that provides a clean UI for the CollabDocs API.

## Tech Stack

- React 18 + Vite
- React Router DOM v6
- Axios for API calls
- Custom design system (8pt grid, Inter typeface, semantic tokens)

## Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000` and proxies all `/api` requests to `http://localhost:8000` (Django backend).

## Pages

- **Dashboard** — Stats overview, recent documents, activity feed
- **Workspaces** — Create workspaces, manage members, view summary stats
- **Documents** — Browse/filter documents, create new ones, view cards
- **Document Editor** — Full editor with version history, comments, tag management
- **Users** — Create users, look up by UUID, copy IDs
- **Audit Logs** — Filter and browse all system events

## Prerequisites

Make sure the Django backend is running at `http://localhost:8000` with a connected PostgreSQL database.
