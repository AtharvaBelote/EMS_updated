"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Divider,
  Slider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  Save,
  Close,
  Info,
  Settings,
  CalendarMonth,
  ExpandMore,
  SelectAll,
  DeselectOutlined,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Employee } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { eachDayOfInterval, format, startOfDay } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceDeductionConfig {
  present: number;    // % of daily salary deducted (0 = no deduction)
  absent: number;     // % of daily salary deducted (100 = full day cut)
  "half-day": number; // % of daily salary deducted (50 = half day cut)
  leave: number;      // % of daily salary deducted
}

export const DEFAULT_DEDUCTION_CONFIG: AttendanceDeductionConfig = {
  present: 0,
  absent: 100,
  "half-day": 50,
  leave: 0,
};

interface ManagerOption {
  id: string;
  name: string;
}

// attendance per day: { [employeeId]: status }
interface DayAttendance {
  [employeeId: string]: string;
}

interface BulkAttendanceEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const attendanceStatuses = [
  { value: "present", label: "Present", color: "success" as const },
  { value: "absent", label: "Absent", color: "error" as const },
  { value: "half-day", label: "Half Day", color: "warning" as const },
  { value: "leave", label: "Leave", color: "info" as const },
];

// ─── Deduction Config Panel ───────────────────────────────────────────────────

interface DeductionConfigPanelProps {
  config: AttendanceDeductionConfig;
  onChange: (config: AttendanceDeductionConfig) => void;
}

function DeductionConfigPanel({ config, onChange }: DeductionConfigPanelProps) {
  const statusLabels: { key: keyof AttendanceDeductionConfig; label: string; color: string }[] = [
    { key: "present", label: "Present", color: "#2e7d32" },
    { key: "absent", label: "Absent", color: "#c62828" },
    { key: "half-day", label: "Half Day", color: "#e65100" },
    { key: "leave", label: "Leave", color: "#0277bd" },
  ];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Settings fontSize="small" />
        Deduction % per Status
        <Tooltip title="0% = no deduction from daily salary. 100% = full day deducted. 200% = double deduction. This affects base salary after attendance.">
          <Info fontSize="small" color="action" sx={{ cursor: "help" }} />
        </Tooltip>
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {statusLabels.map(({ key, label, color }) => (
          <Box key={key}>
            <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
              {label}: {config[key]}%
            </Typography>
            <Slider
              value={config[key]}
              min={0}
              max={200}
              step={10}
              onChange={(_, val) => onChange({ ...config, [key]: val as number })}
              sx={{ color }}
              size="small"
              marks={[
                { value: 0, label: "0%" },
                { value: 100, label: "100%" },
                { value: 200, label: "200%" },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              {config[key] === 0
                ? "No deduction"
          