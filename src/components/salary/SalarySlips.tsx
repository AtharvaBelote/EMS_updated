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
  Grid,
} from '@mui/material';
import {
  Download,
  Search,
  PictureAsPdf,
  Email,
  Visibility,
  Refresh,
  GetApp,
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Payroll, SalarySlip } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function SalarySlips() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
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
      
      // Debug: Log employees data
      console.log('=== EMPLOYEES DATA ===');
      console.log('Total employees:', employeesData.length);
      employeesData.forEach(emp => {
        console.log(`Employee: ${emp.fullName}, ID: ${emp.id}, employeeId: ${emp.employeeId}`);
      });

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
      // Sort by processedAt in JavaScript
      payrollsData.sort((a, b) => {
        const dateA = a.processedAt instanceof Date ? a.processedAt : (a.processedAt as any)?.toDate?.();
        const dateB = b.processedAt instanceof Date ? b.processedAt : (b.processedAt as any)?.toDate?.();
        return dateB - dateA; // Sort in descending order
      });
      setPayrolls(payrollsData);
      
      // Debug: Log payrolls data
      console.log('=== PAYROLLS DATA ===');
      console.log('Total payrolls:', payrollsData.length);
      payrollsData.forEach(payroll => {
        console.log(`Payroll ID: ${payroll.id}, employeeId: ${payroll.employeeId}`);
      });

      // Load existing salary slips
      const slipsQuery = query(
        collection(db, 'salary_slips'),
        where('month', '==', selectedMonth),
        where('year', '==', selectedYear)
      );
      const slipsSnapshot = await getDocs(slipsQuery);
      const slipsData = slipsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SalarySlip[];
      // Sort by generatedAt in JavaScript
      slipsData.sort((a, b) => {
        const dateA = a.generatedAt instanceof Date ? a.generatedAt : (a.generatedAt as any)?.toDate?.();
        const dateB = b.generatedAt instanceof Date ? b.generatedAt : (b.generatedAt as any)?.toDate?.();
        return dateB - dateA; // Sort in descending order
      });
      setSalarySlips(slipsData);
      
      // Debug: Log salary slips data
      console.log('=== SALARY SLIPS DATA ===');
      console.log('Total slips:', slipsData.length);
      slipsData.forEach(slip => {
        console.log(`Slip ID: ${slip.id}, employeeId: ${slip.employeeId}`);
        const foundEmployee = employeesData.find(emp => emp.employeeId === slip.employeeId);
        console.log(`  -> Found employee: ${foundEmployee?.fullName || 'NOT FOUND'}`);
      });

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateSalarySlipPDF = async (employee: Employee, payroll: Payroll) => {
    try {
      setGeneratingPdf(true);
      
      console.log('=== GENERATING SALARY SLIP ===');
      console.log('Employee:', employee.fullName, 'ID:', employee.id, 'employeeId:', employee.employeeId);
      console.log('Payroll employeeId:', payroll.employeeId);
      console.log('Will save slip with employeeId:', payroll.employeeId);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Company Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPANY NAME', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('123 Business Street, City, State 12345', pageWidth / 2, 30, { align: 'center' });
      doc.text('Phone: (555) 123-4567 | Email: hr@company.com', pageWidth / 2, 37, { align: 'center' });
      
      // Salary Slip Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SALARY SLIP', pageWidth / 2, 55, { align: 'center' });
      
      // Employee Details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Details:', 20, 75);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${employee.fullName}`, 20, 85);
      doc.text(`Employee ID: ${employee.employeeId}`, 20, 92);
      doc.text(`Email: ${employee.email}`, 20, 99);
      doc.text(`Month: ${months.find(m => m.value === payroll.month)?.label} ${payroll.year}`, 20, 106);
      
      // Salary Breakdown
      doc.setFont('helvetica', 'bold');
      doc.text('Salary Breakdown:', 20, 125);
      
      const salaryData = [
        ['Component', 'Amount (₹)'],
        ['Basic Salary', payroll.baseSalary?.toFixed(2) || '0.00'],
        ['HRA', payroll.hra?.toFixed(2) || '0.00'],
        ['TA', payroll.ta?.toFixed(2) || '0.00'],
        ['DA', payroll.da?.toFixed(2) || '0.00'],
        ['Total Bonus', payroll.totalBonus?.toFixed(2) || '0.00'],
        ['Total Deduction', payroll.totalDeduction?.toFixed(2) || '0.00'],
        ['Tax Amount', (payroll as any).taxAmount?.toFixed(2) || '0.00'],
        ['Gross Salary', payroll.grossSalary?.toFixed(2) || '0.00'],
        ['Net Salary', payroll.netSalary?.toFixed(2) || '0.00'],
      ];
      
      autoTable(doc, {
        startY: 135,
        head: [salaryData[0]],
        body: salaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 },
      });
      
      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('This is a computer generated document. No signature required.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      // Save the PDF
      const fileName = `salary_slip_${employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
      doc.save(fileName);
      
      // Save to Firestore - use payroll.employeeId (string like "EMP001") instead of employee.id
      await addDoc(collection(db, 'salary_slips'), {
        employeeId: payroll.employeeId,
        payrollId: payroll.id,
        month: payroll.month,
        year: payroll.year,
        fileName,
        generatedAt: new Date(),
        generatedBy: currentUser?.uid || '',
      });
      
      setSuccess(`Salary slip generated for ${employee.fullName}`);
      await loadData(); // Refresh the list
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate salary slip');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generateBulkSalarySlips = async () => {
    try {
      setGeneratingPdf(true);
      setError('');
      setSuccess('');
      
      const availablePayrolls = payrolls.filter(payroll => 
        !salarySlips.some(slip => slip.employeeId === payroll.employeeId)
      );
      
      if (availablePayrolls.length === 0) {
        setError('No new payroll records to generate slips for');
        return;
      }
      
      for (const payroll of availablePayrolls) {
        const employee = employees.find(emp => emp.employeeId === payroll.employeeId);
        if (employee) {
          await generateSalarySlipPDF(employee, payroll);
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setSuccess(`Generated ${availablePayrolls.length} salary slips`);
      
    } catch (error) {
      console.error('Error generating bulk salary slips:', error);
      setError('Failed to generate bulk salary slips');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const previewSalarySlip = (employee: Employee, payroll: Payroll) => {
    setPreviewData({ employee, payroll });
    setShowPreviewDialog(true);
  };

  const filteredSlips = salarySlips.filter(slip => {
    const employee = employees.find(emp => emp.employeeId === slip.employeeId);
    return employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee?.fullName || 'Unknown Employee';
  };

  const getEmployeeId = (employeeId: string) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee?.employeeId || 'Unknown ID';
  };

  const getPayrollData = (employeeId: string) => {
    return payrolls.find(p => p.employeeId === employeeId);
  };

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
          Salary Slips
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate and manage salary slips for employees
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

      {/* Month/Year Selection and Stats */}
      <Card sx={{ mb: 3, backgroundColor: '#2d2d2d' }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 3 }}>
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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
              
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={loadData}
                sx={{ mt: 2, backgroundColor: '#2196f3', '&:hover': { backgroundColor: '#1976d2' } }}
              >
                Refresh
              </Button>
            </Box>
            
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {employees.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {payrolls.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payroll Records
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {salarySlips.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generated Slips
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>
                    {payrolls.length - salarySlips.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Slips
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Search and Bulk Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by Name or Employee ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<PictureAsPdf />}
          onClick={generateBulkSalarySlips}
          disabled={generatingPdf || payrolls.length === salarySlips.length}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          {generatingPdf ? <CircularProgress size={20} /> : 'GENERATE ALL SLIPS'}
        </Button>
      </Box>

      {/* Pending Salary Slips Section */}
      {payrolls.length > salarySlips.length && (
        <Card sx={{ mb: 3, backgroundColor: '#2d2d2d', border: '1px solid #ff9800' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
              Pending Salary Slips ({payrolls.length - salarySlips.length})
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <TableContainer component={Paper} sx={{ backgroundColor: '#3d3d3d', border: '1px solid #333' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                        Employee Name
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                        Employee ID
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                        Net Salary
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrolls
                      .filter(payroll => !salarySlips.some(slip => slip.employeeId === payroll.employeeId))
                      .map((payroll) => {
                        const employee = employees.find(emp => emp.employeeId === payroll.employeeId);
                        return (
                          <TableRow key={payroll.id} sx={{ '&:hover': { backgroundColor: '#4d4d4d' } }}>
                            <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                              {employee?.fullName || 'Unknown'}
                            </TableCell>
                            <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                              {employee?.employeeId || 'Unknown'}
                            </TableCell>
                            <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                              ₹{payroll.netSalary?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Generate Slip">
                                  <IconButton
                                    size="small"
                                    sx={{ color: '#ff9800' }}
                                    onClick={() => employee && generateSalarySlipPDF(employee, payroll)}
                                    disabled={generatingPdf}
                                  >
                                    <PictureAsPdf />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Salary Slips Table */}
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Employee Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Employee ID
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Month/Year
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Net Salary
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Generated On
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSlips
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((slip) => {
                  const employee = employees.find(emp => emp.employeeId === slip.employeeId);
                  const payroll = getPayrollData(slip.employeeId);
                  
                  return (
                    <TableRow key={slip.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        {employee?.fullName || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        {employee?.employeeId || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        {months.find(m => m.value === slip.month)?.label} {slip.year}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        ₹{payroll?.netSalary?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        <Chip 
                          label="Generated" 
                          color="success" 
                          size="small"
                          sx={{ backgroundColor: '#4caf50' }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        {slip.generatedAt instanceof Date 
                          ? slip.generatedAt.toLocaleDateString() 
                          : (slip.generatedAt as any)?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton
                              size="small"
                              sx={{ color: '#2196f3' }}
                              onClick={() => employee && payroll && previewSalarySlip(employee, payroll)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              sx={{ color: '#4caf50' }}
                              onClick={() => employee && payroll && generateSalarySlipPDF(employee, payroll)}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredSlips.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        sx={{
          color: '#ffffff',
          '& .MuiTablePagination-selectIcon': {
            color: '#ffffff',
          },
        }}
      />

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onClose={() => setShowPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: '#ffffff' }}>
            Salary Slip Preview - {previewData?.employee?.fullName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
                Employee Details
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                  <strong>Name:</strong> {previewData.employee.fullName}
                </Typography>
                <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                  <strong>Employee ID:</strong> {previewData.employee.employeeId}
                </Typography>
                <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                  <strong>Email:</strong> {previewData.employee.email}
                </Typography>
                <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
                  <strong>Month:</strong> {months.find(m => m.value === previewData.payroll.month)?.label} {previewData.payroll.year}
                </Typography>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
                Salary Breakdown
              </Typography>
              <Box sx={{ backgroundColor: '#3d3d3d', p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>Basic Salary:</strong> ₹{previewData.payroll.baseSalary?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>HRA:</strong> ₹{previewData.payroll.hra?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>TA:</strong> ₹{previewData.payroll.ta?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>DA:</strong> ₹{previewData.payroll.da?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>Total Bonus:</strong> ₹{previewData.payroll.totalBonus?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>Total Deduction:</strong> ₹{previewData.payroll.totalDeduction?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>Tax Amount:</strong> ₹{(previewData.payroll as any).taxAmount?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    <strong>Gross Salary:</strong> ₹{previewData.payroll.grossSalary?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#4caf50', gridColumn: '1 / -1', mt: 1 }}>
                    <strong>Net Salary:</strong> ₹{previewData.payroll.netSalary?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          <Button
            onClick={() => {
              if (previewData) {
                generateSalarySlipPDF(previewData.employee, previewData.payroll);
                setShowPreviewDialog(false);
              }
            }}
            variant="contained"
            startIcon={<Download />}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 