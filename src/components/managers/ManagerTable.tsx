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
    Chip,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Visibility,
    Search,
    Block,
    CheckCircle,
    FileUpload,
    FileDownload,
} from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Manager, CustomField, TableColumn } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import ManagerForm from './ManagerForm';
import * as XLSX from 'xlsx';

const defaultColumns: TableColumn[] = [
    { id: '1', field: 'fullName', headerName: 'Full Name', width: 220, sortable: true, filterable: true, visible: true, order: 1 },
    { id: '2', field: 'managerId', headerName: 'Manager ID', width: 180, sortable: true, filterable: true, visible: true, order: 2 },
    { id: '3', field: 'email', headerName: 'Email', width: 250, sortable: true, filterable: true, visible: true, order: 3 },
    { id: '4', field: 'status', headerName: 'Status', width: 120, sortable: true, filterable: true, visible: true, order: 4 },
];

export default function ManagerTable() {
    const { currentUser } = useAuth();
    const [managers, setManagers] = useState<Manager[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showForm, setShowForm] = useState(false);
    const [editingManager, setEditingManager] = useState<Manager | null>(null);
    const [columns, setColumns] = useState<TableColumn[]>(defaultColumns);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);

    useEffect(() => {
        if (currentUser?.uid) {
            loadManagers();
            loadCustomFields();
        }
    }, [currentUser?.uid]);

    const loadManagers = async () => {
        try {
            setLoading(true);
            const managersQuery = query(
                collection(db, 'managers'),
                where('companyId', '==', currentUser?.uid) // Filter by current admin's company
            );
            const querySnapshot = await getDocs(managersQuery);
            const managersData: Manager[] = [];
            querySnapshot.forEach((doc) => {
                managersData.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                } as Manager);
            });
            setManagers(managersData);

            // Generate auto-detected columns from manager data
            generateAutoDetectedColumns(managersData);
        } catch (error) {
            console.error('Error loading managers:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCustomFields = async () => {
        try {
            const customFieldsSnapshot = await getDocs(collection(db, 'customFields'));
            const fields: CustomField[] = [];
            customFieldsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.entityType === 'manager' || !data.entityType) {
                    fields.push({ id: doc.id, ...data } as CustomField);
                }
            });
            setCustomFields(fields.sort((a, b) => a.order - b.order));
        } catch (error) {
            console.error('Error loading custom fields:', error);
        }
    };

    const generateAutoDetectedColumns = (managersData: Manager[]) => {
        // Collect all unique field names from manager data
        const allFields = new Set<string>();
        managersData.forEach(manager => {
            Object.keys(manager).forEach(key => {
                if (!['id', 'managerId', 'fullName', 'email', 'status', 'companyId', 'createdAt', 'updatedAt'].includes(key)) {
                    allFields.add(key);
                }
            });
        });

        // Create columns for auto-detected fields
        const autoDetectedColumns: TableColumn[] = Array.from(allFields).map((field, index) => ({
            id: `auto_${index}`,
            field,
            headerName: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
            width: 150,
            sortable: true,
            filterable: true,
            visible: true,
            order: defaultColumns.length + index + 1,
            isAutoDetected: true,
        }));

        setColumns([...defaultColumns, ...autoDetectedColumns]);
    };

    const handleDelete = async (managerId: string) => {
        if (window.confirm('Are you sure you want to delete this manager? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'managers', managerId));
                setManagers(managers.filter(manager => manager.id !== managerId));
            } catch (error) {
                console.error('Error deleting manager:', error);
            }
        }
    };

    const handleStatusToggle = async (managerId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await updateDoc(doc(db, 'managers', managerId), {
                status: newStatus,
                updatedAt: new Date(),
            });

            setManagers(managers.map(manager =>
                manager.id === managerId
                    ? { ...manager, status: newStatus as 'active' | 'inactive' | 'suspended' }
                    : manager
            ));
        } catch (error) {
            console.error('Error updating manager status:', error);
        }
    };

    const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Process each row
                for (const row of jsonData as any[]) {
                    const managerData = {
                        managerId: row.managerId || row['Manager ID'] || '',
                        fullName: row.fullName || row['Full Name'] || '',
                        email: row.email || row['Email'] || '',
                        status: (row.status || row['Status'] || 'active').toLowerCase(),
                        companyId: currentUser?.uid,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        ...Object.keys(row).reduce((acc, key) => {
                            if (!['managerId', 'Manager ID', 'fullName', 'Full Name', 'email', 'Email', 'status', 'Status'].includes(key)) {
                                acc[key] = row[key];
                            }
                            return acc;
                        }, {} as Record<string, any>),
                    };

                    if (managerData.managerId && managerData.fullName && managerData.email) {
                        await addDoc(collection(db, 'managers'), managerData);
                    }
                }

                // Reload managers after upload
                loadManagers();
            } catch (error) {
                console.error('Error uploading managers:', error);
                alert('Error uploading file. Please check the format and try again.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const downloadSampleFile = () => {
        const sampleData = [
            {
                'Manager ID': 'MGR001',
                'Full Name': 'John Doe',
                'Email': 'john.doe@company.com',
                'Status': 'active',
                'Department': 'Sales',
                'Phone': '1234567890',
            },
            {
                'Manager ID': 'MGR002',
                'Full Name': 'Jane Smith',
                'Email': 'jane.smith@company.com',
                'Status': 'active',
                'Department': 'Marketing',
                'Phone': '0987654321',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Managers');
        XLSX.writeFile(workbook, 'manager_sample.xlsx');
    };

    const filteredManagers = managers.filter(manager =>
        manager.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.managerId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'error';
            case 'suspended': return 'warning';
            default: return 'default';
        }
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
                    Manager Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Add, view, and manage system managers
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
                    ADD MANAGER
                </Button>

                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<FileUpload />}
                    sx={{
                        borderColor: '#2196f3',
                        color: '#2196f3',
                        '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(33, 150, 243, 0.04)' },
                    }}
                >
                    ADD IN BULK
                    <input
                        type="file"
                        hidden
                        accept=".xlsx,.xls"
                        onChange={handleBulkUpload}
                    />
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    onClick={downloadSampleFile}
                    sx={{
                        borderColor: '#4caf50',
                        color: '#4caf50',
                        '&:hover': { borderColor: '#388e3c', backgroundColor: 'rgba(76, 175, 80, 0.04)' },
                    }}
                >
                    SAMPLE FILE
                </Button>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Search by Name, Email, or Manager ID"
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

            {/* Manager Table */}
            <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                                {columns.filter(col => col.visible).sort((a, b) => a.order - b.order).map((column) => (
                                    <TableCell key={column.id} sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                        {column.headerName}
                                    </TableCell>
                                ))}
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Created At
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredManagers
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((manager) => (
                                    <TableRow key={manager.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                                        {columns.filter(col => col.visible).sort((a, b) => a.order - b.order).map((column) => (
                                            <TableCell key={column.id} sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                                {column.field === 'status' ? (
                                                    <Chip
                                                        label={manager[column.field] || 'active'}
                                                        color={getStatusColor(manager[column.field]) as any}
                                                        size="small"
                                                    />
                                                ) : (
                                                    manager[column.field as keyof Manager] || 'N/A'
                                                )}
                                            </TableCell>
                                        ))}
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.createdAt?.toLocaleDateString() || 'N/A'}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#2196f3' }}
                                                    >
                                                        <Visibility />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit Manager">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#ff9800' }}
                                                        onClick={() => {
                                                            setEditingManager(manager);
                                                            setShowForm(true);
                                                        }}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={manager.status === 'active' ? 'Deactivate' : 'Activate'}>
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: manager.status === 'active' ? '#ff5722' : '#4caf50' }}
                                                        onClick={() => handleStatusToggle(manager.id, manager.status || 'active')}
                                                    >
                                                        {manager.status === 'active' ? <Block /> : <CheckCircle />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Manager">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#f44336' }}
                                                        onClick={() => handleDelete(manager.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
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
                count={filteredManagers.length}
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

            {/* Manager Form Dialog */}
            <ManagerForm
                open={showForm}
                manager={editingManager}
                onSave={() => {
                    setShowForm(false);
                    setEditingManager(null);
                    loadManagers();
                }}
                onCancel={() => {
                    setShowForm(false);
                    setEditingManager(null);
                }}
            />
        </Box>
    );
}