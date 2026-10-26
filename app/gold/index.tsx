import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { goldService } from '@/services/goldService';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const PURITY_OPTIONS: { label: string; value: '22K' | '24K'; desc: string }[] = [
  { label: '24K', value: '24K', desc: 'Pure gold · 99.9%' },
  { label: '22K', value: '22K', desc: 'Jewellery grade · 91.6%' },
];

export default function GoldScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'buy' | 'sell'>('overview');
  const [purity, setPurity] = useState<'24K' | '22K'>('24K');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellGrams, setSellGrams] = useState('');

  const { data: price, isLoading: priceLoading } = useQuery({
    queryKey: ['gold-price'],
    queryFn: goldService.getPrice,
    staleTime: 60 * 1000,
  });

  const { data: holdings = [] } = useQuery({
    queryKey: ['gold-holdings'],
    queryFn: goldService.getHoldings,
    staleTime: 2 * 60 * 1000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['gold-history'],
    queryFn: goldService.getHistory,
    staleTime: 5 * 60 * 1000,
  });

  const buyMutation = useMutation({
    mutationFn: ({ amount, p }: { amount: number; p: '22K' | '24K' }) =>
      goldService.buy(amount, p),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['gold-holdings'] });
      qc.invalidateQueries({ queryKey: ['gold-history'] });
      const launched = await Linking.canOpenURL(result.phone_pe_url)
        .then(ok => ok ? Linking.openURL(result.phone_pe_url) : Linking.openURL(result.upi_intent_url))
        .catch(() => false);
      if (!launched) Linking.openURL(result.upi_intent_url);
      setBuyAmount('');
      setTab('overview');
    },
    onError: () => Alert.alert('Error', 'Could not initiate gold purchase. Try again.'),
  });

  const sellMutation = useMutation({
    mutationFn: ({ grams, p }: { grams: number; p: '22K' | '24K' }) =>
      goldService.sell(grams, p),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['gold-holdings'] });
      Alert.alert('Sell Initiated', `₹${result.amount.toLocaleString()} will be credited in 1–2 business days.\nRef: ${result.transaction_ref}`);
      setSellGrams('');
      setTab('overview');
    },
    onError: () => Alert.alert('Error', 'Could not initiate sale. Try again.'),
  });

  const currentPrice = purity === '24K' ? price?.per_gram_24k : price?.per_gram_22k;
  const gramsForBuy = buyAmount && currentPrice ? (parseFloat(buyAmount) / currentPrice).toFixed(4) : '—';
  const sellValue = sellGrams && currentPrice ? Math.round(parseFloat(sellGrams) * currentPrice) : 0;

  const totalHeld = holdings.reduce((s, h) => s + h.grams, 0);
  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
  const totalPnl = holdings.reduce((s, h) => s + h.unrealised_pnl, 0);

  const handleBuy = useCallback(() => {
    const amt = parseFloat(buyAmount);
    if (!amt || amt < 10) { Alert.alert('Minimum ₹10', 'Enter at least ₹10 to buy gold.'); return; }
    Alert.alert(`Buy ${gramsForBuy}g ${purity} Gold`, `Pay ₹${amt.toLocaleString()} via UPI?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay', onPress: () => buyMutation.mutate({ amount: amt, p: purity }) },
    ]);
  }, [buyAmount, purity, gramsForBuy, buyMutation]);

  const handleSell = useCallback(() => {
    const g = parseFloat(sellGrams);
    if (!g || g <= 0) { Alert.alert('Invalid', 'Enter valid grams to sell.'); return; }
    if (g > totalHeld) { Alert.alert('Insufficient Gold', `You only hold ${totalHeld.toFixed(4)}g.`); return; }
    Alert.alert(`Sell ${g}g ${purity} Gold`, `Receive ₹${sellValue.toLocaleString()} in your bank account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sell', style: 'destructive', onPress: () => sellMutation.mutate({ grams: g, p: purity }) },
    ]);
  }, [sellGrams, purity, sellValue, totalHeld, sellMutation]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Digital Gold</Text>
          <Text style={s.headerSub}>24K Pure · MMTC-PAMP Certified</Text>
        </View>
        <View style={s.goldBadge}><Text style={s.goldBadgeText}>GOLD</Text></View>
      </View>

      {/* Price Ticker */}
      <View style={s.priceBanner}>
        {priceLoading ? <ActivityIndicator size="small" color={THEME.amber} /> : (
          <>
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>24K / gram</Text>
              <Text style={s.priceValue}>₹{price?.per_gram_24k.toLocaleString()}</Text>
            </View>
            <View style={s.priceDivider} />
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>22K / gram</Text>
              <Text style={s.priceValue}>₹{price?.per_gram_22k.toLocaleString()}</Text>
            </View>
            <View style={s.priceDivider} />
            <View style={s.priceItem}>
              <Text style={s.priceLabel}>24h Change</Text>
              <Text style={[s.priceValue, { color: (price?.change_pct_24h ?? 0) >= 0 ? '#16A34A' : '#DC2626' }]}>
                {(price?.change_pct_24h ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(price?.change_pct_24h ?? 0).toFixed(2)}%
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['overview', 'buy', 'sell'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'overview' ? 'Portfolio' : t === 'buy' ? 'Buy Gold' : 'Sell Gold'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {tab === 'overview' && (
          <>
            {/* Holdings Summary */}
            <View style={[s.card, s.holdingCard]}>
              <Text style={s.holdingLabel}>Total Gold Holdings</Text>
              <Text style={s.holdingGrams}>{totalHeld.toFixed(4)} g</Text>
              <Text style={s.holdingValue}>≈ ₹{Math.round(totalValue).toLocaleString()}</Text>
              <View style={[s.pnlRow, { marginTop: 8 }]}>
                <Ionicons name={totalPnl >= 0 ? 'trending-up' : 'trending-down'} size={14} color={totalPnl >= 0 ? '#16A34A' : '#DC2626'} />
                <Text style={[s.pnlText, { color: totalPnl >= 0 ? '#16A34A' : '#DC2626' }]}>
                  {totalPnl >= 0 ? '+' : ''}₹{Math.round(totalPnl).toLocaleString()} unrealised P&L
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={s.quickRow}>
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: '#FFFBEB' }]} onPress={() => setTab('buy')}>
                <Text style={[s.quickBtnIcon, { color: '#D97706' }]}>+</Text>
                <Text style={[s.quickBtnLabel, { color: '#D97706' }]}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => setTab('sell')}>
                <Text style={[s.quickBtnIcon, { color: '#DC2626' }]}>−</Text>
                <Text style={[s.quickBtnLabel, { color: '#DC2626' }]}>Sell</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction History */}
            {history.length > 0 && (
              <View style={s.card}>
                <Text style={s.sectionLabel}>Transaction History</Text>
                {history.map((tx, i) => (
                  <View key={tx.id} style={[s.txRow, i < history.length - 1 && s.txBorder]}>
                    <View style={[s.txIcon, { backgroundColor: tx.type === 'BUY' ? '#FFFBEB' : '#FEF2F2' }]}>
                      <Text style={{ fontSize: 14 }}>{tx.type === 'BUY' ? '🪙' : '💰'}</Text>
                    </View>
                    <View style={s.txInfo}>
                      <Text style={s.txTitle}>{tx.type === 'BUY' ? 'Bought' : 'Sold'} {tx.grams}g {tx.purity}</Text>
                      <Text style={s.txDate}>{new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <View style={s.txRight}>
                      <Text style={[s.txAmount, { color: tx.type === 'BUY' ? '#DC2626' : '#16A34A' }]}>
                        {tx.type === 'BUY' ? '-' : '+'}₹{tx.amount.toLocaleString()}
                      </Text>
                      <View style={[s.statusBadge, { backgroundColor: tx.status === 'COMPLETED' ? '#DCFCE7' : '#FEF9C3' }]}>
                        <Text style={[s.statusText, { color: tx.status === 'COMPLETED' ? '#16A34A' : '#CA8A04' }]}>{tx.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {tab === 'buy' && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Buy Digital Gold</Text>

            {/* Purity Select */}
            <Text style={s.fieldLabel}>Select Purity</Text>
            <View style={s.purityRow}>
              {PURITY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[s.purityCard, purity === opt.value && s.purityCardActive]}
                  onPress={() => setPurity(opt.value)}>
                  <Text style={[s.purityLabel, purity === opt.value && s.purityLabelActive]}>{opt.label}</Text>
                  <Text style={s.purityDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Field */}
            <Text style={s.fieldLabel}>Amount (₹)</Text>
            <View style={s.inputBox}>
              <Text style={s.inputPrefix}>₹</Text>
              <TextInput
                style={s.input} keyboardType="numeric" value={buyAmount}
                onChangeText={setBuyAmount} placeholder="Min ₹10" placeholderTextColor={THEME.textMuted}
              />
            </View>

            {/* Grams Preview */}
            {buyAmount.length > 0 && (
              <View style={s.gramsPreview}>
                <Ionicons name="information-circle-outline" size={14} color={THEME.indigo} />
                <Text style={s.gramsPreviewText}>You will receive ≈ {gramsForBuy}g of {purity} gold</Text>
              </View>
            )}

            {/* Quick Chips */}
            <View style={s.chipRow}>
              {QUICK_AMOUNTS.map(amt => (
                <TouchableOpacity key={amt} style={s.chip} onPress={() => setBuyAmount(String(amt))}>
                  <Text style={s.chipText}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, (!buyAmount || parseFloat(buyAmount) < 10 || buyMutation.isPending) && s.primaryBtnDisabled]}
              onPress={handleBuy} disabled={!buyAmount || parseFloat(buyAmount) < 10 || buyMutation.isPending}
            >
              {buyMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Buy {gramsForBuy}g Gold · Pay ₹{buyAmount || '0'}</Text>}
            </TouchableOpacity>

            <View style={s.trustRow}>
              <Ionicons name="shield-checkmark" size={12} color={THEME.brand} />
              <Text style={s.trustText}>MMTC-PAMP certified · Insured storage · Instant delivery</Text>
            </View>
          </View>
        )}

        {tab === 'sell' && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Sell Digital Gold</Text>
            <View style={s.holdingInfo}>
              <Text style={s.holdingInfoLabel}>Available to sell</Text>
              <Text style={s.holdingInfoValue}>{totalHeld.toFixed(4)}g</Text>
            </View>

            <Text style={s.fieldLabel}>Grams to Sell</Text>
            <View style={s.inputBox}>
              <Text style={s.inputPrefix}>g</Text>
              <TextInput
                style={s.input} keyboardType="decimal-pad" value={sellGrams}
                onChangeText={setSellGrams} placeholder="e.g. 0.5" placeholderTextColor={THEME.textMuted}
              />
            </View>

            {sellGrams.length > 0 && parseFloat(sellGrams) > 0 && (
              <View style={s.gramsPreview}>
                <Ionicons name="information-circle-outline" size={14} color="#16A34A" />
                <Text style={[s.gramsPreviewText, { color: '#16A34A' }]}>
                  You will receive ≈ ₹{sellValue.toLocaleString()} in your bank account
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: '#DC2626' }, (!sellGrams || parseFloat(sellGrams) <= 0 || sellMutation.isPending) && s.primaryBtnDisabled]}
              onPress={handleSell} disabled={!sellGrams || parseFloat(sellGrams) <= 0 || sellMutation.isPending}
            >
              {sellMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Sell Gold · Get ₹{sellValue.toLocaleString()}</Text>}
            </TouchableOpacity>

            <View style={s.trustRow}>
              <Ionicons name="time-outline" size={12} color={THEME.textSecondary} />
              <Text style={s.trustText}>Amount credited in 1–2 business days · T+1 settlement</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  goldBadge: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#D97706', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  goldBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706', fontFamily: FONTS.bold },
  priceBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#78350F', paddingVertical: 10, paddingHorizontal: 8,
  },
  priceItem: { alignItems: 'center' },
  priceLabel: { fontSize: 10, color: '#FDE68A', fontFamily: FONTS.regular },
  priceValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.semiBold },
  priceDivider: { width: 1, height: 28, backgroundColor: '#92400E' },
  tabRow: { flexDirection: 'row', backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#D97706' },
  tabLabel: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.medium },
  tabLabelActive: { color: '#D97706', fontWeight: '700', fontFamily: FONTS.semiBold },
  scroll: { padding: 16, gap: 14 },
  card: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 16, ...SHADOWS.card },
  holdingCard: { alignItems: 'center', backgroundColor: '#78350F' },
  holdingLabel: { fontSize: 12, color: '#FDE68A', fontFamily: FONTS.regular },
  holdingGrams: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontFamily: FONTS.displayBold, marginTop: 4 },
  holdingValue: { fontSize: 16, color: '#FEF3C7', fontFamily: FONTS.medium },
  pnlRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pnlText: { fontSize: 12, fontFamily: FONTS.medium },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  quickBtnIcon: { fontSize: 24, fontWeight: '900' },
  quickBtnLabel: { fontSize: 13, fontWeight: '700', marginTop: 4, fontFamily: FONTS.semiBold },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginBottom: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  txDate: { fontSize: 11, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 13, fontWeight: '700', fontFamily: FONTS.semiBold },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  purityRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  purityCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: THEME.border, backgroundColor: THEME.surface },
  purityCardActive: { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  purityLabel: { fontSize: 16, fontWeight: '800', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  purityLabelActive: { color: '#D97706' },
  purityDesc: { fontSize: 11, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold, marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 10, backgroundColor: THEME.surface, paddingHorizontal: 12, height: 48, gap: 6, marginBottom: 10 },
  inputPrefix: { fontSize: 16, color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  input: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  gramsPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.indigoLight, padding: 10, borderRadius: 8, marginBottom: 10 },
  gramsPreviewText: { flex: 1, fontSize: 12, color: THEME.indigo, fontFamily: FONTS.medium },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: THEME.surfaceMuted, borderWidth: 1, borderColor: THEME.border },
  chipText: { fontSize: 12, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  primaryBtn: { backgroundColor: '#D97706', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  trustText: { flex: 1, fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular },
  holdingInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: THEME.surfaceMuted, borderRadius: 8, padding: 10, marginBottom: 14 },
  holdingInfoLabel: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.medium },
  holdingInfoValue: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
});
