from fastapi import APIRouter, HTTPException
from ..schemas.models import (
    ModelsRequest,
    ModelsResponse
)
from ..core.models import get_models_from_project, get_models_with_schema_info
from ..core.warehouse import get_client_for_target, get_profile_name_from_dbt_project

router = APIRouter()

@router.post("/models", response_model=ModelsResponse)
async def get_models(request: ModelsRequest):
    try:
        # First get all models from the project
        models = get_models_from_project(request.dbt_project_path)
        
        # Try to connect to the warehouse and get schema information
        try:
            # Get profile name from dbt_project.yml if not provided
            profile_name = get_profile_name_from_dbt_project(request.dbt_project_path)
            
            if not profile_name:
                raise ValueError("Could not determine profile name from dbt_project.yml")
                
            # Get warehouse client
            client = get_client_for_target(
                request.profiles_yml_path,
                profile_name,
                request.target_name
            )
            
            if not client:
                raise ValueError("Failed to create warehouse client")
            
            # Get schemas and tables from the warehouse
            schemas_list = client.get_schemas()
            schemas = []
            
            # For each schema, get its tables
            for schema_name in schemas_list:
                tables = client.get_tables(schema_name)
                schemas.append({
                    'schema': schema_name,
                    'tables': tables
                })
                
            client.disconnect()
            
            # Match models with schemas and tables
            models = get_models_with_schema_info(
                request.dbt_project_path,
                models,
                schemas
            )
        except Exception as e:
            # If we fail to connect to the warehouse, we still return the models
            # but without schema and table information
            print(f"Warning: Could not get schema information: {str(e)}")
        
        return ModelsResponse(models=models)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
