'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import RouteGuard from '@/components/auth/RouteGuard';
import EmployeeSettings from '@/components/settings/EmployeeSettings';
import { Box, CircularProgress, Typography, Paper, Alert } from '@mui/material';

export default function Settings() {
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
    <RouteGuard allowedRoles={['admin', 'manager', 'employee']}>
      <Layout>
        {currentUser.role === 'employee' ? (
          <EmployeeSettings />
        ) : (
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#ffffff' }}>
              System Settings
            </Typography>
            
            <Paper sx={{ p: 3, mt: 2, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
              <Alert severity="info" sx={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                System settings and configuration features are coming soon. This will include:
                <ul>
                  <li>Company information and branding</li>
                  <li>Tax configuration and rates</li>
                  <li>Email notification settings</li>
                  <li>User management and permissions</li>
                  <li>System backup and restore</li>
                  <li>Integration settings</li>
                </ul>
              </Alert>
            </Paper>
          </Box>
        )}
      </Layout>
    </RouteGuard>
  );
} 