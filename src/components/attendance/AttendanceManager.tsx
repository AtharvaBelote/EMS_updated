'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  FileUpload,
  FileDownload,
  Edit,
  Delete,
  Add,
  Save,
  Close,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { collection, getDocs, addDoc, query, where, orderBy, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Attendance } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const attendanceStatuses = [
  { value: 'present', label: 'Present', color: 'success' as const },
  { value: 'absent', label: 'Absent', color: 'error' as const },
  { value: 'half-day', label: 'Half Day', color: 'warning' as const },
  { value: 'leave', label: 'Leave', color: 'info' as const },
];

// Default absence reason codes
const defaultAbsenceReasonCodes = [
  { code: 0, reason: 'Without Reason' },
  { code: 1, reason: 'On Leave' },
  { code: 2, reason: 'Left Service' },
  { code: 3, reason: 'Retired' },
  { code: 4, reason: 'Out of Coverage' },
  { code: 5, reason: 'Expired' },
  { code: 6, reason: 'Non Implemented area' },
  { code: 7, reason: 'Compliance by Immediate Employer' },
  { code: 8, reason: 'Suspension of work' },
  { code: 9, reason: 'Strike/Lockout' },
  { code: 10, reason: 'Retrenchment' },
  { code: 11, reason: 'No Work' },
  { code: 12, reason: 'Doesnt Belong To This Employer' },
];

export default function AttendanceManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [absenceReasonData, setAbsenceReasonData] = useState<Record<string, number>>({});
  const [absenceReasonCodes, setAbsenceReasonCodes] = useState(defaultAbsenceReasonCodes);
  const [newReasonText, setNewReasonText] = useState('');
  const [newReasonCode, setNewReasonCode] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showReasonCodeDialog, setShowReasonCodeDialog] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchEmployees();
    loadAbsenceReasonCodesFromFirestore();
  }, []);


  const [loadingReasonCodes, setLoadingReasonCodes] = useState(false);

  const loadAbsenceReasonCodesFromFirestore = async () => {
    if (!currentUser) return;
    setLoadingReasonCodes(true);
    try {
      const companyId = currentUser.companyId || currentUser.uid;
      const companyRef = doc(db, 'companies', companyId);
      const snapshot = await getDoc(companyRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.absenceReasonCodes) && data.absenceReasonCodes.length > 0) {
          setAbsenceReasonCodes(data.absenceReasonCodes);
        } else {
          setAbsenceReasonCodes(defaultAbsenceReasonCodes);
        }
      } else {
        setAbsenceReasonCodes(defaultAbsenceReasonCodes);
      }
    } catch (e) {
      console.error('Failed to load absence reason codes from Firestore', e);
      setAbsenceReasonCodes(defaultAbsenceReasonCodes);
    } finally {
      setLoadingReasonCodes(false);
    }
  };

  const saveAbsenceReasonCodesToFirestore = async (codes: { code: number; reason: string }[]) => {
    if (!currentUser) return;
    try {
      const companyId = currentUser.companyId || currentUser.uid;
      const companyRef = doc(db, 'companies', companyId);
      const snapshot = await getDoc(companyRef);
      if (snapshot.exists()) {
        await updateDoc(companyRef, { absenceReasonCodes: codes });
      } else {
        await setDoc(companyRef, { absenceReasonCodes: codes }, { merge: true });
      }
      setAbsenceReasonCodes(codes);
    } catch (e) {
      console.error('Failed to save absence reason codes to Firestore', e);
    }
  };

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendanceForDate();
    }
  }, [selectedDate, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let employeesQuery;
      let companyId;
      if (currentUser?.role === 'admin') {
        companyId = currentUser.uid;
        employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', companyId)
        );
      } else if (currentUser?.role === 'manager') {
        companyId = currentUser.companyId || '';
        employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', companyId)
        );
      } else {
        setEmployees([]);
        setLoading(false);
        return;
      }
      const snapshot = await getDocs(employeesQuery);
      let employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];

      // For managers, filter only assigned employees using Firestore manager document ID
      if (currentUser?.role === 'manager') {
        // Gather all unique manager IDs from employees
        const managerIds = new Set<string>();
        employeesData.forEach(emp => {
          if (Array.isArray(emp.assignedManagers)) {
            emp.assignedManagers.forEach((id: string) => managerIds.add(id));
          }
        });

        // Fetch managers data
        const managersData = new Map<string, any>();
        if (managerIds.size > 0) {
          const managersSnapshot = await getDocs(query(
            collection(db, 'managers'),
            where('__name__', 'in', Array.from(managerIds))
          ));
          managersSnapshot.forEach(doc => {
            managersData.set(doc.id, doc.data());
          });
        }

        // Find manager doc ID by email
        let managerDocId: string | null = null;
        for (const [docId, mgr] of managersData.entries()) {
          if (mgr.email === currentUser.email) {
            managerDocId = docId;
            break;
          }
        }
        // Fallback to currentUser.uid if not found
        managerDocId = managerDocId || currentUser.uid;
        employeesData = employeesData.filter(emp => Array.isArray(emp.assignedManagers) && emp.assignedManagers.includes(managerDocId));
        console.log('🔍 DEBUGGING - Manager Firestore ID for assignment:', managerDocId, 'Filtered employees:', employeesData.map(e => e.fullName));
      }

      // Sort employees by fullName after fetching
      employeesData.sort((a, b) => 
        (a.fullName || '').localeCompare(b.fullName || '')
      );

      setEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );
      const snapshot = await getDocs(attendanceQuery);
      
      const attendanceMap: Record<string, string> = {};
      const reasonMap: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        attendanceMap[data.employeeId] = data.status;
        if (data.status === 'absent' && data.reasonCode !== undefined) {
          reasonMap[data.employeeId] = data.reasonCode;
        }
      });
      
      setAttendanceData(attendanceMap);
      setAbsenceReasonData(reasonMap);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleAttendanceChange = (employeeId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: status,
    }));
      // If status is not absent, clear reason code
      if (status !== 'absent') {
        setAbsenceReasonData(prev => {
          const copy = { ...prev };
          delete copy[employeeId];
          return copy;
        });
      }
  };

    // Handle reason code change (admin only)
    const handleReasonCodeChange = (employeeId: string, code: number) => {
      setAbsenceReasonData(prev => ({
        ...prev,
        [employeeId]: code,
      }));
    };

  const handleAddReason = async () => {
      if (!newReasonText || newReasonCode === '') return;
      const code = Number(newReasonCode);
      if (absenceReasonCodes.some(r => r.code === code)) {
        alert('Code already exists');
        return;
      }
  const updated = [...absenceReasonCodes, { code, reason: newReasonText }].sort((a, b) => a.code - b.code);
  await saveAbsenceReasonCodesToFirestore(updated);
      setNewReasonText('');
      setNewReasonCode('');
    };

  const handleDeleteReason = async (code: number) => {
      if (!confirm('Delete this reason code?')) return;
      const updated = absenceReasonCodes.filter(r => r.code !== code);
  await saveAbsenceReasonCodesToFirestore(updated);
    };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const attendanceRecords = Object.entries(attendanceData).map(([employeeId, status]) => ({
        employeeId,
        date: selectedDate,
        status,
        markedBy: currentUser?.uid || '',
        markedAt: new Date(),
          reasonCode: status === 'absent' ? (absenceReasonData[employeeId] ?? 0) : undefined,
      }));

      // Save attendance records
      for (const record of attendanceRecords) {
        await addDoc(collection(db, 'attendance'), record);
      }

      setSuccess('Attendance saved successfully!');
      await fetchAttendanceForDate();
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      'half-day': 0,
      leave: 0,
      total: employees.length,
    };

    Object.values(attendanceData).forEach(status => {
      if (status in stats) {
        stats[status as keyof typeof stats]++;
      }
    });

    return stats;
  };

  // Bulk edit functions
  const handleBulkEdit = () => {
    const newAttendanceData = { ...attendanceData };
    employees.forEach(employee => {
      newAttendanceData[employee.id] = bulkStatus;
        // If bulk status is not absent, clear reason code
        if (bulkStatus !== 'absent') {
          setAbsenceReasonData(prev => {
            const copy = { ...prev };
            delete copy[employee.id];
            return copy;
          });
        }
    });
    setAttendanceData(newAttendanceData);
    setShowBulkEditDialog(false);
    setBulkStatus('');
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Employee ID': 'EMP001',
        'Attendance Status': 'present',
        'Date': new Date().toISOString().split('T')[0]
      },
      {
        'Employee ID': 'EMP002',
        'Attendance Status': 'absent',
        'Date': new Date().toISOString().split('T')[0]
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Sample');
    XLSX.writeFile(wb, 'attendance_sample.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newAttendanceData = { ...attendanceData };
        
        for (const row of jsonData as any[]) {
          const employeeId = row['Employee ID'];
          const status = row['Attendance Status'].toLowerCase();
          
          // Find the employee by employeeId
          const employee = employees.find(emp => emp.employeeId === employeeId);
          
          if (employee && attendanceStatuses.some(s => s.value === status)) {
            newAttendanceData[employee.id] = status;
          }
        }

        setAttendanceData(newAttendanceData);
        setSuccess('Attendance data imported successfully!');
      } catch (error) {
        console.error('Error uploading attendance:', error);
        setError('Failed to import attendance data. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Attendance Management
        </Typography>

          <Button
            variant="outlined"
            color="info"
            startIcon={<FileDownload />}
            onClick={async () => { await loadAbsenceReasonCodesFromFirestore(); setShowReasonCodeDialog(true); }}
            sx={{ mb: 2 }}
          >
            View Absence Reason Codes
          </Button>

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

        {/* Date Selection, Bulk Actions and Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate || new Date())}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
            
            {/* Bulk Action Buttons */}
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setShowBulkEditDialog(true)}
              fullWidth
            >
              Bulk Edit Status
            </Button>
            
            <Button
              variant="contained"
              startIcon={<FileUpload />}
              component="label"
              fullWidth
            >
              Upload XLSX/CSV
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
              />
            </Button>
            
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleDownloadSample}
              fullWidth
            >
              Download Sample
            </Button>
          </Box>
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{stats.present}</Typography>
                    <Typography variant="caption">Present</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Cancel color="error" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{stats.absent}</Typography>
                    <Typography variant="caption">Absent</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Schedule color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{stats['half-day']}</Typography>
                    <Typography variant="caption">Half Day</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Person color="info" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">{stats.leave}</Typography>
                    <Typography variant="caption">Leave</Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Attendance Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell align="center">Attendance Status</TableCell>
                    <TableCell align="center">Reason Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.employeeId}</TableCell>
                    <TableCell>{employee.fullName}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>{employee.designation || '-'}</TableCell>
                    <TableCell align="center">
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={attendanceData[employee.id] || ''}
                          onChange={(e) => handleAttendanceChange(employee.id, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Not Marked</em>
                          </MenuItem>
                          {attendanceStatuses.map((status) => (
                            <MenuItem key={status.value} value={status.value}>
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                                sx={{ minWidth: 80 }}
                              />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                      <TableCell align="center">
                        {attendanceData[employee.id] === 'absent' ? (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={absenceReasonData[employee.id] ?? 0}
                              onChange={(e) => handleReasonCodeChange(employee.id, Number(e.target.value))}
                            >
                              {absenceReasonCodes.map((reason) => (
                                <MenuItem key={reason.code} value={reason.code}>
                                  {reason.code} - {reason.reason}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleSaveAttendance}
            disabled={saving}
            size="large"
          >
            {saving ? <CircularProgress size={24} /> : 'Save Attendance'}
          </Button>
        </Box>

        {/* Bulk Edit Dialog */}
        <Dialog open={showBulkEditDialog} onClose={() => setShowBulkEditDialog(false)}>
          <DialogTitle>Bulk Edit Attendance Status</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Status</InputLabel>
              <Select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                label="Select Status"
              >
                {attendanceStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      sx={{ minWidth: 80 }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBulkEditDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} variant="contained" disabled={!bulkStatus}>
              Apply to All
            </Button>
          </DialogActions>
        </Dialog>

          {/* Reason Code Dialog */}
          <Dialog open={showReasonCodeDialog} onClose={() => setShowReasonCodeDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>Absence Reason Codes</DialogTitle>
            <DialogContent>
              <Table>

                <TableHead>
                  <TableRow>
                    <TableCell><b>Code</b></TableCell>
                    <TableCell><b>Reason</b></TableCell>
                    {currentUser?.role === 'admin' && <TableCell><b>Actions</b></TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {absenceReasonCodes.map((reason) => (
                    <TableRow key={reason.code}>
                      <TableCell>{reason.code}</TableCell>
                      <TableCell>{reason.reason}</TableCell>
                      {currentUser?.role === 'admin' && (
                        <TableCell>
                          <IconButton color="error" onClick={() => handleDeleteReason(reason.code)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {currentUser?.role === 'admin' && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                  <TextField
                    label="Code"
                    type="number"
                    value={newReasonCode}
                    onChange={(e) => setNewReasonCode(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ width: 120 }}
                  />
                  <TextField
                    label="Reason"
                    value={newReasonText}
                    onChange={(e) => setNewReasonText(e.target.value)}
                    fullWidth
                  />
                  <Button variant="contained" startIcon={<Add />} onClick={handleAddReason}>Add</Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowReasonCodeDialog(false)} startIcon={<Close />}>Close</Button>
              {currentUser?.role === 'admin' && <Button onClick={async () => await saveAbsenceReasonCodesToFirestore(absenceReasonCodes)} startIcon={<Save />} variant="contained">Save</Button>}
            </DialogActions>
          </Dialog>
      </Box>
    </LocalizationProvider>
  );
} 