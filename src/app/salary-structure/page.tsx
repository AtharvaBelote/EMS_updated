'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import RouteGuard from '@/components/auth/RouteGuard';
import { Box, CircularProgress } from '@mui/material';
import dynamic from 'next/dynamic';

// Lazy-load to avoid SSR issues with Firebase
const SalaryTemplateBuilder = dynamic(
  () => import('@/components/salary/SalaryTemplateBuilder'),
  { ssr: false, loading: () => <Box display="flex" justifyContent="center" pt={8}><CircularProgress /></Box> }
);

export default function SalaryStructurePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) return null;

  return (
    <RouteGuard allowedRoles={['admin']}>
      <Layout>
        <SalaryTemplateBuilder />
      </Layout>
    </RouteGuard>
  );
}
