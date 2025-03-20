import psycopg2
from psycopg2 import sql
from typing import List, Dict, Any, Optional
from .base_client import WarehouseClient

class PostgresClient(WarehouseClient):
    """PostgreSQL warehouse client implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with connection details."""
        self.config = config
        self.connection = None
        self.cursor = None
    
    def connect(self) -> bool:
        """Establish connection to PostgreSQL."""
        try:
            self.connection = psycopg2.connect(
                host=self.config.get('host', 'localhost'),
                port=self.config.get('port', 5432),
                user=self.config.get('user', ''),
                password=self.config.get('password', ''),
                dbname=self.config.get('dbname', '')
            )
            self.cursor = self.connection.cursor()
            return True
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {str(e)}")
            return False
    
    def disconnect(self) -> None:
        """Close the PostgreSQL connection."""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
    
    def get_schemas(self) -> List[str]:
        """Get list of all schemas in PostgreSQL."""
        if not self.cursor:
            if not self.connect():
                return []
        
        try:
            query = """
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT LIKE 'pg_%' 
            AND schema_name != 'information_schema'
            ORDER BY schema_name;
            """
            self.cursor.execute(query)
            results = self.cursor.fetchall()
            return [row[0] for row in results]
        except Exception as e:
            print(f"Error fetching schemas: {str(e)}")
            return []
    
    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """Get list of all tables in the specified schema."""
        if not self.cursor:
            if not self.connect():
                return []
        
        try:
            query = """
            SELECT table_name, 
                   obj_description(pgc.oid, 'pg_class') as table_description
            FROM information_schema.tables t
            JOIN pg_catalog.pg_class pgc ON t.table_name = pgc.relname
            JOIN pg_catalog.pg_namespace pgn ON pgc.relnamespace = pgn.oid AND t.table_schema = pgn.nspname
            WHERE table_schema = %s
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
            self.cursor.execute(query, (schema,))
            results = self.cursor.fetchall()
            return [
                {
                    'name': row[0],
                    'description': row[1] if row[1] else ''
                } 
                for row in results
            ]
        except Exception as e:
            print(f"Error fetching tables from schema {schema}: {str(e)}")
            return []
    
    def get_table_info(self, schema: str, table: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific table."""
        if not self.cursor:
            if not self.connect():
                return None
        
        try:
            # Get table description
            desc_query = """
            SELECT obj_description(pgc.oid, 'pg_class') as table_description
            FROM pg_catalog.pg_class pgc
            JOIN pg_catalog.pg_namespace pgn ON pgc.relnamespace = pgn.oid
            WHERE pgn.nspname = %s AND pgc.relname = %s
            """
            self.cursor.execute(desc_query, (schema, table))
            description_result = self.cursor.fetchone()
            description = description_result[0] if description_result and description_result[0] else ''
            
            # Get column information
            col_query = """
            SELECT column_name, data_type, 
                   col_description(
                      (SELECT oid FROM pg_class WHERE relname = %s AND 
                       relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = %s)),
                      ordinal_position
                   ) as column_description
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
            """
            self.cursor.execute(col_query, (table, schema, schema, table))
            columns_result = self.cursor.fetchall()
            columns = [
                {
                    'name': row[0],
                    'type': row[1],
                    'description': row[2] if row[2] else ''
                }
                for row in columns_result
            ]
            
            return {
                'name': table,
                'schema': schema,
                'description': description,
                'columns': columns
            }
        except Exception as e:
            print(f"Error fetching table info for {schema}.{table}: {str(e)}")
            return None 