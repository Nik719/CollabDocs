"""
Query-parameter filtering helpers.

Keeps QuerySet-building logic out of the ViewSets and validates incoming
parameters so malformed input yields a 400 instead of a server error.
"""
import uuid

from django.db.models import Q, QuerySet
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError


def validate_uuid(value: str, param: str) -> str:
    """Return the value if it is a valid UUID, else raise a DRF 400."""
    try:
        uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise ValidationError(
            {'error': f"'{param}' must be a valid UUID."}
        ) from None
    return value


def _parse_temporal(value: str, param: str):
    """Accept an ISO date or datetime string; 400 on anything else."""
    import datetime as _dt

    parsed = parse_datetime(value)
    if parsed is None:
        as_date = parse_date(value)
        if as_date is not None:
            parsed = _dt.datetime.combine(as_date, _dt.time.min)
    if parsed is None:
        raise ValidationError(
            {'error': f"'{param}' must be an ISO date (YYYY-MM-DD) or datetime."}
        )
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed)
    return parsed


def filter_documents(queryset: QuerySet, params) -> QuerySet:
    """Filter documents by workspace, status, tag name and title/content search.

    Uses Q objects so the ``search`` parameter matches title OR content
    (``__icontains``), per the brief's query requirements.
    """
    workspace = params.get('workspace')
    doc_status = params.get('status')
    tag_name = params.get('tag')
    search = params.get('search')

    filters = Q()
    if workspace:
        filters &= Q(workspace=validate_uuid(workspace, 'workspace'))
    if doc_status:
        filters &= Q(status=doc_status)
    if tag_name:
        filters &= Q(tags__name__icontains=tag_name)
    if search:
        filters &= Q(title__icontains=search) | Q(content__icontains=search)

    return queryset.filter(filters).distinct()


def filter_audit_logs(queryset: QuerySet, params) -> QuerySet:
    """Filter audit logs by actor, model name and timestamp range."""
    actor_id = params.get('actor')
    date_from = params.get('from')
    date_to = params.get('to')
    model_name = params.get('model')

    if actor_id:
        queryset = queryset.filter(actor_id=validate_uuid(actor_id, 'actor'))
    if date_from:
        queryset = queryset.filter(timestamp__gte=_parse_temporal(date_from, 'from'))
    if date_to:
        queryset = queryset.filter(timestamp__lte=_parse_temporal(date_to, 'to'))
    if model_name:
        queryset = queryset.filter(model_name__icontains=model_name)

    return queryset
