import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Checkbox, Alert } from '@mui/material';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import Header from './Header';
import { useApiDataCache } from './ctxApiDataCache';
import { markEmailsAsRead } from './gMailApi';
import './AppLayout.scss';
import { useUser } from './gAuthApi';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const AppLayout: React.FC = () => {
  const { selectedCategory } = useApiDataCache();
  const user = useUser();

  // State for checked emails, lifted up from EmailList
  const [checkedEmails, setCheckedEmails] = useState<Record<string, boolean>>({});
  const anyChecked = Object.values(checkedEmails).some(Boolean);
  const allEmailIds = Object.keys(checkedEmails);
  const allChecked = allEmailIds.length > 0 && allEmailIds.every(id => checkedEmails[id]);
  const someChecked = allEmailIds.some(id => checkedEmails[id]) && !allChecked;

  const [google_auth_readme_md, setMd] = useState('');
  useEffect(() => { fetch('/readme_google_auth.md').then(res => res.text()).then(setMd); }, []);


  const handleMarkAsUnread = async () => {
    const selectedIds = Object.entries(checkedEmails)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
    if (!selectedIds.length) return;

    await markEmailsAsRead(selectedIds, false);
    setCheckedEmails({}); // Clear selection
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
          </div>

          {!user ? undefined :

            user?.authFailed ? (<>
              <Alert severity="error" >
                Sign in error. Please refresh to try again.
              </Alert>

              <div className="google-auth-readme">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{google_auth_readme_md}</ReactMarkdown>
              </div>
            </>) :

              <EmailList checkedEmails={checkedEmails} setCheckedEmails={setCheckedEmails} />
          }
        </div>
      </div>

    </div>
  );
};

export default AppLayout;