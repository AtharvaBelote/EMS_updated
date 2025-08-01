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
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Person,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, Attendance } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const attendanceStatuses = [
  { value: 'present', label: 'Present', color: 'success' as const },
  { value: 'absent', label: 'Absent', color: 'error' as const },
  { value: 'half-day', label: 'Half Day', color: 'warning' as const },
  { value: 'leave', label: 'Leave', color: 'info' as const },
];

export default function AttendanceManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendanceForDate();
    }
  }, [selectedDate, employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const employeesQuery = query(
        collection(db, 'employees'),
        orderBy('fullName')
      );
      const snapshot = await getDocs(employeesQuery);
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
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
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        attendanceMap[data.employeeId] = data.status;
      });
      
      setAttendanceData(attendanceMap);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleAttendanceChange = (employeeId: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: status,
    }));
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

        {/* Date Selection and Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 3, mb: 3 }}>
          <Box>
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
      </Box>
    </LocalizationProvider>
  );
} 