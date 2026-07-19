"""Small shared helpers for the API layer."""
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response


def error_response(message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    """Return a consistent ``{"error": <message>}`` payload.

    Every non-2xx response in the API uses this shape so clients (frontend,
    Postman collection) can rely on a single error contract.
    """
    return Response({'error': message}, status=status_code)


def get_or_none(model, **kwargs):
    """Fetch a model instance or return None.

    Treats malformed lookup values (e.g. a non-UUID primary key) the same as
    "not found" so callers can return a clean 404 instead of a server error.
    """
    try:
        return model.objects.get(**kwargs)
    except (model.DoesNotExist, ValidationError, ValueError, TypeError):
        return None
