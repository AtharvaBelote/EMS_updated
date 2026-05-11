"use client";

/**
 * TemplateSalaryView
 *
 * Renders the salary calculation table driven by a SalaryTemplate.
 * - Tabs = template sections
 * - Columns = template columns (with formula evaluation)
 * - "All Managers" → union of all sections across all assigned templates; missing = "-"
 * - Per-manager → that manager's assigned template (or global fallback)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  SalaryTemplate,
  TemplateSection,
  TemplateColumn,
  salaryTemplateService,
  evaluateTemplateFormula,
} from "@/lib/salaryTemplateService";
import { Employee } from "@/types";
import {
  fetchAttendanceVariables,
  AttendanceVariables,
} from "@/lib/attendanceDeductionUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManagerInfo {
  id: string;
  name: string;
  salaryTemplateId?: string;
}

interface Props {
  employees: Employee[];
  managers: ManagerInfo[];
  selectedManagerId: string;
  page: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (r: number) => void;
  onEditEmployee: (emp: Employee) => void;
}

// ─── Formula evaluator ────────────────────────────────────────────────────────

function buildEmployeeCtx(emp: Employee): Record<string, unknown> {
  const s = emp.salary ?? {};
  return {
    // fixed info
    name: emp.fullName ?? "",
    employee_id: emp.employeeId ?? "",
    esic_no: emp.esicNo ?? "",
    uan: emp.uan ?? "",
    basic: Number(s.basic ?? (s as any).base ?? 0),
    da: Number(s.da ?? 0),
    total_days: Number(s.totalDays ?? 30),
    paid_days: Number(s.paidDays ?? 30),
    // earnings
    hra: Number(s.hra ?? 0),
    gross_rate_pm: Number(s.grossRatePM ?? 0),
    gross_earning: Number(s.totalGrossEarning ?? 0),
    ot_rate: Number(s.otRatePerHour ?? 0),
    single_ot_hours: Number(s.singleOTHours ?? 0),
    double_ot_hours: Number(s.doubleOTHours ?? 0),
    ot_amount: Number(s.otAmount ?? 0),
    difference: Number(s.difference ?? 0),
    total_gross: Number(s.totalGrossEarning ?? 0),
    // deductions
    professional_tax: Number(s.professionalTax ?? 0),
    esic_employee: Number(s.esicEmployee ?? 0),
    pf_base: Number(s.pfBase ?? 0),
    pf_employee: Number(s.pfEmployee ?? 0),
    advance: Number(s.advance ?? 0),
    total_deduction: Number(s.totalDeduction ?? 0),
    net_salary: Number(s.netSalary ?? 0),
    // employer
    esic_employer: Number(s.esicEmployer ?? 0),
    pf_employer: Number(s.pfEmployer ?? 0),
    mlwf_employer: Number(s.mlwfEmployer ?? 0),
    ctc_per_month: Number(s.ctcPerMonth ?? 0),
    // employee type (custom field)
    employee_type: (emp as any).employeeType ?? (emp as any).employee_type ?? "",
    // spread any extra salary keys
    ...(emp as any).salaryOverrides,
  };
}

function evalCol(col: TemplateColumn, ctx: Record<string, unknown>): string {
  // Fixed info columns — read directly from ctx
  const directKeys = [
    "name", "employee_id", "esic_no", "uan", "basic", "da",
    "total_days", "paid_days",
  ];
  if (directKeys.includes(col.key)) {
    const v = ctx[col.key];
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "number") return v === 0 ? "0" : formatNum(v);
    return String(v);
  }

  if (!col.formula?.expression) return "-";

  const result = evaluateTemplateFormula(col.formula.expression, ctx);
  if (result === 0 || result === "0") return "₹0";
  if (typeof result === "number") return `₹${formatNum(result)}`;
  if (result === null || result === undefined || result === "") return "-";
  return String(result);
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

// ─── Build union sections for "All Managers" view ────────────────────────────

function buildUnionSections(templates: SalaryTemplate[]): TemplateSection[] {
  if (templates.length === 0) return [];

  // Collect all unique sections by label (case-insensitive)
  const sectionMap = new Map<string, TemplateSection>();

  for (const tmpl of templates) {
    for (const sec of tmpl.sections) {
      const key = sec.label.toLowerCase().trim();
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { ...sec, columns: [...sec.columns] });
      } else {
        // Merge columns — add any column keys not already present
        const existing = sectionMap.get(key)!;
        for (const col of sec.columns) {
          if (!existing.columns.find((c) => c.key === col.key)) {
            existing.columns.push(col);
          }
        }
      }
    }
  }

  return Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TemplateSalaryView({
  employees,
  managers,
  selectedManagerId,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEditEmployee,
}: Props) {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  const companyId = currentUser?.uid ?? "";

  // Cache for attendance variables: key = `${employeeId}_${month}_${year}`
  const attendanceCache = useRef<Map<string, AttendanceVariables>>(new Map());

  // Current pay period derived from today's date
  const payPeriod = useMemo(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear(), totalDays: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() };
  }, []);

  // ── Load all templates ────────────────────────────────────────────────────

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    salaryTemplateService
      .getAll(companyId)
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  // ── Resolve which template applies per employee ───────────────────────────

  const getTemplateForManager = useCallback(
    (managerId: string): SalaryTemplate | null => {
      const mgr = managers.find((m) => m.id === managerId);
      if (!mgr) return null;
      // manager-specific template first
      if (mgr.salaryTemplateId) {
        const t = templates.find((t) => t.id === mgr.salaryTemplateId);
        if (t) return t;
      }
      // fallback: global template
      return templates.find((t) => t.managerId === null) ?? null;
    },
    [managers, templates]
  );

  // ── Sections to display ───────────────────────────────────────────────────

  const displaySections = useMemo((): TemplateSection[] => {
    if (selectedManagerId === "all") {
      // Union of all templates
      return buildUnionSections(templates);
    }
    const tmpl = getTemplateForManager(selectedManagerId);
    if (!tmpl) return [];
    return [...tmpl.sections].sort((a, b) => a.order - b.order);
  }, [selectedManagerId, templates, getTemplateForManager]);

  // ── Employees to show ─────────────────────────────────────────────────────

  const visibleEmployees = useMemo(() => {
    if (selectedManagerId === "all") return employees;
    return employees.filter((emp) => {
      if (Array.isArray(emp.assignedManagers))
        return emp.assignedManagers.includes(selectedManagerId);
      return emp.assignedManager === selectedManagerId;
    });
  }, [employees, selectedManagerId]);

  const paged = visibleEmployees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ── Get template for a specific employee (for formula eval) ──────────────

  const getTemplateForEmployee = useCallback(
    (emp: Employee): SalaryTemplate | null => {
      const managerId =
        (Array.isArray(emp.assignedManagers)
          ? emp.assignedManagers[0]
          : emp.assignedManager) ?? "";
      return getTemplateForManager(managerId);
    },
    [getTemplateForManager]
  );

  // ── Evaluate a column value for an employee ───────────────────────────────

  const getCellValue = useCallback(
    (emp: Employee, section: TemplateSection, col: TemplateColumn): string => {
      const tmpl = getTemplateForEmployee(emp);
      if (!tmpl) return "-";

      // Check if this section exists in the employee's template
      const empSection = tmpl.sections.find(
        (s) => s.label.toLowerCase().trim() === section.label.toLowerCase().trim()
      );
      if (!empSection) return "-";

      // Check if this column exists in the employee's section
      const empCol = empSection.columns.find((c) => c.key === col.key);
      if (!empCol) return "-";

      // Build context: evaluate all prior columns in order so formulas can reference them
      const ctx = buildEmployeeCtx(emp);

      // Merge cached attendance variables into context (Requirements 3.2, 3.4)
      const cacheKey = `${emp.id}_${payPeriod.month}_${payPeriod.year}`;
      const cachedVars = attendanceCache.current.get(cacheKey);
      if (cachedVars) {
        Object.assign(ctx, cachedVars);
      } else {
        // Kick off async fetch and populate cache; next render will use the result
        fetchAttendanceVariables(db, emp.id, payPeriod.month, payPeriod.year, payPeriod.totalDays)
          .then((vars) => {
            attendanceCache.current.set(cacheKey, vars);
          })
          .catch(() => {/* silently ignore — zero values already in ctx */});
      }

      // Evaluate all columns in order up to and including this one, building ctx
      const allSections = [...tmpl.sections].sort((a, b) => a.order - b.order);
      for (const sec of allSections) {
        for (const c of sec.columns) {
          if (c.formula?.expression) {
            const val = evaluateTemplateFormula(c.formula.expression, ctx);
            ctx[c.key] = typeof val === "number" ? val : 0;
          }
          if (c.key === col.key && sec.id === empSection.id) {
            return evalCol(empCol, ctx);
          }
        }
      }

      return evalCol(empCol, ctx);
    },
    [getTemplateForEmployee, payPeriod]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (templates.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No salary templates found. Create one in the{" "}
          <strong>Salary Templates</strong> tab first.
        </Typography>
      </Box>
    );
  }

  if (displaySections.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No template assigned to this manager. Assign one in the{" "}
          <strong>Salary Templates</strong> tab.
        </Typography>
      </Box>
    );
  }

  const currentSection = displaySections[tabIndex] ?? displaySections[0];

  return (
    <Paper sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}>
      {/* Section tabs */}
      <Tabs
        value={Math.min(tabIndex, displaySections.length - 1)}
        onChange={(_, v) => setTabIndex(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: "1px solid #333",
          "& .MuiTab-root": { color: "#aaa", fontSize: 13 },
          "& .Mui-selected": { color: "#2196f3" },
          "& .MuiTabs-indicator": { backgroundColor: "#2196f3" },
        }}
      >
        {displaySections.map((sec) => (
          <Tab key={sec.id} label={sec.label} />
        ))}
      </Tabs>

      {/* Table for current section */}
      {currentSection && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1e1e1e" }}>
                {currentSection.columns.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={{ fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {col.label}
                      {col.formula && (
                        <Tooltip title={`Formula: ${col.formula.expression}`}>
                          <Chip
                            label="ƒ"
                            size="small"
                            sx={{ fontSize: 9, height: 16, cursor: "help", ml: 0.5 }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                ))}
                <TableCell sx={{ fontWeight: 600, color: "#fff" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={currentSection.columns.length + 1}
                    sx={{ textAlign: "center", color: "#888", py: 4 }}
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((emp) => (
                  <TableRow
                    key={emp.id}
                    sx={{ "&:hover": { backgroundColor: "#3d3d3d" } }}
                  >
                    {currentSection.columns.map((col) => {
                      const val = getCellValue(emp, currentSection, col);
                      const isMissing = val === "-";
                      return (
                        <TableCell
                          key={col.id}
                          sx={{
                            color: isMissing ? "#555" : "#fff",
                            fontStyle: isMissing ? "italic" : "normal",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {val}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Tooltip title="Edit salary">
                        <IconButton
                          size="small"
                          sx={{ color: "#2196f3" }}
                          onClick={() => onEditEmployee(emp)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination
        component="div"
        count={visibleEmployees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{ color: "#aaa", borderTop: "1px solid #333" }}
      />
    </Paper>
  );
}
