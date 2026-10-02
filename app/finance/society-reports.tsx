import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { societyFinanceService } from '@/services/societyFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SocietyReportsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [reportType, setReportType] = useState<'INC_EXP' | 'BALANCE_SHEET' | 'GST'>('INC_EXP');

  const { data: incExp, isLoading: l1, refetch: r1 } = useQuery({
    queryKey: ['society-inc-exp'],
    queryFn: () => societyFinanceService.getIncomeExpenseStatement(),
  });

  const { data: balSheet, isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ['society-bal-sheet'],
    queryFn: societyFinanceService.getBalanceSheet,
  });

  const { data: gst, isLoading: l3, refetch: r3 } = useQuery({
    queryKey: ['society-gst'],
    queryFn: () => societyFinanceService.getGstTaxSummary(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([r1(), r2(), r3()]);
    } finally {
      setRefreshing(false);
    }
  }, [r1, r2, r3]);

  const handleShareReport = async () => {
    let summary = '';
    if (reportType === 'INC_EXP' && incExp) {
      summary = `📊 *SOCIETY INCOME & EXPENDITURE STATEMENT*
Period: ${incExp.period} (FY ${incExp.financialYear})
Total Income: ${formatCurrency(incExp.totalIncome)}
Total Expenditure: ${formatCurrency(incExp.totalExpenditure)}
Net Operating Surplus: ${formatCurrency(incExp.netSurplusDeficit)}`;
    } else if (reportType === 'BALANCE_SHEET' && balSheet) {
      summary = `🏛️ *SOCIETY AUDITED BALANCE SHEET*
As of: ${balSheet.asOfDate}
Total Assets: ${formatCurrency(balSheet.totalAssets)}
Sinking Fund Reserve: ${formatCurrency(balSheet.sinkingFundReserve)}
Building Repair Corpus: ${formatCurrency(balSheet.buildingRepairReserve)}`;
    } else if (gst) {
      summary = `📋 *SOCIETY MONTHLY GST AUDIT*
Month: ${gst.month}
Outward Taxable: ${formatCurrency(gst.outwardTaxableSupplies)}
GST Collected: ${formatCurrency(gst.totalGstCollected)}
Eligible ITC: ${formatCurrency(gst.inwardEligibleItc)}
Net Payable: ${formatCurrency(gst.netGstPayable)}`;
    }
    try {
      await Share.share({ message: summary, title: 'Society_Financial_Report' });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* ── Report Selectors ── */}
      <View style={styles.reportTabs}>
        {[
          { key: 'INC_EXP', label: 'Income & Exp (P&L)' },
          { key: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { key: 'GST', label: 'GST & TDS Audit' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.rTabBtn, reportType === tab.key && styles.rTabActive]}
            onPress={() => setReportType(tab.key as any)}
          >
            <Text style={[styles.rTabText, reportType === tab.key && styles.rTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Share Action */}
        <TouchableOpacity style={styles.shareReportBtn} onPress={handleShareReport}>
          <Ionicons name="share-outline" size={16} color={COLORS.primary} />
          <Text style={styles.shareReportText}>Export Statement to WhatsApp / PDF</Text>
        </TouchableOpacity>

        {reportType === 'INC_EXP' && incExp && (
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Income & Expenditure Account</Text>
            <Text style={styles.sheetPeriod}>FY {incExp.financialYear} • {incExp.period}</Text>

            {/* Income */}
            <Text style={styles.groupHeading}>A. OPERATIONAL REVENUE</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Member Maintenance Demands</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.maintenanceCollections)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Clubhouse & Amenity Bookings</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.amenityBookings)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fixed Deposit Interest Earned</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.interestEarned)}</Text>
            </View>
            <View style={[styles.row, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Total Revenue (A)</Text>
              <Text style={[styles.subtotalVal, { color: '#10B981' }]}>{formatCurrency(incExp.totalIncome)}</Text>
            </View>

            {/* Expenses */}
            <Text style={[styles.groupHeading, { marginTop: 16 }]}>B. OPERATIONAL EXPENDITURE</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Security Guarding Services</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.securityExpenses)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Housekeeping & Waste Management</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.housekeepingExpenses)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Electricity & Common Area Power</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.electricityPowerExpenses)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Lift AMC & General Repairs</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.repairsMaintenanceExpenses)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Audit & Legal Administrative</Text>
              <Text style={styles.rowVal}>{formatCurrency(incExp.administrativeExpenses)}</Text>
            </View>
            <View style={[styles.row, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Total Expenses (B)</Text>
              <Text style={[styles.subtotalVal, { color: '#EF4444' }]}>{formatCurrency(incExp.totalExpenditure)}</Text>
            </View>

            {/* Net Result */}
            <View style={styles.netSurplusBox}>
              <Text style={styles.netLabel}>Net Operating Surplus</Text>
              <Text style={styles.netVal}>{formatCurrency(incExp.netSurplusDeficit)}</Text>
            </View>
          </View>
        )}

        {reportType === 'BALANCE_SHEET' && balSheet && (
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Audited Balance Sheet</Text>
            <Text style={styles.sheetPeriod}>As of {balSheet.asOfDate}</Text>

            {/* Assets */}
            <Text style={styles.groupHeading}>I. ASSETS & LIQUIDITY</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Operating Bank Account (HDFC)</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.operatingBankAccounts)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sinking Fund Fixed Deposits</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.sinkingFundFixedDeposits)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Member Maintenance Receivables</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.memberMaintenanceReceivables)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Utility Security Deposits (MSEDCL/Water)</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.securityDepositsWithUtilities)}</Text>
            </View>
            <View style={[styles.row, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Total Assets</Text>
              <Text style={[styles.subtotalVal, { color: COLORS.primary }]}>{formatCurrency(balSheet.totalAssets)}</Text>
            </View>

            {/* Liabilities & Reserves */}
            <Text style={[styles.groupHeading, { marginTop: 16 }]}>II. CAPITAL RESERVES & LIABILITIES</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Statutory Sinking Fund Corpus</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.sinkingFundReserve)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Major Repair & Painting Fund</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.buildingRepairReserve)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>General Accumulated Surplus</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.generalReserveSurplus)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Vendor Payables Outstanding</Text>
              <Text style={styles.rowVal}>{formatCurrency(balSheet.vendorPayables)}</Text>
            </View>
            <View style={[styles.row, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Total Reserves & Liabilities</Text>
              <Text style={[styles.subtotalVal, { color: COLORS.primary }]}>{formatCurrency(balSheet.totalLiabilitiesAndReserves)}</Text>
            </View>
          </View>
        )}

        {reportType === 'GST' && gst && (
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>GST & TDS Statutory Compliance</Text>
            <Text style={styles.sheetPeriod}>Month: {gst.month} (GSTR-1 & GSTR-3B)</Text>

            <Text style={styles.groupHeading}>OUTWARD TAXABLE SUPPLIES (GSTR-1)</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Taxable Demands (Above ₹7,500/mo)</Text>
              <Text style={styles.rowVal}>{formatCurrency(gst.outwardTaxableSupplies)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>CGST (9%) + SGST (9%) Output</Text>
              <Text style={styles.rowVal}>{formatCurrency(gst.totalGstCollected)}</Text>
            </View>

            <Text style={[styles.groupHeading, { marginTop: 16 }]}>INPUT TAX CREDIT (GSTR-3B)</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Inward Supplies Eligible ITC</Text>
              <Text style={styles.rowVal}>{formatCurrency(gst.inwardEligibleItc)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>CGST ITC + SGST ITC</Text>
              <Text style={[styles.rowVal, { color: '#10B981' }]}>{formatCurrency(gst.cgstItc + gst.sgstItc)}</Text>
            </View>

            <View style={[styles.netSurplusBox, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
              <Text style={[styles.netLabel, { color: '#4338CA' }]}>Net GST Payable to Treasury</Text>
              <Text style={[styles.netVal, { color: '#4338CA' }]}>{formatCurrency(gst.netGstPayable)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  reportTabs: { flexDirection: 'row', padding: SPACING.md, gap: 6, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  rTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  rTabActive: { backgroundColor: COLORS.primary },
  rTabText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  rTabTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  content: { padding: SPACING.md, paddingBottom: 60 },
  shareReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  shareReportText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  sheetPeriod: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 12 },
  groupHeading: { fontSize: 12, fontWeight: 'bold', color: '#6366F1', marginTop: 6, marginBottom: 4, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowVal: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  subtotalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 4 },
  subtotalLabel: { fontSize: 13, fontWeight: 'bold', color: '#1E293B' },
  subtotalVal: { fontSize: 14, fontWeight: 'bold' },
  netSurplusBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: { fontSize: 14, fontWeight: 'bold', color: '#065F46' },
  netVal: { fontSize: 16, fontWeight: 'bold', color: '#065F46' },
});
