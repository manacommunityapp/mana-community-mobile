import React from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { societyFinanceService, type SocietyInvoiceDto } from '@/services/societyFinanceService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface PayOption {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
}

const PAY_OPTIONS: PayOption[] = [
  { key: 'wallet', label: 'Mana Wallet', icon: 'wallet-outline', route: '/wallet', color: '#7C3AED' },
  { key: 'dues', label: 'Pay Dues', icon: 'receipt-outline', route: '/payments', color: '#059669' },
  { key: 'bbps', label: 'Bill Pay (BBPS)', icon: 'flash-outline', route: '/bbps', color: '#D97706' },
  { key: 'upi', label: 'UPI / Transfer', icon: 'send-outline', route: '/payments/upi', color: '#4F46E5' },
  { key: 'auto', label: 'Auto-Debit', icon: 'repeat-outline', route: '/payments/auto-debit', color: '#7C3AED' },
  { key: 'history', label: 'History', icon: 'time-outline', route: '/payments/history', color: '#0369A1' },
  { key: 'rewards', label: 'Rewards', icon: 'gift-outline', route: '/payments/rewards', color: '#BE185D' },
];

function InvoiceRow({ invoice }: { invoice: SocietyInvoiceDto }) {
  const router = useRouter();
  const isOverdue = invoice.status === 'OVERDUE';
  return (
    <Pressable
      style={styles.invoiceRow}
      onPress={() => router.push('/payments' as any)}
    >
      <View style={styles.invoiceLeft}>
        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
        <Text style={styles.invoiceDue}>Due {invoice.dueDate}</Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={[styles.invoiceAmount, isOverdue && styles.invoiceAmountOverdue]}>
          ₹{(invoice.balanceDue ?? 0).toLocaleString('en-IN')}
        </Text>
        <View style={[styles.invoiceStatus, isOverdue && styles.invoiceStatusOverdue]}>
          <Text style={[styles.invoiceStatusText, isOverdue && styles.invoiceStatusTextOverdue]}>
            {invoice.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PayScreen() {
  const router = useRouter();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['pay-tab-invoices'],
    queryFn: () => societyFinanceService.getInvoices(),
    staleTime: 60_000,
  });

  const pending = invoices.filter((inv) =>
    inv.status === 'OVERDUE' || inv.status === 'SENT' || inv.status === 'DRAFT',
  );
  const totalDue = pending.reduce((s, inv) => s + (inv.balanceDue ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pay</Text>
        <Text style={styles.subtitle}>Payments & billing</Text>
      </View>

      <FlatList
        data={pending.slice(0, 5)}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            {totalDue > 0 && (
              <Pressable
                style={styles.dueBanner}
                onPress={() => router.push('/payments' as any)}
              >
                <View>
                  <Text style={styles.dueBannerLabel}>Total Outstanding</Text>
                  <Text style={styles.dueBannerAmount}>₹{totalDue.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.payAllBtn}>
                  <Text style={styles.payAllBtnText}>Pay All</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              </Pressable>
            )}

            <Text style={styles.sectionTitle}>Payment Options</Text>
            <View style={styles.optionsGrid}>
              {PAY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={styles.optionTile}
                  onPress={() => router.push(opt.route as any)}
                  accessibilityLabel={opt.label}
                >
                  <View style={[styles.optionIcon, { backgroundColor: opt.color + '18' }]}>
                    <Ionicons name={opt.icon} size={22} color={opt.color} />
                  </View>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            {pending.length > 0 && (
              <Text style={styles.sectionTitle}>Pending Invoices</Text>
            )}
          </>
        }
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={THEME.brandDark} />
          ) : pending.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={40} color="#059669" />
              <Text style={styles.emptyText}>All dues paid</Text>
            </View>
          ) : undefined
        }
      />
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
  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold, marginBottom: 10, marginTop: 8 },

  dueBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FEF2F2', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 16, marginBottom: 20, ...SHADOWS.sm,
  },
  dueBannerLabel: { fontSize: 12, color: '#B91C1C', fontFamily: FONTS.regular },
  dueBannerAmount: { fontSize: 22, fontWeight: '800', color: '#DC2626', fontFamily: FONTS.bold, marginTop: 2 },
  payAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DC2626', borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  payAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  optionTile: {
    width: '30%', flexGrow: 1,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, alignItems: 'center', gap: 8,
    ...SHADOWS.sm,
  },
  optionIcon: { width: 46, height: 46, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text ?? '#1E293B', textAlign: 'center', fontFamily: FONTS.semiBold },

  invoiceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, marginBottom: 8, ...SHADOWS.sm,
  },
  invoiceLeft: { flex: 1 },
  invoiceNumber: { fontSize: 14, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  invoiceDue: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmount: { fontSize: 15, fontWeight: '700', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold },
  invoiceAmountOverdue: { color: '#DC2626' },
  invoiceStatus: { backgroundColor: '#F1F5F9', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  invoiceStatusOverdue: { backgroundColor: '#FEE2E2' },
  invoiceStatusText: { fontSize: 10, fontWeight: '600', color: '#475569', fontFamily: FONTS.semiBold },
  invoiceStatusTextOverdue: { color: '#DC2626' },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15, color: '#059669', fontFamily: FONTS.semiBold, fontWeight: '600' },
});
