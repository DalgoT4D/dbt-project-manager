from pydantic import BaseModel
from typing import List, Optional

class Source(BaseModel):
    source: str
    schema: str
    table: str
    tests: List[str]
    description: Optional[str] = None

class SourcesRequest(BaseModel):
    dbt_project_path: str

class SourcesResponse(BaseModel):
    sources: List[Source]

class UpdateSourceRequest(BaseModel):
    dbt_project_path: str
    original_source: str  
    original_table: str   
    updated_source: Source

class DeleteSourceRequest(BaseModel):
    dbt_project_path: str
    source: str
    table: str

class OperationResponse(BaseModel):
    success: bool
    message: str 