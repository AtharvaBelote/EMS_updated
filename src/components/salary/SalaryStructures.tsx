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
} from '@mui/material';
import {
  Edit,
  Search,
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/types';

interface SalaryStructure {
  base: string;
  hra: string;
  ta: string;
  da: string;
  bonuses: { [key: string]: string };
  deductions: { [key: string]: string };
  customDeductions: { [key: string]: string };
  taxRegime: 'old' | 'new';
}

interface BulkEditData {
  base: string;
  hra: string;
  ta: string;
  da: string;
  bonuses: { label: string; amount: string }[];
  deductions: { label: string; amount: string }[];
  customDeductions: { label: string; amount: string }[];
  taxRegime: 'old' | 'new';
}

export default function SalaryStructures() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showIndividualEditDialog, setShowIndividualEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [individualEditData, setIndividualEditData] = useState<BulkEditData>({
    base: '',
    hra: '',
    ta: '',
    da: '',
    bonuses: [],
    deductions: [],
    customDeductions: [],
    taxRegime: 'old',
  });
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({
    base: '',
    hra: '',
    ta: '',
    da: '',
    bonuses: [],
    deductions: [],
    customDeductions: [],
    taxRegime: 'old',
  });
  const [bulkEditLoading, setBulkEditLoading] = useState(false);
  const [individualEditLoading, setIndividualEditLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const employeesQuery = query(collection(db, 'employees'));
      const querySnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSalaryValue = (employee: Employee, field: string) => {
    if (field === 'base') {
      return employee.salary?.base || '';
    }
    if (field === 'hra') {
      return employee.salary?.hra || '';
    }
    if (field === 'ta') {
      return employee.salary?.ta || '';
    }
    if (field === 'da') {
      return employee.salary?.da || '';
    }
    if (field === 'bonuses') {
      const bonuses = employee.salary?.bonuses;
      return bonuses ? Object.entries(bonuses).map(([key, value]) => `${key}: ${value}`).join(', ') : '';
    }
    if (field === 'deductions') {
      const deductions = employee.salary?.deductions;
      return deductions ? Object.entries(deductions).map(([key, value]) => `${key}: ${value}`).join(', ') : '';
    }
    return '';
  };

  const handleBulkEdit = async () => {
    try {
      setBulkEditLoading(true);
      
      const updates = filteredEmployees.map(employee => {
        const salaryUpdate: any = {
          updatedAt: new Date()
        };

        // Update basic salary components
        if (bulkEditData.base) salaryUpdate['salary.base'] = bulkEditData.base;
        if (bulkEditData.hra) salaryUpdate['salary.hra'] = bulkEditData.hra;
        if (bulkEditData.ta) salaryUpdate['salary.ta'] = bulkEditData.ta;
        if (bulkEditData.da) salaryUpdate['salary.da'] = bulkEditData.da;

        // Update bonuses
        if (bulkEditData.bonuses.length > 0) {
          const bonuses: { [key: string]: string } = {};
          bulkEditData.bonuses.forEach(bonus => {
            if (bonus.label && bonus.amount) {
              bonuses[bonus.label] = bonus.amount;
            }
          });
          salaryUpdate['salary.bonuses'] = bonuses;
        }

        // Update deductions
        if (bulkEditData.deductions.length > 0) {
          const deductions: { [key: string]: string } = {};
          bulkEditData.deductions.forEach(deduction => {
            if (deduction.label && deduction.amount) {
              deductions[deduction.label] = deduction.amount;
            }
          });
          salaryUpdate['salary.deductions'] = deductions;
        }

        // Update custom deductions
        if (bulkEditData.customDeductions.length > 0) {
          const customDeductions: { [key: string]: string } = {};
          bulkEditData.customDeductions.forEach(deduction => {
            if (deduction.label && deduction.amount) {
              customDeductions[deduction.label] = deduction.amount;
            }
          });
          salaryUpdate['salary.customDeductions'] = customDeductions;
        }

        // Update tax regime
        if (bulkEditData.taxRegime) {
          salaryUpdate['salary.taxRegime'] = bulkEditData.taxRegime;
        }

        return updateDoc(doc(db, 'employees', employee.id), salaryUpdate);
      });

      await Promise.all(updates);
      setShowBulkEditDialog(false);
      setBulkEditData({
        base: '',
        hra: '',
        ta: '',
        da: '',
        bonuses: [],
        deductions: [],
        customDeductions: [],
        taxRegime: 'old',
      });
      loadEmployees();
    } catch (error) {
      console.error('Error updating salary structures:', error);
    } finally {
      setBulkEditLoading(false);
    }
  };

  const addBonus = () => {
    setBulkEditData(prev => ({
      ...prev,
      bonuses: [...prev.bonuses, { label: '', amount: '' }]
    }));
  };

  const removeBonus = (index: number) => {
    setBulkEditData(prev => ({
      ...prev,
      bonuses: prev.bonuses.filter((_, i) => i !== index)
    }));
  };

  const updateBonus = (index: number, field: 'label' | 'amount', value: string) => {
    setBulkEditData(prev => ({
      ...prev,
      bonuses: prev.bonuses.map((bonus, i) => 
        i === index ? { ...bonus, [field]: value } : bonus
      )
    }));
  };

  const addDeduction = () => {
    setBulkEditData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { label: '', amount: '' }]
    }));
  };

  const removeDeduction = (index: number) => {
    setBulkEditData(prev => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index)
    }));
  };

  const updateDeduction = (index: number, field: 'label' | 'amount', value: string) => {
    setBulkEditData(prev => ({
      ...prev,
      deductions: prev.deductions.map((deduction, i) => 
        i === index ? { ...deduction, [field]: value } : deduction
      )
    }));
  };

  const addCustomDeduction = () => {
    setBulkEditData(prev => ({
      ...prev,
      customDeductions: [...prev.customDeductions, { label: '', amount: '' }]
    }));
  };

  const removeCustomDeduction = (index: number) => {
    setBulkEditData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.filter((_, i) => i !== index)
    }));
  };

  const updateCustomDeduction = (index: number, field: 'label' | 'amount', value: string) => {
    setBulkEditData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleIndividualEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    // Pre-fill the form with current salary data
    const currentSalary = employee.salary || {};
    setIndividualEditData({
      base: currentSalary.base || '',
      hra: currentSalary.hra || '',
      ta: currentSalary.ta || '',
      da: currentSalary.da || '',
      bonuses: currentSalary.bonuses ? Object.entries(currentSalary.bonuses).map(([label, amount]) => ({
        label,
        amount: amount?.toString() || ''
      })) : [],
      deductions: currentSalary.deductions ? Object.entries(currentSalary.deductions).map(([label, amount]) => ({
        label,
        amount: amount?.toString() || ''
      })) : [],
      customDeductions: currentSalary.customDeductions ? Object.entries(currentSalary.customDeductions).map(([label, amount]) => ({
        label,
        amount: amount?.toString() || ''
      })) : [],
      taxRegime: currentSalary.taxRegime || 'old',
    });
    setShowIndividualEditDialog(true);
  };

  const handleIndividualEditSave = async () => {
    if (!editingEmployee) return;

    try {
      setIndividualEditLoading(true);
      
      // Convert arrays back to objects for Firestore
      const bonusesObj: { [key: string]: string } = {};
      individualEditData.bonuses.forEach(bonus => {
        if (bonus.label && bonus.amount) {
          bonusesObj[bonus.label] = bonus.amount;
        }
      });

      const deductionsObj: { [key: string]: string } = {};
      individualEditData.deductions.forEach(deduction => {
        if (deduction.label && deduction.amount) {
          deductionsObj[deduction.label] = deduction.amount;
        }
      });

      const customDeductionsObj: { [key: string]: string } = {};
      individualEditData.customDeductions.forEach(deduction => {
        if (deduction.label && deduction.amount) {
          customDeductionsObj[deduction.label] = deduction.amount;
        }
      });

      const updatedSalary = {
        base: individualEditData.base,
        hra: individualEditData.hra,
        ta: individualEditData.ta,
        da: individualEditData.da,
        bonuses: bonusesObj,
        deductions: deductionsObj,
        customDeductions: customDeductionsObj,
        taxRegime: individualEditData.taxRegime,
      };

      await updateDoc(doc(db, 'employees', editingEmployee.id), {
        salary: updatedSalary,
        updatedAt: new Date(),
      });

      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, salary: updatedSalary, updatedAt: new Date() }
          : emp
      ));

      setShowIndividualEditDialog(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee salary:', error);
    } finally {
      setIndividualEditLoading(false);
    }
  };

  const addIndividualBonus = () => {
    setIndividualEditData(prev => ({
      ...prev,
      bonuses: [...prev.bonuses, { label: '', amount: '' }]
    }));
  };

  const removeIndividualBonus = (index: number) => {
    setIndividualEditData(prev => ({
      ...prev,
      bonuses: prev.bonuses.filter((_, i) => i !== index)
    }));
  };

  const updateIndividualBonus = (index: number, field: 'label' | 'amount', value: string) => {
    setIndividualEditData(prev => ({
      ...prev,
      bonuses: prev.bonuses.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addIndividualDeduction = () => {
    setIndividualEditData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { label: '', amount: '' }]
    }));
  };

  const removeIndividualDeduction = (index: number) => {
    setIndividualEditData(prev => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index)
    }));
  };

  const updateIndividualDeduction = (index: number, field: 'label' | 'amount', value: string) => {
    setIndividualEditData(prev => ({
      ...prev,
      deductions: prev.deductions.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addIndividualCustomDeduction = () => {
    setIndividualEditData(prev => ({
      ...prev,
      customDeductions: [...prev.customDeductions, { label: '', amount: '' }]
    }));
  };

  const removeIndividualCustomDeduction = (index: number) => {
    setIndividualEditData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.filter((_, i) => i !== index)
    }));
  };

  const updateIndividualCustomDeduction = (index: number, field: 'label' | 'amount', value: string) => {
    setIndividualEditData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
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
          Salary Structures
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and edit salary components for each employee
        </Typography>
      </Box>

      {/* Search and Bulk Edit Button */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by Name, Email, or ID"
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
          startIcon={<Edit />}
          onClick={() => setShowBulkEditDialog(true)}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          BULK EDIT ALL
        </Button>
      </Box>

      {/* Salary Structures Table */}
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Name
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Employee ID
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Email
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Base
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  HRA
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  TA
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  DA
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Bonuses
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Deductions
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((employee) => (
                  <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {employee.fullName}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {employee.employeeId}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {employee.email}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'base')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'hra')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'ta')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'da')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'bonuses')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      {getSalaryValue(employee, 'deductions')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                      <Tooltip title="Edit">
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
      </Box>

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

      {/* Bulk Edit Salary Structure Dialog */}
      <Dialog open={showBulkEditDialog} onClose={() => setShowBulkEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: '#ffffff' }}>
            Bulk Edit Salary Structure
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Core Salary Components */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Core Salary Components
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <TextField
                label="Base Salary"
                value={bulkEditData.base}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, base: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="HRA"
                type="number"
                value={bulkEditData.hra}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, hra: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="TA"
                value={bulkEditData.ta}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, ta: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="DA"
                value={bulkEditData.da}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, da: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>

            {/* Bonuses Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Bonuses
            </Typography>
            {bulkEditData.bonuses.map((bonus, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={bonus.label}
                  onChange={(e) => updateBonus(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={bonus.amount}
                  onChange={(e) => updateBonus(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeBonus(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addBonus}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>

            {/* Deductions Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Deductions
            </Typography>
            {bulkEditData.deductions.map((deduction, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={deduction.label}
                  onChange={(e) => updateDeduction(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeDeduction(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addDeduction}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>

            {/* Tax Regime */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Tax Regime</InputLabel>
                <Select
                  value={bulkEditData.taxRegime}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, taxRegime: e.target.value as 'old' | 'new' }))}
                  label="Tax Regime"
                >
                  <MenuItem value="old">Old</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Custom Deductions Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Custom Deductions
            </Typography>
            {bulkEditData.customDeductions.map((deduction, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={deduction.label}
                  onChange={(e) => updateCustomDeduction(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateCustomDeduction(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeCustomDeduction(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addCustomDeduction}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBulkEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkEdit}
            variant="contained"
            disabled={bulkEditLoading}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
          >
            {bulkEditLoading ? <CircularProgress size={24} /> : 'APPLY TO ALL'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Edit Salary Structure Dialog */}
      <Dialog open={showIndividualEditDialog} onClose={() => setShowIndividualEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: '#ffffff' }}>
            Edit Salary Structure - {editingEmployee?.fullName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Core Salary Components */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Core Salary Components
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <TextField
                label="Base Salary"
                value={individualEditData.base}
                onChange={(e) => setIndividualEditData(prev => ({ ...prev, base: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="HRA"
                type="number"
                value={individualEditData.hra}
                onChange={(e) => setIndividualEditData(prev => ({ ...prev, hra: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="TA"
                value={individualEditData.ta}
                onChange={(e) => setIndividualEditData(prev => ({ ...prev, ta: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="DA"
                value={individualEditData.da}
                onChange={(e) => setIndividualEditData(prev => ({ ...prev, da: e.target.value }))}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>

            {/* Bonuses Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Bonuses
            </Typography>
            {individualEditData.bonuses.map((bonus, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={bonus.label}
                  onChange={(e) => updateIndividualBonus(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={bonus.amount}
                  onChange={(e) => updateIndividualBonus(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeIndividualBonus(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addIndividualBonus}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>

            {/* Deductions Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Deductions
            </Typography>
            {individualEditData.deductions.map((deduction, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={deduction.label}
                  onChange={(e) => updateIndividualDeduction(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateIndividualDeduction(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeIndividualDeduction(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addIndividualDeduction}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>

            {/* Tax Regime */}
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Tax Regime</InputLabel>
                <Select
                  value={individualEditData.taxRegime}
                  onChange={(e) => setIndividualEditData(prev => ({ ...prev, taxRegime: e.target.value as 'old' | 'new' }))}
                  label="Tax Regime"
                >
                  <MenuItem value="old">Old</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Custom Deductions Section */}
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', mb: 2 }}>
              Custom Deductions
            </Typography>
            {individualEditData.customDeductions.map((deduction, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  value={deduction.label}
                  onChange={(e) => updateIndividualCustomDeduction(index, 'label', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateIndividualCustomDeduction(index, 'amount', e.target.value)}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeIndividualCustomDeduction(index)}
                  sx={{ minWidth: 'auto' }}
                >
                  Remove
                </Button>
              </Box>
            ))}
            <Button
              variant="text"
              onClick={addIndividualCustomDeduction}
              sx={{ color: '#2196f3', mb: 3 }}
            >
              ADD
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIndividualEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleIndividualEditSave}
            variant="contained"
            disabled={individualEditLoading}
            sx={{
              backgroundColor: '#2196f3',
              '&:hover': { backgroundColor: '#1976d2' },
            }}
          >
            {individualEditLoading ? <CircularProgress size={24} /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 