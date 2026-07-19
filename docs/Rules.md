# Rules — CollabDocs (AI coding boundaries)

These rules are binding for any AI agent working on this repo. When a rule conflicts with a "better practice," **follow the rule** — several exist because the grading rubric demands them.

## 1. Libraries

**Allowed (backend):** Django 5.x, djangorestframework, psycopg2-binary, python-dotenv (or django-environ), django-cors-headers. Nothing else without asking.

**Allowed (frontend):** react, react-dom, react-router-dom, @tanstack/react-query (optional), tailwindcss, lucide-react (icons). Nothing else without asking.

**Forbidden:**

- Any auth library (djangorestframework-simplejwt, allauth, etc.) — auth is out of scope.
- django-filter — write filtering manually with `filter()`, lookups, and `Q` objects (rubric tests this).
- drf-spectacular/swagger, celery, redis, docker — out of scope.
- Frontend: Redux, MUI/AntD/Chakra, axios (use fetch), TypeScript.
- Never add a dependency to `requirements.txt`/`package.json` without pinning the version.

## 2. Non-negotiable spec rules (do NOT "improve" these)

1. All PKs: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` — never AutoField.
2. `User.email` is `CharField(max_length=254, unique=True)` — **not** `EmailField`. This is intentional.
3. All enums use `TextChoices` (`Document.status`, `WorkspaceMember.role`) — no raw string constants.
4. `WorkspaceMember` Meta: `UniqueConstraint(fields=['workspace','user'], name='unique_workspace_member')`.
5. Comment.parent: `ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')`.
6. Tag↔Document M2M is declared **on Tag**: `ManyToManyField(Document, related_name='tags', blank=True)`.
7. `version_number` = `Document.versions.count() + 1` computed **inside** the atomic block. No global counters, no max()+1 alternatives.
8. Every document save (create and update) creates a `DocumentVersion` in the **same** `transaction.atomic()` block.
9. Workspace create + owner-as-admin member in a **single** `transaction.atomic()`.
10. AuditLog written via `post_save` signal on Document, in `signals.py`, connected in `AppConfig.ready()`, using `instance._state.adding` — and it must land inside the same atomic block as the save it records.
11. Use `ModelViewSet` for standard CRUD and `@action` for stats/summary/versions/tags/members. No raw `APIView` where a ViewSet fits.
12. Exactly the 17 endpoints in PRD §5.2 under `/api/`. Do not add, rename, or restructure paths.

## 3. Error handling

- Every error response: correct HTTP status + JSON body `{"error": "<meaningful message>"}` (or DRF's field-error dict for validation).
- 400 — validation failures (serializer errors are fine).
- 404 — catch `Model.DoesNotExist` explicitly (or use `get_object_or_404`) with a message naming the resource.
- 409 — `IntegrityError` on duplicate WorkspaceMember (catch it; don't let it 500).
- Never return a bare 500 for a predictable failure; never swallow exceptions silently.
- Custom validation in at least two serializers (e.g., reject empty document title; reject comment whose `parent` belongs to a different document).

## 4. Query discipline

- `select_related` on every queryset returning nested user/workspace/document data.
- List endpoints support filters via query params using `filter()` lookups (`gte`, `lte`, `in`, `icontains`).
- Document list: `Q` objects for OR search.
- ≥3 endpoints use `aggregate()`/`annotate()` with `Count` (workspace detail, workspace summary, document stats).
- Use `values_list()` where only IDs are needed.
- No queries in loops (no N+1). No `.all()` then Python-side filtering.

## 5. Workflow rules for the AI

- Follow `Phases.md` strictly — one phase at a time; do not start the next phase until acceptance criteria pass.
- After completing a phase, update `Memory.md` (progress, decisions, deviations) before anything else.
- Never edit committed migration files; create new migrations. Migrations must apply cleanly from scratch.
- Never commit `.env`; keep `.env.example` in sync when adding a variable.
- Don't invent fields, models, or endpoints not in the PRD. If the spec is ambiguous, ask the user — don't guess.
- Don't refactor across phases "while you're at it." Small, phase-scoped changes only.
- Run `python manage.py makemigrations --check` and hit changed endpoints (curl/Postman) before declaring a phase done.
- Frontend must handle loading and error states for every fetch — no blank screens on failure.
