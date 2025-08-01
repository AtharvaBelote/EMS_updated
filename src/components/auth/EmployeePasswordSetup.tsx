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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Person } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { User } from '@/types';
import { useRouter } from 'next/navigation';

const schema = yup.object({
  employeeId: yup.string().required('Employee ID is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
}).required();

interface EmployeePasswordFormData {
  employeeId: string;
  password: string;
  confirmPassword: string;
}

export default function EmployeePasswordSetup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmployeePasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      employeeId: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: EmployeePasswordFormData) => {
    try {
      setError('');
      setSuccess('');

      // Check if employee exists in the employees collection
      const employeeQuery = query(collection(db, 'employees'), where('employeeId', '==', data.employeeId));
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (employeeSnapshot.empty) {
        throw new Error('Employee ID not found. Please contact your administrator.');
      }

      const employeeDoc = employeeSnapshot.docs[0];
      const employeeData = employeeDoc.data();

      // Check if user account already exists
      const userQuery = query(collection(db, 'users'), where('employeeId', '==', data.employeeId));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        throw new Error('Account already exists for this Employee ID. Please login instead.');
      }

      // Create Firebase auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employeeData.email, 
        data.password
      );

      // Update Firebase profile
      await updateProfile(userCredential.user, { 
        displayName: employeeData.fullName 
      });

      // Create user document in Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        userId: data.employeeId, // This should match what they enter to login
        email: employeeData.email,
        role: 'employee',
        employeeId: data.employeeId,
        displayName: employeeData.fullName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      console.log('Employee account created successfully:', {
        uid: userCredential.user.uid,
        userId: data.employeeId,
        employeeId: data.employeeId,
        email: employeeData.email,
        role: 'employee'
      });

      setSuccess('Password set successfully! You can now login with your Employee ID and password.');
      
      // Reset form
      reset();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to set password');
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
              <Person sx={{ color: '#ffffff', fontSize: 30 }} />
            </Box>
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: '#ffffff' }}>
                Confirm Employee
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Set your password to activate your account
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

          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                width: '100%', 
                mb: 3,
                borderRadius: 2,
                border: '1px solid #4caf50',
              }}
            >
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="employeeId"
                  label="Employee ID"
                  autoComplete="off"
                  autoFocus
                  error={!!errors.employeeId}
                  helperText={errors.employeeId?.message}
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
                  label="Re-enter Password"
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
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'SET PASSWORD'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{
                  color: '#b0b0b0',
                  cursor: 'pointer',
                  '&:hover': {
                    color: '#2196f3',
                  },
                }}
                onClick={() => router.push('/login')}
              >
                Already have an account? Sign In
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 