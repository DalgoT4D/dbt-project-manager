import os
import glob
from typing import List, Dict, Optional, Any
import yaml
import re
from ..schemas.models import Model


def get_models_from_project(dbt_project_path: str) -> List[Model]:
    """
    Get all SQL files from models directory
    """
    models_dir = os.path.join(dbt_project_path, 'models')
    if not os.path.exists(models_dir):
        raise ValueError(f"Models directory not found at {models_dir}")
    
    # Find all SQL files in the models directory recursively
    sql_files = glob.glob(os.path.join(models_dir, '**', '*.sql'), recursive=True)
    
    # Get test definitions
    test_mapping = _get_tests_for_models(dbt_project_path)
    
    models = []
    for sql_file in sql_files:
        # Get the relative path from the models directory
        relative_path = os.path.relpath(sql_file, models_dir)
        file_name = os.path.basename(sql_file)
        file_name_without_ext = os.path.splitext(file_name)[0]
        
        # Find tests for this model if any
        tests = test_mapping.get(file_name_without_ext, [])
        
        models.append(Model(
            sql_path=relative_path,
            file_name=file_name,
            tests=tests
        ))
    
    return models


def _get_tests_for_models(dbt_project_path: str) -> Dict[str, List[str]]:
    """
    Parse schema.yml files to extract tests for models
    """
    schema_files = glob.glob(os.path.join(dbt_project_path, 'models', '**', '*.yml'), recursive=True)
    schema_files.extend(glob.glob(os.path.join(dbt_project_path, 'models', '**', '*.yaml'), recursive=True))
    
    test_mapping = {}
    
    for schema_file in schema_files:
        try:
            with open(schema_file, 'r') as f:
                schema_data = yaml.safe_load(f)
                
            if schema_data and 'models' in schema_data:
                for model in schema_data['models']:
                    model_name = model.get('name')
                    if not model_name:
                        continue
                    
                    tests = []
                    # Get column tests
                    if 'columns' in model:
                        for column in model['columns']:
                            if 'tests' in column:
                                for test in column['tests']:
                                    if isinstance(test, str):
                                        tests.append(f"{column['name']}: {test}")
                                    elif isinstance(test, dict):
                                        for test_name, _ in test.items():
                                            tests.append(f"{column['name']}: {test_name}")
                    
                    # Get model tests
                    if 'tests' in model:
                        for test in model['tests']:
                            if isinstance(test, str):
                                tests.append(test)
                            elif isinstance(test, dict):
                                for test_name, _ in test.items():
                                    tests.append(test_name)
                    
                    test_mapping[model_name] = tests
        except Exception as e:
            print(f"Error parsing schema file {schema_file}: {str(e)}")
    
    return test_mapping


def get_models_with_schema_info(dbt_project_path: str, models: List[Model], schemas: List[Dict[str, Any]]) -> List[Model]:
    """
    Match models with their schema and table information from the warehouse
    """
    # Process models to get just the file name without extension
    model_table_mapping = {}
    for model in models:
        file_name_without_ext = os.path.splitext(model.file_name)[0]
        model_table_mapping[file_name_without_ext.lower()] = model
    
    # Iterate through schemas and tables to find matches
    for schema_info in schemas:
        schema_name = schema_info['schema']
        for table in schema_info.get('tables', []):
            table_name = table['name'].lower()
            
            # Try to find a matching model
            if table_name in model_table_mapping:
                model = model_table_mapping[table_name]
                model.schema = schema_name
                model.table = table['name']
    
    return models


def update_model(dbt_project_path: str, sql_path: str, new_content: str) -> bool:
    """
    Update the SQL content of a model
    """
    file_path = os.path.join(dbt_project_path, 'models', sql_path)
    if not os.path.exists(file_path):
        return False
    
    try:
        with open(file_path, 'w') as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(f"Error updating model {file_path}: {str(e)}")
        return False


def delete_model(dbt_project_path: str, sql_path: str) -> bool:
    """
    Delete a model file
    """
    file_path = os.path.join(dbt_project_path, 'models', sql_path)
    if not os.path.exists(file_path):
        return False
    
    try:
        os.remove(file_path)
        return True
    except Exception as e:
        print(f"Error deleting model {file_path}: {str(e)}")
        return False 