'use client';

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
  Avatar,
  Chip,
  Divider,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person,
  AttachMoney,
  Notifications,
  Event,
  TrendingUp,
  Star,
  Info,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Employee, Payroll, Attendance } from '@/types';
import { useRouter } from 'next/navigation';

interface EmployeeStats {
  totalAttendance: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  currentMonthSalary: number;
  lastPayroll: Payroll | null;
  recentAttendance: Attendance[];
  attendancePercentage: number;
  efficiencyScore: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  date: Date;
  read: boolean;
}

export default function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<EmployeeStats>({
    totalAttendance: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    currentMonthSalary: 0,
    lastPayroll: null,
    recentAttendance: [],
    attendancePercentage: 0,
    efficiencyScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!currentUser?.employeeId) return;

      try {
        setLoading(true);

        // Fetch employee data
        const employeeQuery = query(
          collection(db, 'employees'),
          where('employeeId', '==', currentUser.employeeId)
        );
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (!employeeSnapshot.empty) {
          const empData = {
            id: employeeSnapshot.docs[0].id,
            ...employeeSnapshot.docs[0].data()
          } as Employee;
          setEmployeeData(empData);
        }

        // Calculate efficiency score based on employee data
        const efficiencyScore = 85; // Default efficiency score

        // Fetch current month payroll
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const payrollQuery = query(
          collection(db, 'payroll'),
          where('employeeId', '==', currentUser.employeeId),
          where('month', '==', currentMonth),
          where('year', '==', currentYear)
        );
        const payrollSnapshot = await getDocs(payrollQuery);
        const currentPayroll = payrollSnapshot.empty ? null : {
          id: payrollSnapshot.docs[0].id,
          ...payrollSnapshot.docs[0].data()
        } as Payroll;

        // Fetch last payroll - simplified query to avoid index requirements
        const lastPayrollQuery = query(
          collection(db, 'payroll'),
          where('employeeId', '==', currentUser.employeeId)
        );
        const lastPayrollSnapshot = await getDocs(lastPayrollQuery);
        const lastPayroll = lastPayrollSnapshot.empty ? null : {
          id: lastPayrollSnapshot.docs[0].id,
          ...lastPayrollSnapshot.docs[0].data()
        } as Payroll;

        setStats({
          totalAttendance: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          currentMonthSalary: currentPayroll?.netSalary || 0,
          lastPayroll,
          recentAttendance: [],
          attendancePercentage: 0,
          efficiencyScore,
        });

        // Mock notifications (in real app, these would come from database)
        setNotifications([
          {
            id: '1',
            title: 'Salary Credited',
            message: 'Your salary for this month has been credited to your account.',
            type: 'success',
            date: new Date(),
            read: false,
          },
          {
            id: '2',
            title: 'Attendance Reminder',
            message: 'Please mark your attendance for today.',
            type: 'info',
            date: new Date(Date.now() - 86400000),
            read: true,
          },
        ]);

      } catch (err) {
        console.error('Error fetching employee data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [currentUser]);

  const quickActions: QuickAction[] = [
    {
      title: 'My Profile',
      description: 'View and update your profile',
      icon: <Person />,
      action: () => router.push('/profile'),
      color: '#ff9800',
    },
    {
      title: 'View Reports',
      description: 'Check your performance reports',
      icon: <TrendingUp />,
      action: () => router.push('/reports'),
      color: '#9c27b0',
    },
  ];

  const upcomingEvents = [
    { title: 'Monthly Team Meeting', date: '2024-01-15', type: 'meeting' },
    { title: 'Performance Review', date: '2024-01-20', type: 'review' },
    { title: 'Company Holiday', date: '2024-01-26', type: 'holiday' },
  ];

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



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Warning color="error" />;
      default: return <Info color="info" />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', mb: 3 }}>
        Welcome back, {currentUser?.displayName}! 👋
      </Typography>

      {/* Employee Profile Card */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: '#2196f3',
                fontSize: '2rem',
              }}
            >
              {currentUser?.displayName?.charAt(0) || 'E'}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                {currentUser?.displayName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                Employee ID: {currentUser?.employeeId}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                Email: {currentUser?.email}
              </Typography>
              {employeeData && (
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  Mobile: {employeeData.mobile}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label="Employee"
                color="primary"
                sx={{ backgroundColor: '#2196f3', color: '#ffffff', mb: 1 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star sx={{ color: '#ffd700', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  {stats.efficiencyScore}% Efficiency
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index} {...({} as any)}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={action.action}
                  sx={{
                    borderColor: action.color,
                    color: action.color,
                    '&:hover': {
                      borderColor: action.color,
                      backgroundColor: `${action.color}20`,
                    },
                    py: 2,
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* @ts-ignore */}
        <Grid xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    ₹{stats.currentMonthSalary.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    This Month's Salary
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Star color="warning" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {stats.efficiencyScore}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Efficiency Score
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Person color="info" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {employeeData?.employeeId || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Employee ID
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity and Salary Info */}
        {/* @ts-ignore */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Salary Information
              </Typography>
              {employeeData && (
                <Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                      Base Salary:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>
                      ₹{employeeData.salary?.base || '0'}
                    </Typography>
                  </Box>
                  {employeeData.salary?.hra && (
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        HRA:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        ₹{employeeData.salary.hra}
                      </Typography>
                    </Box>
                  )}
                  {employeeData.salary?.ta && (
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        TA:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        ₹{employeeData.salary.ta}
                      </Typography>
                    </Box>
                  )}
                  {employeeData.salary?.da && (
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        DA:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        ₹{employeeData.salary.da}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 2, borderColor: '#444' }} />
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      Total:
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                      ₹{stats.currentMonthSalary.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Notifications and Events */}
        {/* @ts-ignore */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            {/* Notifications */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" sx={{ color: '#ffffff' }}>
                      Notifications
                    </Typography>
                    <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                      <Notifications sx={{ color: '#b0b0b0' }} />
                    </Badge>
                  </Box>
                  <List sx={{ p: 0 }}>
                    {notifications.slice(0, 3).map((notification) => (
                      <ListItem key={notification.id} sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {getNotificationIcon(notification.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: notification.read ? 'normal' : 'bold' }}>
                              {notification.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                              {notification.message}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Upcoming Events */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                    Upcoming Events
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {upcomingEvents.map((event, index) => (
                      <ListItem key={index} sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Event sx={{ color: '#2196f3' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ color: '#ffffff' }}>
                              {event.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                              {new Date(event.date).toLocaleDateString()}
                            </Typography>
                          }
                        />
                        <Chip
                          label={event.type}
                          size="small"
                          sx={{ 
                            backgroundColor: event.type === 'holiday' ? '#4caf50' : '#2196f3',
                            color: '#ffffff',
                            fontSize: '0.7rem'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Metrics */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                    Performance Metrics
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        Efficiency Score
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        {stats.efficiencyScore}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.efficiencyScore} 
                      sx={{ backgroundColor: '#444', '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' } }}
                    />
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        This Month's Salary
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        ₹{stats.currentMonthSalary.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((stats.currentMonthSalary / 100000) * 100, 100)} 
                      sx={{ backgroundColor: '#444', '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800' } }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
} 