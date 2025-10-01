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
  People,
  Assessment,
  Business,
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Employee, Payroll } from '@/types';
import { useRouter } from 'next/navigation';

interface ManagerStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  pendingApprovals: number;
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

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ManagerStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    pendingApprovals: 0,
    efficiencyScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setLoading(true);

        // Fetch all employees (managers can see all employees)
        const employeesQuery = query(collection(db, 'employees'));
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesData: Employee[] = [];
        employeesSnapshot.forEach((doc) => {
          employeesData.push({ id: doc.id, ...doc.data() } as Employee);
        });
        setEmployees(employeesData);

        // Calculate stats
        const totalEmployees = employeesData.length;
        const activeEmployees = employeesData.filter(emp => emp.status !== 'inactive').length;
        const totalPayroll = employeesData.reduce((sum, emp) => {
          const baseSalary = parseInt(emp.salary?.base.toString() || '0');
          const hra = parseInt(emp.salary?.hra || '0');
          const ta = parseInt(emp.salary?.ta || '0');
          const da = parseInt(emp.salary?.da || '0');
          return sum + baseSalary + hra + ta + da;
        }, 0);

        setStats({
          totalEmployees,
          activeEmployees,
          totalPayroll,
          pendingApprovals: 5, // Mock data
          efficiencyScore: 92, // Mock data
        });

        // Mock notifications
        setNotifications([
          {
            id: '1',
            title: 'New Employee Added',
            message: 'A new employee has been added to the system.',
            type: 'info',
            date: new Date(),
            read: false,
          },
          {
            id: '2',
            title: 'Payroll Approval Required',
            message: '5 payroll records are pending your approval.',
            type: 'warning',
            date: new Date(Date.now() - 86400000),
            read: true,
          },
          {
            id: '3',
            title: 'Team Performance Update',
            message: 'Your team has achieved 92% efficiency this month.',
            type: 'success',
            date: new Date(Date.now() - 172800000),
            read: true,
          },
        ]);

      } catch (err) {
        console.error('Error fetching manager data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, [currentUser]);

  const quickActions: QuickAction[] = [
    {
      title: 'Manage Employees',
      description: 'View and manage employee information',
      icon: <People />,
      action: () => router.push('/employees'),
      color: '#2196f3',
    },
    {
      title: 'Attendance',
      description: 'Monitor employee attendance',
      icon: <Assessment />,
      action: () => router.push('/attendance'),
      color: '#4caf50',
    },
    {
      title: 'Payroll',
      description: 'Process and approve payroll',
      icon: <AttachMoney />,
      action: () => router.push('/payroll'),
      color: '#ff9800',
    },
    {
      title: 'Reports',
      description: 'Generate and view reports',
      icon: <Business />,
      action: () => router.push('/reports'),
      color: '#9c27b0',
    },
  ];

  const upcomingEvents = [
    { title: 'Monthly Team Review', date: '2024-01-15', type: 'meeting' },
    { title: 'Payroll Processing', date: '2024-01-20', type: 'payroll' },
    { title: 'Performance Reviews', date: '2024-01-25', type: 'review' },
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
        Welcome, {currentUser?.displayName} to the Dashboard! 👋
      </Typography>

      {/* Manager Profile Card */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: '#4caf50',
                fontSize: '2rem',
              }}
            >
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'M'}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                {currentUser?.displayName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                Manager ID: {currentUser?.userId}
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                Email: {currentUser?.email}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label="Manager"
                color="success"
                sx={{ backgroundColor: '#4caf50', color: '#ffffff', mb: 1 }}
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
      {/*<Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
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
      </Card> */}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <People color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {stats.totalEmployees}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Total Employees
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {stats.activeEmployees}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Active Employees
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="warning" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    ₹{stats.totalPayroll.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Total Payroll
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="error" />
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {stats.pendingApprovals}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Pending Approvals
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity and Team Overview */}
        {/* @ts-ignore */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Team Overview
              </Typography>
              <Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Total Team Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {stats.totalEmployees}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Active Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {stats.activeEmployees}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                    Inactive Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {stats.totalEmployees - stats.activeEmployees}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2, borderColor: '#444' }} />
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                    Team Efficiency:
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {stats.efficiencyScore}%
                  </Typography>
                </Box>
              </Box>
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
            {/*<Grid item xs={12}>
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
                            backgroundColor: event.type === 'payroll' ? '#ff9800' : '#2196f3',
                            color: '#ffffff',
                            fontSize: '0.7rem'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid> */}

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
                        Team Efficiency
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        {stats.efficiencyScore}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.efficiencyScore} 
                      sx={{ backgroundColor: '#444', '& .MuiLinearProgress-bar': { backgroundColor: '#4caf50' } }}
                    />
                  </Box>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                        Employee Retention
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        {Math.round((stats.activeEmployees / stats.totalEmployees) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(stats.activeEmployees / stats.totalEmployees) * 100} 
                      sx={{ backgroundColor: '#444', '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' } }}
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