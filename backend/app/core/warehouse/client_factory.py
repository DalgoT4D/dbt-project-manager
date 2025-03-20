import yaml
import os
from typing import Dict, Any, Optional
from .base_client import WarehouseClient
from .postgres_client import PostgresClient
from .bigquery_client import BigQueryClient

def parse_profiles_yml(profiles_yml_path: str) -> Dict[str, Any]:
    """Parse the profiles.yml file and return its contents."""
    try:
        if not os.path.exists(profiles_yml_path):
            raise FileNotFoundError(f"Profiles file not found: {profiles_yml_path}")
        
        with open(profiles_yml_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error parsing profiles.yml: {str(e)}")
        return {}

def get_target_config(profiles_yml_path: str, profile_name: str, target_name: str) -> Optional[Dict[str, Any]]:
    """Get the configuration for a specific target."""
    try:
        profiles = parse_profiles_yml(profiles_yml_path)
        
        if profile_name not in profiles:
            raise KeyError(f"Profile '{profile_name}' not found in profiles.yml")
        
        profile = profiles[profile_name]
        
        if 'outputs' not in profile:
            raise KeyError(f"No outputs found in profile '{profile_name}'")
        
        outputs = profile['outputs']
        
        if target_name not in outputs:
            # Try using the default target
            if 'target' in profile and profile['target'] in outputs:
                target_name = profile['target']
            else:
                raise KeyError(f"Target '{target_name}' not found in profile '{profile_name}'")
        
        return outputs[target_name]
    except Exception as e:
        print(f"Error getting target config: {str(e)}")
        return None

def get_client_for_target(profiles_yml_path: str, profile_name: str, target_name: str) -> Optional[WarehouseClient]:
    """Create a client for the specified target."""
    target_config = get_target_config(profiles_yml_path, profile_name, target_name)
    
    if not target_config:
        return None
    
    warehouse_type = target_config.get('type', '').lower()
    
    if warehouse_type == 'postgres':
        return PostgresClient(target_config)
    elif warehouse_type == 'bigquery':
        return BigQueryClient(target_config)
    else:
        print(f"Unsupported warehouse type: {warehouse_type}")
        return None

def get_profile_name_from_dbt_project(dbt_project_path: str) -> Optional[str]:
    """Extract profile name from dbt_project.yml file."""
    try:
        project_file = os.path.join(dbt_project_path, 'dbt_project.yml')
        
        if not os.path.exists(project_file):
            raise FileNotFoundError(f"DBT project file not found: {project_file}")
        
        with open(project_file, 'r') as f:
            project_config = yaml.safe_load(f)
            
        return project_config.get('profile')
    except Exception as e:
        print(f"Error extracting profile name: {str(e)}")
        return None 