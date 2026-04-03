/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  LinearProgress,
} from "@mui/material";
import {
  AttachMoney,
  Notifications,
  Info,
  CheckCircle,
  Warning,
  People,
} from "@mui/icons-material";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Employee, Payroll } from "@/types";

interface ManagerStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  pendingApprovals: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  date: Date;
  read: boolean;
}

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<ManagerStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payrollActivity, setPayrollActivity] = useState<Payroll[]>([]);

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        setLoading(true);

        if (!currentUser?.uid) {
          setNotifications([]);
          setPayrollActivity([]);
          setStats({
            totalEmployees: 0,
            activeEmployees: 0,
            totalPayroll: 0,
            pendingApprovals: 0,
          });
          setLoading(false);
          return;
        }

        const companyId = currentUser.companyId || currentUser.uid;

        const [employeesSnapshot, notificationsSnapshot, payrollSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "employees"),
                where("companyId", "==", companyId),
              ),
            ),
            getDocs(
              query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
              ),
            ),
            getDocs(
              query(
                collection(db, "payroll"),
                where("companyId", "==", companyId),
              ),
            ),
          ]);

        const employeesData: Employee[] = employeesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];

        const notificationData: Notification[] = notificationsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "Notification",
              message: data.message || "",
              type: data.type || "info",
              date: data.createdAt?.toDate?.() || new Date(),
              read: Boolean(data.isRead),
            };
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(notificationData);

        const payrollData: Payroll[] = payrollSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Payroll[];
        setPayrollActivity(
          payrollData.sort((a, b) => {
            const left = a.processedAt ? new Date(a.processedAt).getTime() : 0;
            const right = b.processedAt ? new Date(b.processedAt).getTime() : 0;
            return right - left;
          }),
        );

        // Calculate stats
        const totalEmployees = employeesData.length;
        const activeEmployees = employeesData.filter(
          (emp) => emp.status !== "inactive",
        ).length;
        const totalPayroll = employeesData.reduce((sum, emp) => {
          // Use new salary structure if available, fallback to legacy structure
          if (emp.salary?.ctcPerMonth) {
            return sum + emp.salary.ctcPerMonth;
          } else {
            const basic =
              typeof emp.salary?.basic === "string"
                ? parseInt(emp.salary.basic || "0") || 0
                : (emp.salary?.basic ?? emp.salary?.base) || 0;
            const hra =
              typeof emp.salary?.hra === "string"
                ? parseInt(emp.salary.hra || "0") || 0
                : emp.salary?.hra || 0;
            const ta =
              typeof emp.salary?.ta === "string"
                ? parseInt(emp.salary.ta || "0") || 0
                : emp.salary?.ta || 0;
            const da =
              typeof emp.salary?.da === "string"
                ? parseInt(emp.salary.da || "0") || 0
                : emp.salary?.da || 0;
            return sum + basic + hra + ta + da;
          }
        }, 0);

        const pendingApprovals = payrollData.filter(
          (record) => record.status === "pending",
        ).length;

        setStats({
          totalEmployees,
          activeEmployees,
          totalPayroll,
          pendingApprovals,
        });
      } catch (err) {
        console.error("Error fetching manager data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, [currentUser]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
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
      case "success":
        return <CheckCircle color="success" />;
      case "warning":
        return <Warning color="warning" />;
      case "error":
        return <Warning color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: "#ffffff", mb: 3 }}>
        Welcome, {currentUser?.displayName} to the Dashboard! 👋
      </Typography>

      {/* Manager Profile Card */}
      <Card
        sx={{ mb: 3, backgroundColor: "#2d2d2d", border: "1px solid #333" }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: "#4caf50",
                fontSize: "2rem",
              }}
            >
              {currentUser?.displayName?.charAt(0).toUpperCase() || "M"}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" sx={{ color: "#ffffff", mb: 1 }}>
                {currentUser?.displayName}
              </Typography>
              <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 1 }}>
                Manager ID: {currentUser?.userId}
              </Typography>
              <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 1 }}>
                Email: {currentUser?.email}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Chip
                label="Manager"
                color="success"
                sx={{ backgroundColor: "#4caf50", color: "#ffffff", mb: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Pending Payroll */}
      {/*<Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            Quick Actions
          </Typography>
                    Pending Payroll Approvals
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index} {...({} as any)}>
                    {payrollActivity.filter(record => record.status === 'pending').slice(0, 3).map((record) => (
                      <ListItem key={record.id} sx={{ px: 0, py: 1 }}>
                  variant="outlined"
                          <AttachMoney sx={{ color: '#ff9800' }} />
                  onClick={action.action}
                  sx={{
                    borderColor: action.color,
                    color: action.color,
                              {getEmployeeName(record.employeeId)}
                      borderColor: action.color,
                      backgroundColor: `${action.color}20`,
                    },
                    py: 2,
                              {record.month}/{record.year} • {record.status}
                    justifyContent: 'flex-start',
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                          label="pending"
                      {action.title}
                    </Typography>
                            backgroundColor: '#ff9800',
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
                    {payrollActivity.filter(record => record.status === 'pending').length === 0 && (
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                              No pending payroll approvals.
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
          </Grid>
        </CardContent>
      </Card> */}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <People color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {stats.totalEmployees}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Total Employees
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {stats.activeEmployees}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Active Employees
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AttachMoney color="warning" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    ₹{stats.totalPayroll.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Total Payroll
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="error" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {stats.pendingApprovals}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
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
          <Card
            sx={{
              backgroundColor: "#2d2d2d",
              border: "1px solid #333",
              height: "100%",
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ color: "#ffffff", mb: 2 }}>
                Team Overview
              </Typography>
              <Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Total Team Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    {stats.totalEmployees}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Active Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    {stats.activeEmployees}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" py={1}>
                  <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                    Inactive Members:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    {stats.totalEmployees - stats.activeEmployees}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar - Notifications and Payroll */}
        {/* @ts-ignore */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            {/* Notifications */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card
                sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}
              >
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Typography variant="h6" sx={{ color: "#ffffff" }}>
                      Notifications
                    </Typography>
                    <Badge
                      badgeContent={notifications.filter((n) => !n.read).length}
                      color="error"
                    >
                      <Notifications sx={{ color: "#b0b0b0" }} />
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
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#ffffff",
                                fontWeight: notification.read
                                  ? "normal"
                                  : "bold",
                              }}
                            >
                              {notification.title}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{ color: "#b0b0b0" }}
                            >
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

            {/* Pending Payroll Approvals */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card
                sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#ffffff", mb: 2 }}>
                    Pending Payroll Approvals
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {payrollActivity
                      .filter((record) => record.status === "pending")
                      .slice(0, 3)
                      .map((record) => (
                        <ListItem key={record.id} sx={{ px: 0, py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <AttachMoney sx={{ color: "#ff9800" }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{ color: "#ffffff" }}
                              >
                                Payroll for employee ID {record.employeeId}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                sx={{ color: "#b0b0b0" }}
                              >
                                Month {record.month}/{record.year}
                              </Typography>
                            }
                          />
                          <Chip
                            label={record.status}
                            size="small"
                            sx={{
                              backgroundColor: "#ff9800",
                              color: "#ffffff",
                              fontSize: "0.7rem",
                            }}
                          />
                        </ListItem>
                      ))}
                    {payrollActivity.filter(
                      (record) => record.status === "pending",
                    ).length === 0 && (
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{ color: "#b0b0b0" }}
                            >
                              No pending payroll approvals.
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Metrics */}
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Card
                sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#ffffff", mb: 2 }}>
                    Performance Metrics
                  </Typography>
                  <Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                        Employee Retention
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#ffffff" }}>
                        {Math.round(
                          (stats.activeEmployees / stats.totalEmployees) * 100,
                        )}
                        %
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats.activeEmployees / stats.totalEmployees) * 100
                      }
                      sx={{
                        backgroundColor: "#444",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#2196f3",
                        },
                      }}
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
