'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Dashboard,
  People,
  AttachMoney,
  Assessment,
  History,
  Settings,
  Logout,
  Person,
  Schedule,
  Receipt,
  Business,
  EventAvailable,
  Notifications,
  FolderOpen,
  TrendingUp,
  SupervisorAccount,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = {
  admin: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Employees', icon: <People />, path: '/employees' },
    { text: 'Managers', icon: <SupervisorAccount />, path: '/managers' },
    { text: 'Attendance', icon: <Schedule />, path: '/attendance' },
    { text: 'Leave Management', icon: <EventAvailable />, path: '/leave-management' },
    { text: 'Performance', icon: <TrendingUp />, path: '/performance' },
    { text: 'Documents', icon: <FolderOpen />, path: '/documents' },
    { text: 'Salary Structures', icon: <AttachMoney />, path: '/salary' },
    { text: 'Payroll', icon: <Receipt />, path: '/payroll' },
    { text: 'Salary Slips', icon: <Assessment />, path: '/salary-slips' },
    { text: 'Reports', icon: <Business />, path: '/reports' },
    { text: 'History', icon: <History />, path: '/history' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ],
  manager: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Employees', icon: <People />, path: '/employees' },
    { text: 'Attendance', icon: <Schedule />, path: '/attendance' },
    { text: 'Leave Management', icon: <EventAvailable />, path: '/leave-management' },
    { text: 'Performance', icon: <TrendingUp />, path: '/performance' },
    { text: 'Documents', icon: <FolderOpen />, path: '/documents' },
    { text: 'Salary Structures', icon: <AttachMoney />, path: '/salary' },
    { text: 'Payroll', icon: <Receipt />, path: '/payroll' },
    { text: 'Salary Slips', icon: <Assessment />, path: '/salary-slips' },
    { text: 'Reports', icon: <Business />, path: '/reports' },
    { text: 'History', icon: <History />, path: '/history' },
  ],
  employee: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
    { text: 'My Leaves', icon: <EventAvailable />, path: '/leave-management' },
    { text: 'My Performance', icon: <TrendingUp />, path: '/performance' },
    { text: 'My Documents', icon: <FolderOpen />, path: '/documents' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ],
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const currentMenuItems = currentUser ? menuItems[currentUser.role] : [];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            EMS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Employee Management System
          </Typography>
        </Box>

        {/* User Info */}
        {currentUser && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar sx={{ width: 40, height: 40, mr: 1 }}>
                {currentUser.displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {currentUser.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Typography>
              </Box>
              {/* <NotificationCenter /> */}
            </Box>
          </Box>
        )}

        {/* Navigation Menu */}
        <List>
          {currentMenuItems.map((item, index) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider />

        {/* Logout */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
} 