'use client';

import React from 'react';
import { Box, Typography, Card, CardContent, Button, Chip } from '@mui/material';
import Layout from '@/components/layout/Layout';
import { FolderOpen, CloudUpload, Security, Assignment } from '@mui/icons-material';

export default function DocumentsPage() {
    return (
        <Layout>
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 600, mb: 3 }}>
                    Document Management
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            lg: 'repeat(4, 1fr)',
                        },
                        gap: 3,
                    }}
                >
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CloudUpload sx={{ color: '#4caf50', mr: 1 }} />
                                <Typography variant="h6">Upload Documents</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Upload and manage employee documents
                            </Typography>
                            <Button variant="outlined" size="small">
                                Upload Files
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Assignment sx={{ color: '#2196f3', mr: 1 }} />
                                <Typography variant="h6">Document Templates</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create and manage document templates
                            </Typography>
                            <Button variant="outlined" size="small">
                                View Templates
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Security sx={{ color: '#ff9800', mr: 1 }} />
                                <Typography variant="h6">Compliance Docs</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Track compliance and expiry dates
                            </Typography>
                            <Button variant="outlined" size="small">
                                View Compliance
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <FolderOpen sx={{ color: '#9c27b0', mr: 1 }} />
                                <Typography variant="h6">Document Library</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Browse and search all documents
                            </Typography>
                            <Button variant="outlined" size="small">
                                Browse Library
                            </Button>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Coming Soon</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Document management features are under development. This will include:
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <Chip label="File Upload & Storage" sx={{ mr: 1, mb: 1 }} />
                        <Chip label="Document Templates" sx={{ mr: 1, mb: 1 }} />
                        <Chip label="Digital Signatures" sx={{ mr: 1, mb: 1 }} />
                        <Chip label="Version Control" sx={{ mr: 1, mb: 1 }} />
                        <Chip label="Expiry Tracking" sx={{ mr: 1, mb: 1 }} />
                        <Chip label="Compliance Management" sx={{ mr: 1, mb: 1 }} />
                    </Box>
                </Box>
            </Box>
        </Layout>
    );
}