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