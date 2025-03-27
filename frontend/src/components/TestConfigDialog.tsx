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
  Alert,
  FormHelperText,
  Chip
} from '@mui/material';
import { API_CONFIG } from '../config';

interface TestType {
  name: string;
  description: string;
  required_configs: {
    name: string;
    type: string;
    description: string;
    required_configs?: {
      name: string;
      type: string;
      description: string;
    }[];
  }[];
}

interface ColumnInfo {
  name: string;
  type: string;
  description?: string;
}

// interface Model {
//   id: string;
//   name: string;
//   schema: string;
//   table: string;
//   tests: string[];
//   sql_path: string;
// }

// interface Source {
//   description: string;
//   source: string;
//   schema: string;
//   table: string;
//   tests: string[];
// }

interface ModelOrSource {
  name: string;
  value: string;
  type: 'model' | 'source';
  schema: string;
  table: string;
}

export interface AddTestRequestInterface {
  dbt_project_path: string;
  profiles_yml_path: string;
  target_name: string;
  schema: string;
  table: string;
  model_path: string;
  source?: string;
  test_config: {
    test_type: string;
    config: Record<string, ConfigValue>;
  };
  column_name?: string;
}

interface TestConfigDialogProps {
  open: boolean;
  onClose: () => void;
  sourceOrModel: any;
  onAddTest: (request: AddTestRequestInterface) => void;
  dbtProjectPath: string;
  profilesYmlPath: string;
  targetName: string;
  currentTestType: string;
}

type ConfigValue = string | number | boolean | string[] | Record<string, any>;

export default function TestConfigDialog({
  open,
  onClose,
  sourceOrModel,
  onAddTest,
  dbtProjectPath,
  profilesYmlPath,
  targetName,
  currentTestType = 'model'
}: TestConfigDialogProps) {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selectedTestType, setSelectedTestType] = useState('');
  const [configValues, setConfigValues] = useState<Record<string, ConfigValue>>({});
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [currentArrayInput, setCurrentArrayInput] = useState<string>('');
  const [modelsAndSources, setModelsAndSources] = useState<ModelOrSource[]>([]);

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
          target_name: targetName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models and sources');
      }

      const data = await response.json();
      setModelsAndSources([...data.models, ...data.sources]);
    } catch (error) {
      console.error('Error fetching models and sources:', error);
    }
  };

  const fetchTestTypes = async () => {
    try {
      // Determine if we're dealing with a source or model based on the model prop
      const endpoint = currentTestType === 'model' ? 
        `${API_CONFIG.backendUrl}${API_CONFIG.endpoints.models}/test-types` :
        `${API_CONFIG.backendUrl}${API_CONFIG.endpoints.sources}/test-types`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch test types');
      }
      const data = await response.json();
      setTestTypes(data.test_types);
    } catch (error) {
      console.error('Error fetching test types:', error);
      // TODO: Show error message to user
    }
  };

  const fetchColumns = async () => {
    if (!sourceOrModel) return;

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
          schema: sourceOrModel.schema,
          table: sourceOrModel.table
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

  useEffect(() => {
    if (open) {
      fetchTestTypes();
      fetchColumns();
    }
  }, [open, sourceOrModel, dbtProjectPath, profilesYmlPath, targetName]);

  // Add new useEffect to handle model_or_source field
  useEffect(() => {
    if (!selectedTestType || !testTypes.length) return;

    const selectedTest = testTypes.find(t => t.name === selectedTestType);
    const hasModelOrSourceField = selectedTest?.required_configs.some(
      config => config.type === 'model_or_source'
    );

    if (hasModelOrSourceField) {
      fetchModelsAndSources();
    }
  }, [selectedTestType, testTypes, dbtProjectPath, profilesYmlPath, targetName]);

  const handleTestTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedTestType(event.target.value as string);
    setConfigValues({});
    setError('');
  };

  const handleColumnChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedColumn(event.target.value as string);
    setError('');
  };

  const handleConfigChange = (configName: string, value: string | boolean) => {
    // Handle nested config values
    if (configName.includes('.')) {
      const [parent, child] = configName.split('.');
      setConfigValues(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent] as Record<string, any> || {}),
          [child]: value
        }
      }));
    } else {
      setConfigValues(prev => ({
        ...prev,
        [configName]: value
      }));
    }
    setError('');
  };

  const handleArrayInputChange = (configName: string, value: string) => {
    setCurrentArrayInput(value);
  };

  const handleArrayInputKeyPress = (configName: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && currentArrayInput.trim()) {
      const currentValues = (configValues[configName] as string[]) || [];
      setConfigValues(prev => ({
        ...prev,
        [configName]: [...currentValues, currentArrayInput.trim()]
      }));
      setCurrentArrayInput('');
    }
  };

  const handleArrayItemDelete = (configName: string, index: number) => {
    const currentValues = (configValues[configName] as string[]) || [];
    setConfigValues(prev => ({
      ...prev,
      [configName]: currentValues.filter((_, i) => i !== index)
    }));
  };

  const renderConfigField = (config: TestType['required_configs'][0], parentKey: string = '') => {
    const value = configValues[config.name];
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      handleConfigChange(config.name, event.target.value);
    };

    switch (config.type) {
      case 'string':
        return (
          <TextField
            key={config.name}
            label={config.name}
            value={value || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText={config.description}
          />
        );
      case 'number':
        return (
          <TextField
            key={config.name}
            label={config.name}
            type="number"
            value={value || ''}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText={config.description}
          />
        );
      case 'boolean':
        return (
          <FormControl key={config.name} fullWidth margin="normal">
            <InputLabel>{config.name}</InputLabel>
            <Select
              value={value === undefined ? '' : value.toString()}
              onChange={(e) => handleConfigChange(config.name, e.target.value === 'true')}
              label={config.name}
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
            <FormHelperText>{config.description}</FormHelperText>
          </FormControl>
        );
      case 'array':
        return (
          <Box key={config.name} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{config.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                value={currentArrayInput}
                onChange={(e) => handleArrayInputChange(config.name, e.target.value)}
                onKeyPress={(e) => handleArrayInputKeyPress(config.name, e)}
                placeholder="Enter value and press Enter"
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={() => handleArrayInputKeyPress(config.name, { key: 'Enter' } as React.KeyboardEvent)}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(value as string[] || []).map((item, index) => (
                <Chip
                  key={index}
                  label={item}
                  onDelete={() => handleArrayItemDelete(config.name, index)}
                />
              ))}
            </Box>
            <FormHelperText>{config.description}</FormHelperText>
          </Box>
        );
      case 'dict':
        return (
          <Box key={config.name} sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
            <Typography variant="subtitle2">{config.name}</Typography>
            {config.required_configs?.map((nestedConfig) => (
              <Box key={nestedConfig.name} sx={{ mt: 1 }}>
                {renderConfigField(nestedConfig, `${config.name}.`)}
              </Box>
            ))}
            <FormHelperText>{config.description}</FormHelperText>
          </Box>
        );
      case 'model_or_source':
        return (
          <FormControl key={config.name} fullWidth margin="normal">
            <InputLabel>{config.name}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleConfigChange(config.name, e.target.value as string)}
              label={config.name}
            >
              <MenuItem value="">Select a model or source</MenuItem>
              {modelsAndSources.map((item) => (
              <MenuItem key={item.name} value={item.value}>
                {item.name} ({item.type})
              </MenuItem>
            ))}
            </Select>
            <FormHelperText>{config.description}</FormHelperText>
          </FormControl>
        );
      default:
        return null;
    }
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

    console.log("source or model", sourceOrModel);

    const fullRequest = {
      dbt_project_path: dbtProjectPath,
      profiles_yml_path: profilesYmlPath,
      target_name: targetName,
      schema: sourceOrModel?.schema || '',
      table: sourceOrModel?.table || '',
      model_path: sourceOrModel?.sql_path || '',  // Empty string for sources
      source: sourceOrModel?.source || '',  // Set source_name only for sources
      test_config: testConfig,
      column_name: selectedColumn || undefined
    };

    onAddTest(fullRequest);
    handleClose(); // Close the dialog after adding the test
  };

  const handleClose = () => {
    setSelectedTestType('');
    setConfigValues({});
    setSelectedColumn('');
    setError('');
    setCurrentArrayInput('');
    setModelsAndSources([]);
    onClose();
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
            <MenuItem value="">None (Table-level test)</MenuItem>
            {columns.map((column) => (
              <MenuItem key={column.name} value={column.name}>
                {column.name} ({column.type})
              </MenuItem>
            ))}
          </TextField>

          {selectedTestType && testTypes.length > 0 && (
            <>
              {testTypes.find(t => t.name === selectedTestType)?.required_configs?.map((config) => (
                renderConfigField(config)
              ))}
            </>
          )}

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
} 