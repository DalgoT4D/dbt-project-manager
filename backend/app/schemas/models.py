from pydantic import BaseModel
from typing import List, Optional


class Model(BaseModel):
    schema: Optional[str] = None
    table: Optional[str] = None
    sql_path: str
    file_name: str
    tests: List[str] = []


class ModelsRequest(BaseModel):
    dbt_project_path: str
    profiles_yml_path: str
    target_name: str


class ModelsResponse(BaseModel):
    models: List[Model]


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