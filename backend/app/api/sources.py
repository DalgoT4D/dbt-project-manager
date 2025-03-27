from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..schemas.sources import (
    SourcesRequest,
    SourcesResponse,
    UpdateSourceRequest,
    DeleteSourceRequest
)
from ..schemas.common import (
    AddTestRequest,
    RemoveTestRequest,
    OperationResponse,
    TestTypesResponse,
    TableColumnsRequest,
    TableColumnsResponse,
    ColumnInfo
)
from ..core.sources import (
    get_sources_from_project,
    add_test_to_source,
    remove_test_from_source,
    find_source_file,
    update_source,
    delete_source
)
from ..core.warehouse import get_client_for_target, get_profile_name_from_dbt_project
from ..core.tests import get_available_source_test_types
import os

router = APIRouter()

@router.post("/sources", response_model=SourcesResponse)
async def get_sources(request: SourcesRequest):
    try:
        sources = get_sources_from_project(request.dbt_project_path)
        return SourcesResponse(sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sources/add-test", response_model=OperationResponse)
async def add_source_test(request: AddTestRequest):
    """Add a new test to a source table"""
    try:
        # Find the source file
        source_file = find_source_file(
            request.dbt_project_path,
            request.source,
            request.table
        )
        
        if not source_file:
            raise ValueError(f"Source file not found for {request.source}.{request.table}")
        
        # Add the test to the source
        success = add_test_to_source(
            source_file,
            request.source,
            request.table,
            request.test_config,
            request.column_name
        )
        
        if not success:
            raise ValueError("Failed to add test to source")
            
        return OperationResponse(
            success=True,
            message=f"Test added successfully to {request.source}.{request.table}"
        )
    except Exception as e:
        return OperationResponse(
            success=False,
            message=str(e)
        )

@router.post("/sources/remove-test", response_model=OperationResponse)
async def remove_source_test(request: RemoveTestRequest):
    """Remove a test from a source table"""
    try:
        # Find the source file
        source_file = find_source_file(
            request.dbt_project_path,
            request.source_name,
            request.table_name
        )
        
        if not source_file:
            raise ValueError(f"Source file not found for {request.source_name}.{request.table_name}")
        
        # Remove the test from the source
        success = remove_test_from_source(
            source_file,
            request.source_name,
            request.table_name,
            request.test_name,
            request.column_name
        )
        
        if not success:
            raise ValueError("Failed to remove test from source or test not found")
            
        return OperationResponse(
            success=True,
            message=f"Test removed successfully from {request.source_name}.{request.table_name}"
        )
    except Exception as e:
        return OperationResponse(
            success=False,
            message=str(e)
        )

@router.put("/sources", response_model=OperationResponse)
async def update_source_endpoint(request: UpdateSourceRequest):
    try:
        success = update_source(
            request.dbt_project_path,
            request.original_source,
            request.original_table,
            request.updated_source
        )
        
        if success:
            return OperationResponse(
                success=True,
                message=f"Successfully updated source '{request.original_source}.{request.original_table}'"
            )
        else:
            return OperationResponse(
                success=False,
                message="Failed to update source. Check logs for details."
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
        
        if success:
            return OperationResponse(
                success=True,
                message=f"Successfully deleted source '{request.source}.{request.table}'"
            )
        else:
            return OperationResponse(
                success=False,
                message="Failed to delete source. Check logs for details."
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources/test-types", response_model=TestTypesResponse)
async def get_source_test_types():
    """Get all available test types and their configurations for sources"""
    try:
        test_types = get_available_source_test_types()
        return TestTypesResponse(test_types=test_types)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 