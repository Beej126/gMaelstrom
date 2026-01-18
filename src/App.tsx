import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import EmailDetail from './EmailDetail';
import './App.scss';
import { Box, Toolbar } from '@mui/material';
import Header from './Header';
import LabelsSidePanel from './LabelsSidePanel';
import { AuthFailed } from './AuthFailed';
import EmailList from './EmailList';

const App: React.FC = () => {

  return (
    <div style={{
      height: "100vh",
      minHeight: 0,
      display: "flex", flexDirection: "column",
      overflow: 'hidden',
    }}>

      <Toolbar 
        disableGutters // removes the default left/right inset
        sx={{ px: 1.5 }} >
        <Header />
      </Toolbar>

      <Box sx={{
        flex: 1, minHeight: 0,
        overflow: 'hidden',
        display: 'flex'
      }}>

        <LabelsSidePanel />

        <Box sx={{
          flex: 1, minWidth: 0, minHeight: 0,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          <AuthFailed />

          <Router>
            <Routes>
              <Route path="/" element={<EmailList />} />
              <Route path="/email/:emailId" element={<EmailDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>

        </Box>

      </Box>
    </div>
  );
};

export default App;
