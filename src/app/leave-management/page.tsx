'use client';

import React from 'react';
import { Box } from '@mui/material';
import Layout from '@/components/layout/Layout';
import LeaveManagement from '@/components/leave/LeaveManagement';

export default function LeaveManagementPage() {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <LeaveManagement />
      </Box>
    </Layout>
  );
}