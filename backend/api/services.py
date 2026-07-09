"""
Business-logic (service) layer.

All multi-step, transactional flows live here so the ViewSets stay thin and
the invariants required by the assignment brief are enforced in one place:

* Workspace creation + owner-as-admin membership → single ``transaction.atomic()``.
* Document create/update + ``DocumentVersion`` snapshot → single ``transaction.atomic()``.
  The Document ``post_save`` signal writes the ``AuditLog`` entry inside the
  same atomic block (Django signals are synchronous).
* ``version_number`` is computed as ``document.versions.count() + 1`` inside
  the atomic block, per the brief (per-document numbering, no global counter).
"""
from typing import Optional

from django.db import transaction

from .models import Document, DocumentVersion, Tag, User, Workspace, WorkspaceMember


def create_workspace_with_owner(serializer) -> Workspace:
    """Create a workspace and auto-add its owner as an admin member."""
    with transaction.atomic():
        workspace = serializer.save()
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=workspace.owner,
            role=WorkspaceMember.Role.ADMIN,
        )
    return workspace


def _create_next_version(document: Document, saved_by: Optional[User]) -> DocumentVersion:
    """Snapshot the document content as the next per-document version."""
    return DocumentVersion.objects.create(
        document=document,
        content=document.content,
        version_number=document.versions.count() + 1,
        saved_by=saved_by,
    )


def create_document_with_version(serializer, saved_by: Optional[User] = None) -> Document:
    """Create a document and its first version atomically."""
    with transaction.atomic():
        document = serializer.save()
        _create_next_version(document, saved_by)
    return document


def update_document_with_version(serializer, saved_by: Optional[User] = None) -> Document:
    """Persist a document update and snapshot a new version atomically."""
    with transaction.atomic():
        document = serializer.save()
        _create_next_version(document, saved_by)
    return document


def add_tags_to_document(document: Document, tag_names: list) -> list:
    """Normalise, get-or-create and attach tags to a document.

    Returns the list of tag names that were attached.
    """
    added = []
    with transaction.atomic():
        for raw_name in tag_names:
            name = str(raw_name).strip().lower()
            if name:
                tag, _ = Tag.objects.get_or_create(name=name)
                tag.documents.add(document)
                added.append(name)
    return added
