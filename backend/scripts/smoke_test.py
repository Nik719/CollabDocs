"""
End-to-end smoke test: exercises all 17 API endpoints from the brief through
the full request/response stack (middleware included).

Runs against a throwaway SQLite database so it needs no running PostgreSQL —
useful as a quick post-change sanity check:

    cd backend && python scripts/smoke_test.py
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'collabdocs.settings')

import django  # noqa: E402

import collabdocs.settings as settings_module  # noqa: E402

_db_path = os.path.join(tempfile.mkdtemp(prefix='collabdocs_smoke_'), 'smoke.sqlite3')
settings_module.DATABASES = {
    'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': _db_path}
}
settings_module.ALLOWED_HOSTS = settings_module.ALLOWED_HOSTS + ['testserver']
django.setup()

from django.core.management import call_command  # noqa: E402
from django.test import Client  # noqa: E402

call_command('migrate', verbosity=0, interactive=False)

client = Client()
passed, failed = 0, 0


def check(label, method, url, expected, payload=None):
    global passed, failed
    kwargs = {'content_type': 'application/json'} if payload is not None else {}
    response = getattr(client, method)(url, data=payload, **kwargs)
    ok = response.status_code == expected
    passed += ok
    failed += (not ok)
    print(f"{'PASS' if ok else 'FAIL'}  {method.upper():6} {url}  → {response.status_code} (expected {expected})")
    if not ok:
        print(f"      body: {getattr(response, 'content', b'')[:300]}")
    return response


# --- Users -----------------------------------------------------------------
r = check('create user', 'post', '/api/users/', 201, {
    'first_name': 'Ada', 'last_name': 'Lovelace',
    'email': 'ada@example.com', 'phone': '+919876543210',
})
user_id = r.json()['id']
r = check('create user 2', 'post', '/api/users/', 201, {
    'first_name': 'Alan', 'last_name': 'Turing',
    'email': 'alan@example.com', 'phone': '+919876543211',
})
user2_id = r.json()['id']
check('get user', 'get', f'/api/users/{user_id}/', 200)

# --- Workspaces --------------------------------------------------------------
r = check('create workspace', 'post', '/api/workspaces/', 201,
          {'name': 'Engineering', 'owner': user_id})
ws_id = r.json()['id']
check('list workspaces', 'get', '/api/workspaces/', 200)
check('get workspace', 'get', f'/api/workspaces/{ws_id}/', 200)
check('add member', 'post', f'/api/workspaces/{ws_id}/members/', 201,
      {'user': user2_id, 'role': 'editor'})
check('duplicate member → 409', 'post', f'/api/workspaces/{ws_id}/members/', 409,
      {'user': user2_id, 'role': 'viewer'})
check('list members', 'get', f'/api/workspaces/{ws_id}/members/', 200)
check('workspace summary', 'get', f'/api/workspaces/{ws_id}/summary/', 200)

# --- Documents ---------------------------------------------------------------
r = check('create document', 'post', '/api/documents/', 201, {
    'title': 'Design Doc', 'content': 'v1', 'workspace': ws_id, 'created_by': user_id,
})
doc_id = r.json()['id']
check('list documents', 'get', '/api/documents/', 200)
check('filter documents', 'get', f'/api/documents/?workspace={ws_id}&status=draft&search=design', 200)
check('get document', 'get', f'/api/documents/{doc_id}/', 200)
check('update document (PUT)', 'put', f'/api/documents/{doc_id}/', 200, {
    'title': 'Design Doc', 'content': 'v2', 'workspace': ws_id, 'saved_by': user2_id,
})
check('document versions', 'get', f'/api/documents/{doc_id}/versions/', 200)
check('document stats', 'get', f'/api/documents/{doc_id}/stats/', 200)
check('add tags', 'post', f'/api/documents/{doc_id}/tags/', 200, {'tags': ['Python', 'django']})

# --- Comments ----------------------------------------------------------------
r = check('create comment', 'post', '/api/comments/', 201, {
    'document': doc_id, 'author': user_id, 'content': 'Nice work!',
})
comment_id = r.json()['id']
check('create reply', 'post', '/api/comments/', 201, {
    'document': doc_id, 'author': user2_id, 'content': 'Agreed!', 'parent': comment_id,
})
check('list threaded comments', 'get', f'/api/comments/?document={doc_id}', 200)

# --- Tags & audit logs --------------------------------------------------------
check('create tag', 'post', '/api/tags/', 201, {'name': 'backend'})
check('duplicate tag → 409', 'post', '/api/tags/', 409, {'name': 'backend'})
check('list tags', 'get', '/api/tags/', 200)
check('audit logs', 'get', '/api/audit-logs/', 200)
check('audit logs filtered', 'get', f'/api/audit-logs/?actor={user_id}&model=Document', 200)

# --- API docs ------------------------------------------------------------------
check('openapi schema', 'get', '/api/schema/', 200)
check('swagger ui', 'get', '/api/docs/', 200)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
