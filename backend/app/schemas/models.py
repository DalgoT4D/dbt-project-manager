from pydantic import BaseModel
from typing import List


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


class UpdateModelRequest(BaseModel):
    dbt_project_path: str
    sql_path: str
    updated_model: str  # New SQL content


class DeleteModelRequest(BaseModel):
    dbt_project_path: str
    sql_path: str
