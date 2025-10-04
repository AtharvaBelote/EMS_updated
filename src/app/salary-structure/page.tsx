'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import RouteGuard from '@/components/auth/RouteGuard';
import { Box, CircularProgress, Typography, Paper, Alert } from '@mui/material';

export default function SalaryStructure() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <RouteGuard allowedRoles={['admin']}>
      <Layout>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ color: '#ffffff' }}>
            Salary Structure Management
          </Typography>
          
          <Paper sx={{ p: 3, mt: 2, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <Alert severity="info" sx={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
              Salary structure management features are coming soon. This will include:
              <ul>
                <li>Salary component configuration (HRA, TA, DA, Bonuses, Deductions)</li>
                <li>Salary structure templates</li>
                <li>Bulk salary updates</li>
                <li>Increment management</li>
                <li>Salary history tracking</li>
              </ul>
            </Alert>
          </Paper>
        </Box>
      </Layout>
    </RouteGuard>
  );
} 