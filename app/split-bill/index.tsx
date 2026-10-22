import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { splitBillService, SplitBill, SplitMember } from '@/services/splitBillService';

const CATEGORY_ICONS: Record<string, string> = {
  MAINTENANCE: '🏠', EVENT: '🎉', UTILITY: '⚡', FOOD: '🍽️', OTHER: '💸',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  OPEN:                { bg: '#EFF6FF', text: '#1D4ED8' },
  PARTIALLY_SETTLED:   { bg: '#FEF9C3', text: '#92400E' },
  SETTLED:             { bg: '#DCFCE7', text: '#16A34A' },
};

const MEMBER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID:     { bg: '#DCFCE7', text: '#16A34A' },
  PENDING:  { bg: '#FEF9C3', text: '#92400E' },
  DECLINED: { bg: '#FEF2F2', text: '#DC2626' },
};

export default function SplitBillScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'my-splits' | 'create'>('my-splits');

  // Create form
  const [title, setTitle] = useState('');
  const [totalAmt, setTotalAmt] = useState('');
  const [memberInputs, setMemberInputs] = useState([
    { name: '', flat: '', share: '' },
    { name: '', flat: '', share: '' },
  ]);

  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['split-bills'],
    queryFn: splitBillService.getSplits,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const total = parseFloat(totalAmt);
      const validMembers = memberInputs.filter(m => m.name.trim() && parseFloat(m.share) > 0);
      return splitBillService.createSplit({
        title: title.trim(),
        total_amount: total,
        split_type: 'CUSTOM',
        members: validMembers.map((m, i) => ({ user_id: `member-${i}`, name: m.name.trim(), flat: m.flat.trim() || undefined, share_amount: parseFloat(m.share) })),
        category: 'OTHER',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['split-bills'] });
      setTab('my-splits');
      setTitle(''); setTotalAmt('');
      setMemberInputs([{ name: '', flat: '', share: '' }, { name: '', flat: '', share: '' }]);
    },
    onError: () => Alert.alert('Error', 'Could not create split. Try again.'),
  });

  const settleMutation = useMutation({
    mutationFn: ({ splitId, memberId, amount, payeeName }: { splitId: string; memberId: string; amount: number; payeeName: string }) =>
      splitBillService.settle(splitId, memberId, amount, payeeName),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['split-bills'] });
      const launched = await Linking.canOpenURL(result.phone_pe_url)
        .then(ok => ok ? Linking.openURL(result.phone_pe_url) : Linking.openURL(result.upi_intent_url))
        .catch(() => false);
      if (!launched) Linking.openURL(result.upi_intent_url);
    },
    onError: () => Alert.alert('Error', 'Payment initiation failed. Try again.'),
  });

  const handleAutoSplit = useCallback(() => {
    const total = parseFloat(totalAmt);
    if (!total || memberInputs.length === 0) return;
    const perMember = Math.round((total / memberInputs.length) * 100) / 100;
    setMemberInputs(prev => prev.map(m => ({ ...m, share: String(perMember) })));
  }, [totalAmt, memberInputs.length]);

  const handleCreate = useCallback(() => {
    if (!title.trim()) { Alert.alert('Required', 'Enter a title for the split.'); return; }
    const total = parseFloat(totalAmt);
    if (!total || total <= 0) { Alert.alert('Required', 'Enter total amount.'); return; }
    const valid = memberInputs.filter(m => m.name.trim() && parseFloat(m.share) > 0);
    if (valid.length < 2) { Alert.alert('Required', 'Add at least 2 members with amounts.'); return; }
    const shareSum = valid.reduce((s, m) => s + parseFloat(m.share), 0);
    if (Math.abs(shareSum - total) > 1) {
      Alert.alert('Mismatch', `Member shares (₹${shareSum}) don't add up to total (₹${total}). Use "Split Equally" to auto-divide.`);
      return;
    }
    createMutation.mutate();
  }, [title, totalAmt, memberInputs, createMutation]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Split Bill</Text>
          <Text style={s.headerSub}>Split expenses among residents · UPI settlement</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['my-splits', 'create'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'my-splits' ? 'My Splits' : '+ Create Split'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {tab === 'my-splits' && (
          isLoading ? (
            <View style={s.loaderBox}><ActivityIndicator size="small" color={THEME.brand} /><Text style={s.loaderText}>Loading splits…</Text></View>
          ) : splits.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>💸</Text>
              <Text style={s.emptyTitle}>No splits yet</Text>
              <Text style={s.emptyText}>Create a split to share expenses with other residents.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setTab('create')}>
                <Text style={s.emptyBtnText}>Create Split</Text>
              </TouchableOpacity>
            </View>
          ) : (
            splits.map(split => (
              <View key={split.id} style={s.splitCard}>
                <View style={s.splitHeaderRow}>
                  <Text style={s.splitIcon}>{CATEGORY_ICONS[split.category] ?? '💸'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.splitTitle}>{split.title}</Text>
                    <Text style={s.splitMeta}>by {split.created_by_name} · {new Date(split.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                  </View>
                  <View style={[s.splitStatusBadge, { backgroundColor: STATUS_COLOR[split.status].bg }]}>
                    <Text style={[s.splitStatusText, { color: STATUS_COLOR[split.status].text }]}>
                      {split.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Amount Summary */}
                <View style={s.amtRow}>
                  <View style={s.amtItem}><Text style={s.amtLabel}>Total</Text><Text style={s.amtValue}>₹{split.total_amount.toLocaleString()}</Text></View>
                  <View style={s.amtItem}><Text style={s.amtLabel}>Settled</Text><Text style={[s.amtValue, { color: '#16A34A' }]}>₹{split.settled_amount.toLocaleString()}</Text></View>
                  <View style={s.amtItem}><Text style={s.amtLabel}>Pending</Text><Text style={[s.amtValue, { color: '#DC2626' }]}>₹{split.pending_amount.toLocaleString()}</Text></View>
                </View>

                {/* Members */}
                <Text style={s.membersLabel}>Members</Text>
                {split.members.map((m, i) => (
                  <View key={m.user_id} style={[s.memberRow, i < split.members.length - 1 && s.memberBorder]}>
                    <View style={s.memberAvatar}>
                      <Text style={s.memberAvatarText}>{m.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{m.name}{m.flat ? ` (${m.flat})` : ''}</Text>
                    </View>
                    <Text style={s.memberAmt}>₹{m.share_amount.toLocaleString()}</Text>
                    {m.status === 'PENDING' ? (
                      <TouchableOpacity
                        style={s.settleBtn}
                        onPress={() => Alert.alert(`Settle ₹${m.share_amount}`, `Pay ${m.name}'s share?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Pay Now', onPress: () => settleMutation.mutate({ splitId: split.id, memberId: m.user_id, amount: m.share_amount, payeeName: m.name }) },
                        ])}
                      >
                        <Text style={s.settleBtnText}>Pay</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.memberStatusBadge, { backgroundColor: MEMBER_STATUS_COLOR[m.status].bg }]}>
                        <Text style={[s.memberStatusText, { color: MEMBER_STATUS_COLOR[m.status].text }]}>{m.status}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))
          )
        )}

        {tab === 'create' && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>New Split</Text>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput style={s.textInput} value={title} onChangeText={setTitle}
              placeholder="e.g. Annual Day Decoration" placeholderTextColor={THEME.textMuted} />

            <Text style={s.fieldLabel}>Total Amount (₹)</Text>
            <View style={s.inputBox}>
              <Text style={s.inputPrefix}>₹</Text>
              <TextInput style={s.inputField} keyboardType="numeric" value={totalAmt} onChangeText={setTotalAmt}
                placeholder="0" placeholderTextColor={THEME.textMuted} />
            </View>

            <View style={s.membersHeaderRow}>
              <Text style={s.fieldLabel}>Members</Text>
              <TouchableOpacity onPress={handleAutoSplit}>
                <Text style={s.splitEquallyBtn}>Split Equally</Text>
              </TouchableOpacity>
            </View>

            {memberInputs.map((m, i) => (
              <View key={i} style={s.memberInputRow}>
                <TextInput style={[s.memberInputField, { flex: 2 }]} value={m.name} placeholder="Name"
                  placeholderTextColor={THEME.textMuted}
                  onChangeText={v => setMemberInputs(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))} />
                <TextInput style={[s.memberInputField, { flex: 1 }]} value={m.flat} placeholder="Flat"
                  placeholderTextColor={THEME.textMuted}
                  onChangeText={v => setMemberInputs(prev => prev.map((x, j) => j === i ? { ...x, flat: v } : x))} />
                <View style={s.shareInputBox}>
                  <Text style={s.inputPrefix}>₹</Text>
                  <TextInput style={[s.memberInputField, { flex: 1 }]} value={m.share} placeholder="Share"
                    keyboardType="numeric" placeholderTextColor={THEME.textMuted}
                    onChangeText={v => setMemberInputs(prev => prev.map((x, j) => j === i ? { ...x, share: v } : x))} />
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.addMemberBtn} onPress={() => setMemberInputs(prev => [...prev, { name: '', flat: '', share: '' }])}>
              <Ionicons name="add-circle-outline" size={16} color={THEME.brand} />
              <Text style={s.addMemberText}>Add Member</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.primaryBtn, (!title.trim() || !totalAmt || createMutation.isPending) && s.primaryBtnDisabled]}
              onPress={handleCreate} disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Create Split · ₹{totalAmt || '0'}</Text>}
            </TouchableOpacity>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  tabRow: { flexDirection: 'row', backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: THEME.brand },
  tabLabel: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.medium },
  tabLabelActive: { color: THEME.brandDark, fontWeight: '700', fontFamily: FONTS.semiBold },
  scroll: { padding: 16, gap: 14 },
  loaderBox: { alignItems: 'center', padding: 32, gap: 8 },
  loaderText: { fontSize: 13, color: THEME.textSecondary },
  emptyBox: { alignItems: 'center', padding: 48, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  emptyText: { fontSize: 13, color: THEME.textSecondary, textAlign: 'center', fontFamily: FONTS.regular },
  emptyBtn: { marginTop: 8, backgroundColor: THEME.brand, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
  splitCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 14, ...SHADOWS.card },
  splitHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  splitIcon: { fontSize: 24 },
  splitTitle: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  splitMeta: { fontSize: 11, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  splitStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  splitStatusText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  amtRow: { flexDirection: 'row', backgroundColor: THEME.surfaceMuted, borderRadius: 8, padding: 10, marginBottom: 12 },
  amtItem: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: 10, color: THEME.textMuted, fontFamily: FONTS.regular },
  amtValue: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginTop: 2 },
  membersLabel: { fontSize: 12, fontWeight: '700', color: THEME.textSecondary, fontFamily: FONTS.semiBold, marginBottom: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: THEME.brandLight, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 13, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  memberName: { fontSize: 12.5, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  memberAmt: { fontSize: 12.5, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  settleBtn: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: THEME.brand, borderRadius: 8 },
  settleBtnText: { fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
  memberStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  memberStatusText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },
  card: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, padding: 16, ...SHADOWS.card },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular, marginBottom: 12, backgroundColor: THEME.surface },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, height: 48, gap: 6, marginBottom: 14, backgroundColor: THEME.surface },
  inputPrefix: { fontSize: 15, color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  inputField: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  membersHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  splitEquallyBtn: { fontSize: 12, fontWeight: '700', color: THEME.brand, fontFamily: FONTS.semiBold },
  memberInputRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  memberInputField: { borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 8, height: 40, fontSize: 12, color: THEME.textPrimary, fontFamily: FONTS.regular, backgroundColor: THEME.surface },
  shareInputBox: { flex: 1.2, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 8, paddingHorizontal: 6, height: 40, backgroundColor: THEME.surface, gap: 2 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginBottom: 14 },
  addMemberText: { fontSize: 13, fontWeight: '600', color: THEME.brand, fontFamily: FONTS.semiBold },
  primaryBtn: { backgroundColor: THEME.brand, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
});
