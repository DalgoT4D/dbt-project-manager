from fastapi import APIRouter, Depends, HTTPException
from ..core.models import get_models_from_project
from ..core.sources import get_sources_from_project 
from ..schemas.project import ProjectSettings

router = APIRouter()

@router.post("/models-and-sources")
async def get_models_and_sources(settings: ProjectSettings):
    """Get all models and sources for model_or_source type."""
    try:
        project_path = settings.dbt_project_path
        
        # Get models using existing function
        models = get_models_from_project(project_path)
        
        # Get sources using existing function
        sources = get_sources_from_project(project_path)
        
        # Format models with ref() syntax
        formatted_models = [
            {
                "name": model.name,
                "value": f"ref('{model.name}')",
                "type": "model",
                "schema": model.schema,
                "table": model.table
            }
            for model in models
        ]
        
        # Format sources with source() syntax
        formatted_sources = [
            {
                "name": f"{source['source']}.{source['table']}",
                "value": f"source('{source['source']}', '{source['table']}')",
                "type": "source",
                "schema": source['schema'],
                "table": source['table']
            }
            for source in sources
        ]
        
        return {
            "models": formatted_models,
            "sources": formatted_sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 