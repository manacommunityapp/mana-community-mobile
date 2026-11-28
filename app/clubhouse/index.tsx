import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';
import { clubhouseService, formatRupees } from '@/services/clubhouseService';
import type {
  FlatTabAccount,
  GuestAccessPass,
  GuestPassQuote,
  PosOrder,
  PosTabChallenge,
} from '@/types/clubhouse';

const SOCIETY_ID = 1;
const FLAT_ID = 1204;

export default function ClubhouseScreen() {
  const [account, setAccount] = useState<FlatTabAccount | null>(null);
  const [challenges, setChallenges] = useState<PosTabChallenge[]>([]);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [pin, setPin] = useState('4829');

  const [visitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [guestName, setGuestName] = useState('Anita Rao');
  const [quote, setQuote] = useState<GuestPassQuote | null>(null);
  const [passes, setPasses] = useState<GuestAccessPass[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [acc, chs, ords, pss, q] = await Promise.all([
        clubhouseService.getFlatTabAccount(SOCIETY_ID, FLAT_ID),
        clubhouseService.listPendingChallenges(SOCIETY_ID, FLAT_ID),
        clubhouseService.listPosOrders(SOCIETY_ID),
        clubhouseService.listPasses(SOCIETY_ID, FLAT_ID),
        clubhouseService.quotePoolGuests(SOCIETY_ID, FLAT_ID, visitDate, 1),
      ]);
      setAccount(acc);
      setChallenges(chs);
      setOrders(ords);
      setPasses(pss);
      setQuote(q);
    } catch {
      // Offline preview safe
    }
  }, [visitDate]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handlePinCoffee = async () => {
    try {
      const res = await clubhouseService.authorizeCoffeeWithPin(SOCIETY_ID, FLAT_ID, pin);
      Alert.alert('POS Authorized', `${res.outcome}: ${res.order?.itemsSummary ?? ''}`);
      await loadAll();
    } catch (err) {
      Alert.alert('Denied', err instanceof Error ? err.message : 'Unable to charge tab');
    }
  };

  const handleResolvePush = async (challengeId: string, approve: boolean) => {
    try {
      const res = await clubhouseService.resolveChallenge(challengeId, 'Mobile Resident A-1204', approve);
      Alert.alert('Tab Push Confirmation', `Outcome: ${res.outcome}`);
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to respond');
    }
  };

  const handleIssueGuest = async () => {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    try {
      const issued = await clubhouseService.issuePoolPasses(SOCIETY_ID, FLAT_ID, visitDate, [trimmed]);
      Alert.alert(
        'Pool Guest Pass Issued',
        `${issued.passes[0]?.pricingTier ?? ''} • Fee: ${formatRupees(issued.quote.totalPayablePaise)}`,
      );
      await loadAll();
    } catch (err) {
      Alert.alert('Issue Failed', err instanceof Error ? err.message : 'Could not issue pass');
    }
  };

  const handleTurnstileCheck = async (qrToken: string) => {
    try {
      const res = await clubhouseService.validateTurnstileQr(SOCIETY_ID, qrToken);
      Alert.alert(res.reasonCode, `${res.message} (${res.poolOccupancy}/${res.poolCapacity})`);
      await loadAll();
    } catch (err) {
      Alert.alert('Scan Error', err instanceof Error ? err.message : 'Turnstile validation failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Clubhouse POS &amp; Pool Passes</Text>
        <Text style={styles.subHeader}>Tower A - 1204 • Credit Headroom &amp; Dynamic Guest QR</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Available Tab</Text>
            <Text style={styles.kpiVal}>
              {account ? formatRupees(account.availableCreditPaise) : '₹10,000.00'}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Free Pool Slots</Text>
            <Text style={styles.kpiVal}>
              {quote ? `${quote.freeRemainingBefore}/${quote.freeLimit}` : '2/2'}
            </Text>
          </View>
        </View>

        {challenges.map((ch) => (
          <View key={ch.challengeId} style={styles.card}>
            <Text style={styles.cardTitle}>Approve Café Tab ({formatRupees(ch.totalPaise)})</Text>
            <Text style={styles.meta}>{ch.outletName} • {ch.itemsSummary}</Text>
            <View style={styles.rowGap}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleResolvePush(ch.challengeId, true)}>
                <Text style={styles.btnText}>Approve Charge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleResolvePush(ch.challengeId, false)}>
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Café Charge (4-Digit PIN 2FA)</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="4-digit Resident PIN (4829)"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePinCoffee}>
            <Text style={styles.btnText}>Pay Cappuccino ₹252.00 via Tab PIN</Text>
          </TouchableOpacity>
          {orders.slice(0, 3).map((o) => (
            <Text key={o.orderId} style={styles.meta}>
              • {o.itemsSummary} ({formatRupees(o.totalPaise)}) — {o.status}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Swimming Pool Guest Pass ({visitDate})</Text>
          <Text style={styles.meta}>
            {quote
              ? `${quote.dayCategory}: Free ${quote.freeRemainingBefore}/2 • Extra ₹${(quote.paidUnitPricePaise / 100).toFixed(0)}`
              : '2 free/month, then ₹150 weekday / ₹300 weekend'}
          </Text>
          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Guest Full Name"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleIssueGuest}>
            <Text style={styles.btnText}>Issue Signed Turnstile QR Pass</Text>
          </TouchableOpacity>

          {passes.slice(0, 4).map((p) => (
            <View key={p.passId} style={styles.passRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.passGuest}>{p.guestName} ({p.pricingTier})</Text>
                <Text style={styles.meta}>{p.status} • {formatRupees(p.totalPaise)}</Text>
              </View>
              {p.status === 'ACTIVE' && (
                <TouchableOpacity style={styles.scanBtn} onPress={() => handleTurnstileCheck(p.qrToken)}>
                  <Text style={styles.btnText}>Simulate Gate Scan</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  content: { padding: 16, gap: 14 },
  header: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subHeader: { fontSize: 13, color: '#475569' },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiLabel: { fontSize: 12, color: '#64748B' },
  kpiVal: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 12, color: '#475569' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  rowGap: { flexDirection: 'row', gap: 10 },
  primaryBtn: { backgroundColor: COLORS.primary ?? '#2563EB', padding: 11, borderRadius: 8, alignItems: 'center' },
  approveBtn: { flex: 1, backgroundColor: '#059669', padding: 10, borderRadius: 8, alignItems: 'center' },
  declineBtn: { flex: 1, backgroundColor: '#DC2626', padding: 10, borderRadius: 8, alignItems: 'center' },
  scanBtn: { backgroundColor: '#0284C7', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  passRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 },
  passGuest: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
