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

type UploadField = "logoUrl" | "stampUrl" | "signUrl";

type UploadStatus = {
  state: "idle" | "uploading" | "success" | "error";
  message: string;
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
  const [uploadStatuses, setUploadStatuses] = useState<
    Record<string, UploadStatus>
  >({});
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
    field: UploadField,
    file?: File,
  ) => {
    if (!file) return;

    const statusKey = `${assetId}:${field}`;

    const uploadFile = async () => {
      try {
        setUploadStatuses((prev) => ({
          ...prev,
          [statusKey]: {
            state: "uploading",
            message: "Uploading...",
          },
        }));
        setError("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("assetField", field);

        const response = await fetch("/api/uploads/r2", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || "Upload failed.");
        }

        const payload = (await response.json()) as { url: string };
        updateAsset(assetId, { [field]: payload.url } as Partial<BrandingAsset>);

        setUploadStatuses((prev) => ({
          ...prev,
          [statusKey]: {
            state: "success",
            message: "Upload successful.",
          },
        }));
      } catch (e) {
        console.error("Error uploading file to R2:", e);
        const message =
          e instanceof Error && e.message
            ? e.message
            : "Upload failed. Please try again.";
        setUploadStatuses((prev) => ({
          ...prev,
          [statusKey]: {
            state: "error",
            message,
          },
        }));
        setError(message);
      }
    };

    void uploadFile();
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

  const anyUploading = Object.values(uploadStatuses).some(
    (status) => status.state === "uploading",
  );

  const getUploadStatus = (assetId: string, field: UploadField) =>
    uploadStatuses[`${assetId}:${field}`];

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
    </Box>
  );
}
