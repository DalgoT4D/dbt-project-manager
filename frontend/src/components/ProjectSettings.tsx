import { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('projectSettings', JSON.stringify(settings));
    alert('Project settings saved successfully');
    navigate('/sources'); // Navigate to sources page after saving
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
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <TextField
          label="DBT Project Path"
          name="dbt_project_path"
          value={settings.dbt_project_path}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="profiles.yml Path"
          name="profiles_yml_path"
          value={settings.profiles_yml_path}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Target Name"
          name="target_name"
          value={settings.target_name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          style={{ marginTop: '1rem' }}
        >
          Save Settings
        </Button>
      </form>
    </Container>
  );
}