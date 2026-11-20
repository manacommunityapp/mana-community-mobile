import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Linking, Alert, FlatList, Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { walletService, type WalletTransaction } from '@/services/walletService';

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TxnRow({ txn }: { txn: WalletTransaction }) {
  const isDebit = txn.direction === 'DEBIT';
  return (
    <View style={styles.txnRow}>
      <View style={[styles.txnIcon, { backgroundColor: isDebit ? '#FEE2E2' : '#D1FAE5' }]}>
        <Ionicons
          name={isDebit ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={18}
          color={isDebit ? '#DC2626' : '#059669'}
        />
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnLabel}>{txn.txnType.replace(/_/g, ' ')}</Text>
        {txn.description ? <Text style={styles.txnDesc} numberOfLines={1}>{txn.description}</Text> : null}
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnAmount, { color: isDebit ? '#DC2626' : '#059669' }]}>
          {isDebit ? '−' : '+'}{formatINR(txn.amount)}
        </Text>
        <Text style={styles.txnTime}>{timeAgo(txn.initiatedAt)}</Text>
      </View>
    </View>
  );
}

type Method = 'UPI' | 'CARD';

export default function WalletScreen() {
  const { user } = useAuth();
  const communityId = user?.communityId ?? 0;

  const [topupVisible, setTopupVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [method, setMethod] = useState<Method>('UPI');
  const [proceeding, setProceeding] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', communityId],
    queryFn: () => walletService.getMyWallet(communityId),
    staleTime: 30_000,
    enabled: communityId > 0,
  });

  const { data: txns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['wallet-txns', communityId],
    queryFn: () => walletService.getTransactions(communityId),
    staleTime: 30_000,
    enabled: communityId > 0,
  });

  const handleTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 100) {
      Alert.alert('Minimum ₹100', 'Please enter at least ₹100 to top up.');
      return;
    }
    setProceeding(true);
    try {
      const { paymentUrl } = await walletService.initiateTopup(amt, method);
      setTopupVisible(false);
      setTopupAmount('');
      Linking.openURL(paymentUrl);
    } catch {
      Alert.alert('Error', 'Could not initiate top-up. Please try again.');
    } finally {
      setProceeding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mana Wallet</Text>
        <Text style={styles.subtitle}>Your community balance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        {walletLoading ? (
          <ActivityIndicator style={{ marginVertical: 32 }} color={THEME.brandDark} />
        ) : (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatINR(wallet?.balance ?? 0)}</Text>
            {wallet && wallet.creditLimit > 0 && (
              <Text style={styles.creditLine}>+ {formatINR(wallet.creditLimit)} credit available</Text>
            )}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setTopupVisible(true)}>
            <Ionicons name="add-circle-outline" size={18} color={THEME.brandDark} />
            <Text style={styles.actionLabel}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Ionicons name="receipt-outline" size={18} color={THEME.brandDark} />
            <Text style={styles.actionLabel}>Pay Dues</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
            <Ionicons name="time-outline" size={18} color={THEME.brandDark} />
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {txnsLoading ? (
          <ActivityIndicator color={THEME.brandDark} />
        ) : txns.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          txns.map((t) => <TxnRow key={t.id} txn={t} />)
        )}
      </ScrollView>

      {/* Top-up modal */}
      <Modal visible={topupVisible} transparent animationType="slide" onRequestClose={() => setTopupVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTopupVisible(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Top Up Wallet</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Enter amount (min ₹100)"
            keyboardType="numeric"
            value={topupAmount}
            onChangeText={setTopupAmount}
            placeholderTextColor={COLORS.textMuted}
          />
          <View style={styles.methodRow}>
            {(['UPI', 'CARD'] as Method[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.methodChip, method === m && styles.methodChipActive]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.proceedBtn} onPress={handleTopup} disabled={proceeding}>
            {proceeding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.proceedBtnText}>Proceed</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  scroll: { padding: 16, paddingBottom: 40 },

  balanceCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: THEME.brandDark,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: FONTS.regular },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4, fontFamily: FONTS.bold },
  creditLine: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 6, fontFamily: FONTS.regular },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: THEME.border, ...SHADOWS.sm,
  },
  actionLabel: { fontSize: 12, color: COLORS.text, fontFamily: FONTS.medium },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold, marginBottom: 10 },

  txnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 12, marginBottom: 8, ...SHADOWS.sm,
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.semiBold },
  txnDesc: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 1 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
  txnTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.regular },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold },
  amountInput: {
    borderWidth: 1, borderColor: THEME.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    color: COLORS.text, fontFamily: FONTS.regular,
  },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodChip: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: THEME.border,
  },
  methodChipActive: { borderColor: THEME.brandDark, backgroundColor: THEME.brandDark + '14' },
  methodChipText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.medium },
  methodChipTextActive: { color: THEME.brandDark },
  proceedBtn: {
    backgroundColor: THEME.brandDark, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
  },
  proceedBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
});
