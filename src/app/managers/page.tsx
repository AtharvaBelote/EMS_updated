'use client';

import React from 'react';
import { Box } from '@mui/material';
import Layout from '@/components/layout/Layout';
import ManagerTable from '@/components/managers/ManagerTable';

export default function ManagersPage() {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ManagerTable />
      </Box>
    </Layout>
  );
}