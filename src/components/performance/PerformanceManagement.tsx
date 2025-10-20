'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
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
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  TrendingDown,
  Timeline,
  Assessment,
  CalendarToday,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AnnualReview, DailyPerformance, PerformanceRating, PerformanceCategory } from '@/types/performance';
import { Employee } from '@/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Performance categories with descriptions
const PERFORMANCE_CATEGORIES = [
  { id: 'technical_skills', name: 'Technical Skills', description: 'Job-specific technical competencies and knowledge' },
  { id: 'communication', name: 'Communication', description: 'Verbal and written communication effectiveness' },
  { id: 'teamwork', name: 'Teamwork & Collaboration', description: 'Ability to work effectively with others' },
  { id: 'punctuality', name: 'Punctuality & Attendance', description: 'Timeliness and regular attendance' },
  { id: 'productivity', name: 'Productivity', description: 'Output and efficiency in work' },
  { id: 'quality', name: 'Quality of Work', description: 'Accuracy and standard of deliverables' },
  { id: 'problem_solving', name: 'Problem Solving', description: 'Analytical and critical thinking abilities' },
];

const RATING_OPTIONS: PerformanceRating[] = ['Excellent', 'Good', 'Average', 'Needs Improvement', 'Poor'];

const RATING_COLORS: Record<PerformanceRating, string> = {
  'Excellent': '#4caf50',
  'Good': '#8bc34a',
  'Average': '#ff9800',
  'Needs Improvement': '#ff5722',
  'Poor': '#f44336',
};

export default function PerformanceManagement() {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [annualReviews, setAnnualReviews] = useState<AnnualReview[]>([]);
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [showAnnualDialog, setShowAnnualDialog] = useState(false);
  const [showDailyDialog, setShowDailyDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<AnnualReview | null>(null);
  const [viewingReview, setViewingReview] = useState<AnnualReview | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Annual Review Form
  const [annualFormData, setAnnualFormData] = useState({
    employeeId: '',
    reviewYear: new Date().getFullYear(),
    categories: PERFORMANCE_CATEGORIES.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      rating: 'Average' as PerformanceRating,
      comments: '',
    })),
    strengths: '',
    areasForImprovement: '',
    achievements: '',
    recommendations: '',
  });

  // Daily Performance Form
  const [dailyFormData, setDailyFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    attendance: 'Present' as 'Present' | 'Absent' | 'Half Day' | 'Late',
    punctuality: 'Good' as PerformanceRating,
    productivity: 'Good' as PerformanceRating,
    quality: 'Good' as PerformanceRating,
    behavior: 'Good' as PerformanceRating,
    tasksCompleted: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load employees
      const employeesQuery = query(collection(db, 'employees'), orderBy('fullName'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesData);

      // Load annual reviews
      const reviewsQuery = query(collection(db, 'annual_reviews'), orderBy('createdAt', 'desc'));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reviewPeriod: {
          startDate: doc.data().reviewPeriod?.startDate?.toDate() || new Date(),
          endDate: doc.data().reviewPeriod?.endDate?.toDate() || new Date(),
        },
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        submittedAt: doc.data().submittedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as AnnualReview[];
      setAnnualReviews(reviewsData);

      // Load daily performance
      const dailyQuery = query(collection(db, 'daily_performance'), orderBy('date', 'desc'));
      const dailySnapshot = await getDocs(dailyQuery);
      const dailyData = dailySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as DailyPerformance[];
      setDailyPerformance(dailyData);

    } catch (err) {
      console.error('Error loading performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnualReview = async () => {
    try {
      if (!annualFormData.employeeId) {
        setError('Please select an employee');
        return;
      }

      const employee = employees.find(e => e.id === annualFormData.employeeId);
      if (!employee) return;

      // Calculate overall rating based on category ratings
      const ratingScores: Record<PerformanceRating, number> = {
        'Excellent': 5,
        'Good': 4,
        'Average': 3,
        'Needs Improvement': 2,
        'Poor': 1,
      };

      const avgScore = annualFormData.categories.reduce((sum, cat) => sum + ratingScores[cat.rating], 0) / annualFormData.categories.length;
      let overallRating: PerformanceRating = 'Average';
      if (avgScore >= 4.5) overallRating = 'Excellent';
      else if (avgScore >= 3.5) overallRating = 'Good';
      else if (avgScore >= 2.5) overallRating = 'Average';
      else if (avgScore >= 1.5) overallRating = 'Needs Improvement';
      else overallRating = 'Poor';

      const reviewData = {
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        reviewerId: currentUser?.uid || '',
        reviewerName: currentUser?.displayName || 'Admin',
        reviewYear: annualFormData.reviewYear,
        reviewPeriod: {
          startDate: new Date(`${annualFormData.reviewYear}-01-01`),
          endDate: new Date(`${annualFormData.reviewYear}-12-31`),
        },
        status: 'completed' as const,
        categories: annualFormData.categories,
        overallRating,
        strengths: annualFormData.strengths,
        areasForImprovement: annualFormData.areasForImprovement,
        achievements: annualFormData.achievements,
        recommendations: annualFormData.recommendations,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      if (editingReview) {
        await updateDoc(doc(db, 'annual_reviews', editingReview.id), reviewData);
        setSuccess('Annual review updated successfully');
      } else {
        await addDoc(collection(db, 'annual_reviews'), reviewData);
        setSuccess('Annual review created successfully');
      }

      setShowAnnualDialog(false);
      resetAnnualForm();
      await loadData();
    } catch (err) {
      console.error('Error saving annual review:', err);
      setError('Failed to save annual review');
    }
  };

  const handleSaveDailyPerformance = async () => {
    try {
      if (!dailyFormData.employeeId) {
        setError('Please select an employee');
        return;
      }

      const employee = employees.find(e => e.id === dailyFormData.employeeId);
      if (!employee) return;

      const performanceData = {
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        trackerId: currentUser?.uid || '',
        trackerName: currentUser?.displayName || 'Admin',
        date: new Date(dailyFormData.date),
        attendance: dailyFormData.attendance,
        punctuality: dailyFormData.punctuality,
        productivity: dailyFormData.productivity,
        quality: dailyFormData.quality,
        behavior: dailyFormData.behavior,
        tasksCompleted: dailyFormData.tasksCompleted,
        notes: dailyFormData.notes,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'daily_performance'), performanceData);
      setSuccess('Daily performance recorded successfully');
      setShowDailyDialog(false);
      resetDailyForm();
      await loadData();
    } catch (err) {
      console.error('Error saving daily performance:', err);
      setError('Failed to save daily performance');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await deleteDoc(doc(db, 'annual_reviews', reviewId));
      setSuccess('Review deleted successfully');
      await loadData();
    } catch (err) {
      console.error('Error deleting review:', err);
      setError('Failed to delete review');
    }
  };

  const handleEditReview = (review: AnnualReview) => {
    setEditingReview(review);
    setAnnualFormData({
      employeeId: employees.find(e => e.employeeId === review.employeeId)?.id || '',
      reviewYear: review.reviewYear,
      categories: review.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        rating: cat.rating,
        comments: cat.comments || '',
      })),
      strengths: review.strengths,
      areasForImprovement: review.areasForImprovement,
      achievements: review.achievements,
      recommendations: review.recommendations,
    });
    setShowAnnualDialog(true);
  };

  const handleViewReview = (review: AnnualReview) => {
    setViewingReview(review);
    setShowViewDialog(true);
  };

  const resetAnnualForm = () => {
    setAnnualFormData({
      employeeId: '',
      reviewYear: new Date().getFullYear(),
      categories: PERFORMANCE_CATEGORIES.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        rating: 'Average' as PerformanceRating,
        comments: '',
      })),
      strengths: '',
      areasForImprovement: '',
      achievements: '',
      recommendations: '',
    });
    setEditingReview(null);
  };

  const resetDailyForm = () => {
    setDailyFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      attendance: 'Present',
      punctuality: 'Good',
      productivity: 'Good',
      quality: 'Good',
      behavior: 'Good',
      tasksCompleted: 0,
      notes: '',
    });
  };

  // Analytics Data
  const getPerformanceDistribution = () => {
    const distribution: Record<PerformanceRating, number> = {
      'Excellent': 0,
      'Good': 0,
      'Average': 0,
      'Needs Improvement': 0,
      'Poor': 0,
    };

    annualReviews.forEach(review => {
      distribution[review.overallRating]++;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const getPerformanceTrend = () => {
    const yearlyData: Record<number, { year: number; excellent: number; good: number; average: number; needsImprovement: number; poor: number }> = {};

    annualReviews.forEach(review => {
      if (!yearlyData[review.reviewYear]) {
        yearlyData[review.reviewYear] = {
          year: review.reviewYear,
          excellent: 0,
          good: 0,
          average: 0,
          needsImprovement: 0,
          poor: 0,
        };
      }

      switch (review.overallRating) {
        case 'Excellent':
          yearlyData[review.reviewYear].excellent++;
          break;
        case 'Good':
          yearlyData[review.reviewYear].good++;
          break;
        case 'Average':
          yearlyData[review.reviewYear].average++;
          break;
        case 'Needs Improvement':
          yearlyData[review.reviewYear].needsImprovement++;
          break;
        case 'Poor':
          yearlyData[review.reviewYear].poor++;
          break;
      }
    });

    return Object.values(yearlyData).sort((a, b) => a.year - b.year);
  };

  const getAttendanceStats = () => {
    const stats: Record<string, number> = {
      Present: 0,
      Absent: 0,
      'Half Day': 0,
      Late: 0,
    };

    dailyPerformance.forEach(record => {
      stats[record.attendance]++;
    });

    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const COLORS = ['#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#f44336'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 1 }}>
            Performance Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track employee performance with annual reviews and daily monitoring
          </Typography>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<Assessment />} label="Overview & Analytics" />
          <Tab icon={<CalendarToday />} label="Annual Reviews" />
          <Tab icon={<Timeline />} label="Daily Tracking" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Stats Cards */}
          {/*@ts-ignore*/}
          <Grid item xs={12} md={3}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#2196f3' }}>
                  Total Reviews
                </Typography>
                <Typography variant="h3" sx={{ color: '#ffffff', mt: 1 }}>
                  {annualReviews.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/*@ts-ignore*/}
          <Grid item xs={12} md={3}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#4caf50' }}>
                  Daily Records
                </Typography>
                <Typography variant="h3" sx={{ color: '#ffffff', mt: 1 }}>
                  {dailyPerformance.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/*@ts-ignore*/}
          <Grid item xs={12} md={3}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ff9800' }}>
                  Employees Reviewed
                </Typography>
                <Typography variant="h3" sx={{ color: '#ffffff', mt: 1 }}>
                  {new Set(annualReviews.map(r => r.employeeId)).size}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/*@ts-ignore*/}
          <Grid item xs={12} md={3}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#9c27b0' }}>
                  Current Year
                </Typography>
                <Typography variant="h3" sx={{ color: '#ffffff', mt: 1 }}>
                  {new Date().getFullYear()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Distribution Chart */}
          {/*@ts-ignore*/}
          <Grid item xs={12} md={6}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Performance Rating Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getPerformanceDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPerformanceDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Distribution Chart */}
          {/*@ts-ignore*/}
          <Grid item xs={12} md={6}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Attendance Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getAttendanceStats()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Trend Chart */}
          {/*@ts-ignore*/}
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#2d2d2d' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                  Performance Trend Over Years
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getPerformanceTrend()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="excellent" stroke="#4caf50" name="Excellent" />
                    <Line type="monotone" dataKey="good" stroke="#8bc34a" name="Good" />
                    <Line type="monotone" dataKey="average" stroke="#ff9800" name="Average" />
                    <Line type="monotone" dataKey="needsImprovement" stroke="#ff5722" name="Needs Improvement" />
                    <Line type="monotone" dataKey="poor" stroke="#f44336" name="Poor" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Annual Reviews Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetAnnualForm();
              setShowAnnualDialog(true);
            }}
            sx={{ backgroundColor: '#2196f3' }}
          >
            Create Annual Review
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Review Year</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Overall Rating</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Reviewed By</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {annualReviews.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((review) => (
                <TableRow key={review.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                  <TableCell sx={{ color: '#ffffff' }}>{review.employeeName}</TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{review.reviewYear}</TableCell>
                  <TableCell>
                    <Chip
                      label={review.overallRating}
                      size="small"
                      sx={{
                        backgroundColor: RATING_COLORS[review.overallRating],
                        color: '#ffffff',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={review.status}
                      size="small"
                      color={review.status === 'completed' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{review.reviewerName}</TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>
                    {review.completedAt?.toLocaleDateString() || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View">
                        <IconButton size="small" sx={{ color: '#2196f3' }} onClick={() => handleViewReview(review)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" sx={{ color: '#ff9800' }} onClick={() => handleEditReview(review)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" sx={{ color: '#f44336' }} onClick={() => handleDeleteReview(review.id)}>
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
        <TablePagination
          component="div"
          count={annualReviews.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ color: '#ffffff' }}
        />
      </TabPanel>

      {/* Daily Tracking Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetDailyForm();
              setShowDailyDialog(true);
            }}
            sx={{ backgroundColor: '#4caf50' }}
          >
            Record Daily Performance
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ backgroundColor: '#2d2d2d' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e1e1e' }}>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Employee</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Attendance</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Punctuality</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Productivity</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Quality</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Tasks</TableCell>
                <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>Tracked By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyPerformance.slice(0, 50).map((record) => (
                <TableRow key={record.id} sx={{ '&:hover': { backgroundColor: '#3d3d3d' } }}>
                  <TableCell sx={{ color: '#ffffff' }}>{record.employeeName}</TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{record.date.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={record.attendance}
                      size="small"
                      color={record.attendance === 'Present' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.punctuality}
                      size="small"
                      sx={{ backgroundColor: RATING_COLORS[record.punctuality], color: '#ffffff' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.productivity}
                      size="small"
                      sx={{ backgroundColor: RATING_COLORS[record.productivity], color: '#ffffff' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.quality}
                      size="small"
                      sx={{ backgroundColor: RATING_COLORS[record.quality], color: '#ffffff' }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{record.tasksCompleted}</TableCell>
                  <TableCell sx={{ color: '#ffffff' }}>{record.trackerName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Annual Review Dialog */}
      <Dialog open={showAnnualDialog} onClose={() => setShowAnnualDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#2d2d2d', color: '#ffffff' }}>
          {editingReview ? 'Edit Annual Review' : 'Create Annual Review'}
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#2d2d2d', mt: 2 }}>
          <Grid container spacing={2}>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={annualFormData.employeeId}
                  label="Employee"
                  onChange={(e) => setAnnualFormData({ ...annualFormData, employeeId: e.target.value })}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Review Year"
                type="number"
                value={annualFormData.reviewYear}
                onChange={(e) => setAnnualFormData({ ...annualFormData, reviewYear: parseInt(e.target.value) })}
              />
            </Grid>

            {/* Performance Categories */}
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Performance Categories
              </Typography>
            </Grid>
            {annualFormData.categories.map((category, index) => (
              <React.Fragment key={category.id}>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ color: '#2196f3' }}>
                    {category.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    {category.description}
                  </Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rating</InputLabel>
                    <Select
                      value={category.rating}
                      label="Rating"
                      onChange={(e) => {
                        const newCategories = [...annualFormData.categories];
                        newCategories[index].rating = e.target.value as PerformanceRating;
                        setAnnualFormData({ ...annualFormData, categories: newCategories });
                      }}
                    >
                      {RATING_OPTIONS.map((rating) => (
                        <MenuItem key={rating} value={rating}>
                          {rating}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Comments"
                    value={category.comments}
                    onChange={(e) => {
                      const newCategories = [...annualFormData.categories];
                      newCategories[index].comments = e.target.value;
                      setAnnualFormData({ ...annualFormData, categories: newCategories });
                    }}
                  />
                </Grid>
              </React.Fragment>
            ))}

            {/* Additional Feedback */}
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Strengths"
                value={annualFormData.strengths}
                onChange={(e) => setAnnualFormData({ ...annualFormData, strengths: e.target.value })}
              />
            </Grid>

            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Areas for Improvement"
                value={annualFormData.areasForImprovement}
                onChange={(e) => setAnnualFormData({ ...annualFormData, areasForImprovement: e.target.value })}
              />
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Achievements"
                value={annualFormData.achievements}
                onChange={(e) => setAnnualFormData({ ...annualFormData, achievements: e.target.value })}
              />
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Recommendations"
                value={annualFormData.recommendations}
                onChange={(e) => setAnnualFormData({ ...annualFormData, recommendations: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#2d2d2d' }}>
          <Button onClick={() => setShowAnnualDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveAnnualReview} variant="contained" sx={{ backgroundColor: '#2196f3' }}>
            Save Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Daily Performance Dialog */}
      <Dialog open={showDailyDialog} onClose={() => setShowDailyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#2d2d2d', color: '#ffffff' }}>
          Record Daily Performance
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#2d2d2d', mt: 2 }}>
          <Grid container spacing={2}>
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Employee</InputLabel>
                <Select
                  value={dailyFormData.employeeId}
                  label="Employee"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, employeeId: e.target.value })}
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={dailyFormData.date}
                onChange={(e) => setDailyFormData({ ...dailyFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Attendance</InputLabel>
                <Select
                  value={dailyFormData.attendance}
                  label="Attendance"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, attendance: e.target.value as any })}
                >
                  <MenuItem value="Present">Present</MenuItem>
                  <MenuItem value="Absent">Absent</MenuItem>
                  <MenuItem value="Half Day">Half Day</MenuItem>
                  <MenuItem value="Late">Late</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Tasks Completed"
                value={dailyFormData.tasksCompleted}
                onChange={(e) => setDailyFormData({ ...dailyFormData, tasksCompleted: parseInt(e.target.value) })}
              />
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Punctuality</InputLabel>
                <Select
                  value={dailyFormData.punctuality}
                  label="Punctuality"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, punctuality: e.target.value as PerformanceRating })}
                >
                  {RATING_OPTIONS.map((rating) => (
                    <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Productivity</InputLabel>
                <Select
                  value={dailyFormData.productivity}
                  label="Productivity"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, productivity: e.target.value as PerformanceRating })}
                >
                  {RATING_OPTIONS.map((rating) => (
                    <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={dailyFormData.quality}
                  label="Quality"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, quality: e.target.value as PerformanceRating })}
                >
                  {RATING_OPTIONS.map((rating) => (
                    <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Behavior</InputLabel>
                <Select
                  value={dailyFormData.behavior}
                  label="Behavior"
                  onChange={(e) => setDailyFormData({ ...dailyFormData, behavior: e.target.value as PerformanceRating })}
                >
                  {RATING_OPTIONS.map((rating) => (
                    <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/*@ts-ignore*/}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={dailyFormData.notes}
                onChange={(e) => setDailyFormData({ ...dailyFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#2d2d2d' }}>
          <Button onClick={() => setShowDailyDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveDailyPerformance} variant="contained" sx={{ backgroundColor: '#4caf50' }}>
            Save Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Review Dialog */}
      <Dialog open={showViewDialog} onClose={() => setShowViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#2d2d2d', color: '#ffffff' }}>
          Performance Review Details
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#2d2d2d', mt: 2 }}>
          {viewingReview && (
            <Box>
              <Grid container spacing={2}>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Employee</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.employeeName}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Review Year</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.reviewYear}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Overall Rating</Typography>
                  <Chip
                    label={viewingReview.overallRating}
                    sx={{ backgroundColor: RATING_COLORS[viewingReview.overallRating], color: '#ffffff', mt: 1 }}
                  />
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Reviewed By</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.reviewerName}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ color: '#2196f3', mt: 2, mb: 1 }}>
                    Performance Categories
                  </Typography>
                </Grid>
                {viewingReview.categories.map((cat) => (
                  // @ts-ignore
                  <Grid item xs={12} key={cat.id}>
                    <Card sx={{ backgroundColor: '#3d3d3d', p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: '#ffffff' }}>{cat.name}</Typography>
                        <Chip
                          label={cat.rating}
                          size="small"
                          sx={{ backgroundColor: RATING_COLORS[cat.rating], color: '#ffffff' }}
                        />
                      </Box>
                      {cat.comments && (
                        <Typography variant="body2" color="text.secondary">{cat.comments}</Typography>
                      )}
                    </Card>
                  </Grid>
                ))}

                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ color: '#2196f3', mt: 2, mb: 1 }}>Feedback</Typography>
                </Grid>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.strengths || 'N/A'}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.areasForImprovement || 'N/A'}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Achievements</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.achievements || 'N/A'}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.achievements || 'N/A'}</Typography>
                </Grid>
                {/*@ts-ignore*/}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Recommendations</Typography>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>{viewingReview.recommendations || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#2d2d2d' }}>
          <Button onClick={() => setShowViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
