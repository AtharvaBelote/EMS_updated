'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Visibility,
  History,
  Person,
  AttachMoney,
  Schedule,
  Assessment,
  Business,
  ExpandMore,
  Timeline,
  Info,
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditLog, Employee, Payroll, Attendance } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const actionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'employee', label: 'Employee' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'salary', label: 'Salary' },
  { value: 'bulk', label: 'Bulk Operations' },
  { value: 'system', label: 'System' },
];

const actionIcons = {
  employee: <Person />,
  attendance: <Schedule />,
  payroll: <AttachMoney />,
  salary: <Assessment />,
  bulk: <Business />,
  system: <Info />,
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`history-tabpanel-${index}`}
      aria-labelledby={`history-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AuditHistory() {
  const { currentUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState('7'); // days
  const [tabValue, setTabValue] = useState(0);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load audit logs - simplified query to avoid index requirements
      const logsQuery = query(
        collection(db, 'audit_logs')
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(log => new Date(log.timestamp.seconds * 1000) >= startDate)
        .sort((a, b) => new Date(b.timestamp.seconds * 1000).getTime() - new Date(a.timestamp.seconds * 1000).getTime())
        .slice(0, 1000) as AuditLog[];
      setAuditLogs(logsData);

      // Load employees for reference
      const employeesQuery = query(collection(db, 'employees'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesData);

      // Load recent payrolls - simplified query to avoid index requirements
      const payrollsQuery = query(
        collection(db, 'payroll')
      );
      const payrollsSnapshot = await getDocs(payrollsQuery);
      const payrollsData = payrollsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => new Date(b.processedAt.seconds * 1000).getTime() - new Date(a.processedAt.seconds * 1000).getTime())
        .slice(0, 100) as Payroll[];
      setPayrolls(payrollsData);

      // Load recent attendance - simplified query to avoid index requirements
      const attendanceQuery = query(
        collection(db, 'attendance')
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData = attendanceSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => new Date(b.date.seconds * 1000).getTime() - new Date(a.date.seconds * 1000).getTime())
        .slice(0, 100) as Attendance[];
      setAttendance(attendanceData);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    return actionIcons[actionType as keyof typeof actionIcons] || <Info />;
  };

  const getActionColor = (actionType: string) => {
    const colors = {
      employee: '#2196f3',
      attendance: '#ff9800',
      payroll: '#4caf50',
      salary: '#9c27b0',
      bulk: '#f44336',
      system: '#607d8b',
    };
    return colors[actionType as keyof typeof colors] || '#607d8b';
  };

  const getActionDescription = (action: string, targetType: string) => {
    const descriptions: { [key: string]: { [key: string]: string } } = {
      employee: {
        create: 'Employee created',
        update: 'Employee updated',
        delete: 'Employee deleted',
        import: 'Employees imported',
        export: 'Employees exported',
      },
      attendance: {
        mark: 'Attendance marked',
        bulk_mark: 'Bulk attendance marked',
        update: 'Attendance updated',
      },
      payroll: {
        process: 'Payroll processed',
        approve: 'Payroll approved',
        pay: 'Payroll paid',
        generate_slip: 'Salary slip generated',
      },
      salary: {
        update: 'Salary updated',
        bulk_update: 'Bulk salary update',
        structure_update: 'Salary structure updated',
      },
      bulk: {
        import: 'Bulk import completed',
        export: 'Bulk export completed',
        update: 'Bulk update completed',
        delete: 'Bulk delete completed',
      },
      system: {
        login: 'User logged in',
        logout: 'User logged out',
        config_change: 'System configuration changed',
      },
    };
    
    return descriptions[targetType]?.[action] || `${action} on ${targetType}`;
  };

  const getUserName = (userId: string) => {
    // This would typically come from a users collection
    // For now, we'll use the userId
    return userId || 'Unknown User';
  };

  const getTargetName = (targetType: string, targetId: string) => {
    switch (targetType) {
      case 'employee':
        const employee = employees.find(emp => emp.id === targetId);
        return employee?.fullName || `Employee ${targetId}`;
      case 'payroll':
        const payroll = payrolls.find(p => p.id === targetId);
        const payrollEmployee = employees.find(emp => emp.id === payroll?.employeeId);
        return payrollEmployee ? `${payrollEmployee.fullName} - ${payroll?.month}/${payroll?.year}` : `Payroll ${targetId}`;
      case 'attendance':
        const attendanceRecord = attendance.find(a => a.id === targetId);
        const attendanceEmployee = employees.find(emp => emp.id === attendanceRecord?.employeeId);
        return attendanceEmployee ? `${attendanceEmployee.fullName} - ${attendanceRecord?.date}` : `Attendance ${targetId}`;
      default:
        return `${targetType} ${targetId}`;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return 'Unknown';
  };

  const showLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(log.userId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActionType = selectedActionType === 'all' || log.targetType === selectedActionType;
    
    return matchesSearch && matchesActionType;
  });

  const getRecentActivity = () => {
    return filteredLogs.slice(0, 10);
  };

  const getActivitySummary = () => {
    const summary = {
      total: filteredLogs.length,
      employee: filteredLogs.filter(log => log.targetType === 'employee').length,
      attendance: filteredLogs.filter(log => log.targetType === 'attendance').length,
      payroll: filteredLogs.filter(log => log.targetType === 'payroll').length,
      salary: filteredLogs.filter(log => log.targetType === 'salary').length,
      bulk: filteredLogs.filter(log => log.targetType === 'bulk').length,
      system: filteredLogs.filter(log => log.targetType === 'system').length,
    };
    return summary;
  };

  const activitySummary = getActivitySummary();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 1 }}>
          Audit Trail & History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track all system activities and changes
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d' }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 2, alignItems: 'end' }}>
            <TextField
              placeholder="Search actions, users, or targets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flex: 1 }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={selectedActionType}
                label="Action Type"
                onChange={(e) => setSelectedActionType(e.target.value)}
              >
                {actionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="1">Last 24 hours</MenuItem>
                <MenuItem value="7">Last 7 days</MenuItem>
                <MenuItem value="30">Last 30 days</MenuItem>
                <MenuItem value="90">Last 90 days</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadData}
              sx={{ backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: '#ffffff' }}>
              {activitySummary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Activities
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: '#2196f3' }}>
              {activitySummary.employee}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Employee Actions
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: '#4caf50' }}>
              {activitySummary.payroll}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Payroll Actions
            </Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: '#ff9800' }}>
              {activitySummary.attendance}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance Actions
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card sx={{ backgroundColor: '#2d2d2d' }}>
        <Box sx={{ borderBottom: 1, borderColor: '#333' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': { color: '#ffffff' },
              '& .Mui-selected': { color: '#2196f3' },
            }}
          >
            <Tab label="Recent Activity" icon={<Timeline />} />
            <Tab label="Detailed Logs" icon={<History />} />
            <Tab label="Activity Summary" icon={<Assessment />} />
          </Tabs>
        </Box>

        {/* Recent Activity Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            Recent Activity (Last 10 Actions)
          </Typography>
          
          {getRecentActivity().map((log) => (
            <Accordion key={log.id} sx={{ backgroundColor: '#3d3d3d', mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#ffffff' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ color: getActionColor(log.targetType) }}>
                    {getActionIcon(log.targetType)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ color: '#ffffff' }}>
                      {getActionDescription(log.action, log.targetType)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      by {getUserName(log.userId)} • {formatTimestamp(log.timestamp)}
                    </Typography>
                  </Box>
                  <Chip 
                    label={log.targetType} 
                    size="small"
                    sx={{ backgroundColor: getActionColor(log.targetType), color: '#ffffff' }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Target:</strong> {getTargetName(log.targetType, log.targetId)}
                  </Typography>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#ffffff', mb: 1 }}>
                        <strong>Changes:</strong>
                      </Typography>
                      <Box sx={{ backgroundColor: '#2d2d2d', p: 2, borderRadius: 1 }}>
                        {Object.entries(log.changes).map(([key, value]) => (
                          <Typography key={key} variant="body2" sx={{ color: '#ffffff', mb: 0.5 }}>
                            <strong>{key}:</strong> {JSON.stringify(value)}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        {/* Detailed Logs Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Target</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log) => (
                    <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: getActionColor(log.targetType) }}>
                            {getActionIcon(log.targetType)}
                          </Box>
                          {getActionDescription(log.action, log.targetType)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Chip 
                          label={log.targetType} 
                          size="small"
                          sx={{ backgroundColor: getActionColor(log.targetType), color: '#ffffff' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {getTargetName(log.targetType, log.targetId)}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {getUserName(log.userId)}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            sx={{ color: '#2196f3' }}
                            onClick={() => showLogDetails(log)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            sx={{ color: '#ffffff' }}
          />
        </TabPanel>

        {/* Activity Summary Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            Activity Summary by Type
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            {Object.entries(activitySummary).map(([type, count]) => {
              if (type === 'total') return null;
              return (
                <Card key={type} sx={{ backgroundColor: '#3d3d3d' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ color: getActionColor(type) }}>
                        {getActionIcon(type)}
                      </Box>
                      <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                        {type} Activities
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: getActionColor(type) }}>
                      {count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {((count / activitySummary.total) * 100).toFixed(1)}% of total activities
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </TabPanel>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: '#ffffff' }}>
            Activity Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Action Information
                </Typography>
                <Box sx={{ backgroundColor: '#3d3d3d', p: 2, borderRadius: 1 }}>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Action:</strong> {getActionDescription(selectedLog.action, selectedLog.targetType)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Type:</strong> {selectedLog.targetType}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Target:</strong> {getTargetName(selectedLog.targetType, selectedLog.targetId)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>User:</strong> {getUserName(selectedLog.userId)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                    <strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}
                  </Typography>
                  {selectedLog.ipAddress && (
                    <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                      <strong>IP Address:</strong> {selectedLog.ipAddress}
                    </Typography>
                  )}
                </Box>
              </Box>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                    Changes Made
                  </Typography>
                  <Box sx={{ backgroundColor: '#3d3d3d', p: 2, borderRadius: 1 }}>
                    {Object.entries(selectedLog.changes).map(([key, value]) => (
                      <Box key={key} sx={{ mb: 2 }}>
                        <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                          {key}:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff', ml: 2 }}>
                          {JSON.stringify(value, null, 2)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 