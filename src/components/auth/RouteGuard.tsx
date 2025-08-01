'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export default function RouteGuard({ 
  children, 
  allowedRoles = ['admin', 'manager', 'employee'], 
  redirectTo = '/dashboard' 
}: RouteGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (!allowedRoles.includes(currentUser.role)) {
        // For employees, redirect to dashboard if they try to access restricted pages
        if (currentUser.role === 'employee') {
          router.push('/dashboard');
        } else {
          router.push(redirectTo);
        }
      }
    }
  }, [currentUser, loading, router, allowedRoles, redirectTo]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2">
            You don't have permission to access this page. Redirecting...
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
} 