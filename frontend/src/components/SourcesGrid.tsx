import { useEffect, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { API_CONFIG } from '../config';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  Box,
  Snackbar,
  Alert,
  Typography,
  Paper,
  IconButton,
} from '@mui/material';
import AddSourceDialog from './AddSourceDialog.tsx';
import TestConfigDialog, { AddTestRequestInterface } from './TestConfigDialog.tsx';

interface Source {
  source: string;
  schema: string;
  table: string;
  tests: string[];
  description?: string;
}

interface ProjectSettings {
  profiles_yml_path: string;
  target_name: string;
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [testConfigDialogOpen, setTestConfigDialogOpen] = useState(false);
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

  const handleView = (id: number) => {
    const source = sources.find((_, index) => index === id);
    if (source) {
      setCurrentSource({ ...source, id });
      setViewDialogOpen(true);
    }
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

  const handleAddTestSubmit = async (request: AddTestRequestInterface) => {
    if (!currentSource) return;
    
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}/add-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add test');
      }
      
      showSnackbar('Test added successfully', 'success');
      
      // Fetch updated sources and update current source
      const updatedSources = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbt_project_path: dbtProjectPath }),
      }).then(res => res.json());
      
      setSources(updatedSources.sources);
      
      const updatedSource = updatedSources.sources.find(
        (s: Source) => s.source === currentSource.source && s.table === currentSource.table
      );
      
      if (updatedSource) {
        setCurrentSource({ ...updatedSource, id: currentSource.id });
      }
      
      setTestConfigDialogOpen(false);
    } catch (error) {
      console.error('Error adding test:', error);
      showSnackbar(error instanceof Error ? error.message : 'An error occurred', 'error');
    }
  };

  const handleRemoveTest = async (testName: string) => {
    if (!currentSource) return;
    
    try {
      const response = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}/remove-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbt_project_path: dbtProjectPath,
          source_name: currentSource.source,
          table_name: currentSource.table,
          test_name: testName,
          column_name: testName.includes(': ') ? testName.split(': ')[0] : undefined
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove test');
      }
      
      showSnackbar('Test removed successfully', 'success');
      
      // Fetch updated sources and update current source
      const updatedSources = await fetch(`${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbt_project_path: dbtProjectPath }),
      }).then(res => res.json());
      
      setSources(updatedSources.sources);
      
      const updatedSource = updatedSources.sources.find(
        (s: Source) => s.source === currentSource.source && s.table === currentSource.table
      );
      
      if (updatedSource) {
        setCurrentSource({ ...updatedSource, id: currentSource.id });
      }
    } catch (error) {
      console.error('Error removing test:', error);
      showSnackbar(error instanceof Error ? error.message : 'An error occurred', 'error');
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
    { field: 'source', headerName: 'Source', width: 200 },
    { field: 'schema', headerName: 'Schema', width: 200 },
    { field: 'table', headerName: 'Table', width: 200 },
    { 
      field: 'description', 
      headerName: 'Description', 
      width: 300,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%'
          }}
        >
          {params.value || ''}
        </Typography>
      )
    },
    {
      field: 'tests',
      headerName: 'Tests',
      width: 100,
      renderCell: (params) => (
        <Typography 
          variant="body2"
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%'
          }}
        >
          {params.value?.length || 0} test{params.value?.length !== 1 ? 's' : ''}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleView(params.row.id)}
            title="View Details"
          >
            <VisibilityIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row.id)}
            title="Edit"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            title="Delete"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <div style={{ height: 600, width: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddSource}
        >
          Add Source
        </Button>
      </Box>

      <DataGrid
        rows={sources.map((source, index) => ({ ...source, id: index }))}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        pageSizeOptions={[10]}
        loading={loading}
        disableRowSelectionOnClick
      />

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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Source Details: {currentSource?.table}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Basic Information</Typography>
              <Typography><strong>Source:</strong> {currentSource?.source}</Typography>
              <Typography><strong>Schema:</strong> {currentSource?.schema}</Typography>
              <Typography><strong>Table:</strong> {currentSource?.table}</Typography>
              <Typography><strong>Description:</strong> {currentSource?.description || 'No description'}</Typography>
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
              {currentSource?.tests && currentSource.tests.length > 0 ? (
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
                  {currentSource.tests.map((test, index) => (
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
                        onClick={() => handleRemoveTest(test)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography>No tests defined for this source</Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>

        {/* Test Config Dialog */}
        <TestConfigDialog
          open={testConfigDialogOpen}
          onClose={() => setTestConfigDialogOpen(false)}
          sourceOrModel={currentSource || null}
          onAddTest={handleAddTestSubmit}
          dbtProjectPath={dbtProjectPath}
          profilesYmlPath={(JSON.parse(localStorage.getItem('projectSettings') || '{}') as ProjectSettings)?.profiles_yml_path || ''}
          targetName={(JSON.parse(localStorage.getItem('projectSettings') || '{}') as ProjectSettings)?.target_name || ''}
          currentTestType="source" 
        />
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