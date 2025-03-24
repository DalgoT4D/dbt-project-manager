from fastapi import APIRouter, HTTPException
from ..schemas.models import (
    ModelsRequest,
    ModelsResponse,
    TestTypesResponse,
    TableColumnsRequest,
    TableColumnsResponse,
    AddTestRequest,
    RemoveTestRequest,
    OperationResponse,
    ColumnInfo
)
from ..core.models import get_models_from_project, get_models_with_schema_info
from ..core.warehouse import get_client_for_target, get_profile_name_from_dbt_project
from ..core.tests import get_available_test_types
from ..core.test_config import find_schema_file, add_test_to_schema, remove_test_from_schema
import os

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


@router.get("/models/test-types", response_model=TestTypesResponse)
async def get_test_types():
    """Get all available test types and their configurations"""
    try:
        test_types = get_available_test_types()
        return TestTypesResponse(test_types=test_types)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/columns", response_model=TableColumnsResponse)
async def get_table_columns(request: TableColumnsRequest):
    """Get column information for a specific table"""
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
        
        # Get table info which includes column information
        table_info = client.get_table_info(request.schema, request.table)
        client.disconnect()
        
        if not table_info:
            raise ValueError(f"Table {request.schema}.{request.table} not found")
        
        # Convert to ColumnInfo objects
        columns = [
            ColumnInfo(
                name=col['name'],
                type=col['type'],
                description=col.get('description')
            )
            for col in table_info['columns']
        ]
        
        return TableColumnsResponse(columns=columns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/add-test", response_model=OperationResponse)
async def add_test(request: AddTestRequest):
    """Add a new test to a model"""
    try:
        # Find or create the schema.yml file for the model
        schema_path = find_schema_file(
            request.model_path,
            request.dbt_project_path
        )
        
        # Extract model name from the SQL file path
        model_filename = os.path.basename(request.model_path)
        model_name = os.path.splitext(model_filename)[0]  # Remove extension
        
        # Add the test to the schema
        success = add_test_to_schema(
            schema_path,
            model_name,
            request.test_config,
            request.column_name
        )
        
        if not success:
            raise ValueError("Failed to add test to schema.yml")
            
        return OperationResponse(
            success=True,
            message=f"Test added successfully to {request.schema}.{request.table}"
        )
    except Exception as e:
        return OperationResponse(
            success=False,
            message=str(e)
        )


@router.post("/models/remove-test", response_model=OperationResponse)
async def remove_test(request: RemoveTestRequest):
    """Remove a test from a model"""
    try:
        # Find the schema.yml file for the model
        schema_path = find_schema_file(
            request.model_path,
            request.dbt_project_path
        )
        
        # Extract model name from the SQL file path
        model_filename = os.path.basename(request.model_path)
        model_name = os.path.splitext(model_filename)[0]  # Remove extension
        
        # Parse the test_name to extract column name if it's a column test
        column_name = request.column_name
        test_name = request.test_name
        
        # If no column name provided but test name contains a column reference
        if not column_name and ': ' in test_name:
            parts = test_name.split(': ', 1)
            column_name = parts[0]
            test_name = parts[1]
        
        # Remove the test from the schema
        success = remove_test_from_schema(
            schema_path,
            model_name,
            test_name,
            column_name
        )
        
        if not success:
            raise ValueError("Failed to remove test from schema.yml or test not found")
            
        return OperationResponse(
            success=True,
            message=f"Test removed successfully from {model_name}"
        )
    except Exception as e:
        return OperationResponse(
            success=False,
            message=str(e)
        )
