import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '@/constants/config';

interface QuickHub {
  title: string;
  sub: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const HUBS: QuickHub[] = [
  { title: 'Invoices & Demands', sub: 'Monthly resident bills & dues', route: '/finance/invoices', icon: 'receipt-outline', color: '#0284C7', bg: '#E0F2FE' },
  { title: 'Expense Approvals', sub: '3-tier voucher authorizations', route: '/finance/expenses', icon: 'checkmark-done-circle-outline', color: '#059669', bg: '#DCFCE7' },
  { title: 'Vendors & TDS Ledger', sub: '194C TDS compliance & payouts', route: '/finance/vendors', icon: 'people-outline', color: '#7C3AED', bg: '#EDE9FE' },
  { title: 'Society Budgeting', sub: 'CapEx & OpEx annual planning', route: '/finance/budget', icon: 'pie-chart-outline', color: '#D97706', bg: '#FEF3C7' },
  { title: 'General Ledger', sub: 'Double-entry journal & accounts', route: '/finance/ledger', icon: 'book-outline', color: '#4F46E5', bg: '#EEF2FF' },
  { title: 'Tax & AGM Reports', sub: 'Balance sheet & trial balance', route: '/finance/society-reports', icon: 'document-text-outline', color: '#DB2777', bg: '#FCE7F3' },
];

export default function SocietyDashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Society Treasury & ERP</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Treasury Overview Hero */}
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4F46E5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroSub}>SOCIETY NET TREASURY RESERVES</Text>
          <Text style={styles.heroAmount}>₹48.65 Lakhs</Text>

          <View style={styles.fundsRow}>
            <View style={styles.fundItem}>
              <Text style={styles.fundLabel}>Operating Account</Text>
              <Text style={styles.fundVal}>₹18.40 L</Text>
            </View>
            <View style={styles.fundDivider} />
            <View style={styles.fundItem}>
              <Text style={styles.fundLabel}>Sinking Fund</Text>
              <Text style={styles.fundVal}>₹25.80 L</Text>
            </View>
            <View style={styles.fundDivider} />
            <View style={styles.fundItem}>
              <Text style={styles.fundLabel}>Advance Wallets</Text>
              <Text style={styles.fundVal}>₹4.45 L</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Monthly Cash Flow Inflow vs Outflow */}
        <View style={styles.cashFlowCard}>
          <Text style={styles.sectionHeader}>October 2026 Cashflow</Text>
          <View style={styles.cashFlowRow}>
            <View style={styles.flowBox}>
              <View style={[styles.flowDot, { backgroundColor: '#059669' }]} />
              <View>
                <Text style={styles.flowLabel}>Maintenance Inflow</Text>
                <Text style={[styles.flowAmount, { color: '#059669' }]}>+₹6.20 L</Text>
              </View>
            </View>
            <View style={styles.flowBox}>
              <View style={[styles.flowDot, { backgroundColor: '#DC2626' }]} />
              <View>
                <Text style={styles.flowLabel}>Vendor Disbursements</Text>
                <Text style={[styles.flowAmount, { color: '#DC2626' }]}>-₹3.85 L</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Financial ERP Modules */}
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Society ERP Operations</Text>
        <View style={styles.hubsGrid}>
          {HUBS.map((hub) => (
            <TouchableOpacity
              key={hub.title}
              style={styles.hubCard}
              onPress={() => router.push(hub.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.hubIconBox, { backgroundColor: hub.bg }]}>
                <Ionicons name={hub.icon} size={22} color={hub.color} />
              </View>
              <Text style={styles.hubTitle}>{hub.title}</Text>
              <Text style={styles.hubSub}>{hub.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 14, ...SHADOWS.sm },
  heroSub: { fontSize: 10, color: '#C7D2FE', fontWeight: '700', letterSpacing: 0.5 },
  heroAmount: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginVertical: 6 },
  fundsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, marginTop: 10 },
  fundItem: { flex: 1, alignItems: 'center' },
  fundLabel: { fontSize: 9, color: '#E0E7FF' },
  fundVal: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  fundDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  cashFlowCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  cashFlowRow: { flexDirection: 'row', gap: 10 },
  flowBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  flowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  flowLabel: { fontSize: 10, color: '#64748B' },
  flowAmount: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  hubsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hubCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  hubIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  hubTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  hubSub: { fontSize: 10, color: '#64748B', marginTop: 2, lineHeight: 14 },
});
