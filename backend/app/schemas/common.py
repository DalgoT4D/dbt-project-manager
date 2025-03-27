from pydantic import BaseModel
from typing import Dict, Any, Optional, List


class BaseRequest(BaseModel):
    """Base request model with common fields"""

    dbt_project_path: str
    profiles_yml_path: str
    target_name: str


class ColumnInfo(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class TestConfig(BaseModel):
    name: str
    description: str
    required_configs: Optional[List[Dict]] = []


class AddTestRequest(BaseRequest):
    """Common request model for adding tests to both models and sources"""

    schema: str
    table: str
    model_path: str  # Empty string for sources, actual path for models
    test_config: Dict[str, Any]
    column_name: Optional[str] = None
    source: Optional[str] = None
    dbt_project_path: Optional[str] = ""
    profiles_yml_path: Optional[str] = ""
    target_name: Optional[str] = ""


class RemoveTestRequest(BaseModel):
    """Common request model for removing tests from both models and sources"""

    dbt_project_path: str
    test_name: str
    model_path: Optional[str] = None  # Empty string for sources, actual path for models
    source_name: Optional[str] = None
    table_name: Optional[str] = None
    column_name: Optional[str] = None


class TableColumnsRequest(BaseRequest):
    """Common request model for getting table columns"""

    schema: str
    table: str


class OperationResponse(BaseModel):
    """Common response model for operations"""

    success: bool
    message: str


class TestTypesResponse(BaseModel):
    """Common response model for test types"""

    test_types: List[TestConfig]


class TableColumnsResponse(BaseModel):
    """Common response model for table columns"""

    columns: List[ColumnInfo]


class ModelsAndSourcesResponse(BaseModel):
    """Common response model for models and sources list"""

    models: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
