'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import RouteGuard from '@/components/auth/RouteGuard';
import SalaryStructures from '@/components/salary/SalaryStructures';
import { Box, CircularProgress, Tabs, Tab, Paper } from '@mui/material';
import dynamic from 'next/dynamic';

const SalaryTemplateBuilder = dynamic(
  () => import('@/components/salary/SalaryTemplateBuilder'),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function SalaryPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);

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
        <Box>
          {/* Top-level tab switcher */}
          <Paper
            sx={{
              mb: 2,
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 2,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                '& .MuiTab-root': { color: '#aaa', fontWeight: 600, fontSize: 14 },
                '& .Mui-selected': { color: '#2196f3' },
                '& .MuiTabs-indicator': { backgroundColor: '#2196f3' },
              }}
            >
              <Tab label="Salary Calculations" />
              <Tab label="Salary Templates" />
            </Tabs>
          </Paper>

          {tab === 0 && <SalaryStructures />}
          {tab === 1 && <SalaryTemplateBuilder />}
        </Box>
      </Layout>
    </RouteGuard>
  );
}
