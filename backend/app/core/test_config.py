import os
import yaml
from typing import Dict, List, Optional, Tuple, Any
from ..schemas.models import TestConfig
from .tests import get_available_test_types

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
                # If the value is a string and contains commas, treat it as an array
                elif isinstance(field_value, str) and ',' in field_value:
                    processed_config[field_name] = [v.strip() for v in field_value.split(',')]
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
                
            if 'tests' not in column_entry:
                column_entry['tests'] = []
                
            column_entry['tests'].append(test_entry)
        else:
            # Add model-level test
            if 'tests' not in model_entry:
                model_entry['tests'] = []
                
            model_entry['tests'].append(test_entry)
            
        # Write updated schema.yml
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
                    if 'tests' in col_entry:
                        # Find and remove the test
                        for i, test in enumerate(col_entry['tests']):
                            if (isinstance(test, str) and test == test_name) or \
                               (isinstance(test, dict) and test_name in test):
                                col_entry['tests'].pop(i)
                                modified = True
                                break
                                
                        # If no tests left, remove the tests key
                        if not col_entry['tests']:
                            col_entry.pop('tests')
                            
                        # If column has no data left, remove it
                        if len(col_entry) <= 1:  # Only has 'name' left
                            model_entry['columns'].pop(column_index)
                            
                        # If no columns left, remove the columns key
                        if not model_entry['columns']:
                            model_entry.pop('columns')
        else:
            # Remove model-level test
            if 'tests' in model_entry:
                for i, test in enumerate(model_entry['tests']):
                    if (isinstance(test, str) and test == test_name) or \
                       (isinstance(test, dict) and test_name in test):
                        model_entry['tests'].pop(i)
                        modified = True
                        break
                        
                # If no tests left, remove the tests key
                if not model_entry['tests']:
                    model_entry.pop('tests')
                    
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
                
                # Add model-level tests
                for test in model.get('tests', []):
                    if isinstance(test, str):
                        tests.append(test)
                    elif isinstance(test, dict):
                        tests.append(list(test.keys())[0])
                        
                # Add column-level tests
                for column in model.get('columns', []):
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

