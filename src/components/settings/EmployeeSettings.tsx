"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  LocationOn,
  Save,
  Edit,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Employee } from "@/types";

const schema = yup
  .object({
    fullName: yup.string().required("Full name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    mobile: yup.string().required("Mobile number is required"),
    address: yup.string().required("Address is required"),
  })
  .required();

interface FormData {
  fullName: string;
  email: string;
  mobile: string;
  address: string;
}

export default function EmployeeSettings() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [employeeDocId, setEmployeeDocId] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
      address: "",
    },
  });

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!currentUser?.employeeId) {
        setError("Employee ID not found. Please contact administrator.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const employeeDoc = await getDoc(
          doc(db, "employees", currentUser.employeeId),
        );

        if (employeeDoc.exists()) {
          const data = employeeDoc.data() as Employee;
          setEmployeeDocId(employeeDoc.id);
          setEmployeeData(data);

          // Set form values
          const formData = {
            fullName: data.fullName || "",
            email: data.email || "",
            mobile: String(data.mobile || ""),
            address: data.address || "",
          };
          reset(formData);
        } else {
          // Try to find employee by email as fallback
          const employeesQuery = query(
            collection(db, "employees"),
            where("email", "==", currentUser.email),
          );
          const employeesSnapshot = await getDocs(employeesQuery);

          if (!employeesSnapshot.empty) {
            const employeeDocSnapshot = employeesSnapshot.docs[0];
            const employeeData = employeeDocSnapshot.data() as Employee;
            setEmployeeDocId(employeeDocSnapshot.id);
            setEmployeeData(employeeData);

            const formData = {
              fullName: employeeData.fullName || "",
              email: employeeData.email || "",
              mobile: String(employeeData.mobile || ""),
              address: employeeData.address || "",
            };
            reset(formData);
          } else {
            setError("Employee data not found. Please contact administrator.");
          }
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
        setError("Failed to load employee data");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [currentUser?.employeeId, reset]);

  const onSubmit = async (data: FormData) => {
    if (!employeeDocId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Prepare update data
      const updateData: any = {
        fullName: data.fullName,
        mobile: data.mobile,
        address: data.address,
        updatedAt: new Date(),
      };

      // Update employee document
      await updateDoc(doc(db, "employees", employeeDocId), updateData);

      // Update local state
      setEmployeeData((prev) =>
        prev
          ? {
              ...prev,
              ...updateData,
            }
          : null,
      );

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      reset(data); // Reset form with new values
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (employeeData) {
      reset({
        fullName: employeeData.fullName || "",
        email: employeeData.email || "",
        mobile: String(employeeData.mobile || ""),
        address: employeeData.address || "",
      });
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: "#ffffff" }}>
        Profile Settings
      </Typography>

      <Typography variant="body1" sx={{ color: "#b0b0b0", mb: 3 }}>
        Update your personal information and contact details
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

      <Grid container spacing={3}>
        {/* Profile Overview */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 2,
                  backgroundColor: "#2196f3",
                  fontSize: "2rem",
                }}
              >
                {employeeData?.fullName?.charAt(0).toUpperCase() || "E"}
              </Avatar>

              <Typography variant="h6" sx={{ color: "#ffffff", mb: 1 }}>
                {employeeData?.fullName}
              </Typography>

              <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 2 }}>
                Employee ID: {employeeData?.employeeId}
              </Typography>

              <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                Department: {employeeData?.department}
              </Typography>

              {employeeData?.joiningDate && (
                <Typography variant="body2" sx={{ color: "#b0b0b0", mt: 1 }}>
                  Joined:{" "}
                  {new Date(
                    employeeData.joiningDate.seconds * 1000,
                  ).toLocaleDateString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Edit Form */}
        {/* @ts-ignore */}
        <Grid item xs={12} md={8}>
          <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography variant="h6" sx={{ color: "#ffffff" }}>
                  Personal Information
                </Typography>

                {!isEditing ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                    sx={{
                      color: "#2196f3",
                      borderColor: "#2196f3",
                      "&:hover": {
                        borderColor: "#1976d2",
                        backgroundColor: "rgba(33, 150, 243, 0.1)",
                      },
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={saving}
                      sx={{
                        color: "#f44336",
                        borderColor: "#f44336",
                        "&:hover": {
                          borderColor: "#d32f2f",
                          backgroundColor: "rgba(244, 67, 54, 0.1)",
                        },
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmit(onSubmit)}
                      disabled={saving || !isDirty}
                      startIcon={
                        saving ? <CircularProgress size={16} /> : <Save />
                      }
                      sx={{
                        backgroundColor: "#2196f3",
                        "&:hover": {
                          backgroundColor: "#1976d2",
                        },
                        "&:disabled": {
                          backgroundColor: "#666",
                        },
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </Box>
                )}
              </Box>

              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="fullName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Full Name"
                          fullWidth
                          disabled={!isEditing}
                          error={!!errors.fullName}
                          helperText={errors.fullName?.message}
                          InputProps={{
                            startAdornment: (
                              <Person sx={{ color: "#666", mr: 1 }} />
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#444",
                              },
                              "&:hover fieldset": {
                                borderColor: isEditing ? "#2196f3" : "#444",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#2196f3",
                              },
                            },
                            "& .MuiInputLabel-root": {
                              color: "#b0b0b0",
                            },
                            "& .MuiInputBase-input": {
                              color: "#ffffff",
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email"
                          type="email"
                          fullWidth
                          disabled
                          InputProps={{
                            startAdornment: (
                              <Email sx={{ color: "#666", mr: 1 }} />
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#444",
                              },
                              "&:hover fieldset": {
                                borderColor: isEditing ? "#2196f3" : "#444",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#2196f3",
                              },
                            },
                            "& .MuiInputLabel-root": {
                              color: "#b0b0b0",
                            },
                            "& .MuiInputBase-input": {
                              color: "#ffffff",
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="mobile"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Mobile Number"
                          fullWidth
                          disabled={!isEditing}
                          error={!!errors.mobile}
                          helperText={errors.mobile?.message}
                          InputProps={{
                            startAdornment: (
                              <Phone sx={{ color: "#666", mr: 1 }} />
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#444",
                              },
                              "&:hover fieldset": {
                                borderColor: isEditing ? "#2196f3" : "#444",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#2196f3",
                              },
                            },
                            "& .MuiInputLabel-root": {
                              color: "#b0b0b0",
                            },
                            "& .MuiInputBase-input": {
                              color: "#ffffff",
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={12}>
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Address"
                          fullWidth
                          multiline
                          rows={3}
                          disabled={!isEditing}
                          error={!!errors.address}
                          helperText={errors.address?.message}
                          InputProps={{
                            startAdornment: (
                              <LocationOn
                                sx={{ color: "#666", mr: 1, mt: 1 }}
                              />
                            ),
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#444",
                              },
                              "&:hover fieldset": {
                                borderColor: isEditing ? "#2196f3" : "#444",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#2196f3",
                              },
                            },
                            "& .MuiInputLabel-root": {
                              color: "#b0b0b0",
                            },
                            "& .MuiInputBase-input": {
                              color: "#ffffff",
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
