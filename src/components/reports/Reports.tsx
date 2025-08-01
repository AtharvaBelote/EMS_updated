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
  Grid,
} from '@mui/material';
import {
  Download,
  Search,
  PictureAsPdf,
  TableChart,
  BarChart,
  PieChart,
  TrendingUp,
  People,
  AttachMoney,
  Schedule,
  Assessment,
  GetApp,
  Refresh,
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Payroll, Attendance } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import * as XLSX from 'xlsx';

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Reports() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [tabValue, setTabValue] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load employees
      const employeesQuery = query(collection(db, 'employees'), orderBy('fullName'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesData);

      // Load payrolls for selected month/year
      const payrollsQuery = query(
        collection(db, 'payroll'),
        where('month', '==', selectedMonth),
        where('year', '==', selectedYear)
      );
      const payrollsSnapshot = await getDocs(payrollsQuery);
      const payrollsData = payrollsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Payroll[];
      setPayrolls(payrollsData);

      // Load attendance for selected month/year
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('month', '==', selectedMonth),
        where('year', '==', selectedYear)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData = attendanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendance[];
      setAttendance(attendanceData);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeStats = () => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status !== 'inactive').length;
    const newEmployees = employees.filter(emp => {
      const joiningDate = emp.dateOfJoining instanceof Date ? emp.dateOfJoining : (emp.dateOfJoining as any)?.toDate?.();
      if (!joiningDate) return false;
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return joiningDate > threeMonthsAgo;
    }).length;

    return { totalEmployees, activeEmployees, newEmployees };
  };

  const getPayrollStats = () => {
    const totalPayroll = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalNetPayroll = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const totalTax = payrolls.reduce((sum, p) => sum + p.taxAmount, 0);
    const avgSalary = payrolls.length > 0 ? totalPayroll / payrolls.length : 0;

    return { totalPayroll, totalNetPayroll, totalTax, avgSalary };
  };

  const getAttendanceStats = () => {
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return { totalDays, presentDays, absentDays, attendanceRate };
  };

  const getPayrollChartData = () => {
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthPayrolls = payrolls.filter(p => p.month === i);
      const totalGross = monthPayrolls.reduce((sum, p) => sum + p.grossSalary, 0);
      const totalNet = monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
      
      monthlyData.push({
        month: months[i - 1]?.label || `Month ${i}`,
        gross: totalGross,
        net: totalNet,
      });
    }
    return monthlyData;
  };

  const getAttendanceChartData = () => {
    const statusCounts = {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      'half-day': attendance.filter(a => a.status === 'half-day').length,
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportEmployeeReport = () => {
    const employeeData = employees.map(emp => ({
      'Employee ID': emp.employeeId,
      'Full Name': emp.fullName,
      'Email': emp.email,
      'Mobile': emp.mobile,
      'Base Salary': emp.salary?.base || '0',
      'HRA': emp.salary?.hra || '0',
      'TA': emp.salary?.ta || '0',
      'DA': emp.salary?.da || '0',
      'Status': emp.status || 'active',
    }));
    exportToExcel(employeeData, `employee_report_${selectedMonth}_${selectedYear}`);
    setSuccess('Employee report exported successfully!');
  };

  const exportPayrollReport = () => {
    const payrollData = payrolls.map(p => {
      const employee = employees.find(emp => emp.id === p.employeeId);
      return {
        'Employee ID': employee?.employeeId || 'Unknown',
        'Employee Name': employee?.fullName || 'Unknown',
        'Month': months.find(m => m.value === p.month)?.label || p.month,
        'Year': p.year,
        'Base Salary': p.baseSalary,
        'HRA': p.hra,
        'TA': p.ta,
        'DA': p.da,
        'Total Bonus': p.totalBonus,
        'Total Deduction': p.totalDeduction,
        'Tax Amount': p.taxAmount,
        'Gross Salary': p.grossSalary,
        'Net Salary': p.netSalary,
        'Status': p.status,
      };
    });
    exportToExcel(payrollData, `payroll_report_${selectedMonth}_${selectedYear}`);
    setSuccess('Payroll report exported successfully!');
  };

  const exportAttendanceReport = () => {
    const attendanceData = attendance.map(a => {
      const employee = employees.find(emp => emp.id === a.employeeId);
      return {
        'Employee ID': employee?.employeeId || 'Unknown',
        'Employee Name': employee?.fullName || 'Unknown',
        'Date': a.date instanceof Date ? a.date.toLocaleDateString() : (a.date as any)?.toDate?.()?.toLocaleDateString() || 'Unknown',
        'Status': a.status,
        'Check In': a.checkIn instanceof Date ? a.checkIn.toLocaleTimeString() : (a.checkIn as any)?.toDate?.()?.toLocaleTimeString() || 'N/A',
        'Check Out': a.checkOut instanceof Date ? a.checkOut.toLocaleTimeString() : (a.checkOut as any)?.toDate?.()?.toLocaleTimeString() || 'N/A',
        'Notes': a.notes || '',
      };
    });
    exportToExcel(attendanceData, `attendance_report_${selectedMonth}_${selectedYear}`);
    setSuccess('Attendance report exported successfully!');
  };

  const employeeStats = getEmployeeStats();
  const payrollStats = getPayrollStats();
  const attendanceStats = getAttendanceStats();
  const payrollChartData = getPayrollChartData();
  const attendanceChartData = getAttendanceChartData();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive reports and analytics for your organization
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

      {/* Month/Year Selection */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={(e) => setSelectedMonth(e.target.value as number)}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                label="Year"
                onChange={(e) => setSelectedYear(e.target.value as number)}
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
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

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People sx={{ color: '#2196f3', mr: 1 }} />
              <Typography variant="h6" sx={{ color: '#ffffff' }}>
                Employee Statistics
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ color: '#ffffff', mb: 1 }}>
              {employeeStats.totalEmployees}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Employees
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Active: {employeeStats.activeEmployees}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                New (3 months): {employeeStats.newEmployees}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AttachMoney sx={{ color: '#4caf50', mr: 1 }} />
              <Typography variant="h6" sx={{ color: '#ffffff' }}>
                Payroll Statistics
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ color: '#ffffff', mb: 1 }}>
              ₹{payrollStats.totalPayroll.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Gross Payroll
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Net: ₹{payrollStats.totalNetPayroll.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Tax: ₹{payrollStats.totalTax.toLocaleString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ backgroundColor: '#2d2d2d' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ color: '#ff9800', mr: 1 }} />
              <Typography variant="h6" sx={{ color: '#ffffff' }}>
                Attendance Statistics
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ color: '#ffffff', mb: 1 }}>
              {attendanceStats.attendanceRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance Rate
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Present: {attendanceStats.presentDays}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Absent: {attendanceStats.absentDays}
              </Typography>
            </Box>
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
            <Tab label="Analytics" icon={<BarChart />} />
            <Tab label="Employee Report" icon={<People />} />
            <Tab label="Payroll Report" icon={<AttachMoney />} />
            <Tab label="Attendance Report" icon={<Schedule />} />
          </Tabs>
        </Box>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {/* Payroll Chart */}
            <Card sx={{ backgroundColor: '#3d3d3d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Monthly Payroll Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={payrollChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                    <XAxis dataKey="month" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #333', color: '#ffffff' }}
                    />
                    <Legend />
                    <Bar dataKey="gross" fill="#2196f3" name="Gross Salary" />
                    <Bar dataKey="net" fill="#4caf50" name="Net Salary" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Chart */}
            <Card sx={{ backgroundColor: '#3d3d3d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Attendance Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={attendanceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {attendanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #333', color: '#ffffff' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Employee Report Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={exportEmployeeReport}
              sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}
            >
              Export Excel
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Base Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees
                  .filter(emp => 
                    emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.employeeId}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.email}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>₹{employee.salary?.base || '0'}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Chip 
                          label={employee.status || 'active'} 
                          color={employee.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={employees.filter(emp => 
              emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
            ).length}
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

        {/* Payroll Report Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={exportPayrollReport}
              sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}
            >
              Export Excel
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Month</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Gross Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Net Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Tax</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payrolls.map((payroll) => {
                  const employee = employees.find(emp => emp.id === payroll.employeeId);
                  return (
                    <TableRow key={payroll.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {employee?.fullName || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {months.find(m => m.value === payroll.month)?.label} {payroll.year}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>₹{payroll.grossSalary.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>₹{payroll.netSalary.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>₹{payroll.taxAmount.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Chip 
                          label={payroll.status} 
                          color={payroll.status === 'paid' ? 'success' : payroll.status === 'approved' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Attendance Report Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={exportAttendanceReport}
              sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#388e3c' } }}
            >
              Export Excel
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Check Out</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.map((record) => {
                  const employee = employees.find(emp => emp.id === record.employeeId);
                  return (
                    <TableRow key={record.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {employee?.fullName || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {record.date instanceof Date ? record.date.toLocaleDateString() : (record.date as any)?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Chip 
                          label={record.status} 
                          color={record.status === 'present' ? 'success' : record.status === 'absent' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {record.checkIn instanceof Date ? record.checkIn.toLocaleTimeString() : (record.checkIn as any)?.toDate?.()?.toLocaleTimeString() || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {record.checkOut instanceof Date ? record.checkOut.toLocaleTimeString() : (record.checkOut as any)?.toDate?.()?.toLocaleTimeString() || 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
} 