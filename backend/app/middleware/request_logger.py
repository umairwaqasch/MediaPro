"""Structured request timing and audit logging middleware."""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("mediapro.access")


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """Logs each request with method, path, status code, and wall-clock duration."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d  %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        # Attach timing header so clients and browser DevTools can see it
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.1f}"
        return response
