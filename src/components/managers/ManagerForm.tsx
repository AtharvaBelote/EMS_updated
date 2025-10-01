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
}).required();

export default function ManagerForm({ open, manager, onSave, onCancel }: ManagerFormProps) {
  const { currentUser } = useAuth();
  const [savedManager, setSavedManager] = useState<Manager | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [existingFields, setExistingFields] = useState<string[]>([]);
  const [moreInfoFields, setMoreInfoFields] = useState<{ name: string; value: string }[]>([]);
  // Load existing custom fields from manager data
  const loadExistingFields = async () => {
    try {
      const managersQuery = query(collection(db, 'managers'));
      const querySnapshot = await getDocs(managersQuery);
      const allFields = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        Object.keys(data).forEach(key => {
          if (!['id', 'managerId', 'fullName', 'email', 'companyId', 'createdAt', 'updatedAt', 'status'].includes(key)) {
            allFields.add(key);
          }
        });
      });
      setExistingFields(Array.from(allFields));
    } catch (error) {
      console.error('Error loading existing fields:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadExistingFields();
    }
  }, [open]);
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
    },
  });

  useEffect(() => {
    loadCustomFields();
  }, []);

  useEffect(() => {
    if (manager && open) {
      setError('');
      setValue('managerId', manager.managerId || '');
      setValue('fullName', manager.fullName || '');
      setValue('email', manager.email || '');
      // Add all other dynamic fields from the manager
      const additionalFields: { name: string; value: string }[] = [];
      Object.entries(manager).forEach(([key, value]) => {
        if (!['id', 'managerId', 'fullName', 'email', 'companyId', 'createdAt', 'updatedAt', 'status'].includes(key) && value !== null && value !== undefined && value !== '') {
          if (!existingFields.includes(key)) {
            additionalFields.push({ name: key, value: String(value) });
          }
        }
      });
      setMoreInfoFields(additionalFields);
    } else if (open) {
      setError('');
      reset();
      const managerId = generateUserId('MGR');
      setValue('managerId', managerId);
      setMoreInfoFields([]);
    }
  }, [manager, open, setValue, reset, existingFields]);

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
        status: 'active', // Always set to active
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

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
              {/* Basic Information */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                  Basic Information
                </Typography>
              </Box>
              <Box>
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
              </Box>
              <Box>
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
              </Box>
              <Box>
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
              </Box>

              {/* Existing Custom Fields from other managers */}
              {existingFields.length > 0 && (
                <>
                  <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                      Existing Custom Fields
                    </Typography>
                  </Box>
                  {existingFields.map((fieldName) => (
                    <Box key={fieldName}>
                      <TextField
                        fullWidth
                        label={fieldName}
                        value={manager ? manager[fieldName] || '' : ''}
                        onChange={e => {
                          if (manager) {
                            setValue(fieldName as any, e.target.value);
                          }
                        }}
                      />
                    </Box>
                  ))}
                </>
              )}

              {/* Additional Information Section */}
              <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1 }}>
                  Additional Information
                </Typography>
                {moreInfoFields.map((field, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <TextField
                      label="Field Name"
                      value={field.name}
                      onChange={e => {
                        const updated = [...moreInfoFields];
                        updated[idx].name = e.target.value;
                        setMoreInfoFields(updated);
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Field Value"
                      value={field.value}
                      onChange={e => {
                        const updated = [...moreInfoFields];
                        updated[idx].value = e.target.value;
                        setMoreInfoFields(updated);
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setMoreInfoFields(moreInfoFields.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
                <Button
                  variant="contained"
                  sx={{ mt: 1, backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}
                  onClick={() => setMoreInfoFields([...moreInfoFields, { name: '', value: '' }])}
                >
                  Add More Info
                </Button>
              </Box>
            </Box>
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