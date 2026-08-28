"""Presets API router for Media Pro."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.preset import PresetItem, PresetCreateRequest, PresetListResponse
from app.services.preset_service import PresetService

router = APIRouter(tags=["Presets & Recipes"])


@router.get("/presets", response_model=PresetListResponse)
async def list_presets(type: Optional[str] = Query(None, description="Filter by type: 'video' | 'image'")):
    """List all available presets (curated built-in recipes + custom user presets)."""
    presets = PresetService.list_presets(preset_type=type)
    return {"presets": presets, "total": len(presets)}


@router.get("/presets/{preset_id}", response_model=PresetItem)
async def get_preset(preset_id: str):
    """Retrieve details for a single preset."""
    preset = PresetService.get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset


@router.post("/presets", response_model=PresetItem)
async def create_preset(payload: PresetCreateRequest):
    """Save a new custom export preset / recipe."""
    try:
        new_preset = PresetService.create_preset(payload.model_dump())
        return new_preset
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create preset: {e}")


@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str):
    """Delete a user-created preset. Built-in presets cannot be deleted."""
    preset = PresetService.get_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    if preset.get("is_builtin"):
        raise HTTPException(status_code=400, detail="Built-in system presets cannot be deleted")

    ok = PresetService.delete_preset(preset_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete preset")
    return {"status": "DELETED", "preset_id": preset_id}


@router.post("/presets/import", response_model=PresetItem)
async def import_preset(payload: PresetCreateRequest):
    """Import a workflow preset recipe from JSON."""
    return await create_preset(payload)
