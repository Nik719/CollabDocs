"""
Custom request logging middleware (assignment §3.1).

Logs the HTTP method, endpoint path, response status code and time taken in
milliseconds for every request, e.g.:

    [CollabDocs] GET /api/documents/ → 200 (12.34ms)

Registered in ``settings.MIDDLEWARE``. Output goes through the
``collabdocs.requests`` logger (console/stdout handler) instead of a bare
``print`` so it plays well with any log aggregation set-up while keeping the
exact same console output.
"""
import logging
import time

logger = logging.getLogger('collabdocs.requests')


class RequestLoggingMiddleware:
    """Log method, path, status code and duration (ms) for every request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            '[CollabDocs] %s %s → %s (%.2fms)',
            request.method,
            request.path,
            response.status_code,
            duration_ms,
        )

        return response
