import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Chip, ActivityIndicator, Button, Portal, Modal, TextInput, Menu } from 'react-native-paper';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeaveApplication, LeaveType, LeaveBalance } from '../types';

const LEAVE_TYPES: LeaveType[] = [
  { id: 'casual', name: 'Casual Leave', code: 'CL', maxDaysPerYear: 12, carryForward: false, color: '#2196f3', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'sick', name: 'Sick Leave', code: 'SL', maxDaysPerYear: 8, carryForward: false, color: '#4caf50', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'earned', name: 'Earned Leave', code: 'EL', maxDaysPerYear: 15, carryForward: true, color: '#ff9800', isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

export default function LeaveScreen() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showMenuLeaveType, setShowMenuLeaveType] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    leaveTypeName: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const fetchData = async () => {
    if (!currentUser?.employeeId) return;

    try {
      const applicationsQuery = query(
        collection(db, 'leaveApplications'),
        where('employeeId', '==', currentUser.employeeId)
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);

      const apps = applicationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate?.() || new Date(doc.data().startDate),
        endDate: doc.data().endDate?.toDate?.() || new Date(doc.data().endDate),
        appliedAt: doc.data().appliedAt?.toDate?.() || new Date(),
      })) as LeaveApplication[];

      setApplications(apps.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));

      const balancesQuery = query(
        collection(db, 'leaveBalances'),
        where('employeeId', '==', currentUser.employeeId)
      );
      const balancesSnapshot = await getDocs(balancesQuery);

      const bals = balancesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveBalance[];

      setBalances(bals);
    } catch (error) {
      console.error('Error fetching leave data:', error);
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

  const handleApplyLeave = async () => {
    if (!currentUser?.employeeId || !formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      return;
    }

    try {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await addDoc(collection(db, 'leaveApplications'), {
        employeeId: currentUser.employeeId,
        leaveTypeId: formData.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: formData.reason,
        status: 'pending',
        appliedAt: new Date(),
      });

      setShowApplyModal(false);
      setFormData({
        leaveTypeId: '',
        leaveTypeName: '',
        startDate: '',
        endDate: '',
        reason: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error applying leave:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    const type = LEAVE_TYPES.find((t) => t.id === leaveTypeId);
    return type?.name || leaveTypeId;
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
          <Text variant="headlineSmall">Leave Management</Text>
          <Button 
            mode="contained" 
            onPress={() => setShowApplyModal(true)}
            icon="plus"
          >
            Apply Leave
          </Button>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Leave Balance" />
          <Card.Content>
            {LEAVE_TYPES.map((leaveType) => {
              const balance = balances.find((b) => b.leaveTypeId === leaveType.id);
              const remaining = balance?.remaining ?? leaveType.maxDaysPerYear;
              const used = balance?.used ?? 0;

              return (
                <View key={leaveType.id} style={styles.balanceItem}>
                  <View style={styles.balanceHeader}>
                    <View style={[styles.colorDot, { backgroundColor: leaveType.color }]} />
                    <Text variant="titleMedium">{leaveType.name}</Text>
                  </View>
                  <View style={styles.balanceStats}>
                    <Text variant="bodySmall" style={styles.balanceText}>
                      Used: {used} | Remaining: {remaining}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Leave Applications" />
          <Card.Content>
            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No leave applications found
                </Text>
              </View>
            ) : (
              applications.map((app) => (
                <Card key={app.id} style={styles.applicationCard}>
                  <Card.Content>
                    <View style={styles.applicationHeader}>
                      <Text variant="titleMedium">{getLeaveTypeName(app.leaveTypeId)}</Text>
                      <Chip 
                        mode="flat" 
                        style={{ backgroundColor: getStatusColor(app.status) }}
                        textStyle={{ color: '#fff' }}
                      >
                        {app.status.toUpperCase()}
                      </Chip>
                    </View>
                    <Text variant="bodyMedium" style={styles.dateText}>
                      {app.startDate.toLocaleDateString()} - {app.endDate.toLocaleDateString()}
                    </Text>
                    <Text variant="bodySmall" style={styles.daysText}>
                      {app.totalDays} day(s)
                    </Text>
                    {app.reason && (
                      <Text variant="bodySmall" style={styles.reasonText}>
                        Reason: {app.reason}
                      </Text>
                    )}
                    <Text variant="bodySmall" style={styles.appliedText}>
                      Applied on: {app.appliedAt.toLocaleDateString()}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={showApplyModal}
          onDismiss={() => setShowApplyModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Apply for Leave
          </Text>

          <Menu
            visible={showMenuLeaveType}
            onDismiss={() => setShowMenuLeaveType(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setShowMenuLeaveType(true)}
                style={styles.input}
              >
                {formData.leaveTypeName || 'Select Leave Type'}
              </Button>
            }
          >
            {LEAVE_TYPES.map((type) => (
              <Menu.Item
                key={type.id}
                onPress={() => {
                  setFormData({ ...formData, leaveTypeId: type.id, leaveTypeName: type.name });
                  setShowMenuLeaveType(false);
                }}
                title={type.name}
              />
            ))}
          </Menu>

          <TextInput
            label="Start Date (YYYY-MM-DD)"
            value={formData.startDate}
            onChangeText={(text) => setFormData({ ...formData, startDate: text })}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="End Date (YYYY-MM-DD)"
            value={formData.endDate}
            onChangeText={(text) => setFormData({ ...formData, endDate: text })}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Reason"
            value={formData.reason}
            onChangeText={(text) => setFormData({ ...formData, reason: text })}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <View style={styles.modalActions}>
            <Button onPress={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleApplyLeave}>
              Submit
            </Button>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  balanceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  balanceStats: {
    marginLeft: 20,
  },
  balanceText: {
    color: '#666',
  },
  applicationCard: {
    marginBottom: 12,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginBottom: 4,
  },
  daysText: {
    color: '#666',
    marginBottom: 4,
  },
  reasonText: {
    color: '#666',
    marginBottom: 4,
  },
  appliedText: {
    color: '#999',
    fontSize: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});
