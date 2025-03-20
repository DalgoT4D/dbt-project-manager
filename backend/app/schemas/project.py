from pydantic import BaseModel

class ProjectSettings(BaseModel):
    dbt_project_path: str
    profiles_yml_path: str
    target_name: str 