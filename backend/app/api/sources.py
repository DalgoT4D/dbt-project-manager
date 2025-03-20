from fastapi import APIRouter, HTTPException
from ..schemas.sources import (
    SourcesRequest, 
    SourcesResponse, 
    UpdateSourceRequest, 
    DeleteSourceRequest,
    OperationResponse
)
from ..core.sources import get_sources_from_project, update_source, delete_source

router = APIRouter()

@router.post("/sources", response_model=SourcesResponse)
async def get_sources(request: SourcesRequest):
    try:
        sources = get_sources_from_project(request.dbt_project_path)
        return SourcesResponse(sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sources", response_model=OperationResponse)
async def update_source_endpoint(request: UpdateSourceRequest):
    try:
        success = update_source(
            request.dbt_project_path,
            request.original_source,
            request.original_table,
            request.updated_source.dict()
        )
        
        if not success:
            return OperationResponse(
                success=False,
                message=f"Source table '{request.original_table}' in source '{request.original_source}' not found"
            )
        
        return OperationResponse(
            success=True,
            message=f"Source table '{request.updated_source.table}' updated successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sources", response_model=OperationResponse)
async def delete_source_endpoint(request: DeleteSourceRequest):
    try:
        success = delete_source(
            request.dbt_project_path,
            request.source,
            request.table
        )
        
        if not success:
            return OperationResponse(
                success=False,
                message=f"Source table '{request.table}' in source '{request.source}' not found"
            )
        
        return OperationResponse(
            success=True,
            message=f"Source table '{request.table}' deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 