'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { GridProps } from '@mui/material/Grid';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { addDoc, updateDoc, doc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, CustomField } from '@/types';
import EmployeeAccountSetup from './EmployeeAccountSetup';
import { generateUserId } from '@/lib/utils';

// Fix 1: Allow dynamic fields in Yup schema
const schema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  mobile: yup.number().required('Mobile number is required'),
  'salary.base': yup.string(),
});

// Replace the interface with a type alias for dynamic fields
type EmployeeFormData = Record<string, any>;

interface EmployeeFormProps {
  open: boolean;
  employee?: Employee | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function EmployeeForm({ open, employee, onSave, onCancel }: EmployeeFormProps) {
  const [savedEmployee, setSavedEmployee] = useState<Employee | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [existingFields, setExistingFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [moreInfoFields, setMoreInfoFields] = useState<{ name: string; value: string }[]>([]);

  // Initialize useForm hook first
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      fullName: '',
      email: '',
      mobile: 0,
      'salary.base': '',
    },
  });

  // Load existing custom fields from employee data
  const loadExistingFields = async () => {
    try {
      const employeesQuery = query(collection(db, 'employees'));
      const querySnapshot = await getDocs(employeesQuery);
      const allFields = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        Object.keys(data).forEach(key => {
          // Exclude main fields and special fields
          if (!['id', 'fullName', 'employeeId', 'email', 'mobile', 'salary', 'createdAt', 'updatedAt'].includes(key)) {
            allFields.add(key);
          }
        });
      });
      
      setExistingFields(Array.from(allFields));
    } catch (error) {
      console.error('Error loading existing fields:', error);
    }
  };

  // Load existing fields when form opens
  useEffect(() => {
    if (open) {
      loadExistingFields();
    }
  }, [open]);

  // Reset form with employee data when editing
  useEffect(() => {
    if (open && employee) {
      // Prepare form data with all employee fields
      const formData: EmployeeFormData = {
        fullName: employee.fullName || '',
        email: employee.email || '',
        mobile: employee.mobile || 0,
        'salary.base': employee.salary?.base || '',
      };

      // Add all other dynamic fields from the employee
      Object.keys(employee).forEach(key => {
        if (!['id', 'fullName', 'email', 'mobile', 'salary', 'createdAt', 'updatedAt'].includes(key)) {
          formData[key] = employee[key];
        }
      });

      // Reset form with the employee data
      reset(formData);

      // Also populate additional info fields if they exist
      const additionalFields: { name: string; value: string }[] = [];
      Object.entries(employee).forEach(([key, value]) => {
        if (!['id', 'employeeId', 'fullName', 'email', 'mobile', 'salary', 'createdAt', 'updatedAt'].includes(key) && 
            value !== null && value !== undefined && value !== '') {
          // Only add to moreInfoFields if it's not already in existingFields
          if (!existingFields.includes(key)) {
            additionalFields.push({ name: key, value: String(value) });
          }
        }
      });
      setMoreInfoFields(additionalFields);
    } else if (open && !employee) {
      // Reset form for new employee
      reset({
        fullName: '',
        email: '',
        mobile: 0,
        'salary.base': '',
      });
      setMoreInfoFields([]);
    }
  }, [open, employee, reset, existingFields]);

  const watchedValues = watch();

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      setLoading(true);
      
      // Generate employee ID if not exists
      const employeeId = employee?.employeeId || generateUserId('employee');
      
      // Prepare employee data
      const employeeData = {
        employeeId,
        fullName: data.fullName,
        email: data.email,
        mobile: data.mobile,
        salary: {
          base: data['salary.base'],
          bonuses: {},
          customDeductions: {},
          deductions: {},
        },
        // Include all other dynamic fields
        ...Object.keys(data).reduce((acc, key) => {
          if (!['fullName', 'email', 'mobile', 'salary.base'].includes(key)) {
            acc[key] = data[key];
          }
          return acc;
        }, {} as Record<string, any>),
        createdAt: employee?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Fix 2: Cast employeeData as any for dynamic assignment
      moreInfoFields.forEach(f => {
        if (f.name) (employeeData as any)[f.name] = f.value;
      });

      let savedEmployeeData: Employee;

      if (employee) {
        await updateDoc(doc(db, 'employees', employee.id), employeeData);
        savedEmployeeData = { ...employee, ...employeeData };
      } else {
        const docRef = await addDoc(collection(db, 'employees'), employeeData);
        savedEmployeeData = { id: docRef.id, ...employeeData };
      }

      setSavedEmployee(savedEmployeeData);

      onSave();
      reset();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth disableEscapeKeyDown={false}>
      <DialogTitle>
        <Typography variant="h5" component="span" sx={{ color: '#ffffff' }}>
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            {/* Basic Information */}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                Basic Information
              </Typography>
            </Box>

            <Box>
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name"
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message?.toString()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
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
                    label="Email"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message?.toString()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
              />
            </Box>

            <Box>
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Mobile"
                    type="tel"
                    error={!!errors.mobile}
                    helperText={errors.mobile?.message?.toString()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
              />
            </Box>

            <Box>
              <Controller
                name="salary.base"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Base Salary"
                    error={!!errors['salary.base']}
                    helperText={errors['salary.base']?.message?.toString()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
              />
            </Box>

            {/* Dynamic Fields */}
            {customFields.map((field) => (
              <Box key={field.id}>
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: formField }) => (
                    <TextField
                      {...formField}
                      fullWidth
                      label={field.name}
                      type={field.type === 'number' ? 'number' : 'text'}
                      error={!!errors[field.name]}
                      helperText={errors[field.name]?.message?.toString()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            ))}

            {/* Existing Custom Fields from other employees */}
            {existingFields.length > 0 && (
              <>
                <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                    Existing Custom Fields
                  </Typography>
                </Box>
                {existingFields.map((fieldName) => (
                  <Box key={fieldName}>
                    <Controller
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={fieldName}
                          placeholder={`Enter ${fieldName}`}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      )}
                    />
                  </Box>
                ))}
              </>
            )}

            {/* --- ADDITIONAL INFO SECTION (editable, see comment below) --- */}
            {/* Add More Info Section: You can edit this section to change how extra fields are handled */}
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
            {/* --- END ADDITIONAL INFO SECTION --- */}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting || loading}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          {isSubmitting || loading ? <CircularProgress size={24} /> : (employee ? 'Update' : 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 