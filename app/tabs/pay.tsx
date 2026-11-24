import React from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { societyFinanceService, type SocietyInvoiceDto } from '@/services/societyFinanceService';
import { useAuth } from '@/hooks/useAuth';
import { useModuleGuard } from '@/hooks/useRoleGuard';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface PayOption {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
  module?: string;
}

const PAY_OPTIONS: PayOption[] = [
  { key: 'wallet', label: 'Mana Wallet', icon: 'wallet-outline', route: '/wallet', color: '#7C3AED', module: 'PAYMENTS' },
  { key: 'dues', label: 'Pay Dues', icon: 'receipt-outline', route: '/payments', color: '#059669', module: 'FINANCE_MGMT' },
  { key: 'bbps', label: 'Bill Pay (BBPS)', icon: 'flash-outline', route: '/bbps', color: '#D97706', module: 'PAYMENTS' },
  { key: 'upi', label: 'UPI / Transfer', icon: 'send-outline', route: '/send-money', color: '#4F46E5', module: 'PAYMENTS' },
  { key: 'auto', label: 'Auto-Debit', icon: 'repeat-outline', route: '/payments/auto-debit', color: '#7C3AED', module: 'FINANCE_MGMT' },
  { key: 'history', label: 'History', icon: 'time-outline', route: '/payments/history', color: '#0369A1', module: 'PAYMENTS' },
  { key: 'rewards', label: 'Rewards', icon: 'gift-outline', route: '/payments/rewards', color: '#BE185D', module: 'PAYMENTS' },
];

function InvoiceRow({ invoice }: { invoice: SocietyInvoiceDto }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const isOverdue = invoice.status === 'OVERDUE';
  return (
    <Pressable
      style={[styles.invoiceRow, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
      onPress={() => router.push('/payments' as any)}
    >
      <View style={styles.invoiceLeft}>
        <Text style={[styles.invoiceNumber, { color: palette.text }]}>{invoice.invoiceNumber}</Text>
        <Text style={[styles.invoiceDue, { color: palette.textMuted }]}>Due {invoice.dueDate}</Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={[styles.invoiceAmount, { color: palette.text }, isOverdue && styles.invoiceAmountOverdue]}>
          ₹{(invoice.balanceDue ?? 0).toLocaleString('en-IN')}
        </Text>
        <View
          style={[
            styles.invoiceStatus,
            { backgroundColor: isOverdue ? palette.dangerLight : palette.surfaceMuted },
          ]}
        >
          <Text
            style={[
              styles.invoiceStatusText,
              { color: isOverdue ? palette.danger : palette.textSecondary },
            ]}
          >
            {invoice.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PayScreen() {
  const router = useRouter();
  const { hasModule, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();
  useModuleGuard('PAYMENTS', 'FINANCE_MGMT');
  const canViewDues = isSuperAdmin || hasModule('FINANCE_MGMT');

  const visibleOptions = React.useMemo(() => {
    return PAY_OPTIONS.filter((opt) => isSuperAdmin || !opt.module || hasModule(opt.module));
  }, [hasModule, isSuperAdmin]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['pay-tab-invoices'],
    queryFn: () => societyFinanceService.getInvoices(),
    staleTime: 60_000,
    enabled: canViewDues,
  });

  const pending = canViewDues ? invoices.filter((inv) =>
    inv.status === 'OVERDUE' || inv.status === 'SENT' || inv.status === 'DRAFT',
  ) : [];
  const totalDue = pending.reduce((s, inv) => s + (inv.balanceDue ?? 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.dockBg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.dockBg, borderBottomColor: palette.dockBorder }]}>
        <Text style={[styles.title, { color: palette.text }]}>Pay</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Payments & billing</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: palette.appBg }}>

      <FlatList
        data={pending.slice(0, 5)}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            {totalDue > 0 && (
              <Pressable
                style={[styles.dueBanner, { backgroundColor: palette.dangerLight }]}
                onPress={() => router.push('/payments' as any)}
              >
                <View>
                  <Text style={[styles.dueBannerLabel, { color: palette.danger }]}>Total Outstanding</Text>
                  <Text style={styles.dueBannerAmount}>₹{totalDue.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.payAllBtn}>
                  <Text style={styles.payAllBtnText}>Pay All</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              </Pressable>
            )}

            {visibleOptions.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Payment Options</Text>
                <View style={styles.optionsGrid}>
                  {visibleOptions.map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={[styles.optionTile, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
                      onPress={() => router.push(opt.route as any)}
                      accessibilityLabel={opt.label}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                        <Ionicons name={opt.icon} size={22} color={opt.color} />
                      </View>
                      <Text style={[styles.optionLabel, { color: palette.text }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {pending.length > 0 && (
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Pending Invoices</Text>
            )}
          </>
        }
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={palette.link} />
          ) : pending.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={40} color={palette.success} />
              <Text style={[styles.emptyText, { color: palette.success }]}>All dues paid</Text>
            </View>
          ) : undefined
        }
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#FAF8FF' },
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
    ...SHADOWS.sm,
  },
  title: { fontSize: 25, color: COLORS.text ?? '#131B2E', fontFamily: FONTS.displayBold },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  scroll: { padding: 16, paddingBottom: 108 },
  sectionTitle: { fontSize: 15.5, color: COLORS.text ?? '#131B2E', fontFamily: FONTS.displayBold, marginBottom: 10, marginTop: 8 },

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
