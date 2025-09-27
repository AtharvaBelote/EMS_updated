'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface ManagerFormProps {
  open: boolean;
  manager?: User | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ManagerForm({ open, manager, onSave, onCancel }: ManagerFormProps) {
  const [formData, setFormData] = useState({
    userId: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (manager) {
      setFormData({
        userId: manager.userId || '',
        displayName: manager.displayName || '',
        email: manager.email || '',
        password: '',
        confirmPassword: '',
        status: (manager.status as 'active' | 'inactive' | 'suspended') || 'active',
      });
    } else {
      setFormData({
        userId: '',
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        status: 'active',
      });
    }
    setError('');
  }, [manager, open]);

  const validateForm = () => {
    if (!formData.userId || !formData.displayName || !formData.email) {
      setError('Please fill in all required fields');
      return false;
    }

    if (!manager && (!formData.password || !formData.confirmPassword)) {
      setError('Password is required for new managers');
      return false;
    }

    if (!manager && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!manager && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const checkDuplicates = async () => {
    // Check if userId already exists (excluding current manager if editing)
    const userIdQuery = query(
      collection(db, 'users'), 
      where('userId', '==', formData.userId)
    );
    const userIdSnapshot = await getDocs(userIdQuery);
    
    if (!userIdSnapshot.empty) {
      const existingUser = userIdSnapshot.docs[0];
      if (!manager || existingUser.id !== manager.uid) {
        throw new Error('Manager ID already exists');
      }
    }

    // Check if email already exists (excluding current manager if editing)
    const emailQuery = query(
      collection(db, 'users'), 
      where('email', '==', formData.email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      const existingUser = emailSnapshot.docs[0];
      if (!manager || existingUser.id !== manager.uid) {
        throw new Error('Email already exists');
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await checkDuplicates();

      if (manager) {
        // Update existing manager
        await updateDoc(doc(db, 'users', manager.uid), {
          userId: formData.userId,
          displayName: formData.displayName,
          email: formData.email,
          status: formData.status,
          updatedAt: new Date(),
        });
      } else {
        // Create new manager
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        // Update Firebase profile
        await updateProfile(userCredential.user, { 
          displayName: formData.displayName 
        });

        // Create user document in Firestore
        const userData: Omit<User, 'uid'> = {
          userId: formData.userId,
          email: formData.email,
          role: 'manager',
          displayName: formData.displayName,
          status: formData.status,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving manager:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already registered in the system');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(error.message || 'Failed to save manager');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {manager ? 'Edit Manager' : 'Add New Manager'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Manager ID *"
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="e.g., MGR001"
          />

          <TextField
            fullWidth
            label="Full Name *"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />

          {!manager && (
            <>
              <TextField
                fullWidth
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                sx={{ mb: 2 }}
                helperText="Minimum 6 characters"
              />

              <TextField
                fullWidth
                label="Confirm Password *"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                sx={{ mb: 2 }}
              />
            </>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              label="Status"
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary">
            * Required fields
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          {loading ? <CircularProgress size={24} /> : (manager ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}