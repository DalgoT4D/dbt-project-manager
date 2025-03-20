import { Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProjectSettings from './components/ProjectSettings';
import Sources from './components/Sources';
import Models from './components/Models';

function AppContent() {
  const location = useLocation();
  const settings = localStorage.getItem('projectSettings');

  // Only redirect to settings if settings are not configured and we're not already on settings page
  if (!settings && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Box>
      <Navigation />
      <Box padding={3}>
        <Routes>
          <Route path="/" element={<Navigate to="/sources" replace />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/models" element={<Models />} />
          <Route path="/settings" element={<ProjectSettings />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;