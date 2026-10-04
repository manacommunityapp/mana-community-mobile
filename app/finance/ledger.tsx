import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  societyFinanceService,
  ChartOfAccountDto,
  GeneralLedgerEntryDto,
} from '@/services/societyFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SocietyLedgerScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'COA' | 'GL'>('COA');

  const {
    data: coa = [],
    isLoading: loadingCoa,
    refetch: refetchCoa,
  } = useQuery({
    queryKey: ['society-coa'],
    queryFn: societyFinanceService.getChartOfAccounts,
  });

  const {
    data: glEntries = [],
    isLoading: loadingGl,
    refetch: refetchGl,
  } = useQuery({
    queryKey: ['society-gl'],
    queryFn: societyFinanceService.getGeneralLedger,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCoa(), refetchGl()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCoa, refetchGl]);

  return (
    <View style={styles.container}>
      {/* ── Switcher Tabs ── */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'COA' && styles.topTabActive]}
          onPress={() => setActiveTab('COA')}
        >
          <Ionicons name="book-outline" size={16} color={activeTab === 'COA' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.topTabText, activeTab === 'COA' && styles.topTabTextActive]}>Chart of Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'GL' && styles.topTabActive]}
          onPress={() => setActiveTab('GL')}
        >
          <Ionicons name="list-outline" size={16} color={activeTab === 'GL' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.topTabText, activeTab === 'GL' && styles.topTabTextActive]}>General Ledger Audit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {activeTab === 'COA' ? (
          <View>
            <Text style={styles.sectionHeading}>Statutory Reserve Funds & Capex</Text>
            {coa.filter(c => c.isReserveFund).map(c => (
              <View key={c.id} style={[styles.coaCard, { borderLeftColor: '#F59E0B' }]}>
                <View style={styles.coaHeader}>
                  <Text style={styles.coaCode}>{c.code}</Text>
                  <Text style={styles.coaType}>{c.type}</Text>
                </View>
                <Text style={styles.coaName}>{c.name}</Text>
                <Text style={styles.coaDesc}>{c.description}</Text>
                <Text style={[styles.coaBal, { color: '#D97706' }]}>{formatCurrency(c.balance)}</Text>
              </View>
            ))}

            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Operational Accounts & Pools</Text>
            {coa.filter(c => !c.isReserveFund).map(c => (
              <View key={c.id} style={[styles.coaCard, { borderLeftColor: c.type === 'INCOME' ? '#10B981' : c.type === 'EXPENSE' ? '#EF4444' : COLORS.primary }]}>
                <View style={styles.coaHeader}>
                  <Text style={styles.coaCode}>{c.code}</Text>
                  <Text style={styles.coaType}>{c.type}</Text>
                </View>
                <Text style={styles.coaName}>{c.name}</Text>
                <Text style={styles.coaDesc}>{c.description}</Text>
                <Text style={styles.coaBal}>{formatCurrency(c.balance)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionHeading}>Double-Entry Journal Log</Text>
            {glEntries.map(entry => (
              <View key={entry.id} style={styles.glCard}>
                <View style={styles.glHeader}>
                  <Text style={styles.glDate}>{entry.entryDate}</Text>
                  <Text style={styles.glVoucher}>{entry.voucherNumber}</Text>
                </View>
                <Text style={styles.glAcc}>[{entry.accountCode}] {entry.accountName}</Text>
                <Text style={styles.glDesc}>{entry.description}</Text>

                <View style={styles.drCrRow}>
                  <Text style={[styles.drText, { opacity: entry.debit > 0 ? 1 : 0.4 }]}>Dr: {formatCurrency(entry.debit)}</Text>
                  <Text style={[styles.crText, { opacity: entry.credit > 0 ? 1 : 0.4 }]}>Cr: {formatCurrency(entry.credit)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topTabs: { flexDirection: 'row', padding: SPACING.md, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  topTabActive: { backgroundColor: COLORS.primary },
  topTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  topTabTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  list: { padding: SPACING.md, paddingBottom: 60 },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  coaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  coaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  coaCode: { fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: '#64748B' },
  coaType: { fontSize: 10, fontWeight: 'bold', color: '#6366F1', backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coaName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  coaDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  coaBal: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 6, textAlign: 'right' },
  glCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  glHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  glDate: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  glVoucher: { fontSize: 11, fontFamily: 'monospace', color: '#3B82F6', fontWeight: 'bold' },
  glAcc: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  glDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  drCrRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 6 },
  drText: { fontSize: 13, fontWeight: 'bold', color: '#EF4444' },
  crText: { fontSize: 13, fontWeight: 'bold', color: '#10B981' },
});
