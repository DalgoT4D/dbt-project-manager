from google.cloud import bigquery
from google.oauth2 import service_account
from typing import List, Dict, Any, Optional
import json
import os
from .base_client import WarehouseClient

class BigQueryClient(WarehouseClient):
    """BigQuery warehouse client implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection details."""
        self.config = config
        self.client = None
        self.project_id = config.get('project', '')
        self.dataset = config.get('dataset', '')
        self.keyfile = config.get('keyfile', '')
        self.credentials = None
    
    def connect(self) -> bool:
        """Establish connection to BigQuery."""
        try:
            if self.keyfile and os.path.exists(self.keyfile):
                self.credentials = service_account.Credentials.from_service_account_file(
                    self.keyfile
                )
                self.client = bigquery.Client(
                    project=self.project_id,
                    credentials=self.credentials
                )
            else:
                # Use application default credentials if keyfile not provided
                self.client = bigquery.Client(project=self.project_id)
            
            return self.client is not None
        except Exception as e:
            print(f"Error connecting to BigQuery: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """Close the BigQuery connection."""
        if self.client:
            self.client.close()
    
    def get_schemas(self) -> List[str]:
        """Get list of all datasets (schemas) in BigQuery."""
        if not self.client:
            if not self.connect():
                return []
        
        try:
            datasets = list(self.client.list_datasets())
            return [dataset.dataset_id for dataset in datasets]
        except Exception as e:
            print(f"Error fetching BigQuery datasets: {str(e)}")
            return []
    
    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """Get list of all tables in the specified dataset (schema)."""
        if not self.client:
            if not self.connect():
                return []
        
        try:
            tables = list(self.client.list_tables(schema))
            result = []
            
            for table in tables:
                table_ref = self.client.get_table(table.reference)
                result.append({
                    'name': table.table_id,
                    'description': table_ref.description or ''
                })
            
            return result
        except Exception as e:
            print(f"Error fetching tables from BigQuery dataset {schema}: {str(e)}")
            return []
    
    def get_table_info(self, schema: str, table: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific table."""
        if not self.client:
            if not self.connect():
                return None
        
        try:
            table_ref = self.client.dataset(schema).table(table)
            table_obj = self.client.get_table(table_ref)
            
            columns = [
                {
                    'name': field.name,
                    'type': field.field_type,
                    'description': field.description or ''
                }
                for field in table_obj.schema
            ]
            
            return {
                'name': table,
                'schema': schema,
                'description': table_obj.description or '',
                'columns': columns
            }
        except Exception as e:
            print(f"Error fetching BigQuery table info for {schema}.{table}: {str(e)}")
            return None 