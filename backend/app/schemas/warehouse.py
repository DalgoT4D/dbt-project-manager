from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class WarehouseConnectionRequest(BaseModel):
    profiles_yml_path: str
    target_name: str
    profile_name: Optional[str] = None
    dbt_project_path: Optional[str] = None

class SchemaResponse(BaseModel):
    schemas: List[str]

class TableInfo(BaseModel):
    name: str
    description: Optional[str] = None
    identifier: Optional[str] = None

class TablesResponse(BaseModel):
    tables: List[TableInfo]

class TableToAdd(BaseModel):
    name: str
    description: Optional[str] = ""
    identifier: Optional[str] = None

class CreateSourcesRequest(BaseModel):
    dbt_project_path: str
    source_name: str
    schema_name: str
    tables: List[TableToAdd]

class OperationResponse(BaseModel):
    success: bool
    message: str 