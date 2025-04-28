import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button, Snackbar, Alert, useTheme } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Sidebar from '../components/Sidebar';
import EmailList from '../components/EmailList';
import Header from '../components/Header';
import ResizableSidebar from '../components/ResizableSidebar';
import { useEmailContext } from '../context/EmailContext';
import '../styles/MainLayout.css';

const MainLayout: React.FC = () => {
  const { fetchEmails, loading, error, refreshing, selectedCategory } = useEmailContext();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default sidebar width
  const theme = useTheme();

  // Set CSS variables based on theme
  useEffect(() => {
    if (theme.palette.mode === 'dark') {
      document.documentElement.style.setProperty('--email-content-bg', theme.palette.background.default);
      document.documentElement.style.setProperty('--email-header-bg', theme.palette.background.paper);
      document.documentElement.style.setProperty('--border-color', theme.palette.divider);
      document.documentElement.style.setProperty('--resize-handle-color', `${theme.palette.primary.main}40`);
      document.documentElement.style.setProperty('--email-content-a', '#afafff');
    } else {
      document.documentElement.style.setProperty('--email-content-bg', '#f5f5f5');
      document.documentElement.style.setProperty('--email-header-bg', '#ffffff');
      document.documentElement.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.12)');
      document.documentElement.style.setProperty('--resize-handle-color', `${theme.palette.primary.main}40`);
    }
  }, [theme.palette.mode, theme.palette.primary.main]);

  // Show error snackbar when there's an error
  useEffect(() => {
    if (error) {
      setSnackbarOpen(true);
    }
  }, [error]);

  const handleRefresh = () => {
    fetchEmails();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSidebarWidthChange = (width: number) => {
    setSidebarWidth(width);
  };

  return (
    <div className="main-layout">
      <Header />
      <div className="content-grid">
        <ResizableSidebar 
          initialWidth={sidebarWidth}
          minWidth={55}
          maxWidth={400}
          onWidthChange={handleSidebarWidthChange}
        >
          <Sidebar />
        </ResizableSidebar>
        
        <div className="email-content">
          <div className="email-header">
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {selectedCategory}
            </Typography>
            <Button 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing || loading}
              sx={{ ml: 2 }}
            >
              Refresh
            </Button>
          </div>
          
          {loading && !refreshing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 48px)' }}>
              <CircularProgress />
            </Box>
          ) : (
            <EmailList />
          )}
        </div>
      </div>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MainLayout;