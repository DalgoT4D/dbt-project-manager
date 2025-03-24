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
  Paper
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
    config: Record<string, string>;
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
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [error, setError] = useState<string>('');

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

    if (open) {
      fetchTestTypes();
      fetchColumns();
    }
  }, [open, model, dbtProjectPath, profilesYmlPath, targetName]);

  const handleTestTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTestType(event.target.value);
    setConfigValues({});
  };

  const handleColumnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColumn(event.target.value);
  };

  const handleConfigChange = (name: string, value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (!selectedTestType) {
      setError('Please select a test type');
      return;
    }

    const testConfig = {
      test_type: selectedTestType,
      config: configValues
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

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
            <TextField
              key={config.name}
              fullWidth
              label={config.description}
              value={configValues[config.name] || ''}
              onChange={(e) => handleConfigChange(config.name, e.target.value)}
              margin="normal"
            />
          ))}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
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
}> = ({ open, onClose, model }) => {
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
            <Typography variant="subtitle1" fontWeight="bold">Tests</Typography>
            {model.tests && model.tests.length > 0 ? (
              <ul>
                {model.tests.map((test, index) => (
                  <li key={index}>{test}</li>
                ))}
              </ul>
            ) : (
              <Typography>No tests defined for this model</Typography>
            )}
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
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
    if (!dbtProjectPath || !profilesYmlPath || !targetName) return;
    
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
      console.log('API Response:', data); // Debug log
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
        showSnackbar('Test added successfully', 'success');
        fetchModels(); // Refresh models to get updated test list
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
        // Refresh models after successfully removing the test
        fetchModels();
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
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.row.tests.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {params.row.tests.map((test: string, index: number) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                    {test}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTest(params.row, test);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography noWrap>No tests</Typography>
          )}
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedModel(params.row);
              setTestConfigDialogOpen(true);
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      )
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

      <TestConfigDialog
        open={testConfigDialogOpen}
        onClose={() => setTestConfigDialogOpen(false)}
        model={selectedModel!}
        onAddTest={handleAddTest}
        dbtProjectPath={dbtProjectPath}
        profilesYmlPath={profilesYmlPath}
        targetName={targetName}
      />

      <ModelDetailsDialog 
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        model={selectedModel}
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