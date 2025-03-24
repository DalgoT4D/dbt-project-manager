from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Model(BaseModel):
    id: str
    name: str
    schema: str
    table: str
    tests: List[str]
    sql_path: str


class ModelsRequest(BaseModel):
    dbt_project_path: str
    profiles_yml_path: str
    target_name: str


class ModelsResponse(BaseModel):
    models: List[Model]


class TestConfig(BaseModel):
    name: str
    description: str
    required_configs: List[Dict[str, str]]


class TestTypesResponse(BaseModel):
    test_types: List[TestConfig]


class TableColumnsRequest(BaseModel):
    dbt_project_path: str
    profiles_yml_path: str
    target_name: str
    schema: str
    table: str


class ColumnInfo(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class TableColumnsResponse(BaseModel):
    columns: List[ColumnInfo]


class AddTestRequest(BaseModel):
    dbt_project_path: str
    profiles_yml_path: str
    target_name: str
    schema: str
    table: str
    model_path: str
    test_config: Dict[str, Any]
    column_name: Optional[str] = None


class RemoveTestRequest(BaseModel):
    dbt_project_path: str
    model_path: str
    test_name: str
    column_name: Optional[str] = None


class UpdateModelRequest(BaseModel):
    dbt_project_path: str
    sql_path: str
    updated_model: str  # New SQL content


class DeleteModelRequest(BaseModel):
    dbt_project_path: str
    sql_path: str


class OperationResponse(BaseModel):
    success: bool
    message: str 