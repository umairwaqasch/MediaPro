"""Aggregates all v1 sub-routers under a single APIRouter."""
from fastapi import APIRouter

from app.api.v1 import system, media, video, image, batch

api_router = APIRouter()

api_router.include_router(system.router)
api_router.include_router(media.router)
api_router.include_router(video.router)
api_router.include_router(image.router)
api_router.include_router(batch.router)
