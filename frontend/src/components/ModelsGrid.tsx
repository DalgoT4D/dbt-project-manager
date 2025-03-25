import { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  Box, 
  Typography, 
  Alert, 
  Snackbar,
  Paper,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { API_CONFIG } from '../config';

interface Model {
  id: string;
  name: string;
  schema: string;
  table: string;
  tests: string[];
  sql_path: string;
}

interface TestType {
  name: string;
  description: string;
  required_configs: {
    name: string;
    type: string;
    description: string;
  }[];
}

interface ColumnInfo {
  name: string;
  type: string;
  description?: string;
}

interface ModelsGridProps {
  dbtProjectPath: string;
  profilesYmlPath: string;
  targetName: string;
}

interface AddTestRequest {
  dbt_project_path: string;
  profiles_yml_path: string;
  target_name: string;
  schema: string;
  table: string;
  model_path: string;
  test_config: {
    test_type: string;
    config: Record<string, string | string[]>;
  };
  column_name?: string;
}

interface TestConfigDialogProps {
  open: boolean;
  onClose: () => void;
  model: Model;
  onAddTest: (testConfig: AddTestRequest) => void;
  dbtProjectPath: string;
  profilesYmlPath: string;
  targetName: string;
}

interface ModelOrSource {
  name: string;
  value: string;
  type: 'model' | 'source';
  schema: string;
  table: string;
}

type ConfigValue = string | string[];

const TestConfigDialog: React.FC<TestConfigDialogProps> = ({ 
  open, 
  onClose, 
  model, 
  onAddTest,
  dbtProjectPath,
  profilesYmlPath,
  targetName
}) => {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedTestType, setSelectedTestType] = useState('');
  const [configValues, setConfigValues] = useState<Record<string, ConfigValue>>({});
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [currentArrayInput, setCurrentArrayInput] = useState<string>('');
  const [modelsAndSources, setModelsAndSources] = useState<ModelOrSource[]>([]);

  useEffect(() => {
    const fetchTestTypes = async () => {
      try {
        const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}/test-types`);
        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }
        const data = await response.json();
        setTestTypes(data.test_types);
      } catch (error) {
        console.error('Error fetching test types:', error);
        setError('Failed to fetch test types');
      }
    };

    const fetchColumns = async () => {
      if (!model) return;
      
      try {
        const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}/columns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dbt_project_path: dbtProjectPath,
            profiles_yml_path: profilesYmlPath,
            target_name: targetName,
            schema: model.schema,
            table: model.table
          }),
        });
        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }
        const data = await response.json();
        setColumns(data.columns);
      } catch (error) {
        console.error('Error fetching columns:', error);
        setError('Failed to fetch columns');
      }
    };

    if (open && model) {
      fetchTestTypes();
      fetchColumns();
    }
  }, [open, dbtProjectPath, profilesYmlPath, targetName, model]);

  const fetchModelsAndSources = async () => {
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.modelsAndSources}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          profiles_yml_path: profilesYmlPath,
          target_name: targetName
        }),
      });
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
      const data = await response.json();
      setModelsAndSources([...data.models, ...data.sources]);
    } catch (error) {
      console.error('Error fetching models and sources:', error);
      setError('Failed to fetch models and sources');
    }
  };

  const handleTestTypeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTestType = event.target.value;
    setSelectedTestType(newTestType);
    setConfigValues({});

    // Check if the selected test type has any model_or_source fields
    const selectedTestTypeConfig = testTypes.find(t => t.name === newTestType);
    if (selectedTestTypeConfig?.required_configs.some(config => config.type === 'model_or_source')) {
      await fetchModelsAndSources();
    }
  };

  const handleColumnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColumn(event.target.value);
  };

  const handleConfigChange = (name: string, value: string, type: string) => {
    if (type === 'array') {
      setConfigValues(prev => ({
        ...prev,
        [name]: value.split(',').map(v => v.trim()).filter(v => v)
      }));
    } else {
      setConfigValues(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleArrayInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, name: string) => {
    if (e.key === 'Enter' && currentArrayInput.trim()) {
      e.preventDefault();
      const newValue = currentArrayInput.trim();
      setConfigValues(prev => ({
        ...prev,
        [name]: [...(prev[name] as string[] || []), newValue]
      }));
      setCurrentArrayInput('');
    }
  };

  const handleRemoveArrayValue = (name: string, valueToRemove: string) => {
    setConfigValues(prev => ({
      ...prev,
      [name]: (prev[name] as string[]).filter(v => v !== valueToRemove)
    }));
  };

  const handleSubmit = () => {
    if (!selectedTestType) {
      setError('Please select a test type');
      return;
    }

    // Get the selected test type configuration
    const selectedTestTypeConfig = testTypes.find(t => t.name === selectedTestType);
    if (!selectedTestTypeConfig) {
      setError('Invalid test type configuration');
      return;
    }

    // Process config values to use the formatted values for model_or_source fields
    const processedConfig: Record<string, string | string[]> = {};
    for (const [fieldName, value] of Object.entries(configValues)) {
      const fieldConfig = selectedTestTypeConfig.required_configs.find(
        config => config.name === fieldName
      );

      if (fieldConfig?.type === 'model_or_source') {
        // Find the selected model or source
        const selectedItem = modelsAndSources.find(item => item.name === value);
        if (selectedItem) {
          processedConfig[fieldName] = selectedItem.value;
        } else {
          processedConfig[fieldName] = value;
        }
      } else {
        processedConfig[fieldName] = value;
      }
    }

    const testConfig = {
      test_type: selectedTestType,
      config: processedConfig
    };

    onAddTest({
      dbt_project_path: dbtProjectPath,
      profiles_yml_path: profilesYmlPath,
      target_name: targetName,
      schema: model.schema,
      table: model.table,
      model_path: model.sql_path,
      test_config: testConfig,
      column_name: selectedColumn || undefined
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedTestType('');
    setConfigValues({});
    setSelectedColumn('');
    setError('');
    setCurrentArrayInput('');
    onClose();
  };

  const renderConfigField = (config: { name: string; type: string; description: string }) => {
    if (config.type === 'array') {
      return (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={`${config.description} (Press Enter to add)`}
            value={currentArrayInput}
            onChange={(e) => setCurrentArrayInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleArrayInputKeyDown(e, config.name)}
            margin="normal"
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {(configValues[config.name] as string[] || []).map((value, index) => (
              <Chip
                key={index}
                label={value}
                onDelete={() => handleRemoveArrayValue(config.name, value)}
              />
            ))}
          </Stack>
        </Box>
      );
    }

    if (config.type === 'model_or_source') {
      const value = configValues[config.name];
      return (
        <FormControl fullWidth margin="normal">
          <InputLabel>{config.description}</InputLabel>
          <Select
            value={typeof value === 'string' ? value : ''}
            onChange={(e: SelectChangeEvent<string>) => handleConfigChange(config.name, e.target.value, config.type)}
            label={config.description}
          >
            {modelsAndSources.map((item) => (
              <MenuItem key={item.name} value={item.value}>
                {item.name} ({item.type})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={config.name}
        fullWidth
        label={config.description}
        value={typeof configValues[config.name] === 'string' ? configValues[config.name] : ''}
        onChange={(e) => handleConfigChange(config.name, e.target.value, config.type)}
        margin="normal"
      />
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Test</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            select
            fullWidth
            label="Test Type"
            value={selectedTestType}
            onChange={handleTestTypeChange}
            margin="normal"
          >
            {testTypes.map((type) => (
              <MenuItem key={type.name} value={type.name}>
                {type.name} - {type.description}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Column (Optional)"
            value={selectedColumn}
            onChange={handleColumnChange}
            margin="normal"
          >
            <MenuItem value="">None (Model-level test)</MenuItem>
            {columns.map((column) => (
              <MenuItem key={column.name} value={column.name}>
                {column.name} ({column.type})
              </MenuItem>
            ))}
          </TextField>

          {selectedTestType && testTypes.find(t => t.name === selectedTestType)?.required_configs.map((config) => (
            renderConfigField(config)
          ))}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Test
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ModelDetailsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  model: Model | null;
  onAddTest: (testConfig: AddTestRequest) => void;
  onRemoveTest: (model: Model, testName: string) => void;
  dbtProjectPath: string;
  profilesYmlPath: string;
  targetName: string;
}> = ({ open, onClose, model, onAddTest, onRemoveTest, dbtProjectPath, profilesYmlPath, targetName }) => {
  const [testConfigDialogOpen, setTestConfigDialogOpen] = useState(false);
  const [error, setError] = useState<string>('');

  if (!model) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Model Details: {model.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Basic Information</Typography>
            <Typography><strong>File Path:</strong> {model.sql_path}</Typography>
            <Typography><strong>Model Name:</strong> {model.name}</Typography>
            <Typography><strong>Schema:</strong> {model.schema}</Typography>
            <Typography><strong>Table:</strong> {model.table}</Typography>
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Tests</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={() => setTestConfigDialogOpen(true)}
              >
                Add Test
              </Button>
            </Box>
            {model.tests && model.tests.length > 0 ? (
              <Box sx={{ 
                maxHeight: '300px',
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#555',
                  },
                },
              }}>
                {model.tests.map((test, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1,
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2">{test}</Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => onRemoveTest(model, test)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>No tests defined for this model</Typography>
            )}
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <TestConfigDialog
        open={testConfigDialogOpen}
        onClose={() => setTestConfigDialogOpen(false)}
        model={model}
        onAddTest={onAddTest}
        dbtProjectPath={dbtProjectPath}
        profilesYmlPath={profilesYmlPath}
        targetName={targetName}
      />
    </Dialog>
  );
};

export default function ModelsGrid({ dbtProjectPath, profilesYmlPath, targetName }: ModelsGridProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [testConfigDialogOpen, setTestConfigDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchModels();
  }, [dbtProjectPath, profilesYmlPath, targetName]);

  const fetchModels = async () => {
    if (!dbtProjectPath) {
      showSnackbar('Project settings not configured', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          profiles_yml_path: profilesYmlPath,
          target_name: targetName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      console.log('Fetched models data:', data.models);
      setModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
      showSnackbar('Failed to fetch models', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (testConfig: AddTestRequest) => {
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}/add-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add test');
      }
      
      if (data.success) {
        // Fetch updated models and update selected model
        const updatedResponse = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dbt_project_path: dbtProjectPath,
            profiles_yml_path: profilesYmlPath,
            target_name: targetName
          }),
        });

        if (!updatedResponse.ok) {
          throw new Error('Failed to fetch updated models');
        }

        const updatedData = await updatedResponse.json();
        setModels(updatedData.models);
        
        // Update selected model if it exists
        if (selectedModel) {
          const updatedModel = updatedData.models.find((m: Model) => m.id === selectedModel.id);
          if (updatedModel) {
            setSelectedModel(updatedModel);
          }
        }
        
        showSnackbar('Test added successfully', 'success');
      } else {
        showSnackbar(data.message, 'error');
      }
    } catch (error) {
      console.error('Error adding test:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to add test', 'error');
    }
  };

  const handleView = (model: Model) => {
    setSelectedModel(model);
    setViewDialogOpen(true);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleRemoveTest = async (model: any, testName: string) => {
    if (!dbtProjectPath) {
      showSnackbar('Project settings not configured', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}/remove-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          model_path: model.sql_path,
          test_name: testName
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Fetch updated models and update selected model
        const updatedResponse = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dbt_project_path: dbtProjectPath,
            profiles_yml_path: profilesYmlPath,
            target_name: targetName
          }),
        });

        if (!updatedResponse.ok) {
          throw new Error('Failed to fetch updated models');
        }

        const updatedData = await updatedResponse.json();
        setModels(updatedData.models);
        
        // Update selected model if it exists
        if (selectedModel) {
          const updatedModel = updatedData.models.find((m: Model) => m.id === selectedModel.id);
          if (updatedModel) {
            setSelectedModel(updatedModel);
          }
        }
        
        showSnackbar('Test removed successfully', 'success');
      } else {
        showSnackbar(`Failed to remove test: ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('Error removing test:', error);
      showSnackbar('Failed to remove test', 'error');
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'sql_path', 
      headerName: 'Model', 
      flex: 1,
      minWidth: 200
    },
    { 
      field: 'schema', 
      headerName: 'Schema', 
      flex: 1,
      minWidth: 150
    },
    { 
      field: 'table', 
      headerName: 'Table', 
      flex: 1,
      minWidth: 150
    },
    { 
      field: 'tests', 
      headerName: 'Tests', 
      flex: 1,
      minWidth: 100,
      sortable: true,
      align: 'left',
      headerAlign: 'left',
      valueGetter: (params: GridRenderCellParams<Model>) => {
        if (!params.row || !Array.isArray(params.row.tests)) {
          return 0;
        }
        return params.row.tests.length;
      },
      renderCell: (params: GridRenderCellParams<Model>) => {
        if (!params.row || !Array.isArray(params.row.tests)) {
          return null;
        }
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            width: '100%',
            height: '100%',
            pl: 1
          }}>
            <Typography variant="body2">
              {params.row.tests.length}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          onClick={() => handleView(params.row)}
        >
          <VisibilityIcon />
        </IconButton>
      )
    }
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Models</Typography>
      </Box>

      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={models}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25]}
        />
      </div>

      <ModelDetailsDialog 
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        model={selectedModel}
        onAddTest={handleAddTest}
        onRemoveTest={handleRemoveTest}
        dbtProjectPath={dbtProjectPath}
        profilesYmlPath={profilesYmlPath}
        targetName={targetName}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 