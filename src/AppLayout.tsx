import React from 'react';
import { Box, Toolbar } from '@mui/material';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import Header from './Header';
import { AuthFailed } from './AuthFailed';
import './AppLayout.scss';

const AppLayout: React.FC = () => {

  return <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

    <Toolbar>
      <Header />
    </Toolbar>
    
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, flex: 1, overflow: 'hidden' }}>
      <Sidebar />
      <div>
        <AuthFailed />
        <EmailList />
      </div>
    </Box>

  </div>;
};

export default AppLayout;