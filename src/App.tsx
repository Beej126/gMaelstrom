import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApiDataCacheProvider } from './ctxApiDataCache';
import { ThemeProvider } from './ctxTheme';
import AppLayout from './AppLayout';
import EmailDetail from './EmailDetail';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.scss';

const App: React.FC = () => {

  return (
    <ThemeProvider>
      <ApiDataCacheProvider>
        <Router>
            <ToastContainer
              style={{ width: "unset" }}
              toastStyle={{ width: "unset" }}
              position="top-center"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick={true}
              pauseOnFocusLoss={true}
              draggable={true}
              pauseOnHover={true}
              theme="colored"
              transition={Bounce}
            />
            
            <Routes>
              <Route path="/" element={<AppLayout />}/>
              <Route path="/email/:emailId" element={<EmailDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

        </Router>
      </ApiDataCacheProvider>
    </ThemeProvider>
  );
};

export default App;
