import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, isUserAuthenticated } from '../app/GAuthApi';
import { Button, Box, Typography, Container, Paper, CircularProgress, Checkbox, FormControlLabel, Link } from '@mui/material';
import { toast } from 'react-toastify';
import GMaelstromIcon from './gMaelstromLogoSvg';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginAttempted, setLoginAttempted] = useState(false);
  // Wait for auth state to be ready on mount
  React.useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      for (let i = 0; i < 10; i++) { // try for up to 1s
        if (isUserAuthenticated()) {
          if (!cancelled) navigate('/');
          return;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      if (!cancelled) setCheckingAuth(false);
    };
    checkAuth();
    return () => { cancelled = true; };
  }, [navigate]);

  const showHostWarning = () => {
    const ignored = localStorage.getItem('gMaelstrom_ignoreHostWarning');
    if (ignored === 'true') return;
    
    const hostname = window.location.hostname;
    const port = window.location.port;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Only show warning if not on localhost
    if (isLocalhost && (port === '3500' || port === '80' || port === '')) return;

    const IgnoreButton = () => (
      <Box sx={{ mt: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              onChange={handleIgnoreHostWarning}
              sx={{ p: 0.5 }}
            />
          }
          label="Ignore forever"
          sx={{ 
            color: 'inherit', 
            fontSize: '0.875rem',
            '& .MuiFormControlLabel-label': { fontSize: '0.875rem' }
          }}
        />
      </Box>
    );

    toast.warning(
      <Box>
        <Typography variant="body2">
          You&apos;ve likely configured Google Auth to only accept localhost on port 80 and 3500.
          <br /><br />
          If you want to use gMaelstrom on a different host, please update your Google Cloud Console OAuth settings.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
          <Link 
            href="https://github.com/Beej126/gMaelstrom/blob/main/readme_google_auth.md" 
            target="_blank" 
            rel="noopener noreferrer"
            color="inherit"
            underline="always"
          >
            View Google Auth Setup Guide
          </Link>
        </Typography>
        <IgnoreButton />
      </Box>,
      {
        autoClose: false
      }
    );
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setLoginAttempted(true);
    try {
      await signIn();

      // Poll for authentication for up to 1s after signIn
      // needed this to smooth out landing on the /login page after signin flow where authentication status wasn't all the way present yet
      let authed = false;
      for (let i = 0; i < 10; i++) {
        if (isUserAuthenticated()) {
          authed = true;
          break;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      if (authed) {
        navigate('/');
      } else {
        setError('Authentication failed. Please try again.');
        showHostWarning();
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Authentication failed. Please try again.');
      showHostWarning();
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnoreHostWarning = () => {
    localStorage.setItem('gMaelstrom_ignoreHostWarning', 'true');
    toast.dismiss('host-warning');
  };

  if (checkingAuth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            backgroundColor: 'background.paper',
          }}
        >
          <GMaelstromIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" sx={{ mb: 3, color: 'text.primary' }}>
            gMaelstrom
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Your personalized Gmail experience
          </Typography>
          
          {loginAttempted && error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleLogin}
            disabled={isLoading}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign in with Google'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            By signing in, you agree to allow gMaelstrom to access your Gmail account.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;