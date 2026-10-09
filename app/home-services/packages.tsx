import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

export default function PackagesScreen() {
  const router = useRouter();

  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ['service-packages-screen'],
    queryFn: () => homeServicesService.getServicePackages(),
  });

  const totalMonthly = packages.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Salary & Retainers</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Monthly Domestic Payroll</Text>
        <Text style={styles.summaryValue}>₹{totalMonthly.toLocaleString()}</Text>
        <Text style={styles.summarySub}>{packages.length} active service packages</Text>
      </View>

      <FlatList
        data={packages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{item.staffName}</Text>
                <Text style={styles.staffRole}>{item.role} • Unit {item.flatNumber}</Text>
              </View>
              <View style={styles.salaryCol}>
                <Text style={styles.salaryAmount}>₹{item.monthlySalary.toLocaleString()}</Text>
                <Text style={styles.salaryFreq}>/{item.packageType.toLowerCase()}</Text>
              </View>
            </View>

            <View style={styles.servicesRow}>
              {item.services.map((svc, i) => (
                <View key={i} style={styles.serviceChip}>
                  <Ionicons name="checkmark" size={10} color="#4F46E5" style={{ marginRight: 3 }} />
                  <Text style={styles.serviceChipText}>{svc}</Text>
                </View>
              ))}
            </View>

            <View style={styles.dueDateRow}>
              <Text style={styles.dueText}>Next Due: {item.nextDueDate}</Text>
              <View style={[
                styles.statusBadge,
                item.paymentStatus === 'PAID' ? styles.paidBadge : styles.dueBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  item.paymentStatus === 'PAID' ? styles.paidText : styles.dueBadgeText
                ]}>
                  {item.paymentStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => Alert.alert('Confirm Salary Payment', `Record payment of ₹${item.monthlySalary.toLocaleString()} to ${item.staffName}?`, [
                { text: 'Cancel' },
                { text: 'Mark Paid', onPress: () => Alert.alert('Success', 'Payment recorded!') }
              ])}
            >
              <Ionicons name="wallet-outline" size={14} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No active salary retainers</Text>
            <Text style={styles.emptySub}>Set up monthly subscriptions for your domestic help</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  summaryCard: { marginHorizontal: 16, backgroundColor: '#1E1B4B', borderRadius: 16, padding: 18, marginBottom: 12 },
  summaryLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginVertical: 4 },
  summarySub: { color: '#A5B4FC', fontSize: 11 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  staffName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  staffRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  salaryCol: { alignItems: 'flex-end' },
  salaryAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  salaryFreq: { fontSize: 10, color: '#64748B' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  serviceChipText: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
  dueDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dueText: { fontSize: 11, color: '#64748B' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  paidBadge: { backgroundColor: '#DCFCE7' },
  paidText: { color: '#059669', fontSize: 10, fontWeight: '700' },
  dueBadge: { backgroundColor: '#FEF3C7' },
  dueBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '700' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', marginTop: 12, paddingVertical: 10, borderRadius: 10 },
  payBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
});
