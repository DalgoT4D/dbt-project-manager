import { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config';

interface ProjectSettings {
  dbt_project_path: string;
  profiles_yml_path: string;
  target_name: string;
}

export default function ProjectSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ProjectSettings>({
    dbt_project_path: '',
    profiles_yml_path: '',
    target_name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage when component mounts
    const savedSettings = localStorage.getItem('projectSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      // Save to backend
      const response = await fetch(`${API_CONFIG.backendUrl}/project-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save settings');
      }

      // Save locally
      localStorage.setItem('projectSettings', JSON.stringify(settings));
      navigate('/sources'); // Navigate to sources page after saving
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        DBT Project Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <TextField
          label="DBT Project Path"
          name="dbt_project_path"
          value={settings.dbt_project_path}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          helperText="Absolute path to your dbt project"
        />
        <TextField
          label="profiles.yml Path"
          name="profiles_yml_path"
          value={settings.profiles_yml_path}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          helperText="Absolute path to your profiles.yml file"
        />
        <TextField
          label="Target Name"
          name="target_name"
          value={settings.target_name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          helperText="The target profile to use (e.g., dev, prod)"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          style={{ marginTop: '1rem' }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </Container>
  );
}