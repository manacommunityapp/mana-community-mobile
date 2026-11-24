/**
 * Vendor Finance Reports — Khatabook-style business summary.
 * Shows receivables aging, top debtors/creditors, trend charts.
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { khatabookService } from '@/services/khatabookService';

function fmt(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

export default function VendorFinanceReports() {
  const router = useRouter();

  const { data: parties = [] } = useQuery({
    queryKey: ['vendor-khata-parties'],
    queryFn: khatabookService.getVendorParties,
  });
  const { data: stats } = useQuery({
    queryKey: ['vendor-khata-stats'],
    queryFn: khatabookService.getVendorStats,
  });

  const receivables = parties.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance);
  const payables = parties.filter(p => p.balance < 0).sort((a, b) => a.balance - b.balance);
  const settled = parties.filter(p => p.balance === 0);

  const totalTxns = parties.reduce((s, p) => s + p.totalGave + p.totalGot, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Khata Reports</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderTopColor: THEME.lossDark }]}>
            <Ionicons name="arrow-up-circle" size={20} color={THEME.lossDark} />
            <Text style={s.summaryLabel}>Total Receivable</Text>
            <Text style={[s.summaryVal, { color: THEME.lossDark }]}>{fmt(stats?.totalReceivable ?? 0)}</Text>
            <Text style={s.summaryCount}>{receivables.length} parties</Text>
          </View>
          <View style={[s.summaryCard, { borderTopColor: THEME.brandDark }]}>
            <Ionicons name="arrow-down-circle" size={20} color={THEME.brandDark} />
            <Text style={s.summaryLabel}>Total Payable</Text>
            <Text style={[s.summaryVal, { color: THEME.brandDark }]}>{fmt(stats?.totalPayable ?? 0)}</Text>
            <Text style={s.summaryCount}>{payables.length} parties</Text>
          </View>
        </View>

        <View style={s.netCard}>
          <Text style={s.netLabel}>Net Position</Text>
          <Text style={[s.netVal, { color: (stats?.netBalance ?? 0) >= 0 ? THEME.lossDark : THEME.brandDark }]}>
            {fmt(stats?.netBalance ?? 0)}
            <Text style={s.netValSuffix}> {(stats?.netBalance ?? 0) >= 0 ? 'Net Receivable' : 'Net Payable'}</Text>
          </Text>
          <Text style={s.netSub}>
            Total transactions: {fmt(totalTxns)} across {parties.length} parties
          </Text>
        </View>

        {/* Receivables list */}
        {receivables.length > 0 && (
          <>
            <Text style={s.sectionTitle}>📤 Will Get (Receivables)</Text>
            <View style={s.listCard}>
              {receivables.map((p, i) => (
                <View key={p.id}>
                  <TouchableOpacity
                    style={s.listRow}
                    onPress={() => router.push({ pathname: '/vendor-finance/khata', params: { partyId: p.id } } as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.listAvatar, { backgroundColor: p.avatarColor + '22' }]}>
                      <Text style={[s.listAvatarText, { color: p.avatarColor }]}>{p.avatarInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listName}>{p.name}</Text>
                      <Text style={s.listPhone}>{p.phone}</Text>
                    </View>
                    <Text style={[s.listBalance, { color: THEME.lossDark }]}>{fmt(p.balance)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={THEME.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  {i < receivables.length - 1 && <View style={s.rowDivider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Payables list */}
        {payables.length > 0 && (
          <>
            <Text style={s.sectionTitle}>📥 Will Give (Payables)</Text>
            <View style={s.listCard}>
              {payables.map((p, i) => (
                <View key={p.id}>
                  <TouchableOpacity
                    style={s.listRow}
                    onPress={() => router.push({ pathname: '/vendor-finance/khata', params: { partyId: p.id } } as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.listAvatar, { backgroundColor: p.avatarColor + '22' }]}>
                      <Text style={[s.listAvatarText, { color: p.avatarColor }]}>{p.avatarInitials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listName}>{p.name}</Text>
                      <Text style={s.listPhone}>{p.phone}</Text>
                    </View>
                    <Text style={[s.listBalance, { color: THEME.brandDark }]}>{fmt(p.balance)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={THEME.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  {i < payables.length - 1 && <View style={s.rowDivider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {settled.length > 0 && (
          <Text style={s.settledNote}>✅ {settled.length} {settled.length === 1 ? 'party' : 'parties'} fully settled</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  scroll: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: THEME.surface,
    borderRadius: 12, padding: 14,
    borderTopWidth: 3, borderWidth: 1, borderColor: THEME.border,
    gap: 4, ...SHADOWS.card,
  },
  summaryLabel: { fontSize: 11, color: THEME.textSecondary },
  summaryVal: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryCount: { fontSize: 11, color: THEME.textMuted },
  netCard: {
    backgroundColor: THEME.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: THEME.border, gap: 4, ...SHADOWS.card,
  },
  netLabel: { fontSize: 12, color: THEME.textSecondary, fontWeight: '600' },
  netVal: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  netValSuffix: { fontSize: 13, fontWeight: '500' },
  netSub: { fontSize: 11.5, color: THEME.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, marginTop: 4 },
  listCard: { backgroundColor: THEME.surface, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, ...SHADOWS.card },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  listAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { fontSize: 13, fontWeight: '800' },
  listName: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary },
  listPhone: { fontSize: 11, color: THEME.textSecondary, marginTop: 2 },
  listBalance: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowDivider: { height: 1, backgroundColor: THEME.border, marginHorizontal: 14 },
  settledNote: { fontSize: 13, color: THEME.brandDark, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
});
