from fastapi import APIRouter, HTTPException
from ..schemas.warehouse import (
    WarehouseConnectionRequest,
    SchemaResponse,
    TablesResponse,
    CreateSourcesRequest,
    OperationResponse
)
from ..core.warehouse import (
    get_client_for_target,
    get_profile_name_from_dbt_project
)
from ..core.sources import create_sources

router = APIRouter()

@router.post("/warehouse/schemas", response_model=SchemaResponse)
async def get_schemas(request: WarehouseConnectionRequest):
    """Get schemas from a warehouse using profiles.yml configuration."""
    try:
        profile_name = request.profile_name
        
        # If profile name not provided, try to get it from dbt_project.yml
        if not profile_name and request.dbt_project_path:
            profile_name = get_profile_name_from_dbt_project(request.dbt_project_path)
            
        if not profile_name:
            raise HTTPException(status_code=400, detail="Profile name not provided and could not be determined from dbt_project.yml")
        
        client = get_client_for_target(
            request.profiles_yml_path,
            profile_name,
            request.target_name
        )
        
        if not client:
            raise HTTPException(status_code=500, detail="Failed to connect to warehouse. Check profiles.yml configuration.")
        
        schemas = client.get_schemas()
        client.disconnect()
        
        return SchemaResponse(schemas=schemas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/warehouse/tables", response_model=TablesResponse)
async def get_tables(request: WarehouseConnectionRequest, schema: str):
    """Get tables from a specific schema using profiles.yml configuration."""
    try:
        profile_name = request.profile_name
        
        # If profile name not provided, try to get it from dbt_project.yml
        if not profile_name and request.dbt_project_path:
            profile_name = get_profile_name_from_dbt_project(request.dbt_project_path)
            
        if not profile_name:
            raise HTTPException(status_code=400, detail="Profile name not provided and could not be determined from dbt_project.yml")
        
        client = get_client_for_target(
            request.profiles_yml_path,
            profile_name,
            request.target_name
        )
        
        if not client:
            raise HTTPException(status_code=500, detail="Failed to connect to warehouse. Check profiles.yml configuration.")
        
        tables = client.get_tables(schema)
        client.disconnect()
        
        return TablesResponse(tables=tables)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/warehouse/sources", response_model=OperationResponse)
async def create_new_sources(request: CreateSourcesRequest):
    """Create new sources in a dbt project."""
    try:
        success = create_sources(
            request.dbt_project_path,
            request.source_name,
            request.schema_name,
            request.tables
        )
        
        if success:
            return OperationResponse(
                success=True,
                message=f"Successfully created/updated source '{request.source_name}' with {len(request.tables)} tables"
            )
        else:
            return OperationResponse(
                success=False,
                message="Failed to create sources. Check logs for details."
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 