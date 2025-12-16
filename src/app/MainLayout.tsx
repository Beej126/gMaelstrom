import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button, Snackbar, Alert, useTheme, IconButton, Tooltip, Checkbox } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import Sidebar from '../components/Sidebar';
import EmailList from '../components/EmailList';
import Header from '../components/Header';
import { useEmailContext } from './ctxEmail';
import { markEmailsAsUnread } from './GmailApi';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { fetchEmails, loading, error, refreshing, selectedCategory } = useEmailContext();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const theme = useTheme();

  // State for checked emails, lifted up from EmailList
  const [checkedEmails, setCheckedEmails] = useState<Record<string, boolean>>({});
  const anyChecked = Object.values(checkedEmails).some(Boolean);
  const allEmailIds = Object.keys(checkedEmails);
  const allChecked = allEmailIds.length > 0 && allEmailIds.every(id => checkedEmails[id]);
  const someChecked = allEmailIds.some(id => checkedEmails[id]) && !allChecked;

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
  }, [theme.palette.background.default, theme.palette.background.paper, theme.palette.divider, theme.palette.mode, theme.palette.primary.main]);

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

  const handleMarkAsUnread = async () => {
    const selectedIds = Object.entries(checkedEmails)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
    if (!selectedIds.length) return;
    try {
      await markEmailsAsUnread(selectedIds);
      setCheckedEmails({}); // Clear selection
      await fetchEmails(); // Refresh list
    } catch {
      setSnackbarOpen(true);
    }
  };

  const handleCheckAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    const newChecked: Record<string, boolean> = {};
    for (const id of allEmailIds) {
      newChecked[id] = checked;
    }
    setCheckedEmails(newChecked);
  };

  return (
    <div className="main-layout">
      <Header />
      <div className="content-grid">
        <Sidebar />
        <div className="email-content">
          <div className="email-header">
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                alignItems: 'center',
                color: theme => theme.palette.mode === 'light' ? '#222' : theme.palette.text.primary,
                fontWeight: 600
              }}
            >
              {selectedCategory}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  ml: '2em',
                  px: 1.5,
                  py: 0.5,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#232323' : '#fafbfc',
                  boxShadow: theme => theme.palette.mode === 'dark' ? '0 1px 2px 0 rgba(0,0,0,0.10)' : '0 1px 2px 0 rgba(0,0,0,0.04)'
                }}
              >
                <Checkbox
                  size="small"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={handleCheckAll}
                  inputProps={{ 'aria-label': 'Select all emails' }}
                  sx={{ p: 0, mr: 1 }}
                />
                <Tooltip title="Mark as Unread" disableInteractive>
                  <span>
                    <IconButton
                      aria-label="Mark as Unread"
                      size="small"
                      onClick={handleMarkAsUnread}
                      disabled={!anyChecked}
                    >
                      <MarkEmailUnreadIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                {/* Add more icon buttons here in the future */}
              </Box>
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
            <EmailList checkedEmails={checkedEmails} setCheckedEmails={setCheckedEmails} />
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