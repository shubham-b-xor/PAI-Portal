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
  CircularProgress,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error, supplierSignup, clearError } = useAuth();

  const [formData, setFormData] = useState({
    supplier_number: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    site: '',
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Check if already authenticated on component mount
    if (isAuthenticated && !isLoading) {
      navigate('/purchase-orders', { replace: true });
    }
  }, []);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    try {
      const { confirmPassword, ...signupData } = formData;
      const result = await supplierSignup(signupData);
      if (result.type.includes('fulfilled')) {
        navigate('/purchase-orders', { replace: true });
      }
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            borderRadius: 1,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/login')}
            sx={{ mb: 2 }}
          >
            Back to Login
          </Button>

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Create Supplier Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Register your organization to access the Supplier Portal
            </Typography>
          </Box>

          {(error || validationError) && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }} 
              onClose={() => {
                clearError();
                setValidationError('');
              }}
            >
              {error || validationError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supplier Number"
                  value={formData.supplier_number}
                  onChange={handleChange('supplier_number')}
                  required
                  disabled={isLoading}
                  helperText="Your unique supplier identifier"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                  disabled={isLoading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                  disabled={isLoading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                  disabled={isLoading}
                  helperText="Minimum 8 characters"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                  disabled={isLoading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={handleChange('address')}
                  required
                  disabled={isLoading}
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Site/Location"
                  value={formData.site}
                  onChange={handleChange('site')}
                  required
                  disabled={isLoading}
                />
              </Grid>

              <Grid item xs={12}>
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
                    'Create Account'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => navigate('/login')}
                sx={{ cursor: 'pointer', textDecoration: 'none' }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Signup;