FROM python:3.12-slim

# Install ffmpeg and ffprobe
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Create data directories
RUN mkdir -p /data/uploads /data/outputs /data/thumbnails /data/image_uploads /data/image_outputs /data/image_thumbnails

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
