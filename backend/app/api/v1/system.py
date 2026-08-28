"""System & health endpoints — /health, /system/hardware, /system/telemetry."""
import subprocess
import shutil
from typing import Optional

from fastapi import APIRouter
from app.services.ffmpeg_service import detect_hardware_acceleration

router = APIRouter(tags=["System"])


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "mediapro-api"}


@router.get("/system/acceleration")
@router.get("/system/hardware")
async def get_system_acceleration():
    """Return active hardware acceleration details (CUDA / NVENC vs CPU fallback)."""
    return detect_hardware_acceleration()


@router.get("/system/telemetry")
async def get_system_telemetry():
    """
    Return live GPU VRAM, CPU, RAM, disk, and Celery queue telemetry.
    Uses nvidia-smi for GPU stats; gracefully falls back if not available.
    """
    from app.celery_app import celery as celery_app

    result: dict = {
        "gpu_name": None,
        "gpu_load_percent": None,
        "vram_used_gb": None,
        "vram_total_gb": None,
        "gpu_temp_c": None,
        "cpu_count": None,
        "ram_used_gb": None,
        "ram_total_gb": None,
        "disk_free_gb": None,
        "celery_active": 0,
        "celery_reserved": 0,
        "nvenc_available": False,
    }

    # --- GPU via nvidia-smi ---
    try:
        smi_out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu",
                "--format=csv,noheader,nounits",
            ],
            timeout=5,
            stderr=subprocess.DEVNULL,
        ).decode().strip().split(",")
        if len(smi_out) >= 5:
            result["gpu_name"] = smi_out[0].strip()
            result["gpu_load_percent"] = float(smi_out[1].strip())
            result["vram_used_gb"] = round(float(smi_out[2].strip()) / 1024, 2)
            result["vram_total_gb"] = round(float(smi_out[3].strip()) / 1024, 2)
            result["gpu_temp_c"] = float(smi_out[4].strip())
            result["nvenc_available"] = True
    except Exception:
        pass

    # --- CPU / RAM ---
    try:
        import os
        result["cpu_count"] = os.cpu_count()
        with open("/proc/meminfo") as f:
            mem = {line.split(":")[0]: int(line.split(":")[1].strip().split()[0]) for line in f}
        total_kb = mem.get("MemTotal", 0)
        avail_kb = mem.get("MemAvailable", 0)
        result["ram_total_gb"] = round(total_kb / 1024 / 1024, 2)
        result["ram_used_gb"] = round((total_kb - avail_kb) / 1024 / 1024, 2)
    except Exception:
        pass

    # --- Disk ---
    try:
        usage = shutil.disk_usage("/data")
        result["disk_free_gb"] = round(usage.free / 1024 / 1024 / 1024, 2)
    except Exception:
        pass

    # --- Celery queue depth ---
    try:
        inspect = celery_app.control.inspect(timeout=1.5)
        active = inspect.active() or {}
        reserved = inspect.reserved() or {}
        result["celery_active"] = sum(len(v) for v in active.values())
        result["celery_reserved"] = sum(len(v) for v in reserved.values())
    except Exception:
        pass

    return result
