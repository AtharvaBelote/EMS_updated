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
  Avatar,
  Chip,
  Grid,
} from '@mui/material';
import { Visibility, VisibilityOff, Business } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const schema = yup.object({
  companyName: yup.string().required('Company name is required').min(2, 'Company name must be at least 2 characters'),
  companyEmail: yup.string().email('Invalid email format').required('Company email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
  phoneNumber: yup.string().required('Phone number is required').matches(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  industryType: yup.string().optional(),
  domain: yup.string().optional().test('domain-format', 'Domain can only contain letters, numbers, and hyphens', function(value) {
    if (!value || value.trim() === '') return true; // Allow empty values
    return /^[a-zA-Z0-9-]+$/.test(value);
  }),
}).required();

interface CompanyRegistrationFormData {
  companyName: string;
  companyEmail: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  industryType?: string;
   domain?: string;
}

const industryTypes = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Transportation',
  'Food & Beverage',
  'Entertainment',
  'Consulting',
  'Non-Profit',
  'Other',
];

export default function CompanyRegistration() {
  // Suppress MUI controlled/uncontrolled Select warnings
  React.useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('MUI: A component is changing the uncontrolled value state of Select to be controlled')) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CompanyRegistrationFormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      companyName: '',
      companyEmail: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      industryType: '',
      domain: '',
    },
  });



  const onSubmit = async (data: CompanyRegistrationFormData) => {
    try {
      setError('');
      setSuccess('');

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.companyEmail,
        data.password
      );

      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, {
        displayName: data.companyName,
      });

      // Create company document
      const companyData = {
        id: user.uid,
        companyName: data.companyName,
        companyEmail: data.companyEmail,
        phoneNumber: data.phoneNumber,
        industryType: data.industryType || 'Other',
        domain: data.domain ? data.domain.toLowerCase() : null,
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        subscription: {
          plan: 'free',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      };

      await setDoc(doc(db, 'companies', user.uid), companyData);

      // Create admin user document
      const adminUserData = {
        id: user.uid,
        userId: user.uid,
        fullName: data.companyName + ' Admin',
        email: data.companyEmail,
        role: 'admin',
        companyId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        permissions: ['all'],
      };

      await setDoc(doc(db, 'users', user.uid), adminUserData);

      setSuccess('Company registered successfully! Redirecting to onboarding...');
      
      // Redirect to onboarding wizard after 2 seconds
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(error.message || 'Failed to register company. Please try again.');
      }
    }
  };

  const watchedDomain = watch('domain');

  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 6,
          marginBottom: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={12}
          sx={{
            padding: { xs: 3, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 4,
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: 3,
              mb: 5,
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4caf50, #45a049, #4caf50)',
                  zIndex: -1,
                  opacity: 0.3,
                },
              }}
            >
              <Business sx={{ color: '#ffffff', fontSize: 36 }} />
            </Box>
            <Box>
              <Typography 
                component="h1" 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  color: '#ffffff',
                  mb: 1,
                  background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Register Your Company
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#b0b0b0',
                  fontWeight: 400,
                  letterSpacing: '0.5px',
                }}
              >
                Set up your company account and start managing your team
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 4,
                borderRadius: 3,
                border: '1px solid #f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                '& .MuiAlert-icon': {
                  color: '#f44336',
                },
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
                mb: 4,
                borderRadius: 3,
                border: '1px solid #4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                '& .MuiAlert-icon': {
                  color: '#4caf50',
                },
              }}
            >
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit as any)} sx={{ width: '100%' }}>
            <Grid container spacing={4}>
              {/* Company Information */}
              {/* @ts-ignore */}
              <Grid item xs={12}>
                <Box sx={{ 
                  mb: 4, 
                  pb: 2, 
                  borderBottom: '2px solid #333',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    width: '60px',
                    height: '2px',
                    backgroundColor: '#4caf50',
                  }
                }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Business sx={{ color: '#4caf50', fontSize: 28 }} />
                    Company Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mt: 1 }}>
                    Provide your company details to set up your account
                  </Typography>
                </Box>
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Company Name"
                      error={!!errors.companyName}
                      helperText={errors.companyName?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.3s ease',
                          '& fieldset': {
                            borderColor: '#444',
                            borderWidth: '2px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4caf50',
                            borderWidth: '2px',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#b0b0b0',
                            fontWeight: 500,
                          },
                          '& .MuiInputBase-input': {
                            color: '#ffffff',
                            fontWeight: 500,
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: errors.companyName ? '#f44336' : '#b0b0b0',
                          fontWeight: 500,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="companyEmail"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Company Email (Admin)"
                      type="email"
                      error={!!errors.companyEmail}
                      helperText={errors.companyEmail?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.3s ease',
                          '& fieldset': {
                            borderColor: '#444',
                            borderWidth: '2px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4caf50',
                            borderWidth: '2px',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#b0b0b0',
                            fontWeight: 500,
                          },
                          '& .MuiInputBase-input': {
                            color: '#ffffff',
                            fontWeight: 500,
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: errors.companyEmail ? '#f44336' : '#b0b0b0',
                          fontWeight: 500,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Phone Number"
                      error={!!errors.phoneNumber}
                      helperText={errors.phoneNumber?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.3s ease',
                          '& fieldset': {
                            borderColor: '#444',
                            borderWidth: '2px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4caf50',
                            borderWidth: '2px',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#b0b0b0',
                            fontWeight: 500,
                          },
                          '& .MuiInputBase-input': {
                            color: '#ffffff',
                            fontWeight: 500,
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: errors.phoneNumber ? '#f44336' : '#b0b0b0',
                          fontWeight: 500,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="industryType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#b0b0b0', fontWeight: 500 }}>Industry Type (Optional)</InputLabel>
                      <Select
                        {...field}
                        label="Industry Type (Optional)"
                        sx={{
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.3s ease',
                          minWidth: '200px',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#444',
                            borderWidth: '2px',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4caf50',
                            borderWidth: '2px',
                          },
                          '& .MuiSelect-select': {
                            color: '#ffffff',
                            fontWeight: 500,
                          },
                          '& .MuiSvgIcon-root': {
                            color: '#b0b0b0',
                          },
                        }}
                      >
                        <MenuItem value="">
                          <em>Select an industry (optional)</em>
                        </MenuItem>
                        {industryTypes.map((industry) => (
                          <MenuItem key={industry} value={industry}>
                            {industry}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12}>
                <Controller
                  name="domain"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Domain (Optional)"
                      error={!!errors.domain}
                      helperText={
                        errors.domain?.message || 
                        (watchedDomain ? `Your subdomain will be: ${watchedDomain.toLowerCase()}.yourapp.com` : '')
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Chip 
                              label=".yourapp.com" 
                              size="small" 
                              sx={{ 
                                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                              }} 
                            />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          transition: 'all 0.3s ease',
                          '& fieldset': {
                            borderColor: '#444',
                            borderWidth: '2px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4caf50',
                            borderWidth: '2px',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#b0b0b0',
                            fontWeight: 500,
                          },
                          '& .MuiInputBase-input': {
                            color: '#ffffff',
                            fontWeight: 500,
                          },
                        },
                        '& .MuiFormHelperText-root': {
                          color: errors.domain ? '#f44336' : '#4caf50',
                          fontWeight: 500,
                        },
                      }}
                    />
                  )}
                />
              </Grid>



              {/* Admin Account */}
              {/* @ts-ignore */}
              <Grid item xs={12}>
                <Box sx={{ 
                  mb: 4, 
                  pb: 2, 
                  borderBottom: '2px solid #333',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    width: '60px',
                    height: '2px',
                    backgroundColor: '#4caf50',
                  }
                }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Business sx={{ color: '#4caf50', fontSize: 28 }} />
                    Admin Account Setup
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mt: 1 }}>
                    Create your admin account to manage your company
                  </Typography>
                </Box>
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
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
                            borderColor: '#4caf50',
                          },
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
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
                            borderColor: '#4caf50',
                          },
                        },
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 6, 
                mb: 4,
                py: 2,
                borderRadius: 4,
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
                textTransform: 'none',
                letterSpacing: '0.5px',
                '&:hover': {
                  background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                  boxShadow: '0 12px 32px rgba(76, 175, 80, 0.6)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #666 0%, #555 100%)',
                  boxShadow: 'none',
                  transform: 'none',
                },
                transition: 'all 0.3s ease-in-out',
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} color="inherit" />
                  <Typography>Registering Company...</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Business sx={{ fontSize: 24 }} />
                  <Typography>Register Company</Typography>
                </Box>
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link 
                href="/login" 
                variant="body2"
                sx={{
                  color: '#4caf50',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '12px 24px',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    textDecoration: 'none',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                {"← Already have an account? Sign In"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 