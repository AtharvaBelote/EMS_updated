import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, DataTable, SegmentedButtons } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Attendance } from '../types';

type ViewMode = 'calendar' | 'list';

export default function AttendanceScreen() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    total: 0,
    percentage: 0,
  });

  const fetchData = async () => {
    if (!currentUser) {
      console.log('❌ No currentUser found');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Starting attendance fetch for user:', {
        uid: currentUser.uid,
        employeeId: currentUser.employeeId,
        email: currentUser.email,
      });

      // Build a set of all possible employee identifiers (matching web app logic)
      const employeeIdentifiers = new Set<string>();

      // Add employeeId if available
      if (currentUser.employeeId) {
        employeeIdentifiers.add(currentUser.employeeId);
        console.log('  ✓ Added employeeId:', currentUser.employeeId);

        // Try to find employee document by ID
        try {
          const employeeDocById = await getDoc(doc(db, 'employees', currentUser.employeeId));
          if (employeeDocById.exists()) {
            employeeIdentifiers.add(employeeDocById.id);
            console.log('  ✓ Found employee doc by ID:', employeeDocById.id);
          }
        } catch (err) {
          console.log('  ℹ️ No employee doc found by ID');
        }

        // Try to find employee by employeeId field
        try {
          const employeeByEmployeeIdSnapshot = await getDocs(
            query(
              collection(db, 'employees'),
              where('employeeId', '==', currentUser.employeeId)
            )
          );
          employeeByEmployeeIdSnapshot.docs.forEach((employeeDoc) => {
            employeeIdentifiers.add(employeeDoc.id);
            console.log('  ✓ Found employee doc by employeeId field:', employeeDoc.id);
          });
        } catch (err) {
          console.log('  ℹ️ No employee found by employeeId field');
        }
      }

      // Add uid if available
      if (currentUser.uid) {
        employeeIdentifiers.add(currentUser.uid);
        console.log('  ✓ Added uid:', currentUser.uid);
      }

      // Try to find employee by email
      if (currentUser.email) {
        try {
          const employeeByEmailSnapshot = await getDocs(
            query(collection(db, 'employees'), where('email', '==', currentUser.email))
          );
          employeeByEmailSnapshot.docs.forEach((employeeDoc) => {
            employeeIdentifiers.add(employeeDoc.id);
            console.log('  ✓ Found employee doc by email:', employeeDoc.id);
          });
        } catch (err) {
          console.log('  ℹ️ No employee found by email');
        }
      }

      const resolvedIdentifiers = Array.from(employeeIdentifiers).filter(Boolean);
      console.log('📋 All resolved identifiers:', resolvedIdentifiers);

      if (resolvedIdentifiers.length === 0) {
        console.log('❌ No employee identifiers found!');
        Alert.alert('Error', 'Employee identity not found. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Fetch attendance records using all identifiers (in chunks of 10 for Firestore 'in' limit)
      const attendanceDocs: Record<string, any> = {};

      for (let i = 0; i < resolvedIdentifiers.length; i += 10) {
        const chunk = resolvedIdentifiers.slice(i, i + 10);
        console.log(`🔍 Querying attendance for chunk ${Math.floor(i / 10) + 1}:`, chunk);

        const attendanceQuery =
          chunk.length === 1
            ? query(collection(db, 'attendance'), where('employeeId', '==', chunk[0]))
            : query(collection(db, 'attendance'), where('employeeId', 'in', chunk));

        const attendanceSnapshot = await getDocs(attendanceQuery);
        console.log(`  📊 Found ${attendanceSnapshot.docs.length} documents in this chunk`);

        attendanceSnapshot.docs.forEach((attendanceDoc) => {
          const data = attendanceDoc.data();
          attendanceDocs[attendanceDoc.id] = {
            id: attendanceDoc.id,
            ...data,
          };
          console.log(`    - Document ${attendanceDoc.id}:`, {
            employeeId: data.employeeId,
            date: data.date,
            status: data.status,
          });
        });
      }

      console.log('📊 Total unique attendance documents:', Object.keys(attendanceDocs).length);

      if (Object.keys(attendanceDocs).length === 0) {
        console.log('⚠️ No attendance records found!');
        console.log('📋 Expected Firestore structure:');
        console.log('  Collection: attendance');
        console.log('  Document fields:');
        console.log('  {');
        console.log('    employeeId: "' + resolvedIdentifiers[0] + '",');
        console.log('    date: Timestamp,');
        console.log('    status: "present" | "absent" | "late" | "half-day",');
        console.log('    createdAt: Timestamp,');
        console.log('    updatedAt: Timestamp');
        console.log('  }');
      }

      // Process records
      const records = Object.values(attendanceDocs)
        .map((attendanceDoc) => {
          let dateValue: Date;

          // Handle different date formats (matching web app logic)
          if (attendanceDoc.date?.toDate && typeof attendanceDoc.date.toDate === 'function') {
            dateValue = attendanceDoc.date.toDate();
          } else if (attendanceDoc.date instanceof Date) {
            dateValue = attendanceDoc.date;
          } else if (attendanceDoc.markedAt?.toDate && typeof attendanceDoc.markedAt.toDate === 'function') {
            dateValue = attendanceDoc.markedAt.toDate();
          } else if (attendanceDoc.markedAt instanceof Date) {
            dateValue = attendanceDoc.markedAt;
          } else if (typeof attendanceDoc.date === 'string') {
            dateValue = new Date(attendanceDoc.date);
          } else if (typeof attendanceDoc.date === 'number') {
            dateValue = new Date(attendanceDoc.date);
          } else {
            console.warn('⚠️ Unknown date format:', attendanceDoc.date);
            dateValue = new Date();
          }

          return {
            ...attendanceDoc,
            date: dateValue,
            createdAt: attendanceDoc.createdAt?.toDate?.() || attendanceDoc.markedAt?.toDate?.() || new Date(),
            updatedAt: attendanceDoc.updatedAt?.toDate?.() || attendanceDoc.markedAt?.toDate?.() || new Date(),
          } as Attendance;
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      setAttendanceRecords(records);

      // Create marked dates for calendar
      const marked: any = {};
      records.forEach((record) => {
        const dateString = record.date.toISOString().split('T')[0];
        marked[dateString] = {
          color: getStatusColor(record.status),
          startingDay: true,
          endingDay: true,
        };
      });
      setMarkedDates(marked);

      const present = records.filter((r) => r.status === 'present').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const halfDay = records.filter((r) => r.status === 'half-day').length;
      const total = records.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ present, absent, late, halfDay, total, percentage });

      console.log('✅ Attendance stats:', { present, absent, late, halfDay, total, percentage });
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#4caf50';
      case 'absent':
        return '#f44336';
      case 'late':
        return '#ff9800';
      case 'half-day':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
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
      <Card style={styles.summaryCard}>
        <Card.Title title="Attendance Summary" />
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: '#2196f3' }]}>
                {stats.percentage}%
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: '#4caf50' }]}>
                {stats.present}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: '#f44336' }]}>
                {stats.absent}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={[styles.statValue, { color: '#ff9800' }]}>
                {stats.late}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Late</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <SegmentedButtons
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
            buttons={[
              {
                value: 'calendar',
                label: 'Calendar',
                icon: 'calendar',
              },
              {
                value: 'list',
                label: 'List',
                icon: 'format-list-bulleted',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </Card.Content>
      </Card>

      {viewMode === 'calendar' ? (
        <Card style={styles.card}>
          <Card.Title title="Attendance Calendar" />
          <Card.Content>
            <Calendar
              markedDates={markedDates}
              markingType="period"
              theme={{
                todayTextColor: '#2196f3',
                selectedDayBackgroundColor: '#2196f3',
                dotColor: '#2196f3',
                arrowColor: '#2196f3',
              }}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text variant="bodySmall">Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f44336' }]} />
                <Text variant="bodySmall">Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ff9800' }]} />
                <Text variant="bodySmall">Late</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2196f3' }]} />
                <Text variant="bodySmall">Half-Day</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Title title="Attendance History" />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {attendanceRecords.slice(0, 30).map((record) => (
                <DataTable.Row key={record.id}>
                  <DataTable.Cell>
                    {record.date.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Chip
                      mode="flat"
                      style={{ backgroundColor: getStatusColor(record.status) }}
                      textStyle={{ color: '#fff' }}
                    >
                      {record.status.toUpperCase()}
                    </Chip>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>

            {attendanceRecords.length === 0 && (
              <View style={styles.emptyState}>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No attendance records found
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Check console logs for Firestore structure details
                </Text>
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
  summaryCard: {
    margin: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 12,
  },
});
