'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  AttachMoney,
  Receipt,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Payroll } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

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

export default function PayrollProcessing() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingPayroll, setExistingPayroll] = useState<Payroll[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      checkExistingPayroll();
    }
  }, [selectedMonth, selectedYear, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const employeesQuery = query(
        collection(db, 'employees'),
        orderBy('fullName')
      );
      const snapshot = await getDocs(employeesQuery);
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPayroll = async () => {
    try {
      const payrollQuery = query(
        collection(db, 'payroll'),
        where('month', '==', selectedMonth),
        where('year', '==', selectedYear)
      );
      const snapshot = await getDocs(payrollQuery);
      const payrollData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      setExistingPayroll(payrollData);
    } catch (err) {
      console.error('Error checking existing payroll:', err);
    }
  };

  const calculateTax = (grossSalary: number, taxRegime: 'old' | 'new') => {
    // Simplified tax calculation - in real implementation, use proper tax slabs
    if (taxRegime === 'new') {
      if (grossSalary <= 300000) return 0;
      if (grossSalary <= 600000) return (grossSalary - 300000) * 0.05;
      if (grossSalary <= 900000) return 15000 + (grossSalary - 600000) * 0.10;
      if (grossSalary <= 1200000) return 45000 + (grossSalary - 900000) * 0.15;
      if (grossSalary <= 1500000) return 90000 + (grossSalary - 1200000) * 0.20;
      return 150000 + (grossSalary - 1500000) * 0.30;
    } else {
      // Old tax regime calculation
      if (grossSalary <= 250000) return 0;
      if (grossSalary <= 500000) return (grossSalary - 250000) * 0.05;
      if (grossSalary <= 1000000) return 12500 + (grossSalary - 500000) * 0.20;
      return 112500 + (grossSalary - 1000000) * 0.30;
    }
  };

  const processPayroll = async () => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const payrollRecords = employees.map(employee => {
        const salary = employee.salary || {};
        const baseSalary = parseFloat(salary.base || '0');
        const hra = parseFloat(salary.hra || '0');
        const ta = parseFloat(salary.ta || '0');
        const da = parseFloat(salary.da || '0');
        const taxRegime = salary.taxRegime || 'old';
        
        const grossSalary = baseSalary + hra + ta + da;
        const taxAmount = calculateTax(grossSalary, taxRegime);
        const netSalary = grossSalary - taxAmount;

        return {
          employeeId: employee.id,
          month: selectedMonth,
          year: selectedYear,
          baseSalary,
          hra,
          ta,
          da,
          totalBonus: 0, // TODO: Add bonus calculation
          totalDeduction: 0, // TODO: Add deduction calculation
          grossSalary,
          netSalary,
          taxAmount,
          status: 'pending' as const,
          processedBy: currentUser?.uid || '',
          processedAt: new Date(),
        };
      });

      // Save payroll records
      for (const record of payrollRecords) {
        await addDoc(collection(db, 'payroll'), record);
      }

      setSuccess('Payroll processed successfully!');
      await checkExistingPayroll();
    } catch (err) {
      console.error('Error processing payroll:', err);
      setError('Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const getPayrollStats = () => {
    const stats = {
      totalEmployees: employees.length,
      processedPayroll: existingPayroll.length,
      totalGrossSalary: existingPayroll.reduce((sum, p) => sum + p.grossSalary, 0),
      totalNetSalary: existingPayroll.reduce((sum, p) => sum + p.netSalary, 0),
      totalTax: existingPayroll.reduce((sum, p) => sum + ((p as any).taxAmount || 0), 0),
    };

    return stats;
  };

  const stats = getPayrollStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payroll Processing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Month/Year Selection and Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 3, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <FormControl fullWidth>
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
            </Box>
            <Box>
              <FormControl fullWidth>
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
            </Box>
          </Box>
        </Box>
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <AttachMoney color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{stats.totalEmployees}</Typography>
                  <Typography variant="caption">Total Employees</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Receipt color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">{stats.processedPayroll}</Typography>
                  <Typography variant="caption">Processed</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <TrendingUp color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">₹{stats.totalGrossSalary.toLocaleString()}</Typography>
                  <Typography variant="caption">Gross Salary</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">₹{stats.totalTax.toLocaleString()}</Typography>
                  <Typography variant="caption">Total Tax</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Process Payroll Button */}
      <Box display="flex" justifyContent="flex-end" sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={processPayroll}
          disabled={processing || existingPayroll.length > 0}
          size="large"
        >
          {processing ? <CircularProgress size={24} /> : 'Process Payroll'}
        </Button>
      </Box>

      {/* Existing Payroll Table */}
      {existingPayroll.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ p: 2 }}>
            Processed Payroll for {months[selectedMonth - 1].label} {selectedYear}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Gross Salary</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Net Salary</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {existingPayroll.map((payroll) => {
                  const employee = employees.find(emp => emp.id === payroll.employeeId);
                  return (
                    <TableRow key={payroll.id}>
                      <TableCell>{employee?.employeeId}</TableCell>
                      <TableCell>{employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}</TableCell>
                      <TableCell align="right">₹{payroll.grossSalary.toLocaleString()}</TableCell>
                      <TableCell align="right">₹{((payroll as any).taxAmount || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">₹{payroll.netSalary.toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={payroll.status}
                          color={payroll.status === 'paid' ? 'success' : payroll.status === 'approved' ? 'info' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
} 