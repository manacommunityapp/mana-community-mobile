import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { mutualFundService, FundCategory, MutualFund } from '@/services/mutualFundService';

const CATEGORIES: { key: FundCategory | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL',       label: 'All',      icon: '📊' },
  { key: 'ELSS',      label: 'Tax Save', icon: '💰' },
  { key: 'LARGE_CAP', label: 'Large Cap',icon: '🏢' },
  { key: 'MID_CAP',   label: 'Mid Cap',  icon: '📈' },
  { key: 'INDEX',     label: 'Index',    icon: '📉' },
  { key: 'LIQUID',    label: 'Liquid',   icon: '💧' },
  { key: 'HYBRID',    label: 'Hybrid',   icon: '⚖️' },
];

const RISK_COLOR: Record<string, string> = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#DC2626' };
const SIP_DATES = [1, 5, 7, 10, 15, 20, 25, 28];

type InvestMode = { fund: MutualFund; type: 'SIP' | 'LUMPSUM' } | null;

export default function MutualFundsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'explore' | 'portfolio' | 'sips'>('explore');
  const [category, setCategory] = useState<FundCategory | 'ALL'>('ALL');
  const [investMode, setInvestMode] = useState<InvestMode>(null);
  const [amount, setAmount] = useState('');
  const [sipDate, setSipDate] = useState(5);

  const { data: funds = [], isLoading: fundsLoading } = useQuery({
    queryKey: ['mf-funds', category],
    queryFn: () => category === 'ALL' ? mutualFundService.getFunds() : mutualFundService.getFunds(category),
    staleTime: 5 * 60 * 1000,
  });

  const { data: holdings = [] } = useQuery({
    queryKey: ['mf-holdings'],
    queryFn: mutualFundService.getHoldings,
    staleTime: 2 * 60 * 1000,
  });

  const { data: sips = [] } = useQuery({
    queryKey: ['mf-sips'],
    queryFn: mutualFundService.getSips,
    staleTime: 2 * 60 * 1000,
  });

  const investMutation = useMutation({
    mutationFn: ({ fundId, amt, type, sd }: { fundId: string; amt: number; type: 'SIP' | 'LUMPSUM'; sd?: number }) =>
      mutualFundService.invest(fundId, amt, type, sd),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['mf-holdings'] });
      qc.invalidateQueries({ queryKey: ['mf-sips'] });
      const launched = await Linking.canOpenURL(result.phone_pe_url)
        .then(ok => ok ? Linking.openURL(result.phone_pe_url) : Linking.openURL(result.upi_intent_url))
        .catch(() => false);
      if (!launched) Linking.openURL(result.upi_intent_url);
      setInvestMode(null);
      setAmount('');
    },
    onError: () => Alert.alert('Error', 'Investment initiation failed. Try again.'),
  });

  const cancelSipMutation = useMutation({
    mutationFn: (sipId: string) => mutualFundService.cancelSip(sipId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mf-sips'] }),
  });

  const handleInvest = useCallback(() => {
    if (!investMode) return;
    const amt = parseFloat(amount);
    const min = investMode.type === 'SIP' ? investMode.fund.min_sip : investMode.fund.min_lumpsum;
    if (!amt || amt < min) { Alert.alert(`Minimum ₹${min}`, `Enter at least ₹${min} for ${investMode.type}.`); return; }
    Alert.alert(
      `${investMode.type === 'SIP' ? 'Set up SIP' : 'Invest Lumpsum'}`,
      `${investMode.fund.short_name}\n₹${amt.toLocaleString()}${investMode.type === 'SIP' ? ` every month on ${sipDate}th` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => investMutation.mutate({ fundId: investMode.fund.id, amt, type: investMode.type, sd: sipDate }) },
      ]
    );
  }, [investMode, amount, sipDate, investMutation]);

  const totalInvested = holdings.reduce((s, h) => s + h.invested_amount, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.current_value, 0);
  const totalPnl = totalCurrent - totalInvested;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Mutual Funds</Text>
          <Text style={s.headerSub}>SIP · Lumpsum · ELSS Tax Saving</Text>
        </View>
        <View style={s.mfBadge}><Text style={s.mfBadgeText}>SEBI</Text></View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['explore', 'portfolio', 'sips'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'explore' ? 'Explore' : t === 'portfolio' ? 'Portfolio' : 'My SIPs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {tab === 'explore' && (
          <>
            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.key} style={[s.catChip, category === c.key && s.catChipActive]} onPress={() => setCategory(c.key)}>
                  <Text style={s.catIcon}>{c.icon}</Text>
                  <Text style={[s.catLabel, category === c.key && s.catLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {fundsLoading ? (
              <View style={s.loaderBox}><ActivityIndicator size="small" color={THEME.brand} /><Text style={s.loaderText}>Loading funds…</Text></View>
            ) : (
              funds.map(fund => (
                <View key={fund.id} style={s.fundCard}>
                  <View style={s.fundHeader}>
                    <View style={s.fundIconBox}><Text style={{ fontSize: 18 }}>📊</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fundName}>{fund.short_name}</Text>
                      <Text style={s.fundAmc}>{fund.amc} · {fund.category.replace('_', ' ')}</Text>
                    </View>
                    <View style={[s.riskBadge, { backgroundColor: RISK_COLOR[fund.risk] + '20' }]}>
                      <Text style={[s.riskText, { color: RISK_COLOR[fund.risk] }]}>{fund.risk}</Text>
                    </View>
                  </View>
                  <View style={s.returnsRow}>
                    {[['1Y', fund.returns_1y], ['3Y', fund.returns_3y], ['5Y', fund.returns_5y]].map(([label, val]) => (
                      <View key={label as string} style={s.returnItem}>
                        <Text style={s.returnLabel}>{label as string} Return</Text>
                        <Text style={[s.returnValue, { color: (val as number) >= 0 ? '#16A34A' : '#DC2626' }]}>
                          {(val as number) >= 0 ? '+' : ''}{val as number}%
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.navRow}>
                    <Text style={s.navText}>NAV ₹{fund.nav.toFixed(2)}</Text>
                    <Text style={[s.navChange, { color: fund.nav_change_pct >= 0 ? '#16A34A' : '#DC2626' }]}>
                      {fund.nav_change_pct >= 0 ? '▲' : '▼'} {Math.abs(fund.nav_change_pct).toFixed(2)}%
                    </Text>
                    <View style={s.fundBtns}>
                      <TouchableOpacity style={s.fundBtnSip} onPress={() => { setInvestMode({ fund, type: 'SIP' }); setAmount(String(fund.min_sip)); }}>
                        <Text style={s.fundBtnSipText}>SIP</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.fundBtnLump} onPress={() => { setInvestMode({ fund, type: 'LUMPSUM' }); setAmount(String(fund.min_lumpsum)); }}>
                        <Text style={s.fundBtnLumpText}>Lumpsum</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'portfolio' && (
          <>
            <View style={[s.card, { backgroundColor: '#1E3A5F' }]}>
              <Text style={s.holdLabel}>Total Invested</Text>
              <Text style={s.holdValue}>₹{totalInvested.toLocaleString()}</Text>
              <Text style={s.holdCurrent}>Current Value: ₹{Math.round(totalCurrent).toLocaleString()}</Text>
              <Text style={[s.holdPnl, { color: totalPnl >= 0 ? '#86EFAC' : '#FCA5A5' }]}>
                {totalPnl >= 0 ? '+' : ''}₹{Math.round(totalPnl).toLocaleString()} ({((totalPnl / totalInvested) * 100).toFixed(2)}%)
              </Text>
            </View>

            {holdings.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📊</Text>
                <Text style={s.emptyText}>No holdings yet. Start investing from the Explore tab.</Text>
              </View>
            ) : (
              holdings.map(h => (
                <View key={h.fund_id} style={s.card}>
                  <Text style={s.fundName}>{h.fund_name}</Text>
                  <View style={s.holdRow}>
                    <View><Text style={s.holdItemLabel}>Units</Text><Text style={s.holdItemValue}>{h.units.toFixed(3)}</Text></View>
                    <View><Text style={s.holdItemLabel}>Avg NAV</Text><Text style={s.holdItemValue}>₹{h.avg_nav.toFixed(2)}</Text></View>
                    <View><Text style={s.holdItemLabel}>Current</Text><Text style={s.holdItemValue}>₹{Math.round(h.current_value).toLocaleString()}</Text></View>
                    <View>
                      <Text style={s.holdItemLabel}>P&L</Text>
                      <Text style={[s.holdItemValue, { color: h.pnl >= 0 ? '#16A34A' : '#DC2626' }]}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'sips' && (
          <>
            {sips.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>🔄</Text>
                <Text style={s.emptyText}>No active SIPs. Set up a SIP from the Explore tab.</Text>
              </View>
            ) : (
              sips.map(sip => (
                <View key={sip.id} style={s.card}>
                  <View style={s.sipHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.fundName}>{sip.fund_name}</Text>
                      <Text style={s.sipMeta}>₹{sip.amount.toLocaleString()}/month · {sip.sip_date}th of every month</Text>
                    </View>
                    <View style={[s.sipStatus, { backgroundColor: sip.status === 'ACTIVE' ? '#DCFCE7' : '#FEF9C3' }]}>
                      <Text style={[s.sipStatusText, { color: sip.status === 'ACTIVE' ? '#16A34A' : '#CA8A04' }]}>{sip.status}</Text>
                    </View>
                  </View>
                  <View style={s.sipStats}>
                    <View><Text style={s.holdItemLabel}>Next SIP</Text><Text style={s.holdItemValue}>{sip.next_installment}</Text></View>
                    <View><Text style={s.holdItemLabel}>Invested</Text><Text style={s.holdItemValue}>₹{sip.total_invested.toLocaleString()}</Text></View>
                    <View><Text style={s.holdItemLabel}>Current</Text><Text style={s.holdItemValue}>₹{sip.current_value.toLocaleString()}</Text></View>
                  </View>
                  <TouchableOpacity style={s.cancelSipBtn} onPress={() =>
                    Alert.alert('Cancel SIP?', `Stop monthly SIP of ₹${sip.amount} for ${sip.fund_name}?`, [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Cancel SIP', style: 'destructive', onPress: () => cancelSipMutation.mutate(sip.id) },
                    ])}>
                    <Text style={s.cancelSipText}>Cancel SIP</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Invest Sheet */}
      {investMode && (
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{investMode.type === 'SIP' ? 'Set up SIP' : 'Invest Lumpsum'} — {investMode.fund.short_name}</Text>
            <TouchableOpacity onPress={() => { setInvestMode(null); setAmount(''); }}>
              <Ionicons name="close" size={20} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={s.fieldLabel}>Amount (₹)</Text>
          <View style={s.inputBox}>
            <Text style={s.inputPrefix}>₹</Text>
            <TextInput style={s.sheetInput} keyboardType="numeric" value={amount} onChangeText={setAmount}
              placeholder={`Min ₹${investMode.type === 'SIP' ? investMode.fund.min_sip : investMode.fund.min_lumpsum}`}
              placeholderTextColor={THEME.textMuted} />
          </View>

          {investMode.type === 'SIP' && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>SIP Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {SIP_DATES.map(d => (
                  <TouchableOpacity key={d} style={[s.dateChip, sipDate === d && s.dateChipActive]} onPress={() => setSipDate(d)}>
                    <Text style={[s.dateChipText, sipDate === d && s.dateChipTextActive]}>{d}th</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={[s.primaryBtn, (!amount || parseFloat(amount) < (investMode.type === 'SIP' ? investMode.fund.min_sip : investMode.fund.min_lumpsum) || investMutation.isPending) && s.primaryBtnDisabled]}
            onPress={handleInvest} disabled={investMutation.isPending}>
            {investMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.primaryBtnText}>{investMode.type === 'SIP' ? `Start ₹${amount}/month SIP` : `Invest ₹${amount} Lumpsum`}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12,
    backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  mfBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  mfBadgeText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8', fontFamily: FONTS.bold },
  tabRow: { flexDirection: 'row', backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: THEME.brand },
  tabLabel: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.medium },
  tabLabelActive: { color: THEME.brandDark, fontWeight: '700', fontFamily: FONTS.semiBold },
  scroll: { padding: 16, gap: 12 },
  catRow: { gap: 8, paddingBottom: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surface },
  catChipActive: { borderColor: THEME.brand, backgroundColor: THEME.brandLight },
  catIcon: { fontSize: 13 },
  catLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  catLabelActive: { color: THEME.brandDark },
  loaderBox: { alignItems: 'center', padding: 32, gap: 8 },
  loaderText: { fontSize: 13, color: THEME.textSecondary },
  fundCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 14, ...SHADOWS.card },
  fundHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fundIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.brandLight, alignItems: 'center', justifyContent: 'center' },
  fundName: { fontSize: 13.5, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  fundAmc: { fontSize: 11, color: THEME.textSecondary, marginTop: 1, fontFamily: FONTS.regular },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  riskText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  returnsRow: { flexDirection: 'row', backgroundColor: THEME.surfaceMuted, borderRadius: 8, padding: 10, marginBottom: 10 },
  returnItem: { flex: 1, alignItems: 'center' },
  returnLabel: { fontSize: 10, color: THEME.textMuted, fontFamily: FONTS.regular },
  returnValue: { fontSize: 13, fontWeight: '700', marginTop: 2, fontFamily: FONTS.semiBold },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navText: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.medium },
  navChange: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.semiBold },
  fundBtns: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  fundBtnSip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: THEME.brandLight, borderWidth: 1, borderColor: THEME.brand },
  fundBtnSipText: { fontSize: 12, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  fundBtnLump: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: THEME.brand },
  fundBtnLumpText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
  card: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 14, ...SHADOWS.card },
  holdLabel: { fontSize: 12, color: '#93C5FD', fontFamily: FONTS.regular },
  holdValue: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: FONTS.displayBold, marginTop: 4 },
  holdCurrent: { fontSize: 14, color: '#BFDBFE', marginTop: 2, fontFamily: FONTS.medium },
  holdPnl: { fontSize: 13, fontWeight: '700', marginTop: 4, fontFamily: FONTS.semiBold },
  holdRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  holdItemLabel: { fontSize: 10, color: THEME.textMuted, fontFamily: FONTS.regular },
  holdItemValue: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginTop: 2 },
  sipHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  sipMeta: { fontSize: 11.5, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  sipStatus: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  sipStatusText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  sipStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cancelSipBtn: { alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DC2626' },
  cancelSipText: { fontSize: 12, fontWeight: '700', color: '#DC2626', fontFamily: FONTS.semiBold },
  emptyBox: { alignItems: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 13, color: THEME.textSecondary, textAlign: 'center', fontFamily: FONTS.regular },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: THEME.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 12,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: THEME.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sheetTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, height: 48, gap: 6 },
  inputPrefix: { fontSize: 16, color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  sheetInput: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  dateChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surface },
  dateChipActive: { borderColor: THEME.brand, backgroundColor: THEME.brandLight },
  dateChipText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  dateChipTextActive: { color: THEME.brandDark },
  primaryBtn: { backgroundColor: THEME.brand, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
});
