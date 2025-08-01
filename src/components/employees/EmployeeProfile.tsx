'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Work,
  AttachMoney,
  Schedule,
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Employee } from '@/types';

export default function EmployeeProfile() {
  const { currentUser } = useAuth();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!currentUser?.employeeId) return;

      try {
        setLoading(true);

        // Fetch employee data
        const employeeQuery = query(
          collection(db, 'employees'),
          where('employeeId', '==', currentUser.employeeId)
        );
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (!employeeSnapshot.empty) {
          const empData = {
            id: employeeSnapshot.docs[0].id,
            ...employeeSnapshot.docs[0].data()
          } as Employee;
          setEmployeeData(empData);
        } else {
          setError('Employee data not found');
        }
      } catch (err) {
        console.error('Error fetching employee data:', err);
        setError('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [currentUser]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!employeeData) {
    return (
      <Alert severity="warning">
        Employee profile not found. Please contact your administrator.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', mb: 3 }}>
        My Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    backgroundColor: '#2196f3',
                    fontSize: '3rem',
                  }}
                >
                  {employeeData.fullName?.charAt(0) || 'E'}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h4" sx={{ color: '#ffffff', mb: 1 }}>
                    {employeeData.fullName}
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#b0b0b0', mb: 2 }}>
                    Employee ID: {employeeData.employeeId}
                  </Typography>
                  <Chip
                    label="Active Employee"
                    color="success"
                    sx={{ backgroundColor: '#4caf50', color: '#ffffff' }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person />
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2, borderColor: '#444' }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Email sx={{ color: '#b0b0b0' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Email Address
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {employeeData.email}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Phone sx={{ color: '#b0b0b0' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Mobile Number
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {employeeData.mobile}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Work sx={{ color: '#b0b0b0' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Department
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {employeeData.department || 'Not specified'}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2}>
                  <Schedule sx={{ color: '#b0b0b0' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Joining Date
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {employeeData.joiningDate ? new Date(employeeData.joiningDate).toLocaleDateString() : 'Not specified'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Salary Information */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney />
                Salary Structure
              </Typography>
              <Divider sx={{ mb: 2, borderColor: '#444' }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Base Salary:
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                    ₹{employeeData.salary?.base || '0'}
                  </Typography>
                </Box>

                {employeeData.salary?.hra && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      HRA:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      ₹{employeeData.salary.hra}
                    </Typography>
                  </Box>
                )}

                {employeeData.salary?.ta && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      TA:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      ₹{employeeData.salary.ta}
                    </Typography>
                  </Box>
                )}

                {employeeData.salary?.da && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      DA:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      ₹{employeeData.salary.da}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ borderColor: '#444' }} />

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                    Total CTC:
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                    ₹{(() => {
                      const base = parseInt(employeeData.salary?.base || '0');
                      const hra = parseInt(employeeData.salary?.hra || '0');
                      const ta = parseInt(employeeData.salary?.ta || '0');
                      const da = parseInt(employeeData.salary?.da || '0');
                      return (base + hra + ta + da).toLocaleString();
                    })()}
                  </Typography>
                </Box>

                {employeeData.salary?.taxRegime && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Tax Regime:
                    </Typography>
                    <Chip
                      label={employeeData.salary.taxRegime === 'new' ? 'New Regime' : 'Old Regime'}
                      color="primary"
                      size="small"
                      sx={{ backgroundColor: '#2196f3', color: '#ffffff' }}
                    />
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Information */}
        {employeeData.address && (
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Address
                </Typography>
                <Divider sx={{ mb: 2, borderColor: '#444' }} />
                <Typography variant="body1" sx={{ color: '#ffffff' }}>
                  {employeeData.address}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Additional Information */}
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2, borderColor: '#444' }} />
              
              {(() => {
                const additionalFields = Object.entries(employeeData).filter(([key, value]) => 
                  !['id', 'employeeId', 'fullName', 'email', 'mobile', 'salary', 'address', 'department', 'joiningDate'].includes(key) && 
                  value !== null && 
                  value !== undefined && 
                  value !== ''
                );

                if (additionalFields.length === 0) {
                  return (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0', fontStyle: 'italic', mb: 2 }}>
                        No additional information available
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#2196f3', fontSize: '0.875rem' }}>
                        You can add additional information in the Settings page
                      </Typography>
                    </Box>
                  );
                }

                return (
                  <Grid container spacing={3}>
                    {additionalFields.map(([key, value]) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box sx={{ 
                          p: 2, 
                          border: '1px solid #444', 
                          borderRadius: 1,
                          backgroundColor: '#1a1a1a'
                        }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#2196f3', 
                              textTransform: 'capitalize',
                              fontWeight: 'bold',
                              mb: 1
                            }}
                          >
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#ffffff',
                              wordBreak: 'break-word'
                            }}
                          >
                            {(() => {
                              if (typeof value === 'object' && value !== null) {
                                // Check if it's a Firestore timestamp
                                if (value.seconds && value.nanoseconds) {
                                  const date = new Date(value.seconds * 1000);
                                  return date.toLocaleString();
                                }
                                // For other objects, show as JSON but limit length
                                const jsonStr = JSON.stringify(value);
                                return jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
                              }
                              return String(value);
                            })()}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 