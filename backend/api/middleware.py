"""
Custom request logging middleware (brief §3.1, Rules.md §2/Phases Phase 5).

Logs, for every request: HTTP method, endpoint path, response status code
and time taken in milliseconds. Registered in ``config.settings.MIDDLEWARE``.
"""
import logging
import time

logger = logging.getLogger('collabdocs.requests')


class RequestLoggingMiddleware:
    """Classic Django middleware: __init__(get_response) + __call__(request)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            '[CollabDocs] %s %s → %s (%.1f ms)',
            request.method,
            request.get_full_path(),
            response.status_code,
            duration_ms,
        )
        return response
