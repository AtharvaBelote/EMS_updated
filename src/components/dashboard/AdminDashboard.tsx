'use client';
import type { GridProps } from '@mui/material/Grid';

import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  People,
  AttachMoney,
  Schedule,
  TrendingUp,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Attendance, Payroll } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: number;
  pendingPayroll: number;
  totalSalaryCost: number;
  recentChanges: number;
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    todayAttendance: 0,
    pendingPayroll: 0,
    totalSalaryCost: 0,
    recentChanges: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch employees for this company only
        const employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', currentUser.uid)
        );
        const employeesSnapshot = await getDocs(employeesQuery);
        const employees = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];

        // Fetch today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', today)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const todayAttendance = attendanceSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.status === 'present';
        }).length;

        // Fetch pending payroll
        const payrollQuery = query(
          collection(db, 'payroll'),
          where('status', '==', 'pending')
        );
        const payrollSnapshot = await getDocs(payrollQuery);
        const pendingPayroll = payrollSnapshot.size;

        // Calculate total salary cost
        const totalSalaryCost = employees.reduce((sum, emp) => {
          return sum + (emp.baseSalary + emp.hra + emp.ta + emp.da);
        }, 0);

        setStats({
          totalEmployees: employees.length,
          activeEmployees: employees.filter(emp => emp.status === 'active').length,
          todayAttendance,
          pendingPayroll,
          totalSalaryCost,
          recentChanges: 0, // TODO: Implement recent changes tracking
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser?.uid]);

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

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: <People color="primary" />,
      color: 'primary.main',
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      icon: <CheckCircle color="success" />,
      color: 'success.main',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: <Schedule color="info" />,
      color: 'info.main',
    },
    {
      title: 'Pending Payroll',
      value: stats.pendingPayroll,
      icon: <Warning color="warning" />,
      color: 'warning.main',
    },
    {
      title: 'Total Salary Cost',
      value: `₹${stats.totalSalaryCost.toLocaleString()}`,
      icon: <AttachMoney color="success" />,
      color: 'success.main',
    },
    {
      title: 'Recent Changes',
      value: stats.recentChanges,
      icon: <TrendingUp color="secondary" />,
      color: 'secondary.main',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        {statCards.map((card, index) => (
          <Box key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ color: card.color }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: 40 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Quick Actions */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <Box>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6">Add Employee</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Schedule sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6">Mark Attendance</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h6">Process Payroll</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h6">View Reports</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
} 