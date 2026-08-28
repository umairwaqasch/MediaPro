import os


# Redis
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Storage paths
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/data/uploads")
OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "/data/outputs")
THUMBNAIL_DIR: str = os.getenv("THUMBNAIL_DIR", "/data/thumbnails")

# Image Storage paths
IMAGE_UPLOAD_DIR: str = os.getenv("IMAGE_UPLOAD_DIR", "/data/image_uploads")
IMAGE_OUTPUT_DIR: str = os.getenv("IMAGE_OUTPUT_DIR", "/data/image_outputs")
IMAGE_THUMBNAIL_DIR: str = os.getenv("IMAGE_THUMBNAIL_DIR", "/data/image_thumbnails")

# API
API_PREFIX: str = os.getenv("API_PREFIX", "/mediapro/api")

# Ensure directories exist
for d in [UPLOAD_DIR, OUTPUT_DIR, THUMBNAIL_DIR, IMAGE_UPLOAD_DIR, IMAGE_OUTPUT_DIR, IMAGE_THUMBNAIL_DIR]:
    os.makedirs(d, exist_ok=True)
