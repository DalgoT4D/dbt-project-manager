import { useState, useEffect } from 'react';
import { AppBar, Toolbar, Tabs, Tab, Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import SchemaIcon from '@mui/icons-material/Schema';

export default function Navigation() {
  const location = useLocation();
  const [value, setValue] = useState(0);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const settings = localStorage.getItem('projectSettings');
    setIsConfigured(!!settings);
    
    // Set the active tab based on current location
    const path = location.pathname;
    if (path === '/sources') setValue(0);
    else if (path === '/models') setValue(1);
    else if (path === '/settings') setValue(2);
  }, [location]);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Box flexGrow={1}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="navigation tabs"
            sx={{ 
              '& .MuiTabs-flexContainer': { justifyContent: 'flex-start' },
              '& .Mui-selected': { 
                color: '#fff !important',
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px 4px 0 0',
              },
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#fff',
                  opacity: 1
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#fff',
                height: 3
              }
            }}
            textColor="inherit"
          >
            <Tab 
              label="Sources" 
              component={Link} 
              to="/sources" 
              disabled={!isConfigured}
              icon={<StorageIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Models" 
              component={Link} 
              to="/models" 
              disabled={!isConfigured}
              icon={<SchemaIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Settings" 
              component={Link} 
              to="/settings"
              icon={<SettingsIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 