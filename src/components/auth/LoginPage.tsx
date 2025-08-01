'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Login } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const schema = yup.object({
  userId: yup.string().required('User ID is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
}).required();

interface LoginFormData {
  userId: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      userId: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      await login(data.userId, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to login');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            backgroundColor: '#2d2d2d',
            border: '1px solid #333',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#2196f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
              }}
            >
              <Login sx={{ color: '#ffffff', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Sign in to your account
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 3,
                borderRadius: 2,
                border: '1px solid #f44336',
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="userId"
                  label="User ID"
                  autoComplete="username"
                  autoFocus
                  error={!!errors.userId}
                  helperText={errors.userId?.message || "Enter your Employee ID, Manager ID, or Admin ID"}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#444',
                      },
                      '&:hover fieldset': {
                        borderColor: '#666',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{
                            color: '#b0b0b0',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            },
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: '#444',
                      },
                      '&:hover fieldset': {
                        borderColor: '#666',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                  }}
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 4, 
                mb: 3,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: '#2196f3',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                '&:hover': {
                  backgroundColor: '#1976d2',
                  boxShadow: '0 6px 16px rgba(33, 150, 243, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                href="/register" 
                variant="body2"
                sx={{
                  color: '#2196f3',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {"Don't have an account? Sign Up"}
              </Link>
              <Link 
                href="/employee-setup" 
                variant="body2"
                sx={{
                  color: '#2196f3',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {"Employee? Set your password"}
              </Link>
              <Link 
                href="/company-registration" 
                variant="body2"
                sx={{
                  color: '#4caf50',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {"🏢 Register Your Company"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 