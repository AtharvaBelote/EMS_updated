/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import {
  Download,
  Search,
  PictureAsPdf,
  Email,
  Visibility,
  Refresh,
  GetApp,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Employee, Payroll, SalarySlip } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function SalarySlips() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [companiesById, setCompaniesById] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [selectedBrandingAssetId, setSelectedBrandingAssetId] =
    useState<string>("");
  const [selectedManager, setSelectedManager] = useState<string>("");
  const [managersById, setManagersById] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [searchTermGenerated, setSearchTermGenerated] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const toAmount = (value: unknown) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtAmount = (value: unknown) => toAmount(value).toFixed(2);

  const getPayslipModel = (
    employee: Employee,
    payroll: Payroll,
    selectedAssetId?: string,
  ) => {
    const monthLabel =
      months.find((m) => m.value === payroll.month)?.label || "Month";
    const period = `${monthLabel.slice(0, 3).toUpperCase()}-${payroll.year}`;
    const salary = employee.salary || {};

    const basic = toAmount(payroll.baseSalary);
    const hra = toAmount(payroll.hra);
    const ta = toAmount(payroll.ta);
    const da = toAmount(payroll.da);
    const totalBonus = toAmount(payroll.totalBonus);
    const grossSalary = toAmount(payroll.grossSalary);

    const epf = toAmount((salary as Record<string, unknown>).pfEmployee);
    const pt = toAmount((salary as Record<string, unknown>).professionalTax);
    const esic = toAmount((salary as Record<string, unknown>).esicEmployee);
    const tds = toAmount(
      (payroll as unknown as { taxAmount?: unknown }).taxAmount,
    );
    const advance = toAmount((salary as Record<string, unknown>).advance);
    const mlwf = toAmount((salary as Record<string, unknown>).mlwfEmployer);
    const totalDeduction = toAmount(payroll.totalDeduction);
    const netSalary = toAmount(payroll.netSalary);

    const totalDays =
      toAmount((salary as Record<string, unknown>).totalDays) || 30;
    const paidDays =
      toAmount((salary as Record<string, unknown>).paidDays) || totalDays;

    const companyId =
      employee.companyId || currentUser?.companyId || currentUser?.uid || "";
    const companyData = companyId ? companiesById[companyId] : undefined;
    const companyAddressObj =
      (companyData?.address as Record<string, unknown> | undefined) || {};
    const composedAddress = [
      String(companyAddressObj.buildingBlock || "").trim(),
      String(companyAddressObj.street || "").trim(),
      String(companyAddressObj.city || "").trim(),
      String(companyAddressObj.state || "").trim(),
      String(companyAddressObj.pinCode || "").trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const brandingAssets = Array.isArray(companyData?.brandingAssets)
      ? (companyData.brandingAssets as Array<Record<string, unknown>>)
      : [];
    const selectedBrandingAsset = selectedAssetId
      ? brandingAssets.find((asset) => String(asset.id) === selectedAssetId)
      : null;
    const defaultBrandingAsset =
      selectedBrandingAsset ||
      brandingAssets.find((asset) => asset.isDefault === true) ||
      brandingAssets[0] ||
      null;

    return {
      companyName: String(
        selectedBrandingAsset?.companyName ||
          companyData?.companyName ||
          companyData?.name ||
          companyData?.adminName ||
          employee.companyName ||
          "COMPANY NAME",
      ),
      companyAddress: String(
        selectedBrandingAsset?.companyAddress ||
          composedAddress ||
          "123 Business Street, City, State 12345",
      ),
      period,
      paidMode: "Paid By Transfer",
      logoUrl: String(defaultBrandingAsset?.logoUrl || ""),
      stampUrl: String(defaultBrandingAsset?.stampUrl || ""),
      signUrl: String(defaultBrandingAsset?.signUrl || ""),
      details: [
        ["E Code", employee.employeeId || "-"],
        ["Name", employee.fullName || "-"],
        [
          "Father Name",
          String((employee as Record<string, unknown>).fatherName || "-"),
        ],
        [
          "Designation",
          String((employee as Record<string, unknown>).designation || "-"),
        ],
        [
          "Department",
          String((employee as Record<string, unknown>).department || "-"),
        ],
        [
          "D.O.J",
          String((employee as Record<string, unknown>).joinDate || "-"),
        ],
        ["D.O.B", String((employee as Record<string, unknown>).dob || "-")],
        ["EPF No.", String((employee as Record<string, unknown>).epfNo || "-")],
        ["UAN No.", String(employee.uan || "-")],
        ["ESIC", String(employee.esicNo || "-")],
        [
          "HQ Location",
          String((employee as Record<string, unknown>).hqLocation || "-"),
        ],
      ],
      attendance: [
        [
          "Working Day",
          fmtAmount(totalDays),
          "0.00",
          "0.00",
          fmtAmount(totalDays),
        ],
        ["Day Wkd", fmtAmount(paidDays), "0.00", "0.00", fmtAmount(paidDays)],
        ["W. Hld", "0.00", "0.00", "0.00", "0.00"],
        ["Pd Hld", "0.00", "0.00", "0.00", "0.00"],
        ["Day Paid", fmtAmount(paidDays), "0.00", "0.00", fmtAmount(paidDays)],
      ],
      earnings: [
        ["BASIC", fmtAmount(basic), fmtAmount(basic)],
        ["H.R.A", fmtAmount(hra), fmtAmount(hra)],
        ["CONVEYANCE ALL.", fmtAmount(ta), fmtAmount(ta)],
        ["D.A.", fmtAmount(da), fmtAmount(da)],
        ["OTHER ALL.", fmtAmount(totalBonus), fmtAmount(totalBonus)],
        ["TOTAL GROSS EARNING", fmtAmount(grossSalary), fmtAmount(grossSalary)],
      ],
      deductions: [
        ["EPF", fmtAmount(epf)],
        ["PT", fmtAmount(pt)],
        ["ESIC", fmtAmount(esic)],
        ["TDS", fmtAmount(tds)],
        ["ADVANCE", fmtAmount(advance)],
        ["MLWF", fmtAmount(mlwf)],
        ["Total", fmtAmount(totalDeduction)],
      ],
      netSalary: fmtAmount(netSalary),
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load employees
      const employeesQuery = query(
        collection(db, "employees"),
        orderBy("fullName"),
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesData);

      const uniqueCompanyIds = Array.from(
        new Set(
          employeesData
            .map((emp) => emp.companyId)
            .filter((id): id is string => !!id),
        ),
      );

      const companyMap: Record<string, Record<string, unknown>> = {};
      for (const companyId of uniqueCompanyIds) {
        const companySnapshot = await getDoc(doc(db, "companies", companyId));
        if (companySnapshot.exists()) {
          companyMap[companyId] = companySnapshot.data() as Record<
            string,
            unknown
          >;
        }
      }

      if (currentUser?.uid && !companyMap[currentUser.uid]) {
        const fallbackCompanySnapshot = await getDoc(
          doc(db, "companies", currentUser.uid),
        );
        if (fallbackCompanySnapshot.exists()) {
          companyMap[currentUser.uid] =
            fallbackCompanySnapshot.data() as Record<string, unknown>;
        }
      }

      setCompaniesById(companyMap);

      // Load managers
      const uniqueManagerIds = Array.from(
        new Set(
          employeesData
            .flatMap((emp) => emp.assignedManagers || [])
            .filter((id): id is string => !!id),
        ),
      );

      const managerMap: Record<string, Record<string, unknown>> = {};
      for (const managerId of uniqueManagerIds) {
        const managerSnapshot = await getDoc(doc(db, "managers", managerId));
        if (managerSnapshot.exists()) {
          managerMap[managerId] = managerSnapshot.data() as Record<
            string,
            unknown
          >;
        }
      }

      setManagersById(managerMap);

      // Debug: Log employees data
      console.log("=== EMPLOYEES DATA ===");
      console.log("Total employees:", employeesData.length);
      employeesData.forEach((emp) => {
        console.log(
          `Employee: ${emp.fullName}, ID: ${emp.id}, employeeId: ${emp.employeeId}`,
        );
      });

      // Load payrolls for selected month/year
      const payrollsQuery = query(
        collection(db, "payroll"),
        where("month", "==", selectedMonth),
        where("year", "==", selectedYear),
      );
      const payrollsSnapshot = await getDocs(payrollsQuery);
      const payrollsData = payrollsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Payroll[];
      // Sort by processedAt in JavaScript
      payrollsData.sort((a, b) => {
        const dateA =
          a.processedAt instanceof Date
            ? a.processedAt
            : (a.processedAt as any)?.toDate?.();
        const dateB =
          b.processedAt instanceof Date
            ? b.processedAt
            : (b.processedAt as any)?.toDate?.();
        return dateB - dateA; // Sort in descending order
      });
      setPayrolls(payrollsData);

      // Debug: Log payrolls data
      console.log("=== PAYROLLS DATA ===");
      console.log("Total payrolls:", payrollsData.length);
      payrollsData.forEach((payroll) => {
        console.log(
          `Payroll ID: ${payroll.id}, employeeId: ${payroll.employeeId}`,
        );
      });

      // Load existing salary slips
      const slipsQuery = query(
        collection(db, "salary_slips"),
        where("month", "==", selectedMonth),
        where("year", "==", selectedYear),
      );
      const slipsSnapshot = await getDocs(slipsQuery);
      const slipsData = slipsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalarySlip[];
      // Sort by generatedAt in JavaScript
      slipsData.sort((a, b) => {
        const dateA =
          a.generatedAt instanceof Date
            ? a.generatedAt
            : (a.generatedAt as any)?.toDate?.();
        const dateB =
          b.generatedAt instanceof Date
            ? b.generatedAt
            : (b.generatedAt as any)?.toDate?.();
        return dateB - dateA; // Sort in descending order
      });
      setSalarySlips(slipsData);

      // Debug: Log salary slips data
      console.log("=== SALARY SLIPS DATA ===");
      console.log("Total slips:", slipsData.length);
      slipsData.forEach((slip) => {
        console.log(`Slip ID: ${slip.id}, employeeId: ${slip.employeeId}`);
        const foundEmployee = employeesData.find(
          (emp) => emp.employeeId === slip.employeeId,
        );
        console.log(
          `  -> Found employee: ${foundEmployee?.fullName || "NOT FOUND"}`,
        );
      });
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateSalarySlipPDF = async (
    employee: Employee,
    payroll: Payroll,
  ) => {
    try {
      setGeneratingPdf(true);

      console.log("=== GENERATING SALARY SLIP ===");
      console.log(
        "Employee:",
        employee.fullName,
        "ID:",
        employee.id,
        "employeeId:",
        employee.employeeId,
      );
      console.log("Payroll employeeId:", payroll.employeeId);
      console.log("Will save slip with employeeId:", payroll.employeeId);

      const slip = getPayslipModel(employee, payroll, selectedBrandingAssetId);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      doc.setDrawColor(31, 41, 55);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      if (slip.logoUrl) {
        try {
          doc.addImage(slip.logoUrl, "PNG", 13, 13, 14, 14);
        } catch {
          try {
            doc.addImage(slip.logoUrl, "JPEG", 13, 13, 14, 14);
          } catch {
            doc.text("TW", 20, 21.2, { align: "center" });
          }
        }
      } else {
        doc.text("TW", 20, 21.2, { align: "center" });
      }

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(String(slip.companyName).toUpperCase(), pageWidth / 2, 18, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(slip.companyAddress, pageWidth / 2, 23, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(`Pay Slip for the month of ${slip.period}`, pageWidth / 2, 28, {
        align: "center",
      });

      doc.line(8, 32, pageWidth - 8, 32);

      autoTable(doc, {
        startY: 34,
        head: [],
        body: slip.details,
        theme: "grid",
        margin: { left: 10, right: 102 },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [31, 41, 55] },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252], cellWidth: 28 },
          1: { cellWidth: 64 },
        },
      });

      autoTable(doc, {
        startY: 34,
        head: [["Attendance / Leave", "O.Bal", "Ernd", "Taken", "C.Bal"]],
        body: slip.attendance,
        theme: "grid",
        margin: { left: 108, right: 10 },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.6,
          halign: "right",
          textColor: [31, 41, 55],
        },
        columnStyles: { 0: { halign: "left", cellWidth: 28 } },
        headStyles: { fillColor: [248, 250, 252], textColor: [31, 41, 55] },
      });

      autoTable(doc, {
        startY: 112,
        head: [["Allowance", "Rate", "Earned Wages"]],
        body: slip.earnings,
        theme: "grid",
        margin: { left: 10, right: 102 },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [31, 41, 55],
          halign: "right",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 42 } },
        headStyles: { fillColor: [248, 250, 252], textColor: [31, 41, 55] },
      });

      autoTable(doc, {
        startY: 112,
        head: [["Deduction", "Amount"]],
        body: slip.deductions,
        theme: "grid",
        margin: { left: 108, right: 10 },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [31, 41, 55],
          halign: "right",
        },
        columnStyles: { 0: { halign: "left" } },
        headStyles: { fillColor: [248, 250, 252], textColor: [31, 41, 55] },
      });

      doc.setFillColor(250, 252, 255);
      doc.rect(10, 188, pageWidth - 20, 10, "FD");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Net Pay", 13, 194.5);
      doc.setTextColor(11, 74, 109);
      doc.text(slip.netSalary, pageWidth - 13, 194.5, { align: "right" });
      doc.setTextColor(31, 41, 55);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(slip.paidMode, pageWidth / 2, 204, { align: "center" });

      autoTable(doc, {
        startY: 208,
        head: [],
        body: [["Employee's Sign", "Checked By", "Company Stamp and Sign"]],
        theme: "grid",
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 8,
          minCellHeight: 18,
          valign: "bottom",
          halign: "center",
        },
      });

      if (slip.signUrl) {
        try {
          doc.addImage(slip.signUrl, "PNG", pageWidth - 70, 215, 30, 8);
        } catch {
          try {
            doc.addImage(slip.signUrl, "JPEG", pageWidth - 70, 215, 30, 8);
          } catch {
            // Ignore non-renderable sign format
          }
        }
      }

      if (slip.stampUrl) {
        try {
          doc.addImage(slip.stampUrl, "PNG", pageWidth - 65, 211, 15, 15);
        } catch {
          try {
            doc.addImage(slip.stampUrl, "JPEG", pageWidth - 65, 211, 15, 15);
          } catch {
            // Ignore non-renderable stamp format
          }
        }
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");

      // Save the PDF
      const fileName = `salary_slip_${employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
      doc.save(fileName);

      // Check if salary slip already exists for this employee, month, year
      const existingSlipsQuery = query(
        collection(db, "salary_slips"),
        where("employeeId", "==", payroll.employeeId),
        where("month", "==", payroll.month),
        where("year", "==", payroll.year),
      );
      const existingSlipsSnapshot = await getDocs(existingSlipsQuery);

      // Save to Firestore - use payroll.employeeId (string like "EMP001") instead of employee.id
      if (existingSlipsSnapshot.empty) {
        // Only create if no existing slip for this employee/month/year
        await addDoc(collection(db, "salary_slips"), {
          employeeId: payroll.employeeId,
          payrollId: payroll.id,
          month: payroll.month,
          year: payroll.year,
          fileName,
          generatedAt: new Date(),
          generatedBy: currentUser?.uid || "",
        });
        setSuccess(`Salary slip generated for ${employee.fullName}`);
      } else {
        setSuccess(`Salary slip already exists for ${employee.fullName}`);
      }
      await loadData(); // Refresh the list
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate salary slip");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generateBulkSalarySlips = async () => {
    try {
      setGeneratingPdf(true);
      setError("");
      setSuccess("");

      // Filter payrolls by manager if selected
      let filteredPayrolls = payrolls;
      if (selectedManager) {
        filteredPayrolls = payrolls.filter((payroll) => {
          const employee = employees.find(
            (emp) => emp.employeeId === payroll.employeeId,
          );
          return employee?.assignedManagers?.includes(selectedManager);
        });
      }

      const availablePayrolls = filteredPayrolls.filter(
        (payroll) =>
          !salarySlips.some((slip) => slip.employeeId === payroll.employeeId),
      );

      if (availablePayrolls.length === 0) {
        setError(
          selectedManager
            ? "No new payroll records to generate slips for this manager"
            : "No new payroll records to generate slips for",
        );
        return;
      }

      for (const payroll of availablePayrolls) {
        const employee = employees.find(
          (emp) => emp.employeeId === payroll.employeeId,
        );
        if (employee) {
          await generateSalarySlipPDF(employee, payroll);
          // Small delay to prevent overwhelming the browser
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      setSuccess(`Generated ${availablePayrolls.length} salary slips`);
    } catch (error) {
      console.error("Error generating bulk salary slips:", error);
      setError("Failed to generate bulk salary slips");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const previewSalarySlip = (employee: Employee, payroll: Payroll) => {
    setPreviewData({ employee, payroll });
    setShowPreviewDialog(true);
  };

  const filteredSlips = salarySlips.filter((slip) => {
    const employee = employees.find(
      (emp) => emp.employeeId === slip.employeeId,
    );

    // Check search term for generated slips only
    const matchesSearch =
      !searchTermGenerated ||
      employee?.fullName?.toLowerCase().includes(searchTermGenerated.toLowerCase()) ||
      employee?.employeeId?.toLowerCase().includes(searchTermGenerated.toLowerCase());

    return matchesSearch;
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp) => emp.employeeId === employeeId);
    return employee?.fullName || "Unknown Employee";
  };

  const getEmployeeId = (employeeId: string) => {
    const employee = employees.find((emp) => emp.employeeId === employeeId);
    return employee?.employeeId || "Unknown ID";
  };

  const getPayrollData = (employeeId: string) => {
    return payrolls.find((p) => p.employeeId === employeeId);
  };

  const getAllBrandingAssets = () => {
    const assetsMap = new Map<string, Record<string, unknown>>();
    Object.values(companiesById).forEach((company) => {
      const assets = Array.isArray(company?.brandingAssets)
        ? (company.brandingAssets as Array<Record<string, unknown>>)
        : [];
      assets.forEach((asset) => {
        const assetId = String(asset.id);
        assetsMap.set(assetId, asset);
      });
    });
    return Array.from(assetsMap.values());
  };

  const getAllManagers = () => {
    const managersSet = new Set<string>();
    employees.forEach((emp) => {
      emp.assignedManagers?.forEach((managerId) => {
        managersSet.add(managerId);
      });
    });
    return Array.from(managersSet).sort();
  };

  const getManagerName = (managerId: string) => {
    const manager = managersById[managerId];
    return (
      String(manager?.fullName || manager?.name || managerId) ||
      managerId
    );
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{ color: "#2196f3", fontWeight: 600, mb: 1 }}
        >
          Salary Slips
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate and manage salary slips for employees
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Month/Year Selection and Stats */}
      <Card sx={{ mb: 3, backgroundColor: "#2d2d2d" }}>
        <CardContent>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 3 }}>
            <Box>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(e.target.value as number)}
                  >
                    {months.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => setSelectedYear(e.target.value as number)}
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={loadData}
                sx={{
                  mt: 2,
                  backgroundColor: "#2196f3",
                  "&:hover": { backgroundColor: "#1976d2" },
                }}
              >
                Refresh
              </Button>
            </Box>

            <Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {employees.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {payrolls.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payroll Records
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {salarySlips.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generated Slips
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "#ffffff" }}>
                    {payrolls.length - salarySlips.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Slips
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters and Bulk Actions */}
      <Box
        sx={{
          mb: 3,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 2,
          alignItems: "flex-end",
        }}
      >
        <FormControl fullWidth>
          <InputLabel>Select Branding Asset</InputLabel>
          <Select
            value={selectedBrandingAssetId}
            label="Select Branding Asset"
            onChange={(e) => setSelectedBrandingAssetId(e.target.value)}
          >
            <MenuItem value="">
              <em>Default Asset</em>
            </MenuItem>
            {getAllBrandingAssets().map((asset) => (
              <MenuItem key={String(asset.id)} value={String(asset.id)}>
                {String(asset.name || asset.id)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Filter by Manager</InputLabel>
          <Select
            value={selectedManager}
            label="Filter by Manager"
            onChange={(e) => setSelectedManager(e.target.value)}
          >
            <MenuItem value="">
              <em>All Managers</em>
            </MenuItem>
            {getAllManagers().map((managerId) => (
              <MenuItem key={managerId} value={managerId}>
                {getManagerName(managerId)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          placeholder="Search Pending Slips"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<PictureAsPdf />}
          onClick={generateBulkSalarySlips}
          disabled={generatingPdf || payrolls.length === salarySlips.length}
          sx={{
            backgroundColor: "#2196f3",
            "&:hover": { backgroundColor: "#1976d2" },
            height: "56px",
            borderRadius: "15px",
          }}
        >
          {generatingPdf ? (
            <CircularProgress size={20} />
          ) : (
            "GENERATE ALL SLIPS"
          )}
        </Button>
      </Box>

      {/* Pending Salary Slips Section */}
      {payrolls.length > salarySlips.length && (
        <Card
          sx={{
            mb: 3,
            backgroundColor: "#2d2d2d",
            border: "1px solid #ff9800",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: "#ff9800", mb: 2 }}>
              Pending Salary Slips ({payrolls.length - salarySlips.length})
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <TableContainer
                component={Paper}
                sx={{ backgroundColor: "#3d3d3d", border: "1px solid #333" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#1e1e1e" }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#ffffff",
                          borderBottom: "2px solid #333",
                        }}
                      >
                        Employee Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#ffffff",
                          borderBottom: "2px solid #333",
                        }}
                      >
                        Employee ID
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#ffffff",
                          borderBottom: "2px solid #333",
                        }}
                      >
                        Net Salary
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "#ffffff",
                          borderBottom: "2px solid #333",
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrolls
                      .filter((payroll) => {
                        // Filter out existing slips
                        if (salarySlips.some((slip) => slip.employeeId === payroll.employeeId)) {
                          return false;
                        }
                        // Apply manager filter
                        if (selectedManager) {
                          const employee = employees.find(
                            (emp) => emp.employeeId === payroll.employeeId,
                          );
                          return employee?.assignedManagers?.includes(selectedManager);
                        }
                        return true;
                      })
                      .map((payroll) => {
                        const employee = employees.find(
                          (emp) => emp.employeeId === payroll.employeeId,
                        );
                        return (
                          <TableRow
                            key={payroll.id}
                            sx={{ "&:hover": { backgroundColor: "#4d4d4d" } }}
                          >
                            <TableCell
                              sx={{
                                borderBottom: "1px solid #333",
                                color: "#ffffff",
                              }}
                            >
                              {employee?.fullName || "Unknown"}
                            </TableCell>
                            <TableCell
                              sx={{
                                borderBottom: "1px solid #333",
                                color: "#ffffff",
                              }}
                            >
                              {employee?.employeeId || "Unknown"}
                            </TableCell>
                            <TableCell
                              sx={{
                                borderBottom: "1px solid #333",
                                color: "#ffffff",
                              }}
                            >
                              ₹{payroll.netSalary?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell
                              sx={{
                                borderBottom: "1px solid #333",
                                color: "#ffffff",
                              }}
                            >
                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Tooltip title="Generate Slip">
                                  <IconButton
                                    size="small"
                                    sx={{ color: "#ff9800" }}
                                    onClick={() =>
                                      employee &&
                                      generateSalarySlipPDF(employee, payroll)
                                    }
                                    disabled={generatingPdf}
                                  >
                                    <PictureAsPdf />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search for Generated Slips */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search Generated Slips by Name or Employee ID"
          value={searchTermGenerated}
          onChange={(e) => setSearchTermGenerated(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Salary Slips Table */}
      <Box sx={{ overflowX: "auto", maxWidth: "100%" }}>
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: "#2d2d2d", border: "1px solid #333" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1e1e1e" }}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Employee Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Employee ID
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Month/Year
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Net Salary
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Generated On
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "#ffffff",
                    borderBottom: "2px solid #333",
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSlips
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((slip) => {
                  const employee = employees.find(
                    (emp) => emp.employeeId === slip.employeeId,
                  );
                  const payroll = getPayrollData(slip.employeeId);

                  return (
                    <TableRow
                      key={slip.id}
                      sx={{ "&:hover": { backgroundColor: "#3d3d3d" } }}
                    >
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        {employee?.fullName || "Unknown"}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        {employee?.employeeId || "Unknown"}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        {months.find((m) => m.value === slip.month)?.label}{" "}
                        {slip.year}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        ₹{payroll?.netSalary?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        <Chip
                          label="Generated"
                          color="success"
                          size="small"
                          sx={{ backgroundColor: "#4caf50" }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        {slip.generatedAt instanceof Date
                          ? slip.generatedAt.toLocaleDateString()
                          : (slip.generatedAt as any)
                              ?.toDate?.()
                              ?.toLocaleDateString() || "Unknown"}
                      </TableCell>
                      <TableCell
                        sx={{
                          borderBottom: "1px solid #333",
                          color: "#ffffff",
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton
                              size="small"
                              sx={{ color: "#2196f3" }}
                              onClick={() =>
                                employee &&
                                payroll &&
                                previewSalarySlip(employee, payroll)
                              }
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              sx={{ color: "#4caf50" }}
                              onClick={() =>
                                employee &&
                                payroll &&
                                generateSalarySlipPDF(employee, payroll)
                              }
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredSlips.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        sx={{
          color: "#ffffff",
          "& .MuiTablePagination-selectIcon": {
            color: "#ffffff",
          },
        }}
      />

      {/* Preview Dialog */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="span" sx={{ color: "#ffffff" }}>
            Salary Slip Preview - {previewData?.employee?.fullName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <Box sx={{ mt: 2, backgroundColor: "#f3f5f8", p: 2 }}>
              {(() => {
                const slip = getPayslipModel(
                  previewData.employee,
                  previewData.payroll,
                  selectedBrandingAssetId,
                );
                return (
                  <Box
                    sx={{
                      maxWidth: 980,
                      mx: "auto",
                      bgcolor: "#fff",
                      border: "2px solid #1f2937",
                      boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    }}
                  >
                    <Box
                      sx={{
                        textAlign: "center",
                        px: 2,
                        py: 1.5,
                        borderBottom: "2px solid #1f2937",
                        position: "relative",
                        background:
                          "linear-gradient(180deg, #fff 0%, #fbfcff 100%)",
                      }}
                    >
                      {slip.logoUrl ? (
                        <Box
                          component="img"
                          src={slip.logoUrl}
                          alt="Company logo"
                          sx={{
                            position: "absolute",
                            left: 16,
                            top: 12,
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            position: "absolute",
                            left: 16,
                            top: 12,
                            width: 52,
                            height: 52,
                            border: "2px solid #0f766e",
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            color: "#0f766e",
                            fontWeight: 700,
                            backgroundColor: "#d9f3ef",
                          }}
                        >
                          TW
                        </Box>
                      )}
                      <Typography
                        sx={{
                          fontSize: "1.2rem",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {slip.companyName}
                      </Typography>
                      <Typography sx={{ color: "#6b7280", fontSize: "0.9rem" }}>
                        {slip.companyAddress}
                      </Typography>
                      <Typography
                        sx={{
                          color: "#374151",
                          fontWeight: 700,
                          mt: 0.5,
                          fontSize: "0.9rem",
                        }}
                      >
                        Pay Slip for the month of {slip.period}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <Table
                        size="small"
                        sx={{
                          "& td": {
                            border: "1px solid #d5d9df",
                            p: "6px 8px",
                            fontSize: "0.84rem",
                          },
                        }}
                      >
                        <TableBody>
                          {slip.details.map(([label, value]) => (
                            <TableRow key={String(label)}>
                              <TableCell
                                sx={{
                                  width: "34%",
                                  bgcolor: "#fcfcfd",
                                  fontWeight: 600,
                                  color: "#374151",
                                }}
                              >
                                {label}
                              </TableCell>
                              <TableCell>{value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Table
                        size="small"
                        sx={{
                          "& th, & td": {
                            border: "1px solid #d5d9df",
                            p: "6px 8px",
                            fontSize: "0.84rem",
                          },
                          "& th": { bgcolor: "#f8fafc", fontWeight: 700 },
                          "& td:not(:first-of-type)": { textAlign: "right" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Attendance / Leave</TableCell>
                            <TableCell>O.Bal</TableCell>
                            <TableCell>Ernd</TableCell>
                            <TableCell>Taken</TableCell>
                            <TableCell>C.Bal</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slip.attendance.map((row, idx) => (
                            <TableRow
                              key={`${row[0]}-${idx}`}
                              sx={
                                idx === slip.attendance.length - 1
                                  ? { fontWeight: 700, bgcolor: "#f4f8ff" }
                                  : undefined
                              }
                            >
                              {row.map((cell, cellIndex) => (
                                <TableCell key={`${cell}-${cellIndex}`}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <Table
                        size="small"
                        sx={{
                          "& th, & td": {
                            border: "1px solid #d5d9df",
                            p: "6px 8px",
                            fontSize: "0.84rem",
                          },
                          "& th": { bgcolor: "#f8fafc", fontWeight: 700 },
                          "& td:nth-of-type(n+2)": { textAlign: "right" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Allowance</TableCell>
                            <TableCell>Rate</TableCell>
                            <TableCell>Earned Wages</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slip.earnings.map((row, idx) => (
                            <TableRow
                              key={`${row[0]}-${idx}`}
                              sx={
                                idx === slip.earnings.length - 1
                                  ? { fontWeight: 700, bgcolor: "#f4f8ff" }
                                  : undefined
                              }
                            >
                              {row.map((cell, cellIndex) => (
                                <TableCell key={`${cell}-${cellIndex}`}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <Table
                        size="small"
                        sx={{
                          "& th, & td": {
                            border: "1px solid #d5d9df",
                            p: "6px 8px",
                            fontSize: "0.84rem",
                          },
                          "& th": { bgcolor: "#f8fafc", fontWeight: 700 },
                          "& td:nth-of-type(2)": { textAlign: "right" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Deduction</TableCell>
                            <TableCell>Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slip.deductions.map((row, idx) => (
                            <TableRow
                              key={`${row[0]}-${idx}`}
                              sx={
                                idx === slip.deductions.length - 1
                                  ? { fontWeight: 700, bgcolor: "#f4f8ff" }
                                  : undefined
                              }
                            >
                              {row.map((cell, cellIndex) => (
                                <TableCell key={`${cell}-${cellIndex}`}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 1,
                        px: 1.5,
                        py: 1.2,
                        borderTop: "1px solid #1f2937",
                        borderBottom: "1px solid #1f2937",
                        bgcolor: "#fafcff",
                        fontWeight: 700,
                      }}
                    >
                      <Typography>Net Pay</Typography>
                      <Typography
                        sx={{
                          color: "#0b4a6d",
                          fontSize: "1.05rem",
                          fontWeight: 700,
                        }}
                      >
                        {slip.netSalary}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        textAlign: "center",
                        borderBottom: "1px solid #1f2937",
                        py: 1,
                        fontWeight: 600,
                        color: "#1f2937",
                        bgcolor: "#f9fafb",
                      }}
                    >
                      {slip.paidMode}
                    </Typography>

                    <Table
                      size="small"
                      sx={{
                        "& td": {
                          border: "1px solid #d5d9df",
                          p: "24px 12px 12px",
                          textAlign: "center",
                          verticalAlign: "bottom",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <TableBody>
                        <TableRow>
                          <TableCell>Employee&apos;s Sign</TableCell>
                          <TableCell>Checked By</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {slip.stampUrl ? (
                                <Box
                                  component="img"
                                  src={slip.stampUrl}
                                  alt="Company stamp"
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    objectFit: "contain",
                                  }}
                                />
                              ) : null}
                              {slip.signUrl ? (
                                <Box
                                  component="img"
                                  src={slip.signUrl}
                                  alt="Company sign"
                                  sx={{
                                    width: 90,
                                    height: 30,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : null}
                              {!slip.stampUrl && !slip.signUrl
                                ? "Company Stamp and Sign"
                                : null}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <Typography
                      sx={{
                        textAlign: "center",
                        p: "10px 12px 16px",
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      This is a computer generated document. No signature
                      required.
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          <Button
            onClick={() => {
              if (previewData) {
                generateSalarySlipPDF(
                  previewData.employee,
                  previewData.payroll,
                );
                setShowPreviewDialog(false);
              }
            }}
            variant="contained"
            startIcon={<Download />}
            sx={{
              backgroundColor: "#2196f3",
              "&:hover": { backgroundColor: "#1976d2" },
            }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
