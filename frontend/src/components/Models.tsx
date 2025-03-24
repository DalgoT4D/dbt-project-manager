import { Box, Typography } from '@mui/material';
import ModelsGrid from './ModelsGrid';

export default function Models() {
  const settings = JSON.parse(localStorage.getItem('projectSettings') || '{}');
  const dbtProjectPath = settings.dbt_project_path;
  const profilesYmlPath = settings.profiles_yml_path;
  const targetName = settings.target_name;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Models
      </Typography>
      <ModelsGrid 
        dbtProjectPath={dbtProjectPath} 
        profilesYmlPath={profilesYmlPath} 
        targetName={targetName}
      />
    </Box>
  );
} 