import { Box, Typography } from '@mui/material';
import SourcesGrid from './SourcesGrid';

export default function Sources() {
  const settings = JSON.parse(localStorage.getItem('projectSettings') || '{}');
  const dbtProjectPath = settings.dbt_project_path;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sources
      </Typography>
      <SourcesGrid dbtProjectPath={dbtProjectPath} />
    </Box>
  );
}