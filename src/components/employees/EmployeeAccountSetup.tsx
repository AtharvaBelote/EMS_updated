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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import { generateUserId } from '@/lib/utils';
import RegistrationSuccessDialog from '../auth/RegistrationSuccessDialog';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  displayName: yup.string().required('Full name is required'),
}).required();

interface EmployeeAccountFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface EmployeeAccountSetupProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
}

export default function EmployeeAccountSetup({ 
  open, 
  onClose, 
  onSuccess, 
  employeeId, 
  employeeName, 
  employeeEmail 
}: EmployeeAccountSetupProps) {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedUserId, setGeneratedUserId] = useState('');
  const [createdEmployee, setCreatedEmployee] = useState<{ name: string; role: string } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EmployeeAccountFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      displayName: employeeName || '',
      email: employeeEmail || '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: EmployeeAccountFormData) => {
    try {
      setError('');

      // Generate User ID for employee
      const userId = generateUserId('employee');
      setGeneratedUserId(userId);

      // Check if userId already exists
      const existingUserQuery = query(collection(db, 'users'), where('userId', '==', userId));
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('Employee ID already exists');
      }

      // Check if email already exists
      const existingEmailQuery = query(collection(db, 'users'), where('email', '==', data.email));
      const existingEmailSnapshot = await getDocs(existingEmailQuery);
      
      if (!existingEmailSnapshot.empty) {
        throw new Error('Email already exists');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Update Firebase profile
      await updateProfile(userCredential.user, { displayName: data.displayName });

      // Create user document in Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        userId: userId,
        email: data.email,
        role: 'employee',
        employeeId: employeeId || userId,
        displayName: data.displayName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Set created employee info for success dialog
      setCreatedEmployee({
        name: data.displayName,
        role: 'Employee'
      });

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error: any) {
      setError(error.message || 'Failed to create employee account');
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setGeneratedUserId('');
    setCreatedEmployee(null);
    reset();
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Setup Employee Account</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Controller
              name="displayName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="Full Name"
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
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
                  label="Email Address"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
                  error={!!errors.password}
                  helperText={errors.password?.message}
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
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit(onSubmit)} 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Account Success Dialog */}
      <RegistrationSuccessDialog
        open={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        userId={generatedUserId}
        userRole={createdEmployee?.role || ''}
        userName={createdEmployee?.name || ''}
      />
    </>
  );
} 