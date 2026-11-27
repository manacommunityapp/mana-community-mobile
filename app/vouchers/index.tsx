import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '@/constants/config';
import { mobileVoucherService } from '@/services/voucherService';
import { AnimatedQrModal } from '@/components/voucher/AnimatedQrModal';
import type { SampleVoucher, SignedVoucherToken } from '@/types/voucher';

const DEFAULT_SOCIETY_ID = 'soc_hyd_001';

export default function VouchersScreen() {
  const [tab, setTab] = useState<'AVAILABLE' | 'MINE'>('AVAILABLE');
  const [available, setAvailable] = useState<SampleVoucher[]>([]);
  const [mine, setMine] = useState<SampleVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVoucher, setActiveVoucher] = useState<SampleVoucher | null>(null);
  const [activeToken, setActiveToken] = useState<SignedVoucherToken | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [availList, myList] = await Promise.all([
        mobileVoucherService.listAvailableVouchers(DEFAULT_SOCIETY_ID),
        mobileVoucherService.getMyClaimedVouchers(),
      ]);
      setAvailable(availList);
      setMine(myList);
    } catch {
      // keep existing state on transient failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleClaim = async (id: string) => {
    try {
      const claimed = await mobileVoucherService.claimVoucher(id);
      await loadAll();
      if (claimed.signedToken) {
        setActiveVoucher(claimed);
        setActiveToken(claimed.signedToken);
      }
    } catch (err) {
      Alert.alert('Claim Failed', err instanceof Error ? err.message : 'Unable to claim sample');
    }
  };

  const handleOpenQr = (voucher: SampleVoucher) => {
    if (!voucher.signedToken) {
      Alert.alert('Unavailable', 'Token not found for this claim. Pull to refresh.');
      return;
    }
    setActiveVoucher(voucher);
    setActiveToken(voucher.signedToken);
  };

  const items = tab === 'AVAILABLE' ? available : mine;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'AVAILABLE' && styles.tabBtnActive]}
          onPress={() => setTab('AVAILABLE')}
        >
          <Text style={[styles.tabText, tab === 'AVAILABLE' && styles.tabTextActive]}>
            Available ({available.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'MINE' && styles.tabBtnActive]}
          onPress={() => setTab('MINE')}
        >
          <Text style={[styles.tabText, tab === 'MINE' && styles.tabTextActive]}>
            My Vouchers ({mine.length})
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.kioskShortcut} onPress={() => router.push('/vouchers/kiosk')}>
        <Text style={styles.kioskShortcutText}>Open Clubhouse Kiosk Scanner →</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <Text style={styles.empty}>No sample vouchers in this tab yet.</Text>
          ) : (
            items.map((v) => (
              <View key={v.id} style={styles.card}>
                <Text style={styles.brand}>{v.brandName}</Text>
                <Text style={styles.product}>{v.productName}</Text>
                {v.kioskLocation ? (
                  <Text style={styles.meta}>Kiosk: {v.kioskLocation}</Text>
                ) : null}
                <View style={styles.actionRow}>
                  <Text style={styles.status}>{v.status}</Text>
                  {v.status === 'UNCLAIMED' ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleClaim(v.id)}>
                      <Text style={styles.btnText}>Claim Free Sample</Text>
                    </TouchableOpacity>
                  ) : v.status === 'CLAIMED' ? (
                    <TouchableOpacity style={styles.successBtn} onPress={() => handleOpenQr(v)}>
                      <Text style={styles.btnText}>Show Live QR</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <AnimatedQrModal
        visible={activeVoucher !== null && activeToken !== null}
        voucher={activeVoucher}
        token={activeToken}
        onClose={() => {
          setActiveVoucher(null);
          setActiveToken(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabRow: { flexDirection: 'row', padding: 12, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontWeight: '700', color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: '#FFFFFF' },
  kioskShortcut: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  kioskShortcutText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, gap: 12 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  brand: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  product: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  successBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
