import os
import glob
from typing import List, Dict, Optional, Any
import yaml
import re
from ..schemas.models import Model
from ..config.constants import TESTS_YAML_KEY


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
        
        # Create a unique ID for the model
        model_id = f"model_{len(models) + 1}"
        
        models.append(Model(
            id=model_id,
            name=file_name_without_ext,
            schema="",  # Will be populated later by get_models_with_schema_info
            table="",   # Will be populated later by get_models_with_schema_info
            tests=tests,
            sql_path=relative_path
        ))
    
    return models


def find_schema_file(model_path: str, project_root: str) -> str:
    """
    Find or create a schema.yml file for a given model.
    Returns the path to the schema file.
    
    If a schema.yml exists in the same directory as the model, use that.
    Otherwise create a new schema file named after the parent directory.
    """
    # Make sure model_path is properly joined with project_root/models
    models_dir = os.path.join(project_root, 'models')
    full_model_path = os.path.join(models_dir, model_path)
    
    # Get the model's directory and parent directory name
    model_dir = os.path.dirname(full_model_path)
    parent_dir_name = os.path.basename(model_dir)
    
    # Look for schema.yml in the same directory first
    schema_path = os.path.join(model_dir, 'schema.yml')
    if os.path.exists(schema_path):
        return schema_path
    
    # Look for a file named after the parent directory
    parent_schema_path = os.path.join(model_dir, f"{parent_dir_name}.yml")
    if os.path.exists(parent_schema_path):
        return parent_schema_path
    
    # If neither exists, create a new file named after the parent directory
    new_schema_path = os.path.join(model_dir, f"{parent_dir_name}.yml")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(new_schema_path), exist_ok=True)
    
    # Initialize with empty structure
    with open(new_schema_path, 'w') as f:
        yaml.dump({'version': 2, 'models': []}, f, default_flow_style=False)
    
    return new_schema_path


def add_test_to_schema(
    schema_path: str,
    model_name: str,
    test_config: Dict,
    column_name: Optional[str] = None
) -> bool:
    """Add a test to the schema.yml file for a model."""
    try:
        # Read existing schema.yml
        with open(schema_path, 'r') as f:
            schema = yaml.safe_load(f) or {}
        
        # Ensure schema has version 2 (dbt standard)
        if 'version' not in schema:
            schema['version'] = 2
            
        # Find or create models section
        if 'models' not in schema:
            schema['models'] = []
            
        # Find or create model entry
        model_entry = None
        for model in schema['models']:
            if model.get('name') == model_name:
                model_entry = model
                break
                
        if not model_entry:
            model_entry = {'name': model_name, 'description': ''}
            schema['models'].append(model_entry)
            
        # Create test configuration based on config type
        test_type = test_config['test_type']
        config = test_config.get('config', {})
        
        # Handle simple tests (no config needed)
        if not config:
            test_entry = test_type
        else:
            # Process config based on field types
            processed_config = {}
            for field_name, field_value in config.items():
                # If the value is already a list, use it as is
                if isinstance(field_value, list):
                    processed_config[field_name] = field_value
                elif isinstance(field_value, str):
                    processed_config[field_name] = field_value.strip()
                else:
                    # The value should already be properly formatted (ref() or source())
                    processed_config[field_name] = field_value
            
            test_entry = {test_type: processed_config}
        
        # Add test to appropriate section
        if column_name:
            # Add column-level test
            if 'columns' not in model_entry:
                model_entry['columns'] = []
                
            column_entry = None
            for col in model_entry['columns']:
                if col.get('name') == column_name:
                    column_entry = col
                    break
                    
            if not column_entry:
                column_entry = {'name': column_name}
                model_entry['columns'].append(column_entry)
                
            # Determine which key to use for tests
            test_key = 'tests' if 'tests' in column_entry else TESTS_YAML_KEY
                
            if test_key not in column_entry:
                column_entry[test_key] = []
                
            column_entry[test_key].append(test_entry)
        else:
            # Determine which key to use for tests
            test_key = 'tests' if 'tests' in model_entry else 'data_tests' if 'data_tests' in model_entry else TESTS_YAML_KEY
                
            if test_key not in model_entry:
                model_entry[test_key] = []
                
            model_entry[test_key].append(test_entry)
            
        # Write updated schema.yml
        print("wririntg out of add test back to yaml")
        print(schema)
        with open(schema_path, 'w') as f:
            yaml.dump(schema, f, default_flow_style=False)
            
        return True
        
    except Exception as e:
        print(f"Error adding test to schema: {str(e)}")
        return False


def remove_test_from_schema(
    schema_path: str,
    model_name: str,
    test_name: str,
    column_name: Optional[str] = None
) -> bool:
    """Remove a test from the schema.yml file for a model."""
    try:
        # Read existing schema.yml
        with open(schema_path, 'r') as f:
            schema = yaml.safe_load(f) or {}
        
        if 'models' not in schema:
            return False
            
        # Find the model entry
        model_index = None
        for i, model in enumerate(schema['models']):
            if model.get('name') == model_name:
                model_index = i
                break
                
        if model_index is None:
            return False
            
        model_entry = schema['models'][model_index]
            
        # Remove the test from the appropriate section
        modified = False
        
        if column_name:
            # Remove column-level test
            if 'columns' in model_entry:
                column_index = None
                for i, col in enumerate(model_entry['columns']):
                    if col.get('name') == column_name:
                        column_index = i
                        break
                        
                if column_index is not None:
                    col_entry = model_entry['columns'][column_index]
                    # Check both test keys
                    for test_key in ['tests', 'data_tests']:
                        if test_key in col_entry:
                            # Find and remove the test
                            for i, test in enumerate(col_entry[test_key]):
                                if (isinstance(test, str) and test == test_name) or \
                                   (isinstance(test, dict) and test_name in test):
                                    col_entry[test_key].pop(i)
                                    modified = True
                                    break
                                    
                            # If no tests left, remove the test key
                            if not col_entry[test_key]:
                                col_entry.pop(test_key)
                                
                    # If column has no data left, remove it
                    if len(col_entry) <= 1:  # Only has 'name' left
                        model_entry['columns'].pop(column_index)
                        
                    # If no columns left, remove the columns key
                    if not model_entry['columns']:
                        model_entry.pop('columns')
        else:
            # Remove model-level test
            # Check both test keys
            for test_key in ['tests', 'data_tests']:
                if test_key in model_entry:
                    for i, test in enumerate(model_entry[test_key]):
                        if (isinstance(test, str) and test == test_name) or \
                           (isinstance(test, dict) and test_name in test):
                            model_entry[test_key].pop(i)
                            modified = True
                            break
                            
                    # If no tests left, remove the test key
                    if not model_entry[test_key]:
                        model_entry.pop(test_key)
                        
        # Check if model has become empty (only has name and description)
        if len(model_entry) <= 2 and 'name' in model_entry:
            schema['models'].pop(model_index)
            modified = True
            
        # If no models left, keep an empty list
        if not schema['models']:
            schema['models'] = []
            
        # Write updated schema.yml if modifications were made
        if modified:
            with open(schema_path, 'w') as f:
                yaml.dump(schema, f, default_flow_style=False)
                
        return modified
        
    except Exception as e:
        print(f"Error removing test from schema: {str(e)}")
        return False


def get_model_tests(schema_path: str, model_name: str) -> List[str]:
    """Get all tests configured for a model."""
    try:
        with open(schema_path, 'r') as f:
            schema = yaml.safe_load(f) or {}
            
        for model in schema.get('models', []):
            if model.get('name') == model_name:
                tests = []
                
                # Add model-level tests from data_tests
                for test in model.get('data_tests', []):
                    if isinstance(test, str):
                        tests.append(test)
                    elif isinstance(test, dict):
                        tests.append(list(test.keys())[0])
                
                # Add model-level tests from tests
                for test in model.get('tests', []):
                    if isinstance(test, str):
                        tests.append(test)
                    elif isinstance(test, dict):
                        tests.append(list(test.keys())[0])
                        
                # Add column-level tests
                for column in model.get('columns', []):
                    # Add column-level tests from data_tests
                    for test in column.get('data_tests', []):
                        if isinstance(test, str):
                            tests.append(f"{column['name']}: {test}")
                        elif isinstance(test, dict):
                            tests.append(f"{column['name']}: {list(test.keys())[0]}")
                    
                    # Add column-level tests from tests
                    for test in column.get('tests', []):
                        if isinstance(test, str):
                            tests.append(f"{column['name']}: {test}")
                        elif isinstance(test, dict):
                            tests.append(f"{column['name']}: {list(test.keys())[0]}")
                            
                return tests
                
        return []
        
    except Exception as e:
        print(f"Error getting model tests: {str(e)}")
        return []


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
                    
                    # Get model-level tests from data_tests
                    for test in model.get('data_tests', []):
                        if isinstance(test, str):
                            tests.append(test)
                        elif isinstance(test, dict):
                            tests.append(list(test.keys())[0])
                    
                    # Get model-level tests from tests
                    for test in model.get('tests', []):
                        if isinstance(test, str):
                            tests.append(test)
                        elif isinstance(test, dict):
                            tests.append(list(test.keys())[0])
                    
                    # Get column-level tests
                    if 'columns' in model:
                        for column in model['columns']:
                            # Add column-level tests from data_tests
                            for test in column.get('data_tests', []):
                                if isinstance(test, str):
                                    tests.append(f"{column['name']}: {test}")
                                elif isinstance(test, dict):
                                    tests.append(f"{column['name']}: {list(test.keys())[0]}")
                            
                            # Add column-level tests from tests
                            for test in column.get('tests', []):
                                if isinstance(test, str):
                                    tests.append(f"{column['name']}: {test}")
                                elif isinstance(test, dict):
                                    tests.append(f"{column['name']}: {list(test.keys())[0]}")
                    
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
        # Use model.name which is already the file name without extension
        model_table_mapping[model.name.lower()] = model
    
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