"""Global RFC 7807-compliant error handler middleware."""
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch any unhandled exception and return a structured JSON error response."""
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "details": {
                    "path": str(request.url),
                    "method": request.method,
                    "traceback": tb[-2000:],  # truncate to last 2000 chars
                },
            }
        },
    )


async def http_exception_handler(request: Request, exc) -> JSONResponse:
    """Convert FastAPI HTTPException into the standard error envelope."""
    from fastapi.exceptions import HTTPException
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "details": {"path": str(request.url), "method": request.method},
            }
        },
    )
