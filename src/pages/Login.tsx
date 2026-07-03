import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  Divider,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';

type LoginMode = 'supplier' | 'procurement';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, error, msalLogin, supplierLogin, clearError } = useAuth();

  const [mode, setMode] = useState<LoginMode>('supplier');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/purchase-orders';

  useEffect(() => {
    // Check if already authenticated on component mount
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, []);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'procurement') {
        const result = await msalLogin(email);
        if (result.type.includes('fulfilled')) {
          navigate(from, { replace: true });
        }
      } else {
        const result = await supplierLogin({ email, password });
        if (result.type.includes('fulfilled')) {
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const switchMode = () => {
    setMode(mode === 'supplier' ? 'procurement' : 'supplier');
    setEmail('');
    setPassword('');
    clearError();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            borderRadius: 1,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {mode === 'supplier' ? 'Supplier Portal' : 'Procurement Cockpit'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supply Chain Management System
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                InputProps={{
                  startAdornment: mode === 'supplier' ? <PersonIcon sx={{ mr: 1, color: 'action.active' }} /> : <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
              
              {mode === 'supplier' && (
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ 
                  mt: 2, 
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Sign In as ${mode === 'supplier' ? 'Supplier' : 'Procurement Specialist'}`
                )}
              </Button>
            </Stack>
          </Box>

          {mode === 'supplier' && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link 
                  component="button" 
                  variant="body2" 
                  onClick={() => navigate('/signup')}
                  sx={{ cursor: 'pointer', textDecoration: 'none' }}
                >
                  Create Supplier Account
                </Link>
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            onClick={switchMode}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Switch to {mode === 'supplier' ? 'Procurement Cockpit' : 'Supplier Portal'}
          </Button>

          {mode === 'procurement' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Use your organization email to login via MSAL
            </Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;