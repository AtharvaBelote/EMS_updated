'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Visibility,
    CheckCircle,
    Cancel,
    CalendarToday,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveApplication, LeaveType, LeaveBalance, Holiday } from '@/types/leave';
import { Employee } from '@/types';

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
            id={`leave-tabpanel-${index}`}
            aria-labelledby={`leave-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function LeaveManagement() {
    const { currentUser } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showApplicationDialog, setShowApplicationDialog] = useState(false);
    const [showLeaveTypeDialog, setShowLeaveTypeDialog] = useState(false);
    const [showHolidayDialog, setShowHolidayDialog] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);

    // Form states
    const [applicationForm, setApplicationForm] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayType: 'first-half' as 'first-half' | 'second-half',
    });

    const [leaveTypeForm, setLeaveTypeForm] = useState({
        name: '',
        code: '',
        maxDaysPerYear: 0,
        carryForward: false,
        maxCarryForwardDays: 0,
        color: '#2196f3',
    });

    const [holidayForm, setHolidayForm] = useState({
        name: '',
        date: '',
        type: 'company' as 'national' | 'regional' | 'company',
        isOptional: false,
        description: '',
    });

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        if (!currentUser) return;

        try {
            // Load leave applications
            const applicationsQuery = currentUser.role === 'employee'
                ? query(collection(db, 'leaveApplications'), where('employeeId', '==', currentUser.employeeId))
                : query(collection(db, 'leaveApplications'));
            const applicationsSnapshot = await getDocs(applicationsQuery);
            const applications = applicationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                endDate: doc.data().endDate?.toDate(),
                appliedAt: doc.data().appliedAt?.toDate(),
                approvedAt: doc.data().approvedAt?.toDate(),
            })) as LeaveApplication[];
            setLeaveApplications(applications);

            // Load leave types
            const typesSnapshot = await getDocs(collection(db, 'leaveTypes'));
            const types = typesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
            })) as LeaveType[];
            setLeaveTypes(types);

            // Load leave balances
            const balancesQuery = currentUser.role === 'employee'
                ? query(collection(db, 'leaveBalances'), where('employeeId', '==', currentUser.employeeId))
                : query(collection(db, 'leaveBalances'));
            const balancesSnapshot = await getDocs(balancesQuery);
            const balances = balancesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toDate(),
            })) as LeaveBalance[];
            setLeaveBalances(balances);

            // Load holidays
            const holidaysSnapshot = await getDocs(collection(db, 'holidays'));
            const holidaysList = holidaysSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate(),
                createdAt: doc.data().createdAt?.toDate(),
            })) as Holiday[];
            setHolidays(holidaysList);

            // Load employees (for admin/manager)
            if (currentUser.role !== 'employee') {
                const employeesSnapshot = await getDocs(collection(db, 'employees'));
                const employeesList = employeesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Employee[];
                setEmployees(employeesList);
            }
        } catch (error) {
            console.error('Error loading leave data:', error);
        }
    };

    const handleApplyLeave = async () => {
        if (!currentUser || !applicationForm.leaveTypeId || !applicationForm.startDate || !applicationForm.endDate) {
            return;
        }

        try {
            const startDate = new Date(applicationForm.startDate);
            const endDate = new Date(applicationForm.endDate);
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const newApplication: Omit<LeaveApplication, 'id'> = {
                employeeId: currentUser.employeeId || currentUser.uid,
                leaveTypeId: applicationForm.leaveTypeId,
                startDate,
                endDate,
                totalDays: applicationForm.isHalfDay ? 0.5 : totalDays,
                reason: applicationForm.reason,
                status: 'pending',
                appliedAt: new Date(),
                isHalfDay: applicationForm.isHalfDay,
                halfDayType: applicationForm.isHalfDay ? applicationForm.halfDayType : undefined,
            };

            await addDoc(collection(db, 'leaveApplications'), newApplication);
            setShowApplicationDialog(false);
            setApplicationForm({
                leaveTypeId: '',
                startDate: '',
                endDate: '',
                reason: '',
                isHalfDay: false,
                halfDayType: 'first-half',
            });
            loadData();
        } catch (error) {
            console.error('Error applying for leave:', error);
        }
    };

    const handleApproveReject = async (applicationId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
        try {
            await updateDoc(doc(db, 'leaveApplications', applicationId), {
                status,
                approvedBy: currentUser?.uid,
                approvedAt: new Date(),
                ...(rejectionReason && { rejectionReason }),
            });
            loadData();
        } catch (error) {
            console.error('Error updating leave application:', error);
        }
    };

    const handleCreateLeaveType = async () => {
        try {
            const newLeaveType: Omit<LeaveType, 'id'> = {
                ...leaveTypeForm,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await addDoc(collection(db, 'leaveTypes'), newLeaveType);
            setShowLeaveTypeDialog(false);
            setLeaveTypeForm({
                name: '',
                code: '',
                maxDaysPerYear: 0,
                carryForward: false,
                maxCarryForwardDays: 0,
                color: '#2196f3',
            });
            loadData();
        } catch (error) {
            console.error('Error creating leave type:', error);
        }
    };

    const handleCreateHoliday = async () => {
        try {
            const newHoliday: Omit<Holiday, 'id'> = {
                ...holidayForm,
                date: new Date(holidayForm.date),
                createdAt: new Date(),
            };

            await addDoc(collection(db, 'holidays'), newHoliday);
            setShowHolidayDialog(false);
            setHolidayForm({
                name: '',
                date: '',
                type: 'company',
                isOptional: false,
                description: '',
            });
            loadData();
        } catch (error) {
            console.error('Error creating holiday:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    const getLeaveTypeName = (leaveTypeId: string) => {
        const leaveType = leaveTypes.find(type => type.id === leaveTypeId);
        return leaveType?.name || 'Unknown';
    };

    const getEmployeeName = (employeeId: string) => {
        const employee = employees.find(emp => emp.employeeId === employeeId || emp.id === employeeId);
        return employee?.fullName || 'Unknown Employee';
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 3 }}>
                Leave Management
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label="My Leaves" />
                    <Tab label="Leave Balance" />
                    {currentUser?.role !== 'employee' && <Tab label="All Applications" />}
                    {currentUser?.role === 'admin' && <Tab label="Leave Types" />}
                    {currentUser?.role === 'admin' && <Tab label="Holidays" />}
                </Tabs>
            </Box>

            {/* My Leaves Tab */}
            <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">My Leave Applications</Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setShowApplicationDialog(true)}
                        sx={{ backgroundColor: '#2196f3' }}
                    >
                        Apply for Leave
                    </Button>
                </Box>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Leave Type</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>End Date</TableCell>
                                <TableCell>Days</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Applied On</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {leaveApplications
                                .filter(app => currentUser?.role === 'employee' ? app.employeeId === currentUser.employeeId : true)
                                .map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell>{getLeaveTypeName(application.leaveTypeId)}</TableCell>
                                        <TableCell>{application.startDate?.toLocaleDateString()}</TableCell>
                                        <TableCell>{application.endDate?.toLocaleDateString()}</TableCell>
                                        <TableCell>{application.totalDays}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={application.status}
                                                color={getStatusColor(application.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{application.appliedAt?.toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small">
                                                <Visibility />
                                            </IconButton>
                                            {application.status === 'pending' && (
                                                <IconButton size="small" color="error">
                                                    <Cancel />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            {/* Leave Balance Tab */}
            <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" sx={{ mb: 3 }}>Leave Balance</Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                        gap: 3,
                    }}
                >
                    {leaveTypes.map((leaveType) => {
                        const balance = leaveBalances.find(b => b.leaveTypeId === leaveType.id);
                        return (
                            <Box key={leaveType.id}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    backgroundColor: leaveType.color,
                                                    mr: 1,
                                                }}
                                            />
                                            <Typography variant="h6">{leaveType.name}</Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Allocated: {balance?.allocated || leaveType.maxDaysPerYear} days
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Used: {balance?.used || 0} days
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Pending: {balance?.pending || 0} days
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                                            Remaining: {balance?.remaining || leaveType.maxDaysPerYear} days
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        );
                    })}
                </Box>
            </TabPanel>

            {/* All Applications Tab (Admin/Manager) */}
            {currentUser?.role !== 'employee' && (
                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" sx={{ mb: 3 }}>All Leave Applications</Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Leave Type</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Days</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {leaveApplications.map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell>{getEmployeeName(application.employeeId)}</TableCell>
                                        <TableCell>{getLeaveTypeName(application.leaveTypeId)}</TableCell>
                                        <TableCell>{application.startDate?.toLocaleDateString()}</TableCell>
                                        <TableCell>{application.endDate?.toLocaleDateString()}</TableCell>
                                        <TableCell>{application.totalDays}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={application.status}
                                                color={getStatusColor(application.status) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {application.status === 'pending' && (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleApproveReject(application.id, 'approved')}
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleApproveReject(application.id, 'rejected', 'Rejected by manager')}
                                                    >
                                                        <Cancel />
                                                    </IconButton>
                                                </>
                                            )}
                                            <IconButton size="small">
                                                <Visibility />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            )}

            {/* Leave Types Tab (Admin) */}
            {currentUser?.role === 'admin' && (
                <TabPanel value={tabValue} index={3}>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Leave Types</Typography>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setShowLeaveTypeDialog(true)}
                            sx={{ backgroundColor: '#2196f3' }}
                        >
                            Add Leave Type
                        </Button>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                            },
                            gap: 3,
                        }}
                    >
                        {leaveTypes.map((leaveType) => (
                            <Box key={leaveType.id}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '50%',
                                                        backgroundColor: leaveType.color,
                                                        mr: 1,
                                                    }}
                                                />
                                                <Typography variant="h6">{leaveType.name}</Typography>
                                            </Box>
                                            <Box>
                                                <IconButton size="small">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" color="error">
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Code: {leaveType.code}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Max Days: {leaveType.maxDaysPerYear} per year
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Carry Forward: {leaveType.carryForward ? 'Yes' : 'No'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </TabPanel>
            )}

            {/* Holidays Tab (Admin) */}
            {currentUser?.role === 'admin' && (
                <TabPanel value={tabValue} index={4}>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Holidays</Typography>
                        <Button
                            variant="contained"
                            startIcon={<CalendarToday />}
                            onClick={() => setShowHolidayDialog(true)}
                            sx={{ backgroundColor: '#2196f3' }}
                        >
                            Add Holiday
                        </Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Holiday Name</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Optional</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {holidays.map((holiday) => (
                                    <TableRow key={holiday.id}>
                                        <TableCell>{holiday.name}</TableCell>
                                        <TableCell>{holiday.date?.toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Chip label={holiday.type} size="small" />
                                        </TableCell>
                                        <TableCell>{holiday.isOptional ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>
                                            <IconButton size="small">
                                                <Edit />
                                            </IconButton>
                                            <IconButton size="small" color="error">
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            )}

            {/* Apply Leave Dialog */}
            <Dialog open={showApplicationDialog} onClose={() => setShowApplicationDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                        <InputLabel>Leave Type</InputLabel>
                        <Select
                            value={applicationForm.leaveTypeId}
                            onChange={(e) => setApplicationForm({ ...applicationForm, leaveTypeId: e.target.value })}
                            label="Leave Type"
                        >
                            {leaveTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        type="date"
                        label="Start Date"
                        value={applicationForm.startDate}
                        onChange={(e) => setApplicationForm({ ...applicationForm, startDate: e.target.value })}
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        fullWidth
                        type="date"
                        label="End Date"
                        value={applicationForm.endDate}
                        onChange={(e) => setApplicationForm({ ...applicationForm, endDate: e.target.value })}
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Reason"
                        value={applicationForm.reason}
                        onChange={(e) => setApplicationForm({ ...applicationForm, reason: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowApplicationDialog(false)}>Cancel</Button>
                    <Button onClick={handleApplyLeave} variant="contained">
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Leave Type Dialog */}
            <Dialog open={showLeaveTypeDialog} onClose={() => setShowLeaveTypeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Leave Type</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Leave Type Name"
                        value={leaveTypeForm.name}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        label="Code"
                        value={leaveTypeForm.code}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, code: e.target.value })}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type="number"
                        label="Max Days Per Year"
                        value={leaveTypeForm.maxDaysPerYear}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, maxDaysPerYear: parseInt(e.target.value) })}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type="color"
                        label="Color"
                        value={leaveTypeForm.color}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, color: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowLeaveTypeDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateLeaveType} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Holiday Dialog */}
            <Dialog open={showHolidayDialog} onClose={() => setShowHolidayDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Holiday</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Holiday Name"
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type="date"
                        label="Date"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        sx={{ mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={holidayForm.type}
                            onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as any })}
                            label="Type"
                        >
                            <MenuItem value="national">National</MenuItem>
                            <MenuItem value="regional">Regional</MenuItem>
                            <MenuItem value="company">Company</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Description"
                        value={holidayForm.description}
                        onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowHolidayDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateHoliday} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}