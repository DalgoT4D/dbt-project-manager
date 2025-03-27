import { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Box, 
  Typography, 
  Alert, 
  Snackbar,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { API_CONFIG } from '../config';
import TestConfigDialog, { AddTestRequestInterface } from './TestConfigDialog';

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

const ModelDetailsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  model: Model | null;
  onAddTest: (request: AddTestRequestInterface) => void;
  onRemoveTest: (model: Model, testName: string) => void;
  dbtProjectPath: string;
  profilesYmlPath: string;
  targetName: string;
}> = ({ open, onClose, model, onAddTest, onRemoveTest, dbtProjectPath, profilesYmlPath, targetName }) => {
  const [testConfigDialogOpen, setTestConfigDialogOpen] = useState(false);

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
        sourceOrModel={model}
        onAddTest={onAddTest}
        dbtProjectPath={dbtProjectPath}
        profilesYmlPath={profilesYmlPath}
        targetName={targetName}
        currentTestType="model"
      />
    </Dialog>
  );
};

export default function ModelsGrid({ dbtProjectPath, profilesYmlPath, targetName }: ModelsGridProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
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

  const handleAddTest = async (testConfig: AddTestRequestInterface) => {
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