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
} from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import ManagerForm from './ManagerForm';

export default function ManagerTable() {
    const [managers, setManagers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [showForm, setShowForm] = useState(false);
    const [editingManager, setEditingManager] = useState<User | null>(null);

    useEffect(() => {
        loadManagers();
    }, []);

    const loadManagers = async () => {
        try {
            setLoading(true);
            const managersQuery = query(collection(db, 'users'), where('role', '==', 'manager'));
            const querySnapshot = await getDocs(managersQuery);
            const managersData: User[] = [];
            querySnapshot.forEach((doc) => {
                managersData.push({
                    uid: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    lastLoginAt: doc.data().lastLoginAt?.toDate(),
                } as User);
            });
            setManagers(managersData);
        } catch (error) {
            console.error('Error loading managers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (managerId: string) => {
        if (window.confirm('Are you sure you want to delete this manager? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'users', managerId));
                setManagers(managers.filter(manager => manager.uid !== managerId));
            } catch (error) {
                console.error('Error deleting manager:', error);
            }
        }
    };

    const handleStatusToggle = async (managerId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await updateDoc(doc(db, 'users', managerId), {
                status: newStatus,
                updatedAt: new Date(),
            });

            setManagers(managers.map(manager =>
                manager.uid === managerId
                    ? { ...manager, status: newStatus as 'active' | 'inactive' }
                    : manager
            ));
        } catch (error) {
            console.error('Error updating manager status:', error);
        }
    };

    const filteredManagers = managers.filter(manager =>
        manager.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.userId?.toLowerCase().includes(searchTerm.toLowerCase())
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
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Manager ID
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Full Name
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Email
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Status
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Created At
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#ffffff', borderBottom: '2px solid #333' }}>
                                    Last Login
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
                                    <TableRow key={manager.uid} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.userId}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.displayName}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.email}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            <Chip
                                                label={manager.status || 'active'}
                                                color={getStatusColor(manager.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.createdAt?.toLocaleDateString() || 'N/A'}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid #333', color: '#ffffff' }}>
                                            {manager.lastLoginAt?.toLocaleDateString() || 'Never'}
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
                                                        onClick={() => handleStatusToggle(manager.uid, manager.status || 'active')}
                                                    >
                                                        {manager.status === 'active' ? <Block /> : <CheckCircle />}
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Manager">
                                                    <IconButton
                                                        size="small"
                                                        sx={{ color: '#f44336' }}
                                                        onClick={() => handleDelete(manager.uid)}
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