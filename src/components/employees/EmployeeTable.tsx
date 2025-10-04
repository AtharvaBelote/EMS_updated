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
  Divider,
  Chip,
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
import { collection, getDocs, doc, deleteDoc, query, orderBy, addDoc, updateDoc, where, deleteField, documentId, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CustomField, TableColumn, Employee as BaseEmployee } from '@/types';

// Extend the base Employee type with additional properties used in this component
interface Employee extends BaseEmployee {
  companyName?: string;
  managerNames?: string;
  status?: string;
  department?: string;
}
import { useAuth } from '@/contexts/AuthContext';
import EmployeeForm from '@/components/employees/EmployeeForm';
import * as XLSX from 'xlsx';

// TODO - Need change

const defaultColumns: TableColumn[] = [
  { id: '1', field: 'fullName', headerName: 'Full Name', width: 220, sortable: true, filterable: true, visible: true, order: 1 },
  { id: '2', field: 'employeeId', headerName: 'Employee Id', width: 180, sortable: true, filterable: true, visible: true, order: 2 },
  { id: '3', field: 'email', headerName: 'Email', width: 250, sortable: true, filterable: true, visible: true, order: 3 },
  { id: '4', field: 'mobile', headerName: 'Mobile', width: 150, sortable: true, filterable: true, visible: true, order: 4 },
  { id: '5', field: 'salary.base', headerName: 'Salary', width: 120, sortable: true, filterable: true, visible: true, order: 5 },
  { id: '6', field: 'department', headerName: 'Department', width: 150, sortable: true, filterable: true, visible: true, order: 6 },
  { id: '7', field: 'companyName', headerName: 'Company', width: 200, sortable: true, filterable: true, visible: true, order: 7 },
  { id: '8', field: 'managerNames', headerName: 'Managers', width: 200, sortable: true, filterable: true, visible: true, order: 8 },
  { id: '9', field: 'status', headerName: 'Status', width: 120, sortable: true, filterable: true, visible: true, order: 9 },
];

export default function EmployeeTable() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
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
  const [showDeleteColumnDialog, setShowDeleteColumnDialog] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string>('');

  useEffect(() => {
    if (currentUser?.uid) {
      loadEmployees();
      loadCustomFields();
    }
  }, [currentUser?.uid]);

  const loadEmployees = async () => {
    try {
      setLoading(true);

      if (!currentUser?.uid) return;

      let employeesQuery;
      let companyId: string;

      // Different query logic based on user role
      if (currentUser.role === 'admin') {
        // Admin can see all employees in their company
        companyId = currentUser.uid;
        employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', companyId)
        );
      } else if (currentUser.role === 'manager') {
        // Manager can see all employees in their company (for viewing)
        // but can only manage employees assigned to them
        companyId = currentUser.companyId || '';
        console.log('🔍 DEBUGGING - Manager companyId:', companyId);
        console.log('🔍 DEBUGGING - Manager UID:', currentUser.uid);
        console.log('🔍 DEBUGGING - Current user data:', currentUser);

        if (!companyId) {
          console.error('❌ Manager does not have companyId. Current user:', currentUser);
          setLoading(false);
          return;
        }
        employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', companyId)
        );
      } else {
        // Employee role shouldn't access this component, but just in case
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(employeesQuery);
      const employeesData: Employee[] = [];

      // Get all unique manager IDs
      const managerIds = new Set<string>();
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.assignedManagers) {
          data.assignedManagers.forEach((id: string) => managerIds.add(id));
        }
      });

      // Fetch managers data
      const managersData = new Map<string, any>();
      if (managerIds.size > 0) {
        const managersSnapshot = await getDocs(query(
          collection(db, 'managers'),
          where(documentId(), 'in', Array.from(managerIds))
        ));
        managersSnapshot.forEach(doc => {
          managersData.set(doc.id, doc.data());
        });
      }

      // Fetch company data
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      const companyName = companyDoc.exists() ? companyDoc.data().companyName || companyDoc.data().name : 'Unknown Company';

      console.log('🔍 DEBUGGING - Total employees found in query:', querySnapshot.size);

      // Process employees with manager names
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        console.log('🔍 DEBUGGING - Processing employee:', data.fullName || data.firstName + ' ' + data.lastName);
        console.log('🔍 DEBUGGING - Employee assignedManagers:', data.assignedManagers);

        // For managers, check if they should see this employee
        if (currentUser.role === 'manager') {
          const isAssignedToManager = data.assignedManagers &&
            data.assignedManagers.includes(currentUser.uid);
          console.log('🔍 DEBUGGING - Manager UID:', currentUser.uid, 'isAssigned:', isAssignedToManager);

          // TEMPORARILY DISABLED - Let's see all employees for debugging
          // if (!isAssignedToManager) {
          //   console.log('🔍 DEBUGGING - Skipping employee (not assigned)');
          //   return; // Skip this employee
          // }
        }

        const managerNames = (data.assignedManagers || [])
          .map((managerId: string) => {
            const manager = managersData.get(managerId);
            return manager ? manager.fullName : 'Unknown Manager';
          })
          .join(', ');

        employeesData.push({
          id: doc.id,
          ...data,
          companyName,
          managerNames,
        } as Employee);
      });

      console.log('🔍 DEBUGGING - Final employees data length:', employeesData.length);
      console.log('🔍 DEBUGGING - Final employees data:', employeesData);

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
        // Exclude main columns, special fields, and sensitive data
        if (!['id', 'fullName', 'employeeId', 'email', 'mobile', 'salary', 'companyId', 'assignedManagers'].includes(key)) {
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

  const handleDeleteColumn = async () => {
    try {
      console.log('Starting column deletion for:', columnToDelete);

      // Find the column to delete
      const columnToDeleteObj = columns.find(col => col.field === columnToDelete);
      if (!columnToDeleteObj) {
        console.error('Column not found:', columnToDelete);
        alert('Column not found');
        return;
      }

      // Don't allow deletion of required default columns and actions column
      if (defaultColumns.some(col => col.field === columnToDelete) || columnToDelete === 'actions') {
        alert('Cannot delete system default columns (Full Name, Manager ID, Email, Status, Actions)');
        return;
      }

      // First, remove the field from all managers in Firestore
      console.log('Removing field from managers...');
      const batch = [];
      for (const manager of employees) {
        const updateData = {
          updatedAt: new Date()
        } as Record<string, any>;

        // Handle both normal fields and fields with spaces
        updateData[columnToDelete] = deleteField();

        // If the field contains spaces, also try to delete its alternative formats
        if (columnToDelete.includes(' ')) {
          const noSpaceVersion = columnToDelete.replace(/\s+/g, '');
          updateData[noSpaceVersion] = deleteField();
          const underscoreVersion = columnToDelete.replace(/\s+/g, '_');
          updateData[underscoreVersion] = deleteField();
        }

        batch.push(updateDoc(doc(db, 'managers', manager.id), updateData));
      }
      await Promise.all(batch);
      console.log('Field removed from all managers');

      // If it's a custom field, remove it from the customFields collection
      const customField = customFields.find(field =>
        field.name === columnToDelete ||
        field.name.replace(/\s+/g, '') === columnToDelete ||
        field.name.replace(/\s+/g, '_') === columnToDelete
      );

      if (customField?.id) {
        console.log('Removing custom field definition...');
        await deleteDoc(doc(collection(db, 'customFields'), customField.id));
        console.log('Custom field definition removed');

        // Update custom fields state
        setCustomFields(prev => prev.filter(field => field.id !== customField.id));
      }

      // Update the columns state
      console.log('Updating columns state...');
      const actionsColumn = columns.find(col => col.field === 'actions');
      const filteredColumns = columns.filter(col =>
        col.field !== columnToDelete &&
        col.field !== columnToDelete.replace(/\s+/g, '') &&
        col.field !== columnToDelete.replace(/\s+/g, '_') &&
        col.field !== 'actions'
      );

      const newColumns = actionsColumn
        ? [...filteredColumns, actionsColumn]
        : filteredColumns;

      console.log('New columns:', newColumns);
      setColumns(newColumns);

      // Close dialog and clear selection
      setShowDeleteColumnDialog(false);
      setColumnToDelete('');

      // Force a reload of data to ensure UI is in sync with database
      await loadEmployees();

      // Show success message
      alert(`Column "${columnToDelete}" has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting column:', error);
      alert('Error deleting column: ' + (error as Error).message);
    }
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

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      employee.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.managerNames?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'active') return matchesSearch && employee.status === 'active';
    if (filterType === 'inactive') return matchesSearch && employee.status === 'inactive';
    if (filterType.startsWith('department:')) {
      const department = filterType.split(':')[1];
      return matchesSearch && employee.department === department;
    }
    if (filterType.startsWith('manager:')) {
      const managerId = filterType.split(':')[1];
      return matchesSearch && employee.assignedManagers?.includes(managerId);
    }
    return matchesSearch;
  });

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

          // Filter out empty columns and clean the data
          const cleanedRow: any = {};
          Object.keys(row).forEach(key => {
            // Skip empty columns (like __EMPTY"", __EMPTY_1"", etc.)
            if (key.startsWith('__EMPTY')) return;

            // Skip keys that are just empty strings or whitespace
            if (!key.trim()) return;

            // Only include non-empty values
            const value = row[key];
            if (value !== null && value !== undefined && value !== '') {
              cleanedRow[key] = value;
            }
          });

          // Add to Firebase with cleaned data
          await addDoc(collection(db, 'employees'), {
            ...cleanedRow,
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
    // Create a proper Excel file with sample data
    const sampleData = [
      {
        'fullName': 'John Doe',
        'employeeId': 'EMP001',
        'email': 'john.doe@company.com',
        'mobile': '1234567890',
        'salary': '50000',
        'department': 'IT',
        'position': 'Developer',
        'joinDate': '2024-01-15'
      },
      {
        'fullName': 'Jane Smith',
        'employeeId': 'EMP002',
        'email': 'jane.smith@company.com',
        'mobile': '0987654321',
        'salary': '55000',
        'department': 'HR',
        'position': 'HR Manager',
        'joinDate': '2024-02-01'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Sample');
    XLSX.writeFile(wb, 'sample_employees.xlsx');
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
          View, and manage employees
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Note: To add employees go to managers tab and click "ASSIGN EMPLOYEES"
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Admin-only buttons */}
        {currentUser?.role === 'admin' && (
          <>
            {/* <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowForm(true)}
              sx={{
                backgroundColor: '#2196f3',
                '&:hover': { backgroundColor: '#1976d2' },
              }}
            >
              ADD EMPLOYEE
            </Button> */}

            {/* <Button
              variant="contained"
              startIcon={<FileUpload />}
              onClick={handleUploadXLSX}
              sx={{
                backgroundColor: '#9c27b0',
                '&:hover': { backgroundColor: '#7b1fa2' },
              }}
            >
              UPLOAD XLSX
            </Button> */}

            {/* <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadSample}
              sx={{
                backgroundColor: '#2196f3',
                '&:hover': { backgroundColor: '#1976d2' },
              }}
            >
              DOWNLOAD SAMPLE TEMPLATE
            </Button> */}

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
              startIcon={<Delete />}
              onClick={() => setShowDeleteColumnDialog(true)}
              sx={{
                backgroundColor: '#f44336',
                '&:hover': { backgroundColor: '#d32f2f' },
              }}
            >
              DELETE COLUMN
            </Button>

            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                // Show a dropdown or dialog to select which column to edit
                const columnField = prompt('Enter column field name to edit (e.g., fullName, email, Employee Id):');
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
          </>
        )}

        {/* Buttons available for both admin and manager */}
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
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
          }}
        >
          EXPORT XLSX
        </Button>
      </Box>

      {/* Search Bar and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          sx={{ flex: 1 }}
          placeholder="Search by Name, Email, ID, Department, or Manager"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter By</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label="Filter By"
          >
            <MenuItem value="all">All Employees</MenuItem>
            <MenuItem value="active">Active Employees</MenuItem>
            <MenuItem value="inactive">Inactive Employees</MenuItem>
            <Divider />
            {Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean).map((dept) => (
              <MenuItem key={dept} value={`department:${dept}`}>
                Department: {dept}
              </MenuItem>
            ))}
            <Divider />
            {Array.from(new Set(employees.map(emp => emp.managerNames))).filter(Boolean).map((manager) => (
              <MenuItem key={manager} value={`manager:${manager}`}>
                Manager: {manager}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  sx={{ color: '#2196f3' }}
                                  onClick={() => {
                                    setEditingEmployee(employee);
                                    setShowForm(true);
                                  }}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              {currentUser?.role === 'admin' && (
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    sx={{ color: '#f44336' }}
                                    onClick={() => handleDelete(employee.id)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Tooltip>
                              )}
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

      {/* Delete Column Dialog */}
      <Dialog open={showDeleteColumnDialog} onClose={() => setShowDeleteColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Column</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Column to Delete</InputLabel>
              <Select
                value={columnToDelete}
                onChange={(e) => setColumnToDelete(e.target.value)}
                label="Select Column to Delete"
              >
                {columns
                  .filter(col => !defaultColumns.some(defCol => defCol.field === col.field)) // Filter out default columns
                  .map((column) => (
                    <MenuItem key={column.id} value={column.field}>
                      {column.headerName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {columnToDelete && (
              <Typography sx={{ mt: 2, color: 'error.main' }}>
                Warning: This action will permanently delete the column "{columnToDelete}" and all its data. This cannot be undone.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteColumnDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteColumn}
            variant="contained"
            color="error"
            disabled={!columnToDelete}
          >
            Delete Column
          </Button>
        </DialogActions>
      </Dialog>

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