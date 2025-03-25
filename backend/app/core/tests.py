from typing import List, Dict, Any, Optional
from ..schemas.models import TestConfig, ColumnInfo

def get_available_test_types() -> List[TestConfig]:
    """
    Returns a list of all available test types and their configurations
    """
    return [
        TestConfig(
            name="unique",
            description="Ensures that a column or combination of columns is unique",
            required_configs=[]
        ),
        TestConfig(
            name="not_null",
            description="Ensures that a column does not contain null values",
            required_configs=[]
        ),
        TestConfig(
            name="accepted_values",
            description="Ensures that a column contains only the specified values",
            required_configs=[
                {
                    "name": "values",
                    "type": "array",
                    "description": "List of accepted values"
                }
            ]
        ),
        TestConfig(
            name="relationships",
            description="Ensures referential integrity between tables",
            required_configs=[
                {
                    "name": "field",
                    "type": "string",
                    "description": "The column name in the referenced table"
                },
                {
                    "name": "to",
                    "type": "model_or_source",
                    "description": "The fully qualified name of the referenced table"
                }
            ]
        ),
        TestConfig(
            name="dbt_utils.expression_is_true",
            description="Ensures that a SQL expression evaluates to true",
            required_configs=[
                {
                    "name": "expression",
                    "type": "string",
                    "description": "SQL expression that should evaluate to true"
                }
            ]
        ),
        TestConfig(
            name="dbt_utils.recency",
            description="Ensures that a timestamp column is recent",
            required_configs=[
                {
                    "name": "datepart",
                    "type": "string",
                    "description": "The unit of time to check (day, hour, minute, etc.)"
                },
                {
                    "name": "field",
                    "type": "string",
                    "description": "The timestamp column to check"
                },
                {
                    "name": "interval",
                    "type": "number",
                    "description": "The expected interval"
                }
            ]
        ),
        TestConfig(
            name="dbt_utils.sequential_values",
            description="Ensures that a column contains sequential values",
            required_configs=[
                {
                    "name": "interval",
                    "type": "number",
                    "description": "The expected interval between values"
                }
            ]
        ),
        TestConfig(
            name="dbt_expectations.expect_column_values_to_be_between",
            description="Ensures that column values are within a specified range",
            required_configs=[
                {
                    "name": "min_value",
                    "type": "number",
                    "description": "Minimum allowed value (optional)"
                },
                {
                    "name": "max_value",
                    "type": "number",
                    "description": "Maximum allowed value (optional)"
                },
                {
                    "name": "row_condition",
                    "type": "string",
                    "description": "SQL condition to filter rows (optional)"
                },
                {
                    "name": "strictly",
                    "type": "boolean",
                    "description": "Whether to use strict comparison (default: false)"
                }
            ]
        ),
        TestConfig(
            name="dbt_expectations.expect_column_to_exist",
            description="Ensures that the specified column exists in the table",
            required_configs=[]
        ),
        TestConfig(
            name="dbt_expectations.expect_column_values_to_be_in_type_list",
            description="Ensures that a column's values are of specified types",
            required_configs=[
                {
                    "name": "column_type_list",
                    "type": "array",
                    "description": "List of expected column types (e.g., [date, datetime])"
                }
            ]
        ),
        TestConfig(
            name="dbt_expectations.expect_column_values_to_be_of_type",
            description="Ensures that a column's values are of a specified data type",
            required_configs=[
                {
                    "name": "column_type",
                    "type": "string",
                    "description": "Expected column type (e.g., date, datetime, string, integer)"
                }
            ]
        )
    ]
