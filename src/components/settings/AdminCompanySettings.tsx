"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete, Save } from "@mui/icons-material";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

type BrandingAsset = {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  logoUrl: string;
  stampUrl: string;
  signUrl: string;
  isDefault: boolean;
};

type CompanySettingsForm = {
  companyName: string;
  adminName: string;
  adminMobile: string;
  email: string;
  address: {
    buildingBlock: string;
    street: string;
    city: string;
    state: string;
    pinCode: string;
  };
  brandingAssets: BrandingAsset[];
};

const emptyAsset = (): BrandingAsset => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  companyName: "",
  companyAddress: "",
  logoUrl: "",
  stampUrl: "",
  signUrl: "",
  isDefault: false,
});

export default function AdminCompanySettings() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<CompanySettingsForm>({
    companyName: "",
    adminName: "",
    adminMobile: "",
    email: "",
    address: {
      buildingBlock: "",
      street: "",
      city: "",
      state: "",
      pinCode: "",
    },
    brandingAssets: [],
  });

  useEffect(() => {
    const loadCompanySettings = async () => {
      if (!currentUser?.uid || currentUser.role !== "admin") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const companyRef = doc(db, "companies", currentUser.uid);
        const snapshot = await getDoc(companyRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as Record<string, unknown>;
          const address =
            (data.address as Record<string, unknown> | undefined) || {};
          setForm({
            companyName: String(data.companyName || ""),
            adminName: String(data.adminName || ""),
            adminMobile: String(data.adminMobile || ""),
            email: String(data.email || ""),
            address: {
              buildingBlock: String(address.buildingBlock || ""),
              street: String(address.street || ""),
              city: String(address.city || ""),
              state: String(address.state || ""),
              pinCode: String(address.pinCode || ""),
            },
            brandingAssets: Array.isArray(data.brandingAssets)
              ? (data.brandingAssets as BrandingAsset[]).map((asset) => ({
                  ...emptyAsset(),
                  ...asset,
                  companyName: String(asset.companyName || ""),
                  companyAddress: String(asset.companyAddress || ""),
                }))
              : [],
          });
        }
      } catch (e) {
        console.error("Error loading admin company settings:", e);
        setError("Failed to load company settings.");
      } finally {
        setLoading(false);
      }
    };

    loadCompanySettings();
  }, [currentUser]);

  const updateAsset = (id: string, patch: Partial<BrandingAsset>) => {
    setForm((prev) => ({
      ...prev,
      brandingAssets: prev.brandingAssets.map((asset) =>
        asset.id === id ? { ...asset, ...patch } : asset,
      ),
    }));
  };

  const setDefaultAsset = (id: string) => {
    setForm((prev) => ({
      ...prev,
      brandingAssets: prev.brandingAssets.map((asset) => ({
        ...asset,
        isDefault: asset.id === id,
      })),
    }));
  };

  const addAsset = () => {
    setForm((prev) => ({
      ...prev,
      brandingAssets: [...prev.brandingAssets, emptyAsset()],
    }));
  };

  const removeAsset = (id: string) => {
    setForm((prev) => ({
      ...prev,
      brandingAssets: prev.brandingAssets.filter((asset) => asset.id !== id),
    }));
  };

  const handleAssetFileUpload = (
    assetId: string,
    field: "logoUrl" | "stampUrl" | "signUrl",
    file?: File,
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      updateAsset(assetId, { [field]: result } as Partial<BrandingAsset>);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const normalizedAssets = [...form.brandingAssets];
      if (
        normalizedAssets.length > 0 &&
        !normalizedAssets.some((a) => a.isDefault)
      ) {
        normalizedAssets[0] = { ...normalizedAssets[0], isDefault: true };
      }

      const payload = {
        companyName: form.companyName,
        adminName: form.adminName,
        adminMobile: form.adminMobile,
        email: form.email,
        address: {
          buildingBlock: form.address.buildingBlock,
          street: form.address.street,
          city: form.address.city,
          state: form.address.state,
          pinCode: form.address.pinCode,
        },
        brandingAssets: normalizedAssets,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "companies", currentUser.uid), payload, {
        merge: true,
      });

      setSuccess("Company settings saved successfully.");
    } catch (e) {
      console.error("Error saving company settings:", e);
      setError("Failed to save company settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="320px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: "#ffffff" }}>
        Company Settings
      </Typography>

      <Typography variant="body1" sx={{ color: "#b0b0b0", mb: 3 }}>
        Configure company profile and payslip branding assets.
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

      <Card
        sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333", mb: 3 }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: "#ffffff", mb: 2 }}>
            Company Profile
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box>
              <TextField
                fullWidth
                label="Company Name"
                value={form.companyName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, companyName: e.target.value }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Company Email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Admin Name"
                value={form.adminName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, adminName: e.target.value }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Admin Mobile"
                value={form.adminMobile}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, adminMobile: e.target.value }))
                }
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" },
              gap: 2,
              mt: 2,
            }}
          >
            <Box>
              <TextField
                fullWidth
                label="Building/Block"
                value={form.address.buildingBlock}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, buildingBlock: e.target.value },
                  }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Street"
                value={form.address.street}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value },
                  }))
                }
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
              gap: 2,
              mt: 2,
            }}
          >
            <Box>
              <TextField
                fullWidth
                label="City"
                value={form.address.city}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value },
                  }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="State"
                value={form.address.state}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: e.target.value },
                  }))
                }
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Pin Code"
                value={form.address.pinCode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, pinCode: e.target.value },
                  }))
                }
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" sx={{ color: "#ffffff" }}>
              Payslip Branding Assets
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={addAsset}>
              Add Logo / Stamp / Sign Set
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 2 }}>
            Add multiple sets. Mark one as default to be used on payslip
            preview/download.
          </Typography>

          {form.brandingAssets.length === 0 && (
            <Paper sx={{ p: 2, bgcolor: "#1f1f1f", border: "1px dashed #555" }}>
              <Typography sx={{ color: "#9ca3af" }}>
                No branding set added yet.
              </Typography>
            </Paper>
          )}

          {form.brandingAssets.map((asset, index) => (
            <Box key={asset.id} sx={{ mb: 2 }}>
              <Paper
                sx={{ p: 2, bgcolor: "#1f1f1f", border: "1px solid #444" }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography sx={{ color: "#ffffff", fontWeight: 600 }}>
                    Branding Set {index + 1}
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={() => removeAsset(asset.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <Box>
                    <TextField
                      fullWidth
                      label="Set Name"
                      value={asset.name}
                      onChange={(e) =>
                        updateAsset(asset.id, { name: e.target.value })
                      }
                    />
                  </Box>
                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={asset.isDefault}
                          onChange={() => setDefaultAsset(asset.id)}
                        />
                      }
                      label="Use this as default"
                      sx={{ color: "#ffffff", mt: 1 }}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Company Name for this asset"
                      value={asset.companyName}
                      onChange={(e) =>
                        updateAsset(asset.id, { companyName: e.target.value })
                      }
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Company Address for this asset"
                      value={asset.companyAddress}
                      onChange={(e) =>
                        updateAsset(asset.id, {
                          companyAddress: e.target.value,
                        })
                      }
                      multiline
                      minRows={2}
                    />
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Box>
                    <TextField
                      fullWidth
                      label="Logo URL"
                      value={asset.logoUrl}
                      onChange={(e) =>
                        updateAsset(asset.id, { logoUrl: e.target.value })
                      }
                    />
                    <Button component="label" size="small" sx={{ mt: 1 }}>
                      Upload Logo
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleAssetFileUpload(
                            asset.id,
                            "logoUrl",
                            e.target.files?.[0],
                          )
                        }
                      />
                    </Button>
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Stamp URL (for this logo)"
                      value={asset.stampUrl}
                      onChange={(e) =>
                        updateAsset(asset.id, { stampUrl: e.target.value })
                      }
                    />
                    <Button component="label" size="small" sx={{ mt: 1 }}>
                      Upload Stamp
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleAssetFileUpload(
                            asset.id,
                            "stampUrl",
                            e.target.files?.[0],
                          )
                        }
                      />
                    </Button>
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Signature URL (for this logo)"
                      value={asset.signUrl}
                      onChange={(e) =>
                        updateAsset(asset.id, { signUrl: e.target.value })
                      }
                    />
                    <Button component="label" size="small" sx={{ mt: 1 }}>
                      Upload Signature
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleAssetFileUpload(
                            asset.id,
                            "signUrl",
                            e.target.files?.[0],
                          )
                        }
                      />
                    </Button>
                  </Box>
                </Box>
              </Paper>
              <Divider sx={{ mt: 2, borderColor: "#444" }} />
            </Box>
          ))}
        </CardContent>
      </Card>

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </Box>
    </Box>
  );
}
