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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Download,
  Visibility,
  Edit,
  Delete,
  Search,
  FileUpload,
  FileDownload,
  AddBox,
} from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, CustomField, TableColumn } from '@/types';
import EmployeeForm from '@/components/employees/EmployeeForm';
import * as XLSX from 'xlsx';

const defaultColumns: TableColumn[] = [
  { id: '1', field: 'fullName', headerName: 'Full Name', width: 220, sortable: true, filterable: true, visible: true, order: 1 },
  { id: '2', field: 'employeeId', headerName: 'Employee Id', width: 180, sortable: true, filterable: true, visible: true, order: 2 },
  { id: '3', field: 'email', headerName: 'Email', width: 250, sortable: true, filterable: true, visible: true, order: 3 },
  { id: '4', field: 'mobile', headerName: 'Mobile', width: 150, sortable: true, filterable: true, visible: true, order: 4 },
  { id: '5', field: 'salary.base', headerName: 'Salary', width: 120, sortable: true, filterable: true, visible: true, order: 5 },
];

export default function EmployeeTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [columns, setColumns] = useState<TableColumn[]>(defaultColumns);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', type: 'text' as const, defaultValue: '' });
  const [showEditColumnDialog, setShowEditColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string>('');
  const [columnValues, setColumnValues] = useState<{ [key: string]: string }>({});
  const [editColumnLoading, setEditColumnLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadCustomFields();
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
      
      // Generate auto-detected columns from employee data
      generateAutoDetectedColumns(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAutoDetectedColumns = (employeesData: Employee[]) => {
    // Collect all unique field names from employee data
    const allFields = new Set<string>();
    employeesData.forEach(employee => {
      Object.keys(employee).forEach(key => {
        // Exclude main columns and special fields
        if (!['id', 'fullName', 'employeeId', 'email', 'mobile', 'salary'].includes(key)) {
          allFields.add(key);
        }
      });
    });

    // Create auto-detected columns
    const autoDetectedColumns = Array.from(allFields).map((field, index) => ({
      id: `auto-${field}`,
      field: field,
      headerName: field,
      width: 150,
      sortable: true,
      filterable: true,
      visible: true,
      order: defaultColumns.length + index + 1,
      isAutoDetected: true,
    }));

    // Add actions column at the end
    const actionsColumn: TableColumn = {
      id: 'actions',
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      visible: true,
      order: defaultColumns.length + autoDetectedColumns.length + 1,
    };

    setColumns([...defaultColumns, ...autoDetectedColumns, actionsColumn]);
  };

  const loadCustomFields = async () => {
    try {
      const customFieldsQuery = query(collection(db, 'customFields'), orderBy('order'));
      const querySnapshot = await getDocs(customFieldsQuery);
      const fields: CustomField[] = [];
      querySnapshot.forEach((doc) => {
        fields.push({ id: doc.id, ...doc.data() } as CustomField);
      });
      setCustomFields(fields);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        setEmployees(employees.filter(emp => emp.id !== employeeId));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleAddColumn = async () => {
    try {
      const newCustomField: CustomField = {
        id: Date.now().toString(),
        name: newColumn.name,
        type: newColumn.type,
        required: false,
        order: customFields.length + 1,
        createdAt: new Date(),
        defaultValue: newColumn.defaultValue || undefined,
      };

      // Add to custom fields
      setCustomFields([...customFields, newCustomField]);

      // Add to columns (before actions column)
      const currentColumns = [...columns];
      const actionsColumn = currentColumns.pop(); // Remove actions column temporarily
      
      const newColumnConfig: TableColumn = {
        id: `custom-${newCustomField.id}`,
        field: newColumn.name,
        headerName: newColumn.name,
        width: 150,
        sortable: true,
        filterable: true,
        visible: true,
        order: currentColumns.length + 1,
        isCustom: true,
      };

      setColumns([...currentColumns, newColumnConfig, actionsColumn!]);
      setShowAddColumnDialog(false);
      setNewColumn({ name: '', type: 'text', defaultValue: '' });
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFieldValue = (employee: Employee, field: string) => {
    if (field === 'salary.base') {
      return employee.salary?.base || '';
    }
    if (field === 'actions') {
      return null;
    }
    
    // Handle nested object properties (e.g., salary.bonuses.performance)
    if (field.includes('.')) {
      const keys = field.split('.');
      let value = employee;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return '';
        }
      }
      return value || '';
    }
    
    // Handle Firestore timestamp objects
    const value = employee[field];
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      // Convert Firestore timestamp to readable date
      const date = new Date(value.seconds * 1000);
      return date.toLocaleDateString();
    }
    
    return value || '';
  };

  const handleExportCSV = () => {
    const headers = columns.filter(col => col.visible && col.field !== 'actions').map(col => col.headerName);
    const csvData = [
      headers.join(','),
      ...filteredEmployees.map(emp => 
        columns
          .filter(col => col.visible && col.field !== 'actions')
          .map(col => getFieldValue(emp, col.field))
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    // Gather all unique fields from employees
    const allFields = new Set<string>();
    employees.forEach(emp => Object.keys(emp).forEach(key => allFields.add(key)));
    const fields = Array.from(allFields);
    // Prepare data for XLSX
    const data = employees.map(emp => {
      const row: Record<string, any> = {};
      fields.forEach(field => {
        row[field] = emp[field] !== undefined ? emp[field] : '';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employees.xlsx');
  };

  const handleUploadXLSX = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        for (const row of rows) {
          // Require fullName, employeeId, email, mobile
          if (!row.fullName || !row.employeeId || !row.email || !row.mobile) continue;
          // Add to Firebase
          await addDoc(collection(db, 'employees'), {
            ...row,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        // Reload employees after upload
        loadEmployees();
      };
      reader.readAsBinaryString(file);
    };
    input.click();
  };

  const handleDownloadSample = () => {
    const sampleData = [
      ['Full Name', 'Employee Id', 'Email', 'Mobile', 'Salary'],
    ];

    const csvData = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openEditColumnDialog = (columnField: string) => {
    setEditingColumn(columnField);
    const values: { [key: string]: string } = {};
    employees.forEach(emp => {
      values[emp.id] = getFieldValue(emp, columnField) || '';
    });
    setColumnValues(values);
    setShowEditColumnDialog(true);
  };

  const handleEditColumn = async () => {
    try {
      setEditColumnLoading(true);
      const updates = Object.entries(columnValues).map(([employeeId, value]) => 
        updateDoc(doc(db, 'employees', employeeId), {
          [editingColumn]: value,
          updatedAt: new Date()
        })
      );
      await Promise.all(updates);
      setShowEditColumnDialog(false);
      setEditingColumn('');
      setColumnValues({});
      loadEmployees(); // Reload to show updated data
    } catch (error) {
      console.error('Error updating column:', error);
    } finally {
      setEditColumnLoading(false);
    }
  };

  const updateColumnValues = (employeeId: string, value: string) => {
    setColumnValues(prev => ({
      ...prev,
      [employeeId]: value
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
          Employees
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add, view, and manage employees
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowForm(true)}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          ADD EMPLOYEE
        </Button>
        
        <Button
          variant="contained"
          startIcon={<FileUpload />}
          onClick={handleUploadXLSX}
          sx={{
            backgroundColor: '#9c27b0',
            '&:hover': { backgroundColor: '#7b1fa2' },
          }}
        >
          UPLOAD XLSX
        </Button>
        
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleDownloadSample}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          DOWNLOAD SAMPLE XLSX
        </Button>
        
        <Button
          variant="contained"
          startIcon={<FileDownload />}
          onClick={handleExportCSV}
          sx={{
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#388e3c' },
          }}
        >
          EXPORT CSV
        </Button>
        
        <Button
          variant="contained"
          startIcon={<FileDownload />}
          onClick={handleExportXLSX}
          sx={{
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#388e3c' },
          }}
        >
          EXPORT XLSX
        </Button>
        
        <Button
          variant="contained"
          startIcon={<AddBox />}
          onClick={() => setShowAddColumnDialog(true)}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          ADD COLUMN
        </Button>
        
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => {
            // Show a dropdown or dialog to select which column to edit
            const columnField = prompt('Enter column field name to edit (e.g., fullName, email, Bhadava):');
            if (columnField) {
              openEditColumnDialog(columnField);
            }
          }}
          sx={{
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' },
          }}
        >
          EDIT COLUMN
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by Name, Email, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Employee Table */}
      <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                {columns
                  .filter(col => col.visible)
                  .map((column) => (
                    <TableCell
                      key={column.id}
                      sx={{
                        fontWeight: 600,
                        color: '#ffffff',
                        borderBottom: '2px solid #333',
                        width: column.width,
                        ...(column.field === 'actions' && {
                          position: 'sticky',
                          right: 0,
                          zIndex: 2,
                          backgroundColor: '#1e1e1e',
                          borderLeft: '2px solid #333',
                        }),
                      }}
                    >
                      {column.headerName}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((employee) => (
                  <TableRow key={employee.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                    {columns
                      .filter(col => col.visible)
                      .map((column) => (
                        <TableCell
                          key={column.id}
                          sx={{
                            borderBottom: '1px solid #333',
                            color: '#ffffff',
                            ...(column.field === 'actions' && {
                              position: 'sticky',
                              right: 0,
                              zIndex: 2,
                              backgroundColor: '#2d2d2d',
                              borderLeft: '2px solid #333',
                            }),
                          }}
                        >
                          {column.field === 'actions' ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  sx={{ color: '#2196f3' }}
                                  onClick={() => {
                                    setEditingEmployee(employee);
                                    setShowForm(true);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  sx={{ color: '#f44336' }}
                                  onClick={() => handleDelete(employee.id)}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            getFieldValue(employee, column.field)
                          )}
                        </TableCell>
                      ))}
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

      {/* Employee Form Dialog */}
      <EmployeeForm
        open={showForm}
        employee={editingEmployee}
        onSave={() => {
          setShowForm(false);
          setEditingEmployee(null);
          loadEmployees();
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingEmployee(null);
        }}
      />

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onClose={() => setShowAddColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Column</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Column Name"
            value={newColumn.name}
            onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Column Type</InputLabel>
            <Select
              value={newColumn.type}
              onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as any })}
              label="Column Type"
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
              <MenuItem value="date">Date</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Default Value (optional)"
            value={newColumn.defaultValue ?? ''}
            onChange={(e) => setNewColumn({ ...newColumn, defaultValue: e.target.value })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddColumnDialog(false)}>Cancel</Button>
          <Button onClick={handleAddColumn} variant="contained" disabled={!newColumn.name}>
            Add Column
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Column Dialog */}
      <Dialog open={showEditColumnDialog} onClose={() => setShowEditColumnDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Column: {editingColumn}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
            {employees.map((employee) => (
              <Box key={employee.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <Typography sx={{ minWidth: 200, color: '#ffffff' }}>
                  {employee.fullName} ({employee.employeeId})
                </Typography>
                <TextField
                  fullWidth
                  label="Value"
                  value={columnValues[employee.id] ?? ''}
                  onChange={(e) => updateColumnValues(employee.id, e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditColumnDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEditColumn} 
            variant="contained" 
            disabled={editColumnLoading}
            sx={{
              backgroundColor: '#ff9800',
              '&:hover': { backgroundColor: '#f57c00' },
            }}
          >
            {editColumnLoading ? <CircularProgress size={24} /> : 'Update Column'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 