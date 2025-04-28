import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, isUserAuthenticated } from '../services/authService';
import { Button, Box, Typography, Container, Paper, CircularProgress } from '@mui/material';
import GMailstromIcon from '../components/GMailstromIcon';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already authenticated, redirect to main page
  React.useEffect(() => {
    if (isUserAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn();
      if (isUserAuthenticated()) {
        navigate('/');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            backgroundColor: 'white',
          }}
        >
          <GMailstromIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" sx={{ mb: 3, color: 'text.primary' }}>
            gMaelstrom
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Your personalized Gmail experience
          </Typography>
          
          {error && (
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