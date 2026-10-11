import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/services/budgetService';

export default function SocietyTreasuryDashboard() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');

  const { data: summary, refetch } = useQuery({
    queryKey: ['society-budget-summary'],
    queryFn: () => budgetService.getBudgetSummary(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const totalBudget = summary?.totalBudget || 4800000;
  const totalExpenses = summary?.totalExpenses || 3950000;
  const reserveFund = 12500000;
  const totalCollections = 4250000;

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/finance');
          }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Society Treasury & ERP</Text>
          <Text style={s.topNavSubtitle}>Financial Health & Compliance</Text>
        </View>
        <TouchableOpacity
          style={s.topNavIconBtn}
          onPress={() => router.push('/finance/budget')}
        >
          <Ionicons name="pie-chart-outline" size={19} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Segmented Switcher */}
        <View style={s.periodRow}>
          {(['MONTH', 'QUARTER', 'YEAR'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[s.periodChip, selectedPeriod === period && s.periodChipActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[s.periodChipText, selectedPeriod === period && s.periodChipTextActive]}>
                {period === 'MONTH' ? 'October 2026' : period === 'QUARTER' ? 'Q3 FY26-27' : 'FY 2026-27'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Index Metric Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.metricsScroll}
        >
          <View style={s.metricCard}>
            <Text style={s.cardLabel}>Monthly Collections</Text>
            <Text style={s.cardValue}>₹{(totalCollections).toLocaleString('en-IN')}</Text>
            <View style={s.gainPill}>
              <Ionicons name="trending-up" size={12} color={THEME.brandDark} />
              <Text style={s.gainPillText}>+8.4% MoM</Text>
            </View>
          </View>

          <View style={s.metricCard}>
            <Text style={s.cardLabel}>Reserve / Sinking Fund</Text>
            <Text style={s.cardValue}>₹{(reserveFund).toLocaleString('en-IN')}</Text>
            <View style={s.gainPill}>
              <Ionicons name="shield-checkmark" size={12} color={THEME.brandDark} />
              <Text style={s.gainPillText}>Liquid FD & Sweep</Text>
            </View>
          </View>

          <View style={s.metricCard}>
            <Text style={s.cardLabel}>OpEx Incurred</Text>
            <Text style={s.cardValue}>₹{(totalExpenses).toLocaleString('en-IN')}</Text>
            <View style={[s.gainPill, { backgroundColor: THEME.amberLight }]}>
              <Text style={[s.gainPillText, { color: '#B45309' }]}>82.3% of Allocation</Text>
            </View>
          </View>
        </ScrollView>

        {/* Tax & TDS Compliance */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionHeading}>Statutory & Tax Compliance</Text>
          <View style={s.complianceCard}>
            <View style={s.complianceRow}>
              <View style={s.complianceIconBox}>
                <Ionicons name="document-text-outline" size={18} color={THEME.brandDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.complianceTitle}>TDS Deducted (Sec 194C / 194J)</Text>
                <Text style={s.complianceSub}>₹42,500 deposited for Sep 2026</Text>
              </View>
              <View style={s.statusPillCompliant}>
                <Text style={s.statusTextCompliant}>Filed & Paid</Text>
              </View>
            </View>

            <View style={s.complianceDivider} />

            <View style={s.complianceRow}>
              <View style={[s.complianceIconBox, { backgroundColor: THEME.indigoLight }]}>
                <Ionicons name="shield-outline" size={18} color={THEME.indigo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.complianceTitle}>GST Input Tax Credit (ITC)</Text>
                <Text style={s.complianceSub}>₹1,18,400 eligible ITC on vendor invoices</Text>
              </View>
              <View style={s.statusPillCompliant}>
                <Text style={s.statusTextCompliant}>Matched</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Ops Shortcuts */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionHeading}>Committee Actions</Text>
          <View style={s.actionsGrid}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/finance/budget')}
              activeOpacity={0.75}
            >
              <View style={[s.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="pie-chart-outline" size={18} color="#EA580C" />
              </View>
              <Text style={s.actionLabel}>Budget Variance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/finance/invoices')}
              activeOpacity={0.75}
            >
              <View style={[s.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="receipt-outline" size={18} color="#0284C7" />
              </View>
              <Text style={s.actionLabel}>Vendor Invoices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/finance/vendors')}
              activeOpacity={0.75}
            >
              <View style={[s.actionIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="people-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={s.actionLabel}>Vendor TDS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/finance/society-reports')}
              activeOpacity={0.75}
            >
              <View style={[s.actionIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#DC2626" />
              </View>
              <Text style={s.actionLabel}>P&L Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  topNavTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  topNavSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  topNavIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.brandLight,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  periodChipActive: {
    backgroundColor: THEME.brandLight,
    borderColor: THEME.brandBorder,
  },
  periodChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  periodChipTextActive: {
    color: THEME.brandDark,
  },
  metricsScroll: {
    gap: 12,
    paddingVertical: 2,
  },
  metricCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  cardLabel: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.medium,
  },
  cardValue: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
  },
  gainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.brandLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  gainPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.brandDark,
    fontFamily: FONTS.semiBold,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  complianceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  complianceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: THEME.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  complianceSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  statusPillCompliant: {
    backgroundColor: THEME.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTextCompliant: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.brandDark,
  },
  complianceDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
});