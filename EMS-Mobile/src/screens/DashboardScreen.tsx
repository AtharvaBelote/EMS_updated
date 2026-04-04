import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Employee, Attendance } from '../types';

export default function DashboardScreen() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    totalAttendance: 0,
    attendancePercentage: 0,
    currentMonthSalary: 0,
  });

  const fetchData = async () => {
    if (!currentUser) {
      console.log('No currentUser found');
      return;
    }

    try {
      console.log('Fetching data for user:', {
        uid: currentUser.uid,
        employeeId: currentUser.employeeId,
        email: currentUser.email,
      });

      // Build a set of all possible employee identifiers
      const employeeIdentifiers = new Set<string>();

      if (currentUser.employeeId) {
        employeeIdentifiers.add(currentUser.employeeId);

        try {
          const employeeDocById = await getDoc(doc(db, 'employees', currentUser.employeeId));
          if (employeeDocById.exists()) {
            employeeIdentifiers.add(employeeDocById.id);
          }
        } catch (err) {
          console.log('No employee doc found by ID');
        }

        try {
          const employeeByEmployeeIdSnapshot = await getDocs(
            query(
              collection(db, 'employees'),
              where('employeeId', '==', currentUser.employeeId)
            )
          );
          employeeByEmployeeIdSnapshot.docs.forEach((employeeDoc) => {
            employeeIdentifiers.add(employeeDoc.id);
          });
        } catch (err) {
          console.log('No employee found by employeeId field');
        }
      }

      if (currentUser.uid) {
        employeeIdentifiers.add(currentUser.uid);
      }

      if (currentUser.email) {
        try {
          const employeeByEmailSnapshot = await getDocs(
            query(collection(db, 'employees'), where('email', '==', currentUser.email))
          );
          employeeByEmailSnapshot.docs.forEach((employeeDoc) => {
            employeeIdentifiers.add(employeeDoc.id);
          });
        } catch (err) {
          console.log('No employee found by email');
        }
      }

      const resolvedIdentifiers = Array.from(employeeIdentifiers).filter(Boolean);
      console.log('Resolved identifiers:', resolvedIdentifiers);

      // Fetch employee data
      let empData: Employee | null = null;
      if (currentUser.employeeId) {
        const employeeQuery = query(
          collection(db, 'employees'),
          where('employeeId', '==', currentUser.employeeId)
        );
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          empData = {
            id: employeeSnapshot.docs[0].id,
            ...employeeSnapshot.docs[0].data(),
          } as Employee;
          setEmployeeData(empData);
          console.log('Employee data loaded:', empData.fullName);
        }
      }

      // Fetch attendance records using all identifiers
      const attendanceDocs: Record<string, any> = {};

      for (let i = 0; i < resolvedIdentifiers.length; i += 10) {
        const chunk = resolvedIdentifiers.slice(i, i + 10);
        console.log(`Querying attendance for chunk ${Math.floor(i / 10) + 1}:`, chunk);

        const attendanceQuery =
          chunk.length === 1
            ? query(collection(db, 'attendance'), where('employeeId', '==', chunk[0]))
            : query(collection(db, 'attendance'), where('employeeId', 'in', chunk));

        const attendanceSnapshot = await getDocs(attendanceQuery);
        console.log(`Found ${attendanceSnapshot.docs.length} documents in this chunk`);

        attendanceSnapshot.docs.forEach((attendanceDoc) => {
          attendanceDocs[attendanceDoc.id] = {
            id: attendanceDoc.id,
            ...attendanceDoc.data(),
          };
        });
      }

      const attendanceData = Object.values(attendanceDocs).map((doc) => ({
        ...doc,
        date: doc.date?.toDate?.() || new Date(doc.date),
      })) as Attendance[];

      console.log('Total attendance records found:', attendanceData.length);

      const totalAttendance = attendanceData.length;
      const presentDays = attendanceData.filter((r) => r.status === 'present').length;
      const absentDays = attendanceData.filter((r) => r.status === 'absent').length;
      const attendancePercentage = totalAttendance > 0
        ? Math.round((presentDays / totalAttendance) * 100)
        : 0;

      // Calculate salary with multiple fallback options
      let calculatedSalary = 0;
      if (empData?.salary) {
        // Try different salary fields
        if (empData.salary.netSalary) {
          calculatedSalary = Number(empData.salary.netSalary);
        } else if (empData.salary.ctcPerMonth) {
          calculatedSalary = Number(empData.salary.ctcPerMonth);
        } else if (empData.salary.totalGrossEarning) {
          calculatedSalary = Number(empData.salary.totalGrossEarning);
        } else if (empData.salary.grossRatePM) {
          calculatedSalary = Number(empData.salary.grossRatePM);
        } else {
          // Calculate from basic components
          const basic = Number(empData.salary.basic || 0);
          const da = Number(empData.salary.da || 0);
          const hra = Number(empData.salary.hra || 0);
          const ta = Number(empData.salary.ta || 0);
          calculatedSalary = basic + da + hra + ta;

          // Add custom allowances if they exist
          if (empData.salary.customAllowances && Array.isArray(empData.salary.customAllowances)) {
            calculatedSalary += empData.salary.customAllowances.reduce(
              (sum, allowance) => sum + (Number(allowance.amount) || 0),
              0
            );
          }
        }
        console.log('Calculated salary:', calculatedSalary);
      }

      setStats({
        presentDays,
        absentDays,
        totalAttendance,
        attendancePercentage,
        currentMonthSalary: calculatedSalary,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Avatar.Text
          size={64}
          label={currentUser?.displayName?.charAt(0) || 'E'}
          style={styles.avatar}
        />
        <Text variant="headlineSmall" style={styles.welcomeText}>
          Welcome, {currentUser?.displayName}!
        </Text>
        <Text variant="bodyMedium" style={styles.employeeId}>
          {currentUser?.employeeId}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.statValue}>
              ₹{stats.currentMonthSalary.toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Monthly Salary
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.statValue}>
              {stats.attendancePercentage}%
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Attendance
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Attendance Summary" />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">Total Days:</Text>
            <Chip mode="flat">{stats.totalAttendance}</Chip>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Present:</Text>
            <Chip mode="flat" style={styles.presentChip}>
              {stats.presentDays}
            </Chip>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium">Absent:</Text>
            <Chip mode="flat" style={styles.absentChip}>
              {stats.absentDays}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {employeeData && (
        <>
          <Card style={styles.card}>
            <Card.Title title="Salary Information" />
            <Card.Content>
              <View style={styles.row}>
                <Text variant="bodyMedium">Basic:</Text>
                <Text variant="bodyMedium">₹{(employeeData.salary?.basic || 0).toLocaleString()}</Text>
              </View>
              {employeeData.salary?.da > 0 && (
                <View style={styles.row}>
                  <Text variant="bodyMedium">DA:</Text>
                  <Text variant="bodyMedium">₹{employeeData.salary.da.toLocaleString()}</Text>
                </View>
              )}
              {employeeData.salary?.hra && (
                <View style={styles.row}>
                  <Text variant="bodyMedium">HRA:</Text>
                  <Text variant="bodyMedium">₹{employeeData.salary.hra.toLocaleString()}</Text>
                </View>
              )}
              {employeeData.salary?.ta && (
                <View style={styles.row}>
                  <Text variant="bodyMedium">TA:</Text>
                  <Text variant="bodyMedium">₹{employeeData.salary.ta.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#e0e0e0', marginTop: 8, paddingTop: 8 }]}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Total:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#2196f3' }}>
                  ₹{stats.currentMonthSalary.toLocaleString()}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Personal Information" />
            <Card.Content>
              <View style={styles.row}>
                <Text variant="bodyMedium">Email:</Text>
                <Text variant="bodyMedium">{employeeData.email}</Text>
              </View>
              <View style={styles.row}>
                <Text variant="bodyMedium">Mobile:</Text>
                <Text variant="bodyMedium">{employeeData.mobile}</Text>
              </View>
              {employeeData.department && (
                <View style={styles.row}>
                  <Text variant="bodyMedium">Department:</Text>
                  <Text variant="bodyMedium">{employeeData.department}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </>
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
  welcomeText: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  employeeId: {
    color: '#e3f2fd',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  presentChip: {
    backgroundColor: '#4caf50',
  },
  absentChip: {
    backgroundColor: '#f44336',
  },
});
