'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Alert,
  Paper,
} from '@mui/material';
import { CheckCircle, ContentCopy, Check, Info } from '@mui/icons-material';
import { copyToClipboard } from '@/lib/utils';

interface RegistrationSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userRole: string;
  userName: string;
}

export default function RegistrationSuccessDialog({
  open,
  onClose,
  userId,
  userRole,
  userName,
}: RegistrationSuccessDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const handleCopyUserId = async () => {
    try {
      const success = await copyToClipboard(userId);
      if (success) {
        setCopied(true);
        setCopyError('');
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopyError('Failed to copy User ID');
      }
    } catch (error) {
      setCopyError('Failed to copy User ID');
    }
  };

  const handleClose = () => {
    setCopied(false);
    setCopyError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e',
          borderRadius: 3,
          border: '1px solid #333',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        borderBottom: '1px solid #333',
        backgroundColor: '#1e1e1e'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CheckCircle sx={{ color: '#4caf50', fontSize: 28 }} />
          <Typography 
            variant="h5" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1.5rem'
            }}
          >
            Registration Successful!
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, backgroundColor: '#1e1e1e' }}>
        {/* Main Success Box */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#e8f5e8',
            border: '2px solid #4caf50',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)',
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2,
              color: '#2e7d32',
              fontSize: '1rem',
              fontWeight: 500,
              lineHeight: 1.5
            }}
          >
            Welcome, <strong>{userName}</strong>! Your {userRole} account has been created successfully.
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 2,
              color: '#2e7d32',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Your UserID is:
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
            <TextField
              value={userId}
              fullWidth
              variant="outlined"
              size="medium"
              InputProps={{
                readOnly: true,
                sx: {
                  backgroundColor: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: '#2e7d32',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50',
                    borderWidth: '2px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#45a049',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4caf50',
                  },
                },
              }}
            />
            <IconButton
              onClick={handleCopyUserId}
              sx={{ 
                minWidth: 48,
                height: 48,
                backgroundColor: copied ? '#4caf50' : '#f5f5f5',
                color: copied ? '#ffffff' : '#4caf50',
                border: '2px solid #4caf50',
                '&:hover': {
                  backgroundColor: copied ? '#45a049' : '#e8f5e8',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {copied ? <Check sx={{ fontSize: 20 }} /> : <ContentCopy sx={{ fontSize: 20 }} />}
            </IconButton>
          </Box>
          
          {copyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {copyError}
            </Alert>
          )}
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#2e7d32',
              fontSize: '0.9rem',
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            <strong>Please save this UserID for login.</strong> You can use this ID along with your password to access the system.
          </Typography>
        </Paper>

        {/* Important Alert Box */}
        <Alert 
          severity="info" 
          icon={<Info sx={{ color: '#2196f3' }} />}
          sx={{ 
            mb: 3,
            backgroundColor: '#1a237e',
            color: '#ffffff',
            border: '1px solid #3f51b5',
            borderRadius: 2,
            '& .MuiAlert-message': {
              color: '#ffffff',
            },
            '& .MuiAlert-icon': {
              color: '#2196f3',
            }
          }}
        >
          <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
            <strong>Important:</strong> Please note down your UserID and password in a secure location. 
            You will need these credentials to log in to the system.
          </Typography>
        </Alert>

        {/* Bottom Text */}
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#b0b0b0',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            textAlign: 'center',
            mb: 2
          }}
        >
          You can now log in to the system using your UserID and password. 
          If you forget your credentials, please contact your system administrator.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        pt: 0,
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #333',
        justifyContent: 'flex-end'
      }}>
        <Button 
          onClick={handleClose} 
          variant="contained" 
          sx={{
            backgroundColor: '#2196f3',
            color: '#ffffff',
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            fontSize: '0.95rem',
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
            '&:hover': {
              backgroundColor: '#1976d2',
              boxShadow: '0 6px 16px rgba(33, 150, 243, 0.4)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          Continue to Login
        </Button>
      </DialogActions>
    </Dialog>
  );
} 