import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, ActivityIndicator, Button, Portal, Modal, Divider } from 'react-native-paper';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SalarySlip } from '../types';
import { generateSalarySlipPDF } from '../utils/pdfGenerator';

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function SalarySlipsScreen() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchData = async () => {
    if (!currentUser?.employeeId) return;

    try {
      // Load all salary slips for the employee (not filtered by month/year)
      const slipsQuery = query(
        collection(db, 'salary_slips'),
        where('employeeId', '==', currentUser.employeeId)
      );
      const slipsSnapshot = await getDocs(slipsQuery);

      const slips = slipsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          generatedAt: doc.data().generatedAt?.toDate?.() || new Date(),
        }))
        .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()) as SalarySlip[];

      setSalarySlips(slips);

      // Load payrolls for reference
      const payrollsQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', currentUser.employeeId)
      );
      const payrollsSnapshot = await getDocs(payrollsQuery);
      const payrollsData = payrollsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      setPayrolls(payrollsData);
    } catch (error) {
      console.error('Error fetching salary slips:', error);
      Alert.alert('Error', 'Failed to load salary slips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getMonthName = (monthValue: number) => {
    return months.find((m) => m.value === monthValue)?.label || 'Unknown';
  };

  const getPayrollData = (
    employeeId: string,
    payrollId?: string,
    month?: number,
    year?: number,
  ) => {
    return payrolls.find((p) => {
      if (payrollId && p.id === payrollId) {
        return true;
      }

      if (month !== undefined && year !== undefined) {
        return (
          p.employeeId === employeeId &&
          p.month === month &&
          p.year === year
        );
      }

      return p.employeeId === employeeId;
    });
  };

  const viewSlipDetails = (slip: SalarySlip) => {
    setSelectedSlip(slip);
    setShowDetailModal(true);
  };

  const handleDownload = async (slip: SalarySlip) => {
    try {
      const slipData = getSlipData(slip);
      if (!slipData) {
        Alert.alert('Error', 'Slip data not available');
        return;
      }

      await generateSalarySlipPDF(
        {
          companyName: slipData.companyName,
          companyAddress: slipData.companyAddress || '',
          period: slipData.period,
          paidMode: slipData.paidMode || 'Paid By Transfer',
          logoUrl: slipData.logoUrl,
          stampUrl: slipData.stampUrl,
          signUrl: slipData.signUrl,
          details: slipData.details,
          attendance: slipData.attendance,
          earnings: slipData.earnings,
          deductions: slipData.deductions,
          netSalary: slipData.netSalary,
        },
        slip.employeeId,
        slip.month,
        slip.year
      );
    } catch (error) {
      console.error('Error downloading slip:', error);
      Alert.alert('Error', 'Failed to download salary slip');
    }
  };

  const getSlipData = (slip: SalarySlip) => {
    const slipData = (slip as any).slipData;
    if (!slipData) return null;

    return {
      companyName: String(slipData.companyName || 'Company'),
      companyAddress: String(slipData.companyAddress || ''),
      period: String(slipData.period || `${slip.month}/${slip.year}`),
      paidMode: String(slipData.paidMode || 'Paid By Transfer'),
      logoUrl: String(slipData.logoUrl || ''),
      stampUrl: String(slipData.stampUrl || ''),
      signUrl: String(slipData.signUrl || ''),
      netSalary: String(slipData.netSalary || '0.00'),
      earnings: normalizeRows(slipData.earnings),
      deductions: normalizeRows(slipData.deductions),
      details: normalizeRows(slipData.details),
      attendance: normalizeRows(slipData.attendance),
    };
  };

  const normalizeRows = (value: any): string[][] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((row) => {
        if (Array.isArray(row)) {
          return row.map((cell) => String(cell ?? ''));
        }
        if (row && typeof row === 'object' && Array.isArray(row.cells)) {
          return row.cells.map((cell: any) => String(cell ?? ''));
        }
        return null;
      })
      .filter((row): row is string[] => Array.isArray(row));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{color: 'white'}}>Salary Slips</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            View your generated salary slips
          </Text>
        </View>

        {salarySlips.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No salary slips available yet
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Your salary slips will appear here once they are generated by your HR department
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.slipsContainer}>
            {salarySlips.map((slip) => {
              const payroll = getPayrollData(
                slip.employeeId,
                slip.payrollId,
                slip.month,
                slip.year,
              );
              const netSalary = (slip as any).slipData?.netSalary || payroll?.netSalary || '0.00';

              return (
                <TouchableOpacity
                  key={slip.id}
                  onPress={() => viewSlipDetails(slip)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.slipCard} mode="elevated">
                    <Card.Content>
                      <View style={styles.slipHeader}>
                        <View style={styles.slipInfo}>
                          <Text variant="titleMedium" style={styles.periodText}>
                            {getMonthName(slip.month)} {slip.year}
                          </Text>
                          <Text variant="bodySmall" style={styles.dateText}>
                            Generated: {slip.generatedAt.toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.slipAmount}>
                          <Text variant="bodySmall" style={styles.netLabel}>
                            Net Salary
                          </Text>
                          <Text variant="titleLarge" style={styles.salaryText}>
                            ₹{netSalary}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.slipActions}>
                        <Button
                          mode="contained-tonal"
                          onPress={() => viewSlipDetails(slip)}
                          style={styles.viewButton}
                          icon="eye"
                        >
                          View Details
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={() => handleDownload(slip)}
                          style={styles.downloadButton}
                          icon="download"
                        >
                          Download
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showDetailModal}
          onDismiss={() => setShowDetailModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            {selectedSlip && (() => {
              const slipData = getSlipData(selectedSlip);
              const payroll = getPayrollData(
                selectedSlip.employeeId,
                selectedSlip.payrollId,
                selectedSlip.month,
                selectedSlip.year,
              );

              if (!slipData) {
                return (
                  <View style={{ padding: 20 }}>
                    <Text variant="bodyMedium">No slip data available</Text>
                    {!payroll && (
                      <Text variant="bodySmall" style={{ color: '#666', marginTop: 8 }}>
                        Payroll data not found for this salary slip.
                      </Text>
                    )}
                  </View>
                );
              }

              return (
                <>
                  <Text variant="headlineSmall" style={styles.modalTitle}>
                    Salary Slip
                  </Text>

                  <Card style={styles.detailCard}>
                    <Card.Content>
                      <Text variant="titleLarge" style={styles.companyName}>
                        {slipData.companyName}
                      </Text>
                      <Text variant="bodyMedium" style={styles.period}>
                        Period: {slipData.period}
                      </Text>
                      <Divider style={styles.divider} />

                      <Text variant="titleMedium" style={styles.sectionTitle}>
                        Earnings
                      </Text>
                      {slipData.earnings.map((row, idx) => (
                        <View key={idx} style={styles.row}>
                          <Text variant="bodyMedium">{row[0]}</Text>
                          <Text variant="bodyMedium" style={styles.amount}>
                            ₹{row[row.length - 1]}
                          </Text>
                        </View>
                      ))}

                      <Divider style={styles.divider} />

                      <Text variant="titleMedium" style={styles.sectionTitle}>
                        Deductions
                      </Text>
                      {slipData.deductions.map((row, idx) => (
                        <View key={idx} style={styles.row}>
                          <Text variant="bodyMedium">{row[0]}</Text>
                          <Text variant="bodyMedium" style={styles.amount}>
                            ₹{row[1]}
                          </Text>
                        </View>
                      ))}

                      <Divider style={styles.divider} />

                      <View style={styles.netSalaryRow}>
                        <Text variant="titleMedium" style={styles.netSalaryLabel}>
                          Net Salary
                        </Text>
                        <Text variant="titleLarge" style={styles.netSalaryAmount}>
                          ₹{slipData.netSalary}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>

                  <View style={styles.modalActions}>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDetailModal(false)}
                      style={styles.actionButton}
                    >
                      Close
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => selectedSlip && handleDownload(selectedSlip)}
                      style={styles.actionButton}
                      icon="download"
                    >
                      Download
                    </Button>
                  </View>
                </>
              );
            })()}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#2196f3',
  },
  subtitle: {
    color: '#e3f2fd',
    marginTop: 4,
  },
  emptyCard: {
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
  },
  slipsContainer: {
    padding: 16,
    gap: 12,
  },
  slipCard: {
    marginBottom: 12,
    elevation: 2,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  slipInfo: {
    flex: 1,
  },
  slipAmount: {
    alignItems: 'flex-end',
  },
  netLabel: {
    color: '#666',
    marginBottom: 4,
  },
  periodText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateText: {
    color: '#666',
  },
  salaryText: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  slipActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewButton: {
    flex: 1,
  },
  downloadButton: {
    flex: 1,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 20,
    paddingBottom: 10,
    fontWeight: 'bold',
  },
  detailCard: {
    margin: 20,
    marginTop: 0,
  },
  companyName: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  period: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2196f3',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  amount: {
    fontWeight: '500',
  },
  netSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  netSalaryLabel: {
    fontWeight: 'bold',
  },
  netSalaryAmount: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
