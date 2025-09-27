'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Button, Chip } from '@mui/material';
import Layout from '@/components/layout/Layout';
import { TrendingUp, Assignment, Star, Timeline } from '@mui/icons-material';

export default function PerformancePage() {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 3 }}>
          Performance Management
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: '#4caf50', mr: 1 }} />
                <Typography variant="h6">Performance Reviews</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage annual and quarterly performance reviews
              </Typography>
              <Button variant="outlined" size="small">
                View Reviews
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment sx={{ color: '#2196f3', mr: 1 }} />
                <Typography variant="h6">Goals & Objectives</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set and track employee goals and KPIs
              </Typography>
              <Button variant="outlined" size="small">
                Manage Goals
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Star sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6">360° Feedback</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Collect feedback from peers and managers
              </Typography>
              <Button variant="outlined" size="small">
                Start Feedback
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Timeline sx={{ color: '#9c27b0', mr: 1 }} />
                <Typography variant="h6">Career Development</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Plan career paths and development plans
              </Typography>
              <Button variant="outlined" size="small">
                View Plans
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Coming Soon</Typography>
          <Typography variant="body1" color="text.secondary">
            Performance management features are under development. This will include:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Chip label="Performance Reviews" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Goal Setting" sx={{ mr: 1, mb: 1 }} />
            <Chip label="360° Feedback" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Competency Management" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Career Planning" sx={{ mr: 1, mb: 1 }} />
            <Chip label="Performance Analytics" sx={{ mr: 1, mb: 1 }} />
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}