import os
import yaml
from typing import List, Dict, Any, Optional
from pathlib import Path

def parse_sources_from_yaml(yaml_content: str) -> List[Dict[str, Any]]:
    """Parse YAML content and extract sources information."""
    try:
        data = yaml.safe_load(yaml_content)
        if not data or 'sources' not in data:
            return []
        
        sources = []
        for source in data['sources']:
            source_name = source.get('name', '')
            schema = source.get('schema', '')
            
            for table in source.get('tables', []):
                sources.append({
                    'source': source_name,
                    'schema': schema,
                    'table': table.get('name', ''),
                    'tests': [],  # We'll add tests later if needed
                    'description': table.get('description', '')
                })
        return sources
    except Exception as e:
        print(f"Error parsing YAML: {str(e)}")
        return []

def get_sources_from_project(dbt_project_path: str) -> List[Dict[str, Any]]:
    """Scan models directory for YAML files and extract all sources."""
    all_sources = []
    models_dir = Path(dbt_project_path) / 'models'
    
    if not models_dir.exists():
        return all_sources
    
    for yaml_file in models_dir.rglob('*.yml'):
        try:
            with open(yaml_file, 'r') as f:
                content = f.read()
                sources = parse_sources_from_yaml(content)
                all_sources.extend(sources)
        except Exception as e:
            print(f"Error reading file {yaml_file}: {str(e)}")
            continue
    
    return all_sources

def find_source_file(dbt_project_path: str, source_name: str, table_name: str) -> Optional[Path]:
    """Find the YAML file containing a specific source and table."""
    models_dir = Path(dbt_project_path) / 'models'
    
    if not models_dir.exists():
        return None
    
    for yaml_file in models_dir.rglob('*.yml'):
        try:
            with open(yaml_file, 'r') as f:
                data = yaml.safe_load(f)
                if not data or 'sources' not in data:
                    continue
                
                for source in data['sources']:
                    if source.get('name') == source_name:
                        for table in source.get('tables', []):
                            if table.get('name') == table_name:
                                return yaml_file
        except Exception as e:
            print(f"Error reading file {yaml_file}: {str(e)}")
            continue
    
    return None

def update_source(dbt_project_path: str, 
                 original_source: str, 
                 original_table: str, 
                 updated_source: Dict[str, Any]) -> bool:
    """Update a source table in the YAML file."""
    source_file = find_source_file(dbt_project_path, original_source, original_table)
    
    if not source_file:
        return False
    
    try:
        with open(source_file, 'r') as f:
            data = yaml.safe_load(f)
        
        # Find and update the source table
        for source in data['sources']:
            if source.get('name') == original_source:
                for i, table in enumerate(source.get('tables', [])):
                    if table.get('name') == original_table:
                        # Update table properties
                        table['name'] = updated_source['table']
                        table['description'] = updated_source.get('description', '')
                        
                        # If the source or schema name changed, we need to update those as well
                        if updated_source['source'] != original_source:
                            # Create a new source entry if it doesn't exist
                            existing_source = None
                            for s in data['sources']:
                                if s.get('name') == updated_source['source']:
                                    existing_source = s
                                    break
                            
                            if existing_source:
                                # Move the table to the existing source
                                existing_source['tables'].append(table)
                                source['tables'].pop(i)
                            else:
                                # Rename the source
                                source['name'] = updated_source['source']
                                source['schema'] = updated_source['schema']
                        
                        # Write the updated data back to the file
                        with open(source_file, 'w') as f:
                            yaml.dump(data, f, sort_keys=False)
                        
                        return True
        
        return False
    except Exception as e:
        print(f"Error updating source: {str(e)}")
        return False

def delete_source(dbt_project_path: str, source_name: str, table_name: str) -> bool:
    """Delete a source table from the YAML file."""
    source_file = find_source_file(dbt_project_path, source_name, table_name)
    
    if not source_file:
        return False
    
    try:
        with open(source_file, 'r') as f:
            data = yaml.safe_load(f)
        
        # Find and delete the source table
        for source in data['sources']:
            if source.get('name') == source_name:
                for i, table in enumerate(source.get('tables', [])):
                    if table.get('name') == table_name:
                        # Remove the table
                        source['tables'].pop(i)
                        
                        # If there are no tables left, remove the source
                        if not source.get('tables'):
                            for j, s in enumerate(data['sources']):
                                if s.get('name') == source_name:
                                    data['sources'].pop(j)
                                    break
                        
                        # Write the updated data back to the file
                        with open(source_file, 'w') as f:
                            yaml.dump(data, f, sort_keys=False)
                        
                        return True
        
        return False
    except Exception as e:
        print(f"Error deleting source: {str(e)}")
        return False

def create_sources(dbt_project_path: str, source_name: str, schema_name: str, tables: List[Dict[str, Any]]) -> bool:
    """Create new sources or add tables to existing sources."""
    models_dir = Path(dbt_project_path) / 'models'
    
    if not models_dir.exists():
        try:
            models_dir.mkdir(parents=True)
        except Exception as e:
            print(f"Error creating models directory: {str(e)}")
            return False
    
    # First, look for existing YAML files with sources
    existing_source_file = None
    
    for yaml_file in models_dir.rglob('*.y*ml'):  # Match both .yml and .yaml
        try:
            with open(yaml_file, 'r') as f:
                data = yaml.safe_load(f)
                # Check if this file has sources
                if data and 'sources' in data:
                    existing_source_file = yaml_file
                    break
        except Exception as e:
            print(f"Error reading YAML file {yaml_file}: {str(e)}")
            continue
    
    # If no existing file with sources found, create a new sources.yml
    if not existing_source_file:
        sources_file = models_dir / 'sources.yml'
        data = {
            'version': 2,
            'sources': []
        }
    else:
        sources_file = existing_source_file
        try:
            with open(sources_file, 'r') as f:
                data = yaml.safe_load(f)
                if 'sources' not in data:
                    data['sources'] = []
        except Exception as e:
            print(f"Error reading existing sources file: {str(e)}")
            return False
    
    # Check if the source already exists
    existing_source = None
    for source in data['sources']:
        if source.get('name') == source_name:
            existing_source = source
            break
    
    try:
        # Handle tables whether they're dictionaries with get() or objects with attributes
        def get_safe(item, key, default=''):
            # Handle both dict.get() and object.attribute access
            if hasattr(item, 'get') and callable(item.get):
                return item.get(key, default)
            elif hasattr(item, key):
                return getattr(item, key, default)
            else:
                return default
        
        # Create or update the source
        if existing_source:
            # Add new tables to the existing source
            existing_tables = [table.get('name') for table in existing_source.get('tables', [])]
            
            for table in tables:
                table_name = get_safe(table, 'name')
                if table_name not in existing_tables:
                    existing_source['tables'].append({
                        'name': table_name,
                        'identifier': get_safe(table, 'identifier', table_name),
                        'description': get_safe(table, 'description', '')
                    })
        else:
            # Create a new source
            new_source = {
                'name': source_name,
                'description': f'Source for {schema_name}',
                'schema': schema_name,
                'tables': [
                    {
                        'name': get_safe(table, 'name'),
                        'identifier': get_safe(table, 'identifier', get_safe(table, 'name')),
                        'description': get_safe(table, 'description', '')
                    }
                    for table in tables
                ]
            }
            data['sources'].append(new_source)
        
        # Write the updated file
        with open(sources_file, 'w') as f:
            yaml.dump(data, f, sort_keys=False)
        
        return True
    except Exception as e:
        print(f"Error creating sources: {str(e)}")
        return False 