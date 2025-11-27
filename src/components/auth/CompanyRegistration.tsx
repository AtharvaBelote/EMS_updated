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
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Business, ContentCopy, CheckCircle } from '@mui/icons-material';
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
  industryType: yup.string().required('Industry type is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Please confirm your password'),
  adminName: yup.string().required('Admin name is required').min(2, 'Admin name must be at least 2 characters'),
  adminMobile: yup.string().required('Admin mobile number is required').matches(/^[0-9+\-\s()]+$/, 'Invalid phone number format'),
  street: yup.string().required('Street address is required'),
  city: yup.string().required('City is required'),
  state: yup.string().required('State is required'),
  pinCode: yup.string().required('Pin code is required').matches(/^[0-9]{6}$/, 'Pin code must be 6 digits'),
  buildingBlock: yup.string().optional(),
}).required();

interface CompanyRegistrationFormData {
  companyName: string;
  companyEmail: string;
  industryType: string;
  password: string;
  confirmPassword: string;
  adminName: string;
  adminMobile: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  buildingBlock?: string;
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
  const [generatedAdminId, setGeneratedAdminId] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
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
      industryType: '',
      password: '',
      confirmPassword: '',
      adminName: '',
      adminMobile: '',
      street: '',
      city: '',
      state: '',
      pinCode: '',
      buildingBlock: '',
    },
  });



  const generateAdminId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ADM${timestamp}${random}`;
  };

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
      const adminId = generateAdminId();

      // Update user profile
      await updateProfile(user, {
        displayName: data.adminName,
      });

      // Create company document with the required structure
      const companyData = {
        companyName: data.companyName,
        email: data.companyEmail, // admin email
        userId: adminId, // auto generated adminID to login
        managers: [], // under this admin (empty array initially)
        address: {
          city: data.city,
          street: data.street,
          pinCode: data.pinCode,
          state: data.state,
          buildingBlock: data.buildingBlock || '',
        },
        adminName: data.adminName,
        adminMobile: data.adminMobile,
        uid: user.uid, // auto generated by firebase
        createdAt: new Date(),
        role: 'admin',
        industryType: data.industryType,
      };

      await setDoc(doc(db, 'companies', user.uid), companyData);

      // Create admin user document for authentication
      const adminUserData = {
        uid: user.uid,
        userId: adminId, // This is what they'll use to login
        displayName: data.adminName,
        email: data.companyEmail,
        role: 'admin',
        companyId: user.uid,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
      };

      await setDoc(doc(db, 'users', user.uid), adminUserData);

      setGeneratedAdminId(adminId);
      setRegistrationComplete(true);
      setSuccess(`Company registered successfully! Please save your Admin ID for login.`);

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



  const handleCopyAdminId = () => {
    navigator.clipboard.writeText(generatedAdminId);
  };

  // Show success screen with Admin ID
  if (registrationComplete && generatedAdminId) {
    return (
      <Container component="main" maxWidth="md">
        <Box
          sx={{
            marginTop: 8,
            marginBottom: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '80vh',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={12}
            sx={{
              padding: { xs: 4, md: 6 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 4,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
            }}
          >
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
              }}
            >
              <CheckCircle sx={{ color: '#ffffff', fontSize: 60 }} />
            </Box>

            <Typography
              variant="h3"
              sx={{
                color: '#ffffff',
                fontWeight: 800,
                mb: 2,
                textAlign: 'center',
              }}
            >
              Registration Successful!
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: '#b0b0b0',
                mb: 4,
                textAlign: 'center',
              }}
            >
              Your company has been registered successfully
            </Typography>

            <Divider sx={{ width: '100%', mb: 4, borderColor: '#333' }} />

            <Card
              sx={{
                width: '100%',
                mb: 4,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                border: '2px solid #4caf50',
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#ffffff',
                    mb: 2,
                    fontWeight: 600,
                  }}
                >
                  Your Admin ID
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#b0b0b0',
                    mb: 3,
                  }}
                >
                  Please save this ID. You'll need it to log in to your account.
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: 3,
                    borderRadius: 2,
                    border: '1px solid #444',
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: '#4caf50',
                      fontWeight: 700,
                      letterSpacing: '2px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {generatedAdminId}
                  </Typography>
                  <IconButton
                    onClick={handleCopyAdminId}
                    sx={{
                      color: '#4caf50',
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      },
                    }}
                  >
                    <ContentCopy />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>

            <Alert
              severity="warning"
              sx={{
                width: '100%',
                mb: 4,
                borderRadius: 3,
                border: '1px solid #ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                '& .MuiAlert-icon': {
                  color: '#ff9800',
                },
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Important: Save this Admin ID!
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                You will need this ID along with your email and password to log in. Store it in a safe place.
              </Typography>
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => router.push('/login')}
              sx={{
                py: 2,
                borderRadius: 4,
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #45a049 0%, #388e3c 100%)',
                  boxShadow: '0 12px 32px rgba(76, 175, 80, 0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease-in-out',
              }}
            >
              Proceed to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

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
                  name="industryType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#b0b0b0', fontWeight: 500 }}>Industry Type *</InputLabel>
                      <Select
                        {...field}
                        label="Industry Type *"
                        error={!!errors.industryType}
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
                          <em>Select an industry</em>
                        </MenuItem>
                        {industryTypes.map((industry) => (
                          <MenuItem key={industry} value={industry}>
                            {industry}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.industryType && (
                        <Typography variant="caption" sx={{ color: '#f44336', mt: 1, ml: 2 }}>
                          {errors.industryType.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Company Address Section */}
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
                    Company Address
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mt: 1 }}>
                    Provide your company's physical address
                  </Typography>
                </Box>
              </Grid>

              {/* @ts-ignore */}
              <Grid item xs={12}>
                <Controller
                  name="street"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Street Address"
                      error={!!errors.street}
                      helperText={errors.street?.message}
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
                          color: errors.street ? '#f44336' : '#b0b0b0',
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
                  name="buildingBlock"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Building/Block No. (Optional)"
                      error={!!errors.buildingBlock}
                      helperText={errors.buildingBlock?.message}
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
                          color: errors.buildingBlock ? '#f44336' : '#b0b0b0',
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
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="City"
                      error={!!errors.city}
                      helperText={errors.city?.message}
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
                          color: errors.city ? '#f44336' : '#b0b0b0',
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
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="State"
                      error={!!errors.state}
                      helperText={errors.state?.message}
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
                          color: errors.state ? '#f44336' : '#b0b0b0',
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
                  name="pinCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Pin Code"
                      error={!!errors.pinCode}
                      helperText={errors.pinCode?.message}
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
                          color: errors.pinCode ? '#f44336' : '#b0b0b0',
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
                  name="adminName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Admin Name"
                      error={!!errors.adminName}
                      helperText={errors.adminName?.message}
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
                          color: errors.adminName ? '#f44336' : '#b0b0b0',
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
                  name="adminMobile"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      required
                      fullWidth
                      label="Admin Mobile Number"
                      error={!!errors.adminMobile}
                      helperText={errors.adminMobile?.message}
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
                          color: errors.adminMobile ? '#f44336' : '#b0b0b0',
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
                          color: errors.password ? '#f44336' : '#b0b0b0',
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
                          color: errors.confirmPassword ? '#f44336' : '#b0b0b0',
                          fontWeight: 500,
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