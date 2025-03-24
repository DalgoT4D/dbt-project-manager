import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Snackbar, 
  Alert,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { 
  DataGrid, 
  GridColDef, 
  GridActionsCellItem, 
  GridRowParams,
  GridRenderCellParams
} from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { API_CONFIG } from '../config';

interface Model {
  schema: string | null;
  table: string | null;
  sql_path: string;
  file_name: string;
  tests: string[];
}

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<Model & { id: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    const settingsStr = localStorage.getItem('projectSettings');
    if (!settingsStr) {
      showSnackbar('Project settings not found', 'error');
      setLoading(false);
      return;
    }

    const settings = JSON.parse(settingsStr);
    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
      showSnackbar('Failed to fetch models', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: number) => {
    const model = models.find((_, index) => index === id);
    if (model) {
      setCurrentModel({ ...model, id });
      setViewDialogOpen(true);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const columns: GridColDef[] = [
    { field: 'schema', headerName: 'Schema', flex: 1, minWidth: 150 },
    { field: 'table', headerName: 'Table', flex: 1, minWidth: 150 },
    { field: 'sql_path', headerName: 'Model', flex: 1.5, minWidth: 200 },
    { 
      field: 'tests', 
      headerName: 'Tests', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        const tests = params.row.tests as string[];
        return tests ? tests.join(', ') : '';
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="view"
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => handleView(params.id as number)}
        />,
      ],
    },
  ];

  const rows = models.map((model, index) => ({
    id: index,
    ...model,
  }));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Models</Typography>
      </Box>

      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows}
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

      {/* View Model Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Model Details: {currentModel?.file_name}</DialogTitle>
        <DialogContent>
          {currentModel && (
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Basic Information</Typography>
                <Typography><strong>File Path:</strong> {currentModel.sql_path}</Typography>
                <Typography><strong>File Name:</strong> {currentModel.file_name}</Typography>
                <Typography><strong>Schema:</strong> {currentModel.schema || 'Not mapped to database'}</Typography>
                <Typography><strong>Table:</strong> {currentModel.table || 'Not mapped to database'}</Typography>
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Tests</Typography>
                {currentModel.tests && currentModel.tests.length > 0 ? (
                  <ul>
                    {currentModel.tests.map((test, index) => (
                      <li key={index}>{test}</li>
                    ))}
                  </ul>
                ) : (
                  <Typography>No tests defined for this model</Typography>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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