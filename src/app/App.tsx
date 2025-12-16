import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EmailProvider } from './ctxEmail';
import { ThemeProvider } from './ctxTheme';
import { initializeGoogleAuth, isUserAuthenticated } from '../app/googleAuthApi';
import LoginPage from '../components/LoginPage';
import MainLayout from './MainLayout';
import EmailDetail from '../components/EmailDetail';
import LabelSettingsDialog from '../components/LabelSettingsDialog';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.scss';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return isUserAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace />
  );
};

const App: React.FC = () => {
  const [gapiInitialized, setGapiInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Google authentication when the app loads
    const initGoogleAuth = async () => {
      try {
        await initializeGoogleAuth();
        setGapiInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);

        // More user-friendly error messages
        if (error instanceof Error && (error.message?.includes('Client ID') || error.message?.includes('API Key'))) {
          setInitError(error.message);
        } else if ((error as Expando)?.error === 'idpiframe_initialization_failed' ||
          (error as Expando)?.details?.includes('invalid_client') ||
          (error as Expando)?.message?.includes('OAuth client was not found')) {
          setInitError('Google OAuth configuration is invalid. Please check your client ID and make sure the OAuth consent screen is properly configured in Google Cloud Console.');
        } else {
          setInitError('Failed to initialize Google services. Please check your internet connection and try again later.');
        }
      }
    };

    initGoogleAuth();
  }, []);

  // We're now using our ThemeProvider component, so we'll move the error and loading screens inside it
  return (
    <ThemeProvider>
      {initError ? (
        <div className="error-container">
          <h2>Authentication Error</h2>
          <p>{initError}</p>
          <div className="error-details">
            <h3>Troubleshooting Steps:</h3>
            <ol>
              <li>Verify that you&apos;ve created a project in the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
              <li>Make sure the Gmail API is enabled for your project</li>
              <li>Check that you&apos;ve created OAuth consent screen and credentials</li>
              <li>Verify that your client ID and API key are correctly set in the .env file</li>
              <li>Ensure that your OAuth consent screen has been configured and published</li>
              <li>Add your application domain to the authorized JavaScript origins</li>
            </ol>
          </div>
        </div>
      ) : !gapiInitialized ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      ) : (
        <EmailProvider>
          <Router>
            <div className="app">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/email/:emailId"
                  element={
                    <ProtectedRoute>
                      <EmailDetail />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <LabelSettingsDialog />
              <ToastContainer
                style={{
                  width: "unset",
                  // maxWidth: '90vw'
                }}
                toastStyle={{
                  width: "unset",
                  // minHeight: 'auto'
                }}

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
            </div>
          </Router>
        </EmailProvider>
      )}
    </ThemeProvider>
  );
};

export default App;
