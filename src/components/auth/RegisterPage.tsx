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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { generateUserId } from '@/lib/utils';
import RegistrationSuccessDialog from './RegistrationSuccessDialog';

const schema = yup.object({
  displayName: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  role: yup.string().oneOf(['admin', 'manager'], 'Please select a valid role').required('Role is required'),
}).required();

interface RegisterFormData {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'manager';
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedUserId, setGeneratedUserId] = useState('');
  const [registeredUser, setRegisteredUser] = useState<{ name: string; role: string } | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'manager',
    },
  });

  const watchedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      
      // Generate User ID based on role
      const userId = generateUserId(data.role);
      setGeneratedUserId(userId);
      
      await register(userId, data.email, data.password, data.displayName, data.role);
      
      // Set registered user info for success dialog
      setRegisteredUser({
        name: data.displayName,
        role: data.role === 'admin' ? 'Administrator' : 'Manager'
      });
      
      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error: any) {
      setError(error.message || 'Failed to register');
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setGeneratedUserId('');
    setRegisteredUser(null);
    router.push('/login');
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
              <PersonAdd sx={{ color: '#ffffff', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>
                Create Account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Join the Employee Management System
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
              name="displayName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="displayName"
                  label="Full Name"
                  autoComplete="name"
                  autoFocus
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
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
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" error={!!errors.role}>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    {...field}
                    labelId="role-label"
                    id="role"
                    label="Role"
                    sx={{
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#444',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#666',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2196f3',
                      },
                    }}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                  </Select>
                  {errors.role && (
                    <Typography variant="caption" color="error">
                      {errors.role.message}
                    </Typography>
                  )}
                </FormControl>
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
                  autoComplete="new-password"
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

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{
                            color: '#b0b0b0',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            },
                          }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link 
                href="/login" 
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
                {"Already have an account? Sign In"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Registration Success Dialog */}
      <RegistrationSuccessDialog
        open={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        userId={generatedUserId}
        userRole={registeredUser?.role || ''}
        userName={registeredUser?.name || ''}
      />
    </Container>
  );
} 