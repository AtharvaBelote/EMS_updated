'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Business,
  People,
  Settings,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Celebration,
  Dashboard,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function OnboardingWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<{ [k: number]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleNext = () => {
    setCompleted((prev) => ({ ...prev, [activeStep]: true }));
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSkip = () => {
    setCompleted((prev) => ({ ...prev, [activeStep]: true }));
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Mark onboarding as completed
      // You can add logic here to update user preferences
      setTimeout(() => {
        router.push('/dashboard'); // This will show admin panel for new company owners
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      label: 'Welcome to Your Dashboard',
      description: 'Get started with your new company account',
      icon: <Celebration />,
      content: (
        <Box>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ backgroundColor: '#4caf50', width: 60, height: 60 }}>
                  <Business sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                    Welcome, {currentUser?.displayName}!
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
                    Your company account has been successfully created
                  </Typography>
                </Box>
              </Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                🎉 Your company is now ready to start managing employees and payroll!
              </Alert>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                This quick setup will help you get started with the essential features:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Company Profile Setup" 
                    secondary="Configure your company details and preferences"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Add Your First Employee" 
                    secondary="Start building your team"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Configure Payroll Settings" 
                    secondary="Set up salary structures and deductions"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      label: 'Company Profile',
      description: 'Review and update your company information',
      icon: <Business />,
      content: (
        <Box>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Company Information
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                <Chip 
                  label="Company Name" 
                  variant="outlined" 
                  sx={{ borderColor: '#4caf50', color: '#4caf50' }}
                />
                <Chip 
                  label="Domain" 
                  variant="outlined" 
                  sx={{ borderColor: '#2196f3', color: '#2196f3' }}
                />
                <Chip 
                  label="Industry" 
                  variant="outlined" 
                  sx={{ borderColor: '#ff9800', color: '#ff9800' }}
                />
                <Chip 
                  label="Status: Active" 
                  sx={{ backgroundColor: '#4caf50', color: '#ffffff' }}
                />
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                💡 You can update your company profile anytime from the Settings page
              </Alert>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Your company profile is now active. You can customize it further by:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Upload a company logo" 
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff', fontSize: '0.9rem' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Add company address and contact details" 
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff', fontSize: '0.9rem' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Configure company policies and settings" 
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff', fontSize: '0.9rem' } }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      label: 'Add Your First Employee',
      description: 'Start building your team',
      icon: <People />,
      content: (
        <Box>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Ready to Add Employees
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                ✅ Your employee management system is ready!
              </Alert>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                You can now start adding employees to your team. Here's what you can do:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Add individual employees" 
                    secondary="Fill out employee details and create accounts"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Bulk import employees" 
                    secondary="Upload CSV file with employee data"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Set up employee roles" 
                    secondary="Assign managers and regular employees"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                  💡 Pro Tip:
                </Typography>
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  Start with a few test employees to familiarize yourself with the system before adding your entire team.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      label: 'Configure Payroll',
      description: 'Set up salary structures and payroll settings',
      icon: <Settings />,
      content: (
        <Box>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                Payroll Configuration
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                ⚙️ Configure your payroll settings to get started
              </Alert>
              <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                Set up your payroll system with these essential configurations:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Salary Structures" 
                    secondary="Define base salary, HRA, TA, DA, and other components"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tax Settings" 
                    secondary="Configure tax regimes and deduction rules"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Bonus & Deductions" 
                    secondary="Set up performance bonuses and custom deductions"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Payroll Schedule" 
                    secondary="Configure monthly payroll processing dates"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                  ⚠️ Important:
                </Typography>
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  Make sure to configure payroll settings before processing your first payroll to avoid errors.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ),
    },
    {
      label: 'You\'re All Set!',
      description: 'Start using your employee management system',
      icon: <Dashboard />,
      content: (
        <Box>
          <Card sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', mb: 3 }}>
            <CardContent>
              <Box textAlign="center" mb={3}>
                <Avatar sx={{ backgroundColor: '#4caf50', width: 80, height: 80, mx: 'auto', mb: 2 }}>
                  <Celebration sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 'bold', mb: 1 }}>
                  🎉 Congratulations!
                </Typography>
                <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
                  Your employee management system is ready to use
                </Typography>
              </Box>
              
              <Alert severity="success" sx={{ mb: 3 }}>
                ✅ All setup steps completed successfully!
              </Alert>

              <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
                What's Next?
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Explore your dashboard" 
                    secondary="Get familiar with the main features and navigation"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Add your first employee" 
                    secondary="Start building your team by adding employees"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Configure payroll settings" 
                    secondary="Set up salary structures and tax configurations"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Set up attendance tracking" 
                    secondary="Configure attendance policies and monitoring"
                    sx={{ '& .MuiListItemText-primary': { color: '#ffffff' }, '& .MuiListItemText-secondary': { color: '#b0b0b0' } }}
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 3, p: 2, backgroundColor: '#1e1e1e', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#2196f3', fontWeight: 'bold', mb: 1 }}>
                  📞 Need Help?
                </Typography>
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  Our support team is here to help you get the most out of your employee management system. 
                  You can access help documentation and contact support from the Settings page.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ backgroundColor: '#2d2d2d', border: '1px solid #333', p: 3 }}>
        <Typography variant="h4" sx={{ color: '#ffffff', mb: 3, textAlign: 'center' }}>
          Welcome to Your Employee Management System
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ '& .MuiStepLabel-root': { color: '#ffffff' } }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: completed[index] ? '#4caf50' : activeStep === index ? '#2196f3' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}
                  >
                    {completed[index] ? <CheckCircle sx={{ fontSize: 20 }} /> : step.icon}
                  </Box>
                )}
              >
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                  {step.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2 }}>
                  {step.content}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={loading}
                      sx={{
                        backgroundColor: '#4caf50',
                        '&:hover': { backgroundColor: '#388e3c' },
                      }}
                      endIcon={index === steps.length - 1 ? undefined : <ArrowForward />}
                    >
                      {index === steps.length - 1 ? (loading ? <CircularProgress size={20} /> : 'Get Started') : 'Continue'}
                    </Button>
                    {index !== steps.length - 1 && (
                      <Button
                        variant="outlined"
                        onClick={handleSkip}
                        sx={{
                          borderColor: '#666',
                          color: '#b0b0b0',
                          '&:hover': { borderColor: '#999' },
                        }}
                      >
                        Skip
                      </Button>
                    )}
                    {index !== 0 && (
                      <Button
                        variant="outlined"
                        onClick={handleBack}
                        startIcon={<ArrowBack />}
                        sx={{
                          borderColor: '#666',
                          color: '#b0b0b0',
                          '&:hover': { borderColor: '#999' },
                        }}
                      >
                        Back
                      </Button>
                    )}
                  </Box>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
} 