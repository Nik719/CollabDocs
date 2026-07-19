"""Tiny test-data factories (no external dependencies)."""
import itertools

from api.models import Comment, Document, Tag, User, Workspace, WorkspaceMember

_counter = itertools.count(1)


def create_user(**kwargs) -> User:
    n = next(_counter)
    defaults = {
        'first_name': 'Test',
        'last_name': f'User{n}',
        'email': f'user{n}@example.com',
        'phone': f'+91900000{n:04d}',
    }
    defaults.update(kwargs)
    return User.objects.create(**defaults)


def create_workspace(owner=None, with_owner_member=True, **kwargs) -> Workspace:
    owner = owner or create_user()
    defaults = {'name': f'Workspace {next(_counter)}'}
    defaults.update(kwargs)
    workspace = Workspace.objects.create(owner=owner, **defaults)
    if with_owner_member:
        WorkspaceMember.objects.create(
            workspace=workspace, user=owner, role=WorkspaceMember.Role.ADMIN
        )
    return workspace


def create_document(workspace=None, created_by=None, **kwargs) -> Document:
    workspace = workspace or create_workspace()
    defaults = {
        'title': f'Document {next(_counter)}',
        'content': 'Initial content.',
        'created_by': created_by or workspace.owner,
    }
    defaults.update(kwargs)
    return Document.objects.create(workspace=workspace, **defaults)


def create_comment(document=None, author=None, parent=None, **kwargs) -> Comment:
    document = document or create_document()
    defaults = {'content': 'A comment.'}
    defaults.update(kwargs)
    return Comment.objects.create(
        document=document,
        author=author or document.created_by,
        parent=parent,
        **defaults,
    )


def create_tag(**kwargs) -> Tag:
    defaults = {'name': f'tag-{next(_counter)}'}
    defaults.update(kwargs)
    return Tag.objects.create(**defaults)
