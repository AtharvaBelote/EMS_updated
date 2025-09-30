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
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Manager, CustomField } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { generateUserId } from '@/lib/utils';

interface ManagerFormProps {
  open: boolean;
  manager?: Manager | null;
  onSave: () => void;
  onCancel: () => void;
}

// Validation schema
const schema = yup.object({
  managerId: yup.string().required('Manager ID is required'),
  fullName: yup.string().required('Full name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  status: yup.string().oneOf(['active', 'inactive', 'suspended']),
}).required();

export default function ManagerForm({ open, manager, onSave, onCancel }: ManagerFormProps) {
  const { currentUser } = useAuth();
  const [savedManager, setSavedManager] = useState<Manager | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [moreInfoFields, setMoreInfoFields] = useState<Array<{ name: string; value: any; type: string }>>([]);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [error, setError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      managerId: '',
      fullName: '',
      email: '',
      status: 'active' as 'active' | 'inactive' | 'suspended',
    },
  });

  useEffect(() => {
    loadCustomFields();
  }, []);

  useEffect(() => {
    if (manager && open) {
      setError(''); // Clear errors when opening
      setValue('managerId', manager.managerId || '');
      setValue('fullName', manager.fullName || '');
      setValue('email', manager.email || '');
      setValue('status', manager.status || 'active');

      // Load custom field values
      const customFieldValues = customFields.map(field => ({
        name: field.name,
        value: manager[field.name] || field.defaultValue || '',
        type: field.type,
      }));
      setMoreInfoFields(customFieldValues);
    } else if (open) {
      setError(''); // Clear errors when opening
      reset();
      const managerId = generateUserId('MGR');
      setValue('managerId', managerId);

      // Initialize custom fields with default values
      const customFieldValues = customFields.map(field => ({
        name: field.name,
        value: field.defaultValue || '',
        type: field.type,
      }));
      setMoreInfoFields(customFieldValues);
    }
  }, [manager, open, customFields, setValue, reset]);

  const loadCustomFields = async () => {
    try {
      const customFieldsSnapshot = await getDocs(collection(db, 'customFields'));
      const fields: CustomField[] = [];
      customFieldsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.entityType === 'manager' || !data.entityType) {
          fields.push({ id: doc.id, ...data } as CustomField);
        }
      });
      setCustomFields(fields.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  const checkDuplicates = async (managerId: string, email: string) => {
    // Check if managerId already exists (excluding current manager if editing)
    const managerIdQuery = query(
      collection(db, 'managers'),
      where('managerId', '==', managerId),
      where('companyId', '==', currentUser?.uid)
    );
    const managerIdSnapshot = await getDocs(managerIdQuery);

    if (!managerIdSnapshot.empty) {
      const existingManager = managerIdSnapshot.docs[0];
      if (!manager || existingManager.id !== manager.id) {
        throw new Error('Manager ID already exists in your company');
      }
    }

    // Check if email already exists (excluding current manager if editing)
    const emailQuery = query(
      collection(db, 'managers'),
      where('email', '==', email),
      where('companyId', '==', currentUser?.uid)
    );
    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      const existingManager = emailSnapshot.docs[0];
      if (!manager || existingManager.id !== manager.id) {
        throw new Error('Email already exists in your company');
      }
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setError(''); // Clear previous errors

      // Validate that currentUser exists
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      await checkDuplicates(data.managerId, data.email);

      // Prepare manager data
      const managerData = {
        managerId: data.managerId,
        fullName: data.fullName,
        email: data.email,
        status: data.status,
        companyId: currentUser.uid, // Now guaranteed to be string
        createdAt: manager?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Add custom fields
      moreInfoFields.forEach(field => {
        if (field.name) {
          (managerData as any)[field.name] = field.value;
        }
      });

      let savedManagerData: Manager;

      if (manager) {
        await updateDoc(doc(db, 'managers', manager.id), managerData);
        savedManagerData = { ...manager, ...managerData } as Manager;
      } else {
        const docRef = await addDoc(collection(db, 'managers'), managerData);
        savedManagerData = { id: docRef.id, ...managerData } as Manager;
      }

      setSavedManager(savedManagerData);
      onSave();
      reset();
    } catch (error: any) {
      console.error('Error saving manager:', error);
      setError(error.message || 'Failed to save manager');
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        {manager ? 'Edit Manager' : 'Add New Manager'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Basic Information */}
            <Typography variant="h6" sx={{ color: 'primary.main' }}>
              Basic Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Manager ID *"
                    error={!!errors.managerId}
                    helperText={errors.managerId?.message}
                    placeholder="e.g., MGR001"
                  />
                )}
              />

              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name *"
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email *"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>Status *</InputLabel>
                    <Select {...field} label="Status *">
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="suspended">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showMoreInfo}
                        onChange={(e) => setShowMoreInfo(e.target.checked)}
                      />
                    }
                    label="Add Additional Information"
                  />
                </FormGroup>

                {showMoreInfo && (
                  <>
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      Additional Information
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      {moreInfoFields.map((field, index) => (
                        <TextField
                          key={index}
                          fullWidth
                          label={field.name}
                          value={field.value}
                          onChange={(e) => {
                            const updatedFields = [...moreInfoFields];
                            updatedFields[index].value = e.target.value;
                            setMoreInfoFields(updatedFields);
                          }}
                          type={field.type === 'number' ? 'number' : 'text'}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          {isSubmitting ? <CircularProgress size={24} /> : (manager ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}