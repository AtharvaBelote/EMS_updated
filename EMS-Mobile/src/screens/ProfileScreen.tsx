import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Employee } from '../types';

export default function ProfileScreen() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);

  const fetchData = async () => {
    if (!currentUser?.employeeId) return;

    try {
      const employeeQuery = query(
        collection(db, 'employees'),
        where('employeeId', '==', currentUser.employeeId)
      );
      const employeeSnapshot = await getDocs(employeeQuery);

      if (!employeeSnapshot.empty) {
        const empData = {
          id: employeeSnapshot.docs[0].id,
          ...employeeSnapshot.docs[0].data(),
        } as Employee;
        setEmployeeData(empData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!employeeData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Not specified';
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    if (typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate().toLocaleDateString();
    }
    return new Date(dateValue).toLocaleDateString();
  };

  const calculateTotalSalary = () => {
    if (employeeData.salary?.ctcPerMonth) {
      return employeeData.salary.ctcPerMonth;
    }
    if (employeeData.salary?.totalGrossEarning) {
      return employeeData.salary.totalGrossEarning;
    }

    let total = 0;
    const basic = Number(employeeData.salary?.basic || 0);
    const da = Number(employeeData.salary?.da || 0);
    const hra = Number(employeeData.salary?.hra || 0);
    total = basic + da + hra;

    if (employeeData.salary?.customAllowances) {
      total += employeeData.salary.customAllowances.reduce(
        (sum, allowance) => sum + (allowance.amount || 0),
        0
      );
    }

    if (total === 0) {
      const base = Number(employeeData.salary?.base || 0);
      const ta = Number(employeeData.salary?.ta || 0);
      total = base + hra + ta + da;
    }

    return total;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={employeeData.fullName?.charAt(0) || 'E'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.name}>
          {employeeData.fullName}
        </Text>
        <Text variant="bodyMedium" style={styles.employeeId}>
          {employeeData.employeeId}
        </Text>
        <Chip mode="flat" style={styles.statusChip}>
          Active Employee
        </Chip>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Personal Information" />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Email:</Text>
            <Text variant="bodyMedium">{employeeData.email}</Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Mobile:</Text>
            <Text variant="bodyMedium">{employeeData.mobile}</Text>
          </View>
          <Divider style={styles.divider} />

          {employeeData.department && (
            <>
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>Department:</Text>
                <Text variant="bodyMedium">{employeeData.department}</Text>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Joining Date:</Text>
            <Text variant="bodyMedium">
              {formatDate(employeeData.joinDate || employeeData.joiningDate)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Salary Structure" />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Basic Salary:</Text>
            <Text variant="bodyMedium" style={styles.amount}>
              ₹{(employeeData.salary?.basic || 0).toLocaleString()}
            </Text>
          </View>
          <Divider style={styles.divider} />

          {employeeData.salary?.da > 0 && (
            <>
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>DA:</Text>
                <Text variant="bodyMedium" style={styles.amount}>
                  ₹{employeeData.salary.da.toLocaleString()}
                </Text>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {employeeData.salary?.hra && (
            <>
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>HRA:</Text>
                <Text variant="bodyMedium" style={styles.amount}>
                  ₹{employeeData.salary.hra.toLocaleString()}
                </Text>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {employeeData.salary?.ta && (
            <>
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>TA:</Text>
                <Text variant="bodyMedium" style={styles.amount}>
                  ₹{employeeData.salary.ta.toLocaleString()}
                </Text>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text variant="titleMedium" style={styles.totalLabel}>Total CTC:</Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              ₹{calculateTotalSalary().toLocaleString()}
            </Text>
          </View>

          {employeeData.salary?.taxRegime && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>Tax Regime:</Text>
                <Chip mode="flat" style={styles.taxChip}>
                  {employeeData.salary.taxRegime === 'new' ? 'New Regime' : 'Old Regime'}
                </Chip>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {employeeData.address && (
        <Card style={styles.card}>
          <Card.Title title="Address" />
          <Card.Content>
            <Text variant="bodyMedium">{employeeData.address}</Text>
          </Card.Content>
        </Card>
      )}

      {(employeeData.esicNo || employeeData.uan) && (
        <Card style={styles.card}>
          <Card.Title title="Additional Details" />
          <Card.Content>
            {employeeData.esicNo && (
              <>
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.label}>ESIC No:</Text>
                  <Text variant="bodyMedium">{employeeData.esicNo}</Text>
                </View>
                <Divider style={styles.divider} />
              </>
            )}
            {employeeData.uan && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>UAN:</Text>
                <Text variant="bodyMedium">{employeeData.uan}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
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
    backgroundColor: '#2196f3',
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#1976d2',
    marginBottom: 12,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  employeeId: {
    color: '#e3f2fd',
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#4caf50',
  },
  card: {
    margin: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    color: '#666',
    flex: 1,
  },
  amount: {
    fontWeight: '500',
  },
  divider: {
    marginVertical: 4,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  taxChip: {
    backgroundColor: '#e3f2fd',
  },
});
