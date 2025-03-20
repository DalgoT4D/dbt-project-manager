import { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { API_CONFIG } from '../config';
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
  Snackbar,
  Alert,
  Typography,
  Checkbox,
  ListItemText,
  Paper
} from '@mui/material';
// @ts-ignore
import AddSourceDialog from './AddSourceDialog.tsx';

interface Source {
  source: string;
  schema: string;
  table: string;
  tests: string[];
  description?: string;
}

interface SourcesGridProps {
  dbtProjectPath: string;
}

export default function SourcesGrid({ dbtProjectPath }: SourcesGridProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addSourceDialogOpen, setAddSourceDialogOpen] = useState(false);
  const [currentSource, setCurrentSource] = useState<Source & { id: number } | null>(null);
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
    fetchSources();
  }, [dbtProjectPath]);

  const fetchSources = async () => {
    if (!dbtProjectPath) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbt_project_path: dbtProjectPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }

      const data = await response.json();
      setSources(data.sources);
    } catch (error) {
      console.error('Error fetching sources:', error);
      showSnackbar('Failed to fetch sources', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const source = sources.find((_, index) => index === id);
    if (source) {
      setCurrentSource({ ...source, id });
      setEditDialogOpen(true);
    }
  };

  const handleDelete = (id: number) => {
    const source = sources.find((_, index) => index === id);
    if (source) {
      setCurrentSource({ ...source, id });
      setDeleteDialogOpen(true);
    }
  };

  const handleAddSource = () => {
    setAddSourceDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentSource) return;
    
    try {
      const originalSource = sources[currentSource.id];
      
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          original_source: originalSource.source,
          original_table: originalSource.table,
          updated_source: {
            source: currentSource.source,
            schema: currentSource.schema,
            table: currentSource.table,
            tests: currentSource.tests,
            description: currentSource.description
          }
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update source');
      }
      
      showSnackbar('Source updated successfully', 'success');
      fetchSources();
    } catch (error) {
      console.error('Error updating source:', error);
      showSnackbar(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      setEditDialogOpen(false);
      setCurrentSource(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentSource) return;
    
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          source: currentSource.source,
          table: currentSource.table
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete source');
      }
      
      showSnackbar('Source deleted successfully', 'success');
      fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      showSnackbar(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setCurrentSource(null);
    }
  };

  const handleSourceAdded = () => {
    fetchSources();
    setAddSourceDialogOpen(false);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const columns: GridColDef[] = [
    { field: 'source', headerName: 'Source', flex: 1, minWidth: 150 },
    { field: 'schema', headerName: 'Schema', flex: 1, minWidth: 150 },
    { field: 'table', headerName: 'Table', flex: 1, minWidth: 150 },
    { field: 'tests', headerName: 'Tests', flex: 1, minWidth: 150 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.id as number)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.id as number)}
        />,
      ],
    },
  ];

  const rows = sources.map((source, index) => ({
    id: index,
    ...source,
  }));

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Sources</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAddSource}
        >
          Add New Source
        </Button>
      </Box>

      <div style={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5 },
            },
          }}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          disableRowSelectionOnClick
          sx={{ width: '100%' }}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Source</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, minWidth: '400px' }}>
            <TextField
              label="Source"
              value={currentSource?.source || ''}
              onChange={(e) => currentSource && setCurrentSource({...currentSource, source: e.target.value})}
              fullWidth
            />
            <TextField
              label="Schema"
              value={currentSource?.schema || ''}
              onChange={(e) => currentSource && setCurrentSource({...currentSource, schema: e.target.value})}
              fullWidth
            />
            <TextField
              label="Table"
              value={currentSource?.table || ''}
              onChange={(e) => currentSource && setCurrentSource({...currentSource, table: e.target.value})}
              fullWidth
            />
            <TextField
              label="Description"
              value={currentSource?.description || ''}
              onChange={(e) => currentSource && setCurrentSource({...currentSource, description: e.target.value})}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Source</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the source table "{currentSource?.table}" from "{currentSource?.source}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Add Source Dialog */}
      <AddSourceDialog 
        open={addSourceDialogOpen}
        onClose={() => setAddSourceDialogOpen(false)}
        onSourceAdded={handleSourceAdded}
        dbtProjectPath={dbtProjectPath}
        onError={(message: string) => showSnackbar(message, 'error')}
        onSuccess={(message: string) => showSnackbar(message, 'success')}
      />

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
} 