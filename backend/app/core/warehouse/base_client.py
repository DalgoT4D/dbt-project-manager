from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class WarehouseClient(ABC):
    """Base interface for database warehouse clients."""
    
    @abstractmethod
    def connect(self) -> bool:
        """Establish connection to the warehouse."""
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """Close the connection to the warehouse."""
        pass
    
    @abstractmethod
    def get_schemas(self) -> List[str]:
        """Get list of all schemas in the warehouse."""
        pass
    
    @abstractmethod
    def get_tables(self, schema: str) -> List[Dict[str, Any]]:
        """Get list of all tables in a schema with basic metadata."""
        pass
    
    @abstractmethod
    def get_table_info(self, schema: str, table: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific table."""
        pass 