import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

const PAYMENT_STATUS: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  PAID:    { emoji: '✅', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  DUE:     { emoji: '⏳', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  OVERDUE: { emoji: '🔴', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
};

export default function PackagesScreen() {
  const router = useRouter();

  const { data: packages = [], isLoading, refetch } = useQuery({
    queryKey: ['service-packages-screen'],
    queryFn: () => homeServicesService.getServicePackages(),
  });

  const totalMonthly = packages.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>💰 Salary & Retainers</Text>
            <Text style={styles.headerSub}>Monthly domestic staff payroll</Text>
          </View>
        </View>

        <View style={styles.payrollBanner}>
          <View style={styles.payrollLeft}>
            <Text style={styles.payrollLabel}>📊 Total Monthly Payroll</Text>
            <Text style={styles.payrollAmount}>₹{totalMonthly.toLocaleString()}</Text>
            <Text style={styles.payrollSub}>{packages.length} active service packages</Text>
          </View>
          <View style={styles.payrollRight}>
            <View style={styles.payrollEmojiCircle}>
              <Text style={styles.payrollEmoji}>💸</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={packages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); }} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const pCfg = PAYMENT_STATUS[item.paymentStatus] || PAYMENT_STATUS.DUE;

          return (
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>👤 {item.staffName}</Text>
                  <Text style={styles.staffRole}>{item.role} • 🏠 Unit {item.flatNumber}</Text>
                </View>
                <View style={styles.salaryCol}>
                  <Text style={styles.salaryAmount}>₹{item.monthlySalary.toLocaleString()}</Text>
                  <Text style={styles.salaryFreq}>/{item.packageType.toLowerCase()}</Text>
                </View>
              </View>

              <View style={styles.servicesRow}>
                {item.services.map((svc, i) => (
                  <View key={i} style={styles.serviceChip}>
                    <Text style={styles.serviceCheck}>✓</Text>
                    <Text style={styles.serviceChipText}>{svc}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.dueDateRow}>
                <Text style={styles.dueText}>📅 Next Due: {item.nextDueDate}</Text>
                <View style={[styles.statusBadge, { backgroundColor: pCfg.bg, borderColor: pCfg.border }]}>
                  <Text style={styles.statusEmoji}>{pCfg.emoji}</Text>
                  <Text style={[styles.statusText, { color: pCfg.color }]}>{item.paymentStatus}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => Alert.alert('Confirm Salary Payment', `Record payment of ₹${item.monthlySalary.toLocaleString()} to ${item.staffName}?`, [
                  { text: 'Cancel' },
                  { text: 'Mark Paid', onPress: () => Alert.alert('Success', 'Payment recorded!') }
                ])}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payBtnGrad}
                >
                  <Text style={styles.payBtnText}>💳 Record Payment</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>💰</Text>
            </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  headerSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#C7D2FE', marginTop: 2 },

  payrollBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  payrollLeft: { flex: 1 },
  payrollLabel: { fontSize: 11, fontFamily: FONTS.bold, color: '#C7D2FE' },
  payrollAmount: { fontSize: 28, fontFamily: FONTS.displayEB, color: '#FFFFFF', marginVertical: 4 },
  payrollSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#A5B4FC' },
  payrollRight: { marginLeft: 12 },
  payrollEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payrollEmoji: { fontSize: 24 },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  staffName: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  staffRole: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 3 },
  salaryCol: { alignItems: 'flex-end' },
  salaryAmount: { fontSize: 18, fontFamily: FONTS.displayEB, color: '#0F172A' },
  salaryFreq: { fontSize: 10, fontFamily: FONTS.regular, color: '#64748B' },

  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 6 },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  serviceCheck: { fontSize: 11, color: '#4F46E5', fontFamily: FONTS.bold, marginRight: 4 },
  serviceChipText: { fontSize: 11, fontFamily: FONTS.semiBold, color: '#4F46E5' },

  dueDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueText: { fontSize: 11, fontFamily: FONTS.medium, color: '#64748B' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusEmoji: { fontSize: 11, marginRight: 4 },
  statusText: { fontSize: 10, fontFamily: FONTS.bold },

  payBtn: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  payBtnGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  payBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0F172A' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 4, textAlign: 'center' },
});
