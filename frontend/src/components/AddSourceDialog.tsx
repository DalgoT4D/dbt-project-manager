import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Checkbox,
  ListItemText,
  FormHelperText,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import { API_CONFIG } from '../config';

interface TableInfo {
  name: string;
  description: string;
}

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
  dbtProjectPath: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function AddSourceDialog({
  open,
  onClose,
  onSourceAdded,
  dbtProjectPath,
  onError,
  onSuccess
}: AddSourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTables, setSelectedTables] = useState<TableInfo[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);
  const [formErrors, setFormErrors] = useState({
    sourceName: '',
    schema: '',
    tables: ''
  });

  // Load schemas when dialog opens
  useEffect(() => {
    if (open) {
      fetchSchemas();
    }
  }, [open, dbtProjectPath]);

  const fetchSchemas = async () => {
    if (!dbtProjectPath) return;

    setLoading(true);
    const settings = JSON.parse(localStorage.getItem('projectSettings') || '{}');
    
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.warehouseSchemas}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          profiles_yml_path: settings.profiles_yml_path,
          target_name: settings.target_name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schemas');
      }

      const data = await response.json();
      setSchemas(data.schemas);
    } catch (error) {
      console.error('Error fetching schemas:', error);
      onError('Failed to fetch schemas from the warehouse');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async (schema: string) => {
    if (!dbtProjectPath || !schema) return;

    setLoadingTables(true);
    const settings = JSON.parse(localStorage.getItem('projectSettings') || '{}');
    
    try {
      const response = await fetch(
        `${API_CONFIG.backendUrl}${API_CONFIG.endpoints.warehouseTables}?schema=${schema}`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dbt_project_path: dbtProjectPath,
            profiles_yml_path: settings.profiles_yml_path,
            target_name: settings.target_name
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const data = await response.json();
      setTables(data.tables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      onError('Failed to fetch tables from the warehouse');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSchemaChange = (event: SelectChangeEvent<string>) => {
    const schema = event.target.value;
    setSelectedSchema(schema);
    setSelectedTables([]);
    
    if (schema) {
      fetchTables(schema);
    }
  };

  const handleTableChange = (event: SelectChangeEvent<string[]>) => {
    const tableNames = event.target.value as string[];
    
    // Find the full table objects for the selected names
    const selectedTableObjects = tables.filter(table => 
      tableNames.includes(table.name)
    );
    
    setSelectedTables(selectedTableObjects);
  };

  const handleUpdateTableDescription = (tableName: string, description: string) => {
    setSelectedTables(prev => 
      prev.map(table => 
        table.name === tableName ? { ...table, description } : table
      )
    );
  };

  const validateForm = (): boolean => {
    const errors = {
      sourceName: '',
      schema: '',
      tables: ''
    };
    
    if (!sourceName.trim()) {
      errors.sourceName = 'Source name is required';
    }
    
    if (!selectedSchema) {
      errors.schema = 'Schema is required';
    }
    
    if (selectedTables.length === 0) {
      errors.tables = 'At least one table must be selected';
    }
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.warehouseSources}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          source_name: sourceName,
          schema_name: selectedSchema,
          tables: selectedTables.map(table => ({
            name: table.name,
            description: table.description
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create sources');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create sources');
      }
      
      onSuccess(data.message || 'Sources created successfully');
      onSourceAdded();
      handleClose();
    } catch (error) {
      console.error('Error creating sources:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSchema('');
    setSelectedTables([]);
    setSourceName('');
    setFormErrors({
      sourceName: '',
      schema: '',
      tables: ''
    });
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Add New Source</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Source Name"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                  error={!!formErrors.sourceName}
                  helperText={formErrors.sourceName}
                />
                
                <FormControl 
                  fullWidth 
                  margin="normal" 
                  required
                  error={!!formErrors.schema}
                >
                  <InputLabel id="schema-select-label">Schema</InputLabel>
                  <Select
                    labelId="schema-select-label"
                    value={selectedSchema}
                    onChange={handleSchemaChange}
                    label="Schema"
                  >
                    {schemas.map((schema) => (
                      <MenuItem key={schema} value={schema}>
                        {schema}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.schema && (
                    <FormHelperText>{formErrors.schema}</FormHelperText>
                  )}
                </FormControl>
                
                <FormControl 
                  fullWidth 
                  margin="normal" 
                  required
                  error={!!formErrors.tables}
                  disabled={loadingTables || !selectedSchema}
                >
                  <InputLabel id="tables-select-label">Tables</InputLabel>
                  <Select
                    labelId="tables-select-label"
                    multiple
                    value={selectedTables.map(t => t.name)}
                    onChange={handleTableChange}
                    renderValue={(selected) => `${selected.length} tables selected`}
                    label="Tables"
                  >
                    {loadingTables ? (
                      <MenuItem disabled>
                        <CircularProgress size={24} />
                        Loading tables...
                      </MenuItem>
                    ) : (
                      tables.map((table) => (
                        <MenuItem key={table.name} value={table.name}>
                          <Checkbox checked={selectedTables.some(t => t.name === table.name)} />
                          <ListItemText primary={table.name} />
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {formErrors.tables && (
                    <FormHelperText>{formErrors.tables}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Tables Descriptions
                </Typography>
                
                {selectedTables.length === 0 ? (
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" color="textSecondary">
                      No tables selected. Select tables from the left panel to add descriptions.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                    {selectedTables.map((table) => (
                      <Paper key={table.name} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle2">{table.name}</Typography>
                        <TextField
                          label="Description"
                          value={table.description || ''}
                          onChange={(e) => handleUpdateTableDescription(table.name, e.target.value)}
                          fullWidth
                          margin="dense"
                          multiline
                          rows={2}
                        />
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || loadingTables}
        >
          {loading ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 