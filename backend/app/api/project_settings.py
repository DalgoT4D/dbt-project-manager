from fastapi import APIRouter, Response
from app.schemas.project import ProjectSettings

router = APIRouter()

# In-memory session storage (for development)
project_settings = None


@router.post("/project-settings")
async def save_project_settings(settings: ProjectSettings, response: Response):
    global project_settings
    project_settings = settings
    response.status_code = 201
    return {"message": "Project settings saved successfully"}


@router.get("/project-settings")
async def get_project_settings():
    if project_settings is None:
        return {"message": "No project settings found"}
    return project_settings
