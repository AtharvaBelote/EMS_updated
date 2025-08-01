'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import RouteGuard from '@/components/auth/RouteGuard';
import Reports from '@/components/reports/Reports';
import { Box, CircularProgress } from '@mui/material';

export default function ReportsPage() {
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
    <RouteGuard allowedRoles={['admin', 'manager']}>
      <Layout>
        <Reports />
      </Layout>
    </RouteGuard>
  );
} 