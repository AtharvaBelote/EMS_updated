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

  // Custom calculation parameters
  const [customParameters, setCustomParameters] = useState<{
    id: string;
    name: string;
    type: 'addition' | 'deduction';
    calculationType: 'percentage' | 'fixed';
    appliesTo: 'gross' | 'basic' | 'net' | 'ctc';
    formula: string;
    description?: string;
  }[]>([]);

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

    // Calculate global custom parameters
    const calculateCustomParameterValue = (param: any) => {
      try {
        // Create a safe evaluation context with available variables
        const context = {
          basic: adjustedBasic,
          da: adjustedDa,
          hra: hra,
          grossRate: calculateGrossRate(adjustedBasic, adjustedDa, hra),
          totalDays: data.totalDays,
          paidDays: data.paidDays
        };

        // Simple formula evaluation (in production, use a proper formula parser)
        let formula = param.formula || '0';

        // Replace variables in formula
        Object.entries(context).forEach(([key, value]) => {
          const regex = new RegExp(`\\b${key}\\b`, 'g');
          formula = formula.replace(regex, value.toString());
        });

        // Basic math evaluation (be careful with eval in production!)
        try {
          // Only allow basic math operations for security
          if (/^[0-9+\-*/.() ]+$/.test(formula)) {
            return eval(formula) || 0;
          } else {
            // If formula contains variables or complex expressions, return 0 for now
            return 0;
          }
        } catch {
          return 0;
        }
      } catch {
        return 0;
      }
    };

    // Calculate global custom additions and deductions
    let globalCustomAdditions = 0;
    let globalCustomDeductions = 0;

    customParameters.forEach(param => {
      const value = calculateCustomParameterValue(param);
      if (param.type === 'addition') {
        globalCustomAdditions += value;
      } else {
        globalCustomDeductions += value;
      }
    });

    const grossRate = calculateGrossRate(adjustedBasic, adjustedDa, hra) + totalCustomAllowances + globalCustomAdditions;
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

    const totalDeduction = professionalTax + esicEmployee + pfEmployee + totalCustomDeductions + globalCustomDeductions + data.advance;

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
      globalCustomAdditions,
      globalCustomDeductions,
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
          {customParameters.length > 0 && <Tab label="Custom Parameters" />}
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

        {/* Custom Parameters Tab */}
        {customParameters.length > 0 && (
          <TabPanel value={tabValue} index={4}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Name</TableCell>
                    {customParameters.map((param) => (
                      <TableCell key={param.id} sx={{ fontWeight: 600, color: '#ffffff' }}>
                        {param.type === 'addition' ? '➕' : '➖'} {param.name}
                        <Typography variant="caption" sx={{ display: 'block', color: '#b0b0b0' }}>
                          {param.appliesTo === 'basic' ? 'Basic' :
                            param.appliesTo === 'gross' ? 'Gross' :
                              param.appliesTo === 'net' ? 'Net' : 'CTC'}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 600, color: '#ffffff' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((employee) => (
                      <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                        <TableCell sx={{ color: '#ffffff' }}>{employee.fullName}</TableCell>
                        {customParameters.map((param) => {
                          // Calculate the custom parameter value
                          const calculateCustomValue = (param: any, employee: any) => {
                            try {
                              const basic = employee.salary?.basic || 0;
                              const da = employee.salary?.da || 0;
                              const hra = employee.salary?.hra || calculateHRA(basic, da, 5); // Default 5% HRA
                              const grossRate = basic + da + hra;
                              const totalDays = employee.salary?.totalDays || 30;
                              const paidDays = employee.salary?.paidDays || 30;

                              // Create evaluation context
                              const context = {
                                basic,
                                da,
                                hra,
                                grossRate,
                                totalDays,
                                paidDays
                              };

                              let formula = param.formula || '0';

                              // Replace variables in formula
                              Object.entries(context).forEach(([key, value]) => {
                                const regex = new RegExp(`\\b${key}\\b`, 'g');
                                formula = formula.replace(regex, value.toString());
                              });

                              // Basic math evaluation
                              try {
                                if (/^[0-9+\-*/.() ]+$/.test(formula)) {
                                  return eval(formula) || 0;
                                } else {
                                  return 0;
                                }
                              } catch {
                                return 0;
                              }
                            } catch (error) {
                              return 0;
                            }
                          };

                          const value = calculateCustomValue(param, employee);
                          return (
                            <TableCell key={param.id} sx={{ color: param.type === 'addition' ? '#4caf50' : '#f44336' }}>
                              {formatCurrency(value)}
                            </TableCell>
                          );
                        })}
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
        )}
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
          <Typography variant="h5" component="span" sx={{ color: '#2196f3', fontWeight: 600 }}>
            💰 Salary Calculation Guide
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mt: 1 }}>
            Understanding how your salary is calculated step by step
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>

            {/* Basic Components */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center' }}>
                🏗️ Basic Salary Components
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>Basic Salary</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Fixed amount set by company policy</Typography>
                  <Typography variant="caption" sx={{ color: '#2196f3', fontFamily: 'monospace' }}>Example: ₹15,225</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>Dearness Allowance (DA)</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Cost of living adjustment</Typography>
                  <Typography variant="caption" sx={{ color: '#2196f3', fontFamily: 'monospace' }}>Example: ₹775</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>House Rent Allowance (HRA)</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Calculated as percentage of Basic + DA</Typography>
                  <Typography variant="caption" sx={{ color: '#2196f3', fontFamily: 'monospace' }}>Formula: (Basic + DA) × 5%</Typography>
                </Box>
              </Box>
            </Box>

            {/* Earnings Calculation */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #4caf50' }}>
              <Typography variant="h6" sx={{ color: '#4caf50', mb: 2, display: 'flex', alignItems: 'center' }}>
                📈 Earnings Calculation
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 200, color: '#ffffff' }}>Gross Rate (Monthly):</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>Basic + DA + HRA</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 200, color: '#ffffff' }}>Daily Rate:</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>Gross Rate ÷ Total Days</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 200, color: '#ffffff' }}>Gross Earning:</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>Daily Rate × Paid Days</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 200, color: '#ffffff' }}>Overtime Rate/Hour:</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>(Gross Earning ÷ Paid Days) ÷ 8 hours</Typography>
                </Box>
              </Box>
            </Box>

            {/* Deductions */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #ff9800' }}>
              <Typography variant="h6" sx={{ color: '#ff9800', mb: 2, display: 'flex', alignItems: 'center' }}>
                📉 Deductions
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>Professional Tax</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>Based on salary slabs:</Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#ff9800' }}>• Below ₹7,501: ₹0</Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#ff9800' }}>• ₹7,501-₹10,000: ₹175</Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#ff9800' }}>• Above ₹10,000: ₹200</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>ESIC (Employee)</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Employee State Insurance</Typography>
                  <Typography variant="caption" sx={{ color: '#ff9800', fontFamily: 'monospace' }}>Total Gross × 0.75%</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>PF (Employee)</Typography>
                  <Typography variant="body2" sx={{ color: '#b0b0b0' }}>Provident Fund contribution</Typography>
                  <Typography variant="caption" sx={{ color: '#ff9800', fontFamily: 'monospace' }}>PF Base × 12%</Typography>
                </Box>
              </Box>
            </Box>

            {/* Final Calculation */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #2196f3' }}>
              <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center' }}>
                🎯 Final Calculation
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#3d3d3d', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 200, color: '#4caf50' }}>Net Salary:</Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>Total Gross - Total Deductions</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#3d3d3d', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 200, color: '#2196f3' }}>CTC (Monthly):</Typography>
                  <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#2196f3' }}>Total Gross + Employer Contributions</Typography>
                </Box>
              </Box>
            </Box>

            {/* Custom Parameters */}
            {customParameters.length > 0 && (
              <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #e91e63' }}>
                <Typography variant="h6" sx={{ color: '#e91e63', mb: 2, display: 'flex', alignItems: 'center' }}>
                  🧮 Custom Parameters
                </Typography>
                <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                  Additional custom calculations configured for your organization
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                  {customParameters.map((param) => (
                    <Box key={param.id} sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff', mb: 1 }}>
                        {param.type === 'addition' ? '➕' : '➖'} {param.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                        Applied to: {param.appliesTo === 'basic' ? 'Basic Salary' :
                          param.appliesTo === 'gross' ? 'Gross Salary' :
                            param.appliesTo === 'net' ? 'Net Salary' : 'CTC'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#e91e63', fontFamily: 'monospace', display: 'block' }}>
                        Formula: {param.formula || 'Not configured'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ff9800' }}>
                        Type: {param.calculationType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                      </Typography>
                      {param.description && (
                        <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block', mt: 1, fontStyle: 'italic' }}>
                          {param.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Employer Contributions */}
            <Box sx={{ mb: 2, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #9c27b0' }}>
              <Typography variant="h6" sx={{ color: '#9c27b0', mb: 2, display: 'flex', alignItems: 'center' }}>
                🏢 Employer Contributions (Not deducted from salary)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>Employer ESIC</Typography>
                  <Typography variant="caption" sx={{ color: '#9c27b0', fontFamily: 'monospace' }}>Total Gross × 3.25%</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>Employer PF</Typography>
                  <Typography variant="caption" sx={{ color: '#9c27b0', fontFamily: 'monospace' }}>PF Base × 13%</Typography>
                </Box>
              </Box>
            </Box>

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCalculationDialog(false)} variant="contained" sx={{ backgroundColor: '#2196f3' }}>
            Got it!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: '#2196f3', fontWeight: 600 }}>
            ⚙️ Salary Calculation Parameters
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', mt: 1 }}>
            Configure all calculation rules and percentages used in salary computation
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>

            {/* Statutory Deduction Percentages */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center' }}>
                🏛️ Government Statutory Rates
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                These rates are set by government and may change based on policy updates
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                <TextField
                  label="ESIC Employee Rate (%)"
                  type="number"
                  value={editData.esicEmployeePercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, esicEmployeePercentage: parseFloat(e.target.value) || 0.75 }))}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 10 }}
                  helperText="Current: 0.75% (Employee contribution)"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="ESIC Employer Rate (%)"
                  type="number"
                  value={editData.esicEmployerPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, esicEmployerPercentage: parseFloat(e.target.value) || 3.25 }))}
                  fullWidth
                  inputProps={{ step: 0.01, min: 0, max: 10 }}
                  helperText="Current: 3.25% (Employer contribution)"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="PF Employee Rate (%)"
                  type="number"
                  value={editData.pfEmployeePercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, pfEmployeePercentage: parseFloat(e.target.value) || 12 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Current: 12% (Employee PF contribution)"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="PF Employer Rate (%)"
                  type="number"
                  value={editData.pfEmployerPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, pfEmployerPercentage: parseFloat(e.target.value) || 13 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Current: 13% (Employer PF contribution)"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
              </Box>
            </Box>

            {/* Company Policy Rates */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#4caf50', mb: 2, display: 'flex', alignItems: 'center' }}>
                🏢 Company Policy Rates
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                These rates can be adjusted based on company policy and benefits structure
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                <TextField
                  label="HRA Percentage (%)"
                  type="number"
                  value={editData.hraPercentage}
                  onChange={(e) => setEditData(prev => ({ ...prev, hraPercentage: parseFloat(e.target.value) || 5 }))}
                  fullWidth
                  inputProps={{ step: 0.1, min: 0, max: 50 }}
                  helperText="Percentage of (Basic + DA) for HRA"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="Working Hours Per Day"
                  type="number"
                  value={8}
                  onChange={() => { }} // This could be made configurable
                  fullWidth
                  inputProps={{ step: 0.5, min: 6, max: 12 }}
                  helperText="Used for overtime calculations"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="Standard Working Days"
                  type="number"
                  value={30}
                  onChange={() => { }} // This could be made configurable
                  fullWidth
                  inputProps={{ step: 1, min: 26, max: 31 }}
                  helperText="Default days per month"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
              </Box>
            </Box>

            {/* Professional Tax Slabs */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#ff9800', mb: 2, display: 'flex', alignItems: 'center' }}>
                📊 Professional Tax Slabs
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                Professional tax rates based on salary ranges (varies by state)
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1 }}>Slab 1: Below ₹7,501</Typography>
                  <TextField
                    label="Tax Amount (₹)"
                    type="number"
                    defaultValue={0}
                    fullWidth
                    inputProps={{ min: 0 }}
                    sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                  />
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1 }}>Slab 2: ₹7,501 - ₹10,000</Typography>
                  <TextField
                    label="Tax Amount (₹)"
                    type="number"
                    defaultValue={175}
                    fullWidth
                    inputProps={{ min: 0 }}
                    sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                  />
                </Box>
                <Box sx={{ p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 1 }}>Slab 3: Above ₹10,000</Typography>
                  <TextField
                    label="Tax Amount (₹)"
                    type="number"
                    defaultValue={200}
                    fullWidth
                    inputProps={{ min: 0 }}
                    sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Overtime Calculation Rules */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#9c27b0', mb: 2, display: 'flex', alignItems: 'center' }}>
                ⏰ Overtime Calculation Rules
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                Configure how overtime is calculated and compensated
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                <TextField
                  label="Single OT Multiplier"
                  type="number"
                  defaultValue={1}
                  fullWidth
                  inputProps={{ step: 0.1, min: 1, max: 3 }}
                  helperText="Multiplier for single overtime hours"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="Double OT Multiplier"
                  type="number"
                  defaultValue={2}
                  fullWidth
                  inputProps={{ step: 0.1, min: 1.5, max: 4 }}
                  helperText="Multiplier for double overtime hours"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
                <TextField
                  label="Holiday OT Multiplier"
                  type="number"
                  defaultValue={2.5}
                  fullWidth
                  inputProps={{ step: 0.1, min: 2, max: 5 }}
                  helperText="Multiplier for holiday overtime"
                  sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                />
              </Box>
            </Box>

            {/* Skill Categories Management */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center' }}>
                🎯 Skill Categories & Adjustments
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                Define skill-based salary adjustments for different employee categories
              </Typography>

              {skillCategories.map((skill, index) => (
                <Box key={skill.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <TextField
                    label="Skill Category Name"
                    value={skill.name}
                    onChange={(e) => {
                      const updated = [...skillCategories];
                      updated[index].name = e.target.value;
                      setSkillCategories(updated);
                    }}
                    sx={{ flex: 1, '& .MuiInputBase-input': { color: '#ffffff' } }}
                  />
                  <TextField
                    label="Adjustment Amount (₹)"
                    type="number"
                    value={skill.amount}
                    onChange={(e) => {
                      const updated = [...skillCategories];
                      updated[index].amount = parseFloat(e.target.value) || 0;
                      setSkillCategories(updated);
                    }}
                    sx={{ width: 200, '& .MuiInputBase-input': { color: '#ffffff' } }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Description"
                    value={skill.description || ''}
                    onChange={(e) => {
                      const updated = [...skillCategories];
                      updated[index].description = e.target.value;
                      setSkillCategories(updated);
                    }}
                    sx={{ flex: 1, '& .MuiInputBase-input': { color: '#ffffff' } }}
                    placeholder="Optional description"
                  />
                  <Button
                    variant="outlined"
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
                variant="outlined"
                onClick={() => {
                  setSkillCategories(prev => [...prev, {
                    id: Date.now().toString(),
                    name: 'New Skill Category',
                    amount: 0,
                    description: ''
                  }]);
                }}
                sx={{ color: '#2196f3', borderColor: '#2196f3', mt: 2 }}
              >
                + Add Skill Category
              </Button>
            </Box>

            {/* Custom Calculation Parameters */}
            <Box sx={{ mb: 4, p: 3, backgroundColor: '#2d2d2d', borderRadius: 2, border: '1px solid #444' }}>
              <Typography variant="h6" sx={{ color: '#e91e63', mb: 2, display: 'flex', alignItems: 'center' }}>
                🧮 Custom Calculation Parameters
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 3 }}>
                Add custom additions or deductions with formulas that apply to all employees
              </Typography>

              {customParameters.map((param, index) => (
                <Box key={param.id} sx={{ mb: 3, p: 2, backgroundColor: '#3d3d3d', borderRadius: 1, border: '1px solid #555' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 2, mb: 2, alignItems: 'center' }}>
                    <TextField
                      label="Parameter Name"
                      value={param.name || ''}
                      onChange={(e) => {
                        const updated = [...customParameters];
                        updated[index].name = e.target.value;
                        setCustomParameters(updated);
                      }}
                      placeholder="e.g., Transport Allowance, Medical Deduction"
                      sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                    />

                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#b0b0b0' }}>Type</InputLabel>
                      <Select
                        value={param.type || 'addition'}
                        label="Type"
                        onChange={(e) => {
                          const updated = [...customParameters];
                          updated[index].type = e.target.value as 'addition' | 'deduction';
                          setCustomParameters(updated);
                        }}
                        sx={{ '& .MuiSelect-select': { color: '#ffffff' } }}
                      >
                        <MenuItem value="addition">➕ Addition</MenuItem>
                        <MenuItem value="deduction">➖ Deduction</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#b0b0b0' }}>Applies To</InputLabel>
                      <Select
                        value={param.appliesTo || 'gross'}
                        label="Applies To"
                        onChange={(e) => {
                          const updated = [...customParameters];
                          updated[index].appliesTo = e.target.value as 'gross' | 'basic' | 'net' | 'ctc';
                          setCustomParameters(updated);
                        }}
                        sx={{ '& .MuiSelect-select': { color: '#ffffff' } }}
                      >
                        <MenuItem value="basic">🏗️ Basic Salary</MenuItem>
                        <MenuItem value="gross">� Gross Saolary</MenuItem>
                        <MenuItem value="net">💰 Net Salary</MenuItem>
                        <MenuItem value="ctc">🎯 CTC</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#b0b0b0' }}>Calculation</InputLabel>
                      <Select
                        value={param.calculationType || 'fixed'}
                        label="Calculation"
                        onChange={(e) => {
                          const updated = [...customParameters];
                          updated[index].calculationType = e.target.value as 'percentage' | 'fixed';
                          setCustomParameters(updated);
                        }}
                        sx={{ '& .MuiSelect-select': { color: '#ffffff' } }}
                      >
                        <MenuItem value="percentage">📊 Percentage</MenuItem>
                        <MenuItem value="fixed">💰 Fixed Amount</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setCustomParameters(prev => prev.filter((_, i) => i !== index));
                      }}
                      sx={{ minWidth: 'auto', height: 56 }}
                    >
                      🗑️
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                        Formula {param.calculationType === 'percentage' ? '(%)' : '(₹)'}
                      </Typography>
                      <TextField
                        value={param.formula || ''}
                        onChange={(e) => {
                          const updated = [...customParameters];
                          updated[index].formula = e.target.value;
                          setCustomParameters(updated);
                        }}
                        placeholder={
                          (param.calculationType || 'fixed') === 'percentage'
                            ? "e.g., basic * 0.1 or (basic + da) * 0.05"
                            : "e.g., 2000 or basic * 0.1 + 500"
                        }
                        multiline
                        rows={2}
                        fullWidth
                        sx={{
                          '& .MuiInputBase-input': { color: '#ffffff', fontFamily: 'monospace' },
                          '& .MuiInputBase-root': { backgroundColor: '#1a1a1a' }
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#ff9800', display: 'block', mt: 1 }}>
                        Available variables: basic, da, hra, grossRate, totalDays, paidDays
                      </Typography>
                    </Box>

                    <TextField
                      label="Description (Optional)"
                      value={param.description || ''}
                      onChange={(e) => {
                        const updated = [...customParameters];
                        updated[index].description = e.target.value;
                        setCustomParameters(updated);
                      }}
                      placeholder="Brief description of this parameter"
                      multiline
                      rows={2}
                      sx={{ '& .MuiInputBase-input': { color: '#ffffff' } }}
                    />
                  </Box>

                  {/* Formula Preview */}
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1a', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      Preview: {(param.type || 'addition') === 'addition' ? '➕' : '➖'} {param.name || 'New Parameter'} = {param.formula || 'Enter formula'}
                      {(param.calculationType || 'fixed') === 'percentage' && param.formula && !param.formula.includes('%') && ' (as percentage)'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2196f3', display: 'block', mt: 0.5 }}>
                      Applied to: {(param.appliesTo || 'gross') === 'basic' ? '🏗️ Basic Salary' :
                        (param.appliesTo || 'gross') === 'gross' ? '📈 Gross Salary' :
                          (param.appliesTo || 'gross') === 'net' ? '💰 Net Salary' : '🎯 CTC'}
                    </Typography>
                  </Box>
                </Box>
              ))}

              <Button
                variant="outlined"
                onClick={() => {
                  setCustomParameters(prev => [...prev, {
                    id: Date.now().toString(),
                    name: '',
                    type: 'addition',
                    calculationType: 'fixed',
                    appliesTo: 'gross',
                    formula: '',
                    description: ''
                  }]);
                }}
                sx={{
                  color: '#e91e63',
                  borderColor: '#e91e63',
                  mt: 2,
                  '&:hover': { borderColor: '#c2185b', backgroundColor: 'rgba(233, 30, 99, 0.1)' }
                }}
              >
                ➕ Add More Parameter
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  // Add a test parameter to verify functionality
                  setCustomParameters(prev => [...prev, {
                    id: Date.now().toString(),
                    name: 'Transport Allowance',
                    type: 'addition',
                    calculationType: 'fixed',
                    appliesTo: 'gross',
                    formula: '2000',
                    description: 'Fixed transport allowance for all employees'
                  }]);
                }}
                sx={{
                  color: '#4caf50',
                  borderColor: '#4caf50',
                  ml: 2,
                  mt: 2,
                  '&:hover': { borderColor: '#388e3c', backgroundColor: 'rgba(76, 175, 80, 0.1)' }
                }}
              >
                🧪 Add Test Parameter
              </Button>

              {/* Formula Helper */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#1a1a1a', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#2196f3', mb: 1 }}>
                  💡 Formula Examples:
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                  • Fixed Transport: <code style={{ color: '#4caf50' }}>2000</code> (₹2000 for everyone)
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                  • Medical Allowance: <code style={{ color: '#4caf50' }}>basic * 0.05</code> (5% of basic salary)
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                  • Performance Bonus: <code style={{ color: '#4caf50' }}>(basic + da) * 0.1</code> (10% of basic + DA)
                </Typography>
                <Typography variant="caption" sx={{ color: '#b0b0b0', display: 'block' }}>
                  • Attendance Deduction: <code style={{ color: '#f44336' }}>(totalDays - paidDays) * 500</code> (₹500 per absent day)
                </Typography>
              </Box>
            </Box>

            {/* Configuration Notes */}
            <Box sx={{ p: 3, backgroundColor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                📝 Configuration Notes
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                • Changes to statutory rates should be made only when government policies change
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                • Professional tax rates vary by state - ensure compliance with local regulations
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                • Company policy rates can be adjusted based on organizational benefits structure
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                • Custom parameters will be applied to all employees automatically
              </Typography>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                • All changes will apply to future salary calculations and can be applied retroactively if needed
              </Typography>
            </Box>

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)} sx={{ color: '#b0b0b0' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Here you would save the configuration to Firebase or your backend
              // For now, we'll just show a success message
              console.log('Saving configuration:', {
                editData,
                skillCategories,
                customParameters
              });

              setShowConfigDialog(false);
              setAlert({
                type: 'success',
                message: `Configuration saved! Updated ${customParameters.length} custom parameters, ${skillCategories.length} skill categories, and all calculation rates.`
              });
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