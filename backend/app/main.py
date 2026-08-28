"""Media Pro API — Clean modular entry point.

The monolithic router has been decomposed into:
  app/api/v1/system.py  — Health, hardware, telemetry
  app/api/v1/media.py   — Upload, library, streaming, delete
  app/api/v1/video.py   — All video processing endpoints
  app/api/v1/image.py   — All image processing endpoints
  app/api/v1/batch.py   — Batch queue, status, cancel, SSE tasks
  app/schemas/          — Centralized Pydantic v2 request/response models
  app/middleware/       — RFC 7807 error handler + structured request logger
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import API_PREFIX
from app.api.v1.api import api_router
from app.middleware.error_handler import global_exception_handler, http_exception_handler
from app.middleware.request_logger import RequestLoggerMiddleware

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

# ---------- App ----------
app = FastAPI(
    title="Media Pro API",
    description="Industrial-grade video and image processing workstation API",
    version="2.0.0",
    docs_url="/mediapro/api/docs",
    openapi_url="/mediapro/api/openapi.json",
)

# ---------- Middleware ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggerMiddleware)

# ---------- Exception handlers ----------
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)

# ---------- Routers ----------
app.include_router(api_router, prefix=API_PREFIX)
