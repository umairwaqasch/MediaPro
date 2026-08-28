from celery import Celery
from app.config import REDIS_URL

celery = Celery(
    "videoprocessor",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.video_tasks", "app.tasks.image_tasks", "app.tasks.face_tasks"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,
)
