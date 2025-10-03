'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  Alert,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  Search,
  Upload,
  Download,
  Calculate,
  FileUpload,
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface SalaryCalculationData {
  // Employee Information
  esicNo: string;
  uan: string;

  // Basic Components
  basic: number;
  da: number;

  // Working Days
  totalDays: number;
  paidDays: number;

  // Overtime
  singleOTHours: number;
  doubleOTHours: number;

  // Manual Adjustments
  difference: number;
  advance: number;

  // Skill-based salary
  isSkillBased: boolean;
  skillCategory: string;
  skillAmount: number;

  // Custom components
  customAllowances: { label: string; amount: number }[];
  customBonuses: { label: string; amount: number }[];
  customDeductions: { label: string; amount: number }[];

  // Configurable percentages
  hraPercentage: number;
  esicEmployeePercentage: number;
  esicEmployerPercentage: number;
  pfEmployeePercentage: number;
  pfEmployerPercentage: number;
}

interface SkillCategory {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

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
      id={`salary-tabpanel-${index}`}
      aria-labelledby={`salary-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SalaryStructures() {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form data
  const [editData, setEditData] = useState<SalaryCalculationData>({
    esicNo: '',
    uan: '',
    basic: 0,
    da: 0,
    totalDays: 30,
    paidDays: 30,
    singleOTHours: 0,
    doubleOTHours: 0,
    difference: 0,
    advance: 0,
    isSkillBased: false,
    skillCategory: '',
    skillAmount: 0,
    customAllowances: [],
    customBonuses: [],
    customDeductions: [],
    hraPercentage: 5,
    esicEmployeePercentage: 0.75,
    esicEmployerPercentage: 3.25,
    pfEmployeePercentage: 12,
    pfEmployerPercentage: 13,
  });

  // Bulk edit data
  const [bulkEditData, setBulkEditData] = useState<SalaryCalculationData>({
    esicNo: '',
    uan: '',
    basic: 0,
    da: 0,
    totalDays: 30,
    paidDays: 30,
    singleOTHours: 0,
    doubleOTHours: 0,
    difference: 0,
    advance: 0,
    isSkillBased: false,
    skillCategory: '',
    skillAmount: 0,
    customAllowances: [],
    customBonuses: [],
    customDeductions: [],
    hraPercentage: 5,
    esicEmployeePercentage: 0.75,
    esicEmployerPercentage: 3.25,
    pfEmployeePercentage: 12,
    pfEmployerPercentage: 13,
  });

  // Skill categories
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);

  // Loading states
  const [editLoading, setEditLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [currentUser]);

  const loadEmployees = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const employeesQuery = query(
        collection(db, 'employees'),
        where('companyId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      setAlert({ type: 'error', message: 'Failed to load employees' });
    } finally {
      setLoading(false);
    }
  };

  // Salary calculation functions
  const calculateHRA = (basic: number, da: number, hraPercentage: number = 5): number => {
    return Math.round((basic + da) * (hraPercentage / 100));
  };

  const calculateGrossRate = (basic: number, da: number, hra: number): number => {
    return basic + da + hra;
  };

  const calculateGrossEarning = (grossRate: number, totalDays: number, paidDays: number): number => {
    return Math.round((grossRate / totalDays) * paidDays);
  };

  const calculateOTRate = (grossEarning: number, paidDays: number): number => {
    return (grossEarning / paidDays) / 8;
  };

  const calculateOTAmount = (otRate: number, singleOTHours: number, doubleOTHours: number): number => {
    return Math.round((singleOTHours * otRate) + (doubleOTHours * otRate * 2));
  };

  const calculateProfessionalTax = (totalGross: number): number => {
    if (totalGross < 7501) return 0;
    if (totalGross <= 10000) return 175;
    return 200;
  };

  const calculateESICEmployee = (totalGross: number, percentage: number = 0.75): number => {
    return Math.ceil(totalGross * (percentage / 100));
  };

  const calculatePFBase = (basic: number, da: number, totalDays: number, paidDays: number): number => {
    return Math.round(((basic + da) / totalDays) * paidDays);
  };

  const calculatePFEmployee = (pfBase: number, percentage: number = 12): number => {
    return Math.round(pfBase * (percentage / 100));
  };

  const calculateESICEmployer = (totalGross: number, percentage: number = 3.25): number => {
    return Math.round(totalGross * (percentage / 100));
  };

  const calculatePFEmployer = (pfBase: number, percentage: number = 13): number => {
    return Math.round(pfBase * (percentage / 100));
  };

  const calculateFullSalary = (data: SalaryCalculationData) => {
    // Apply skill-based amount if enabled
    let adjustedBasic = data.basic;
    let adjustedDa = data.da;

    if (data.isSkillBased && data.skillAmount > 0) {
      // Replace the basic salary with the skill-based amount
      adjustedBasic = data.skillAmount;
      // Keep DA as is or you can adjust it proportionally if needed
    }

    const hra = calculateHRA(adjustedBasic, adjustedDa, data.hraPercentage);

    // Calculate custom allowances total
    const totalCustomAllowances = data.customAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);

    // Calculate custom bonuses total
    const totalCustomBonuses = data.customBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

    const grossRate = calculateGrossRate(adjustedBasic, adjustedDa, hra) + totalCustomAllowances;
    const grossEarning = calculateGrossEarning(grossRate, data.totalDays, data.paidDays);
    const otRate = calculateOTRate(grossEarning, data.paidDays);
    const otAmount = calculateOTAmount(otRate, data.singleOTHours, data.doubleOTHours);
    const totalGrossEarning = grossEarning + otAmount + data.difference + totalCustomBonuses;

    const professionalTax = calculateProfessionalTax(totalGrossEarning);
    const esicEmployee = calculateESICEmployee(totalGrossEarning, data.esicEmployeePercentage);
    const pfBase = calculatePFBase(adjustedBasic, adjustedDa, data.totalDays, data.paidDays);
    const pfEmployee = calculatePFEmployee(pfBase, data.pfEmployeePercentage);

    // Calculate custom deductions total
    const totalCustomDeductions = data.customDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);

    const totalDeduction = professionalTax + esicEmployee + pfEmployee + totalCustomDeductions + data.advance;

    const netSalary = totalGrossEarning - totalDeduction;

    const esicEmployer = calculateESICEmployer(totalGrossEarning, data.esicEmployerPercentage);
    const pfEmployer = calculatePFEmployer(pfBase, data.pfEmployerPercentage);
    const ctcPerMonth = totalGrossEarning + esicEmployer + pfEmployer;

    return {
      basic: adjustedBasic,
      da: adjustedDa,
      hra,
      grossRatePM: grossRate,
      otRatePerHour: otRate,
      singleOTHours: data.singleOTHours,
      doubleOTHours: data.doubleOTHours,
      otAmount,
      difference: data.difference,
      advance: data.advance,
      totalGrossEarning,
      professionalTax,
      esicEmployee,
      pfBase,
      pfEmployee,
      totalDeduction,
      netSalary,
      esicEmployer,
      pfEmployer,
      ctcPerMonth,
      totalDays: data.totalDays,
      paidDays: data.paidDays,
      isSkillBased: data.isSkillBased,
      skillCategory: data.skillCategory,
      skillAmount: data.skillAmount,
      customAllowances: data.customAllowances,
      customBonuses: data.customBonuses,
      customDeductions: data.customDeductions,
      hraPercentage: data.hraPercentage,
      esicEmployeePercentage: data.esicEmployeePercentage,
      esicEmployerPercentage: data.esicEmployerPercentage,
      pfEmployeePercentage: data.pfEmployeePercentage,
      pfEmployerPercentage: data.pfEmployerPercentage,
    };
  };

  const filteredEmployees = employees.filter(employee =>
    employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const updates = jsonData.map(async (row) => {
        const employee = employees.find(emp =>
          emp.employeeId === row['Employee ID'] ||
          emp.fullName === row['Name']
        );

        if (!employee) return null;

        // Parse custom allowances, bonuses, and deductions
        const parseCustomItems = (str: string) => {
          if (!str) return [];
          return str.split(',').map(item => {
            const [label, amount] = item.split(':');
            return { label: label?.trim() || '', amount: parseFloat(amount) || 0 };
          }).filter(item => item.label && item.amount > 0);
        };

        const salaryData: SalaryCalculationData = {
          esicNo: row['ESIC No'] || '',
          uan: row['UAN'] || '',
          basic: parseFloat(row['Basic Salary']) || 0,
          da: parseFloat(row['DA']) || 0,
          totalDays: parseFloat(row['Total Days']) || 30,
          paidDays: parseFloat(row['Paid Days']) || 30,
          singleOTHours: parseFloat(row['Single OT Hours']) || 0,
          doubleOTHours: parseFloat(row['Double OT Hours']) || 0,
          difference: parseFloat(row['Difference']) || 0,
          advance: parseFloat(row['Advance']) || 0,
          isSkillBased: (row['Skill Based'] || '').toLowerCase() === 'yes',
          skillCategory: row['Skill Category'] || '',
          skillAmount: parseFloat(row['Skill Amount']) || 0,
          customAllowances: parseCustomItems(row['Custom Allowances'] || ''),
          customBonuses: parseCustomItems(row['Custom Bonuses'] || ''),
          customDeductions: parseCustomItems(row['Custom Deductions'] || ''),
          hraPercentage: 5,
          esicEmployeePercentage: 0.75,
          esicEmployerPercentage: 3.25,
          pfEmployeePercentage: 12,
          pfEmployerPercentage: 13,
        };

        const calculatedSalary = calculateFullSalary(salaryData);

        return updateDoc(doc(db, 'employees', employee.id), {
          esicNo: salaryData.esicNo,
          uan: salaryData.uan,
          salary: calculatedSalary,
          updatedAt: new Date(),
        });
      });

      await Promise.all(updates.filter(Boolean));
      setAlert({ type: 'success', message: 'Salary data uploaded successfully!' });
      loadEmployees();
    } catch (error) {
      console.error('Error uploading file:', error);
      setAlert({ type: 'error', message: 'Failed to upload salary data' });
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download sample file
  const downloadSampleFile = () => {
    const sampleData = [
      {
        'Name': 'John Doe',
        'Employee ID': 'EMP001',
        'ESIC No': '1234567890',
        'UAN': '123456789012',
        'Basic Salary': 15225,
        'DA': 775,
        'Total Days': 30,
        'Paid Days': 30,
        'Single OT Hours': 0,
        'Double OT Hours': 0,
        'Difference': 0,
        'Advance': 0,
        'Skill Based': 'No', // Yes/No
        'Skill Category': '', // Skilled/Semi-Skilled/Unskilled
        'Skill Amount': 0,
        // Allowances (format: "Label1:Amount1,Label2:Amount2")
        'Custom Allowances': 'Transport:2000,Medical:1500',
        // Bonuses (format: "Label1:Amount1,Label2:Amount2") 
        'Custom Bonuses': 'Performance:5000,Attendance:1000',
        // Deductions (format: "Label1:Amount1,Label2:Amount2")
        'Custom Deductions': 'Canteen:500,Uniform:300',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Data');
    XLSX.writeFile(workbook, 'salary_structure_sample.xlsx');
  };

  // Edit individual employee
  const handleIndividualEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditData({
      esicNo: employee.esicNo || '',
      uan: employee.uan || '',
      basic: employee.salary?.basic || 0,
      da: employee.salary?.da || 0,
      totalDays: employee.salary?.totalDays || 30,
      paidDays: employee.salary?.paidDays || 30,
      singleOTHours: employee.salary?.singleOTHours || 0,
      doubleOTHours: employee.salary?.doubleOTHours || 0,
      difference: employee.salary?.difference || 0,
      advance: employee.salary?.advance || 0,
      isSkillBased: employee.salary?.isSkillBased || false,
      skillCategory: employee.salary?.skillCategory || '',
      skillAmount: employee.salary?.skillAmount || 0,
      customAllowances: employee.salary?.customAllowances || [],
      customBonuses: employee.salary?.customBonuses || [],
      customDeductions: employee.salary?.customDeductions || [],
      hraPercentage: employee.salary?.hraPercentage || 5,
      esicEmployeePercentage: employee.salary?.esicEmployeePercentage || 0.75,
      esicEmployerPercentage: employee.salary?.esicEmployerPercentage || 3.25,
      pfEmployeePercentage: employee.salary?.pfEmployeePercentage || 12,
      pfEmployerPercentage: employee.salary?.pfEmployerPercentage || 13,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;

    try {
      setEditLoading(true);
      const calculatedSalary = calculateFullSalary(editData);

      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        esicNo: editData.esicNo,
        uan: editData.uan,
        salary: calculatedSalary,
        updatedAt: new Date(),
      });

      setEmployees(prev => prev.map(emp =>
        emp.id === editingEmployee.id
          ? {
            ...emp,
            esicNo: editData.esicNo,
            uan: editData.uan,
            salary: calculatedSalary,
            updatedAt: new Date()
          }
          : emp
      ));

      setShowEditDialog(false);
      setEditingEmployee(null);
      setAlert({ type: 'success', message: 'Salary structure updated successfully!' });
    } catch (error) {
      console.error('Error updating salary:', error);
      setAlert({ type: 'error', message: 'Failed to update salary structure' });
    } finally {
      setEditLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined): string => {
    return amount ? `₹${amount.toLocaleString()}` : '₹0';
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
      {/* Alert */}
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 1 }}>
          Salary Structures & Calculations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive salary calculation system with automatic formula-based computations
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by Name, Email, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{
            flex: 1,
            minWidth: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
        />

        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={downloadSampleFile}
          sx={{ borderRadius: 2 }}
        >
          Download Sample
        </Button>

        <Button
          variant="contained"
          startIcon={uploadLoading ? <CircularProgress size={20} /> : <Upload />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadLoading}
          sx={{
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#45a049' },
            borderRadius: 2,
          }}
        >
          Upload Excel
        </Button>

        <Button
          variant="contained"
          startIcon={<Calculate />}
          onClick={() => setShowCalculationDialog(true)}
          sx={{
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' },
            borderRadius: 2,
          }}
        >
          Calculation Guide
        </Button>

        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => setShowConfigDialog(true)}
          sx={{
            backgroundColor: '#9c27b0',
            '&:hover': { backgroundColor: '#7b1fa2' },
            borderRadius: 2,
          }}
        >
          Edit Calculations
        </Button>

        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => setShowBulkEditDialog(true)}
          sx={{
            backgroundColor: '#e91e63',
            '&:hover': { backgroundColor: '#c2185b' },
            borderRadius: 2,
          }}
        >
          Bulk Edit All
        </Button>
      </Box>

      {/* Salary Structures Table with Tabs */}
      <Paper sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid #333',
            '& .MuiTab-root': { color: '#ffffff' },
            '& .Mui-selected': { color: '#2196f3' }
          }}
        >
          <Tab label="Employee Info & Basic" />
          <Tab label="Earnings & Overtime" />
          <Tab label="Deductions & Net Pay" />
          <Tab label="Employer Contributions & CTC" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>ESIC No</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>UAN</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Basic Salary</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>D.A.</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Days (Total/Paid)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.employeeId}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.esicNo || '-'}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.uan || '-'}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.basic)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.da)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {employee.salary?.totalDays || 30} / {employee.salary?.paidDays || 30}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        <Tooltip title="Edit Salary Structure">
                          <IconButton
                            size="small"
                            sx={{ color: '#2196f3' }}
                            onClick={() => handleIndividualEdit(employee)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>HRA (5%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Gross Rate PM</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Gross Earning</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>OT Rate/Hour</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>OT Hours (S/D)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>OT Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Total Gross</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.hra)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.grossRatePM)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {formatCurrency(employee.salary?.grossRatePM && employee.salary?.totalDays && employee.salary?.paidDays
                          ? Math.round((employee.salary.grossRatePM / employee.salary.totalDays) * employee.salary.paidDays)
                          : 0)}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        ₹{employee.salary?.otRatePerHour?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>
                        {employee.salary?.singleOTHours || 0} / {employee.salary?.doubleOTHours || 0}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.otAmount)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.totalGrossEarning)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Prof. Tax</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>ESIC (0.75%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>PF Base</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>PF (12%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Total Deduction</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Net Salary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.professionalTax)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.esicEmployee)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.pfBase)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.pfEmployee)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.totalDeduction)}</TableCell>
                      <TableCell sx={{ color: '#4caf50', fontWeight: 600 }}>{formatCurrency(employee.salary?.netSalary)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employer ESIC (3.25%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Employer PF (13%)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>MLWF</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>CTC Per Month</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                      <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.esicEmployer)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.pfEmployer)}</TableCell>
                      <TableCell sx={{ color: '#ffffff' }}>{formatCurrency(employee.salary?.mlwfEmployer)}</TableCell>
                      <TableCell sx={{ color: '#ff9800', fontWeight: 600 }}>{formatCurrency(employee.salary?.ctcPerMonth)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredEmployees.length}
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

      {/* Edit Salary Structure Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span">
            Edit Salary Structure - {editingEmployee?.fullName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Employee Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Employee Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="ESIC No"
                  value={editData.esicNo}
                  onChange={(e) => setEditData(prev => ({ ...prev, esicNo: e.target.value }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="UAN"
                  value={editData.uan}
                  onChange={(e) => setEditData(prev => ({ ...prev, uan: e.target.value }))}
                  fullWidth
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Basic Salary Components */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Basic Salary Components
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="Basic Salary"
                  type="number"
                  value={editData.basic}
                  onChange={(e) => setEditData(prev => ({ ...prev, basic: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="D.A. (Dearness Allowance)"
                  type="number"
                  value={editData.da}
                  onChange={(e) => setEditData(prev => ({ ...prev, da: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Working Days */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Working Days
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="Total Days"
                  type="number"
                  value={editData.totalDays}
                  onChange={(e) => setEditData(prev => ({ ...prev, totalDays: parseFloat(e.target.value) || 30 }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  label="Paid Days"
                  type="number"
                  value={editData.paidDays}
                  onChange={(e) => setEditData(prev => ({ ...prev, paidDays: parseFloat(e.target.value) || 30 }))}
                  fullWidth
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Overtime */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Overtime Hours
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Single OT Hours"
                  type="number"
                  value={editData.singleOTHours}
                  onChange={(e) => setEditData(prev => ({ ...prev, singleOTHours: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Double OT Hours"
                  type="number"
                  value={editData.doubleOTHours}
                  onChange={(e) => setEditData(prev => ({ ...prev, doubleOTHours: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Difference (Adjustment)"
                  type="number"
                  value={editData.difference}
                  onChange={(e) => setEditData(prev => ({ ...prev, difference: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Advance"
                  type="number"
                  value={editData.advance}
                  onChange={(e) => setEditData(prev => ({ ...prev, advance: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                  helperText="Amount to be deducted from salary"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Custom Allowances */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Custom Allowances
            </Typography>
            {editData.customAllowances.map((allowance, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Allowance Name"
                  value={allowance.label}
                  onChange={(e) => {
                    const updated = [...editData.customAllowances];
                    updated[index].label = e.target.value;
                    setEditData(prev => ({ ...prev, customAllowances: updated }));
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Amount (₹)"
                  type="number"
                  value={allowance.amount}
                  onChange={(e) => {
                    const updated = [...editData.customAllowances];
                    updated[index].amount = parseFloat(e.target.value) || 0;
                    setEditData(prev => ({ ...prev, customAllowances: updated }));
                  }}
                  sx={{ width: 150 }}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    setEditData(prev => ({
                      ...prev,
                      customAllowances: prev.customAllowances.filter((_, i) => i !== index)
                    }));
                  }}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={() => {
                setEditData(prev => ({
                  ...prev,
                  customAllowances: [...prev.customAllowances, { label: '', amount: 0 }]
                }));
              }}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              Add Allowance
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Custom Bonuses */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Custom Bonuses
            </Typography>
            {editData.customBonuses.map((bonus, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Bonus Name"
                  value={bonus.label}
                  onChange={(e) => {
                    const updated = [...editData.customBonuses];
                    updated[index].label = e.target.value;
                    setEditData(prev => ({ ...prev, customBonuses: updated }));
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Amount (₹)"
                  type="number"
                  value={bonus.amount}
                  onChange={(e) => {
                    const updated = [...editData.customBonuses];
                    updated[index].amount = parseFloat(e.target.value) || 0;
                    setEditData(prev => ({ ...prev, customBonuses: updated }));
                  }}
                  sx={{ width: 150 }}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    setEditData(prev => ({
                      ...prev,
                      customBonuses: prev.customBonuses.filter((_, i) => i !== index)
                    }));
                  }}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={() => {
                setEditData(prev => ({
                  ...prev,
                  customBonuses: [...prev.customBonuses, { label: '', amount: 0 }]
                }));
              }}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              Add Bonus
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Custom Deductions */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Custom Deductions
            </Typography>
            {editData.customDeductions.map((deduction, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Deduction Name"
                  value={deduction.label}
                  onChange={(e) => {
                    const updated = [...editData.customDeductions];
                    updated[index].label = e.target.value;
                    setEditData(prev => ({ ...prev, customDeductions: updated }));
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Amount (₹)"
                  type="number"
                  value={deduction.amount}
                  onChange={(e) => {
                    const updated = [...editData.customDeductions];
                    updated[index].amount = parseFloat(e.target.value) || 0;
                    setEditData(prev => ({ ...prev, customDeductions: updated }));
                  }}
                  sx={{ width: 150 }}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    setEditData(prev => ({
                      ...prev,
                      customDeductions: prev.customDeductions.filter((_, i) => i !== index)
                    }));
                  }}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={() => {
                setEditData(prev => ({
                  ...prev,
                  customDeductions: [...prev.customDeductions, { label: '', amount: 0 }]
                }));
              }}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              Add Deduction
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Skill-Based Salary */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Skill-Based Salary
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editData.isSkillBased}
                    onChange={(e) => setEditData(prev => ({ ...prev, isSkillBased: e.target.checked }))}
                  />
                }
                label="Enable skill-based salary calculation"
              />

              {editData.isSkillBased && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <FormControl fullWidth>
                      <InputLabel>Skill Category</InputLabel>
                      <Select
                        value={editData.skillCategory}
                        onChange={(e) => {
                          const selectedSkill = skillCategories.find(skill => skill.name === e.target.value);
                          setEditData(prev => ({
                            ...prev,
                            skillCategory: e.target.value,
                            skillAmount: selectedSkill?.amount || 0
                          }));
                        }}
                        label="Skill Category"
                      >
                        {skillCategories.map((skill) => (
                          <MenuItem key={skill.id} value={skill.name}>
                            {skill.name} (₹{skill.amount.toLocaleString()})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <TextField
                      label="Skill Amount (₹)"
                      type="number"
                      value={editData.skillAmount}
                      onChange={(e) => setEditData(prev => ({ ...prev, skillAmount: parseFloat(e.target.value) || 0 }))}
                      fullWidth
                      inputProps={{ min: 0 }}
                      helperText="This amount will replace the basic salary"
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* Calculated Preview */}
            {editData.basic > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Calculated Values Preview
                </Typography>
                <Box sx={{ p: 2, backgroundColor: '#2d2d2d', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2" color="text.secondary">HRA ({editData.hraPercentage}%)</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(calculateHRA(editData.basic, editData.da, editData.hraPercentage))}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2" color="text.secondary">Gross Rate PM</Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(calculateGrossRate(editData.basic, editData.da, calculateHRA(editData.basic, editData.da, editData.hraPercentage)))}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2" color="text.secondary">Net Salary</Typography>
                      <Typography variant="body1" fontWeight={600} color="success.main">
                        {formatCurrency(calculateFullSalary(editData).netSalary)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography variant="body2" color="text.secondary">CTC Per Month</Typography>
                      <Typography variant="body1" fontWeight={600} color="warning.main">
                        {formatCurrency(calculateFullSalary(editData).ctcPerMonth)}
                      </Typography>
                    </Box>
                  </Box>

                  {editData.isSkillBased && (
                    <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                      <Typography variant="body2" color="primary" fontWeight={600}>
                        Skill-based adjustment: {editData.skillCategory} (₹{editData.skillAmount.toLocaleString()})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Basic salary replaced with skill amount: {formatCurrency(editData.skillAmount)} |
                        DA remains: {formatCurrency(editData.da)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={editLoading}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
          >
            {editLoading ? <CircularProgress size={24} /> : 'Save & Calculate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calculation Guide Dialog */}
      <Dialog open={showCalculationDialog} onClose={() => setShowCalculationDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span">
            Salary Calculation Formulas & Structure
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Salary Structure Tree</Typography>

            <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.6, p: 2, backgroundColor: '#2d2d2d', borderRadius: 1 }}>
              <div><strong>Employee Information</strong></div>
              <div>├── Name</div>
              <div>├── ESIC No.</div>
              <div>├── UAN</div>
              <div>└── Days Payable (Total – Paid)</div>
              <br />

              <div><strong>Earnings</strong></div>
              <div>├── Basic Salary → Fixed (e.g., ₹15,225)</div>
              <div>├── D.A. (Dearness Allowance) → Fixed (e.g., ₹775)</div>
              <div>├── HRA → =ROUND((Basic + D.A.) * HRA%, 0)</div>
              <div>├── Gross Rate (PM) → =Basic + D.A. + HRA</div>
              <div>├── Gross Earning → Adjusted as per Paid Days → (Gross Rate ÷ Payable Days) × Paid Days</div>
              <div>├── Overtime (OT)</div>
              <div>│   ├── OT Rate/Hour → (Gross Earning ÷ Paid Days) ÷ 8</div>
              <div>│   └── OT Amount → (Single OT Hours × OT Rate) + (Double OT Hours × OT Rate × 2)</div>
              <div>├── Difference (Adjustment) → Manual/Round-off</div>
              <div>└── Total Gross Earning → Gross Earning + OT Amount + Difference</div>
              <br />

              <div><strong>Skill-Based Adjustments</strong></div>
              <div>├── If skill-based enabled:</div>
              <div>│   ├── Adjusted Basic → Basic × Skill Multiplier</div>
              <div>│   └── Adjusted D.A. → D.A. × Skill Multiplier</div>
              <div>└── Skill Categories: (Changes base salary if mentioned)</div>
              <br />

              <div><strong>Deductions</strong></div>
              <div>├── Professional Tax → Slab based</div>
              <div>│   ├── If Gross &lt; 7,501 → 0</div>
              <div>│   ├── If 7,501 – 10,000 → 175</div>
              <div>│   └── If &gt; 10,000 → 200</div>
              <div>├── ESIC (Employee) → =ROUNDUP(Total Gross × ESIC Employee%, 0)</div>
              <div>├── PF Base → (Basic + D.A.) ÷ Payable Days × Paid Days</div>
              <div>├── PF (Employee) → =ROUND(PF Base × PF Employee%, 0)</div>
              <div>└── Total Deduction → Prof. Tax + ESIC + PF</div>
              <br />

              <div><strong>Net Salary</strong></div>
              <div>└── Pay Slip Net PM → Total Gross Earning – Total Deduction</div>
              <br />

              <div><strong>Employer Contributions</strong></div>
              <div>├── Employer ESIC → =ROUND(Total Gross × ESIC Employer%, 0)</div>
              <div>├── Employer PF → =ROUND(PF Base × PF Employer%, 0)</div>
              <div>└── Employer MLWF → =Employee MLWF × 3 (if applicable)</div>
              <br />

              <div><strong>Cost to Company (CTC)</strong></div>
              <div>└── CTC Per Month → Total Gross + Employer ESIC + Employer PF + Employer MLWF</div>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCalculationDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span">
            Edit Salary Calculation Parameters
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Percentage Configuration */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Calculation Percentages
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="HRA Percentage"
                  type="number"
                  value={editData.hraPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, hraPercentage: parseFloat(e.target.value) || 5 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Default: 5%"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="ESIC Employee %"
                  type="number"
                  value={editData.esicEmployeePercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, esicEmployeePercentage: parseFloat(e.target.value) || 0.75 }))}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 10 }}
                  helperText="Default: 0.75%"
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="ESIC Employer %"
                  type="number"
                  value={editData.esicEmployerPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, esicEmployerPercentage: parseFloat(e.target.value) || 3.25 }))}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 10 }}
                  helperText="Default: 3.25%"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="PF Employee %"
                  type="number"
                  value={editData.pfEmployeePercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, pfEmployeePercentage: parseFloat(e.target.value) || 12 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Default: 12%"
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="PF Employer %"
                  type="number"
                  value={editData.pfEmployerPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, pfEmployerPercentage: parseFloat(e.target.value) || 13 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Default: 13%"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Skill Categories Management */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Skill Categories (Optional)
            </Typography>
            {skillCategories.map((skill, index) => (
              <Box key={skill.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Skill Name"
                  value={skill.name}
                  onChange={(e) => {
                    const updated = [...skillCategories];
                    updated[index].name = e.target.value;
                    setSkillCategories(updated);
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Amount (₹)"
                  type="number"
                  value={skill.amount}
                  onChange={(e) => {
                    const updated = [...skillCategories];
                    updated[index].amount = parseFloat(e.target.value) || 0;
                    setSkillCategories(updated);
                  }}
                  sx={{ width: 150 }}
                  inputProps={{ min: 0 }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    setSkillCategories(prev => prev.filter((_, i) => i !== index));
                  }}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={() => {
                setSkillCategories(prev => [...prev, {
                  id: Date.now().toString(),
                  name: 'New Skill',
                  amount: 20000,
                }]);
              }}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              Add Skill Category
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>Close</Button>
          <Button
            onClick={() => {
              setShowConfigDialog(false);
              setAlert({ type: 'success', message: 'Calculation parameters updated successfully!' });
            }}
            variant="contained"
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditDialog} onClose={() => setShowBulkEditDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span">
            Bulk Edit All Employees ({filteredEmployees.length} employees)
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Changes will be applied to all {filteredEmployees.length} employees. Leave fields empty to keep existing values.
          </Alert>

          <Box sx={{ mt: 2 }}>
            {/* Basic Components */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Basic Salary Components (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Basic Salary"
                  type="number"
                  value={bulkEditData.basic || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, basic: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                  helperText="Leave empty to keep existing values"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="D.A. (Dearness Allowance)"
                  type="number"
                  value={bulkEditData.da || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, da: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                  helperText="Leave empty to keep existing values"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Advance"
                  type="number"
                  value={bulkEditData.advance || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, advance: parseFloat(e.target.value) || 0 }))}
                  fullWidth
                  helperText="Leave empty to keep existing values"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Working Days */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Working Days (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Total Days"
                  type="number"
                  value={bulkEditData.totalDays || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, totalDays: parseFloat(e.target.value) || 30 }))}
                  fullWidth
                  helperText="Leave empty to keep existing values"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="Paid Days"
                  type="number"
                  value={bulkEditData.paidDays || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, paidDays: parseFloat(e.target.value) || 30 }))}
                  fullWidth
                  helperText="Leave empty to keep existing values"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Calculation Percentages */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Calculation Percentages (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="HRA Percentage"
                  type="number"
                  value={bulkEditData.hraPercentage || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, hraPercentage: parseFloat(e.target.value) || 5 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Leave empty to keep existing values"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="ESIC Employee %"
                  type="number"
                  value={bulkEditData.esicEmployeePercentage || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, esicEmployeePercentage: parseFloat(e.target.value) || 0.75 }))}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 10 }}
                  helperText="Leave empty to keep existing values"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  label="PF Employee %"
                  type="number"
                  value={bulkEditData.pfEmployeePercentage || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, pfEmployeePercentage: parseFloat(e.target.value) || 12 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Leave empty to keep existing values"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkEditDialog(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                setEditLoading(true);
                const updates = filteredEmployees.map(async (employee) => {
                  const currentSalary = employee.salary || {};
                  const updatedData = {
                    ...currentSalary,
                    ...(bulkEditData.basic > 0 && { basic: bulkEditData.basic }),
                    ...(bulkEditData.da > 0 && { da: bulkEditData.da }),
                    ...(bulkEditData.advance >= 0 && { advance: bulkEditData.advance }),
                    ...(bulkEditData.totalDays > 0 && { totalDays: bulkEditData.totalDays }),
                    ...(bulkEditData.paidDays > 0 && { paidDays: bulkEditData.paidDays }),
                    ...(bulkEditData.hraPercentage > 0 && { hraPercentage: bulkEditData.hraPercentage }),
                    ...(bulkEditData.esicEmployeePercentage > 0 && { esicEmployeePercentage: bulkEditData.esicEmployeePercentage }),
                    ...(bulkEditData.pfEmployeePercentage > 0 && { pfEmployeePercentage: bulkEditData.pfEmployeePercentage }),
                  };

                  return updateDoc(doc(db, 'employees', employee.id), {
                    salary: updatedData,
                    updatedAt: new Date(),
                  });
                });

                await Promise.all(updates);
                setShowBulkEditDialog(false);
                setBulkEditData({
                  esicNo: '',
                  uan: '',
                  basic: 0,
                  da: 0,
                  totalDays: 30,
                  paidDays: 30,
                  singleOTHours: 0,
                  doubleOTHours: 0,
                  difference: 0,
                  advance: 0,
                  isSkillBased: false,
                  skillCategory: '',
                  skillAmount: 0,
                  customAllowances: [],
                  customBonuses: [],
                  customDeductions: [],
                  hraPercentage: 5,
                  esicEmployeePercentage: 0.75,
                  esicEmployerPercentage: 3.25,
                  pfEmployeePercentage: 12,
                  pfEmployerPercentage: 13,
                });
                loadEmployees();
                setAlert({ type: 'success', message: `Successfully updated ${filteredEmployees.length} employees!` });
              } catch (error) {
                console.error('Error bulk updating employees:', error);
                setAlert({ type: 'error', message: 'Failed to update employees' });
              } finally {
                setEditLoading(false);
              }
            }}
            variant="contained"
            disabled={editLoading}
            sx={{
              backgroundColor: '#e91e63',
              '&:hover': { backgroundColor: '#c2185b' },
            }}
          >
            {editLoading ? <CircularProgress size={24} /> : `Update ${filteredEmployees.length} Employees`}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
} 