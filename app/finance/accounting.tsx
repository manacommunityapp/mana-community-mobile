import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  cfbosAccountingService,
  AccountTreeNode,
  AccountType,
  JournalEntry,
} from '@/services/cfbosAccountingService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Tab = 'coa' | 'journal' | 'trial';

const ACCOUNT_TYPE_COLOR: Record<AccountType, string> = {
  ASSET:     '#2563EB',
  LIABILITY: '#DC2626',
  EQUITY:    '#7C3AED',
  INCOME:    '#16A34A',
  EXPENSE:   '#D97706',
};

function fmt(n: number): string {
  if (n === 0) return '—';
  const sign = n < 0 ? '(' : '';
  const end  = n < 0 ? ')' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${end}`;
}

function dateStr(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

function AccountNode({ node, depth = 0 }: { node: AccountTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <TouchableOpacity
        onPress={() => hasChildren && setExpanded(e => !e)}
        activeOpacity={hasChildren ? 0.7 : 1}
        style={[s.acctRow, { paddingLeft: 16 + depth * 16 }]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {hasChildren ? (
              <Ionicons
                name={expanded ? 'chevron-down' : 'chevron-forward'}
                size={12}
                color={THEME.textSecondary}
              />
            ) : <View style={{ width: 12 }} />}
            <Text style={[s.acctCode, { color: ACCOUNT_TYPE_COLOR[node.accountType] }]}>
              {node.code}
            </Text>
            {node.isSystemAccount && (
              <View style={s.sysBadge}>
                <Text style={s.sysBadgeText}>SYS</Text>
              </View>
            )}
          </View>
          <Text style={[s.acctName, { paddingLeft: 18 }]}>{node.name}</Text>
        </View>
        <Text style={[s.acctBal, { color: node.currentBalance < 0 ? THEME.lossDark : THEME.textPrimary }]}>
          {fmt(node.currentBalance)}
        </Text>
      </TouchableOpacity>
      {expanded && hasChildren && node.children.map(child => (
        <AccountNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </View>
  );
}

function ChartOfAccountsView() {
  const { data: tree = [], isLoading, refetch } = useQuery({
    queryKey: ['cfbos-coa'],
    queryFn: cfbosAccountingService.getAccountTree,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <ScrollView
      contentContainerStyle={s.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
    >
      {isLoading ? (
        <ActivityIndicator color={THEME.brand} style={{ marginTop: 40 }} />
      ) : tree.length === 0 ? (
        <EmptyState icon="book-outline" text="No accounts configured" />
      ) : (
        tree.map(node => (
          <View key={node.id} style={s.acctTypeGroup}>
            <View style={[s.acctTypeHeader, { backgroundColor: ACCOUNT_TYPE_COLOR[node.accountType] + '18' }]}>
              <View style={[s.acctTypeDot, { backgroundColor: ACCOUNT_TYPE_COLOR[node.accountType] }]} />
              <Text style={[s.acctTypeLabel, { color: ACCOUNT_TYPE_COLOR[node.accountType] }]}>
                {node.accountType}
              </Text>
              <Text style={[s.acctTypeBal, { color: ACCOUNT_TYPE_COLOR[node.accountType] }]}>
                {fmt(node.currentBalance)}
              </Text>
            </View>
            {node.children.map(child => (
              <AccountNode key={child.id} node={child} depth={1} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Journal Ledger ──────────────────────────────────────────────────────────

function statusColor(status: JournalEntry['status']): string {
  if (status === 'POSTED')   return THEME.brandDark;
  if (status === 'REVERSED') return THEME.lossDark;
  return THEME.textSecondary;
}

function statusBg(status: JournalEntry['status']): string {
  if (status === 'POSTED')   return THEME.brandLight;
  if (status === 'REVERSED') return THEME.lossLight;
  return THEME.surfaceMuted;
}

function JournalLedgerView() {
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 30);

  const [from] = useState(isoDate(thirtyAgo));
  const [to]   = useState(isoDate(today));
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<JournalEntry | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cfbos-journal', from, to, page],
    queryFn: () => cfbosAccountingService.getJournalEntries(from, to, page, 20),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const entries    = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (selected) {
    return (
      <ScrollView contentContainerStyle={s.listContent}>
        <TouchableOpacity style={s.backRow} onPress={() => setSelected(null)}>
          <Ionicons name="arrow-back" size={16} color={THEME.brandDark} />
          <Text style={s.backText}>Back to Journal</Text>
        </TouchableOpacity>
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailEntry}>{selected.entryNumber}</Text>
            <View style={[s.statusPill, { backgroundColor: statusBg(selected.status) }]}>
              <Text style={[s.statusPillText, { color: statusColor(selected.status) }]}>
                {selected.status}
              </Text>
            </View>
          </View>
          <Text style={s.detailDesc}>{selected.narration}</Text>
          <Text style={s.detailMeta}>{dateStr(selected.entryDate)} · {selected.entryType}</Text>
          {selected.sourceModule && (
            <Text style={s.detailMeta}>Source: {selected.sourceModule}</Text>
          )}

          <View style={s.divider} />
          <Text style={s.detailLinesTitle}>Journal Lines</Text>
          <View style={s.linesHeader}>
            <Text style={[s.linesCol, { flex: 2 }]}>Account</Text>
            <Text style={[s.linesCol, { textAlign: 'right' }]}>Debit</Text>
            <Text style={[s.linesCol, { textAlign: 'right' }]}>Credit</Text>
          </View>
          {selected.lines.map(l => (
            <View key={l.id} style={s.lineRow}>
              <View style={{ flex: 2 }}>
                <Text style={s.lineAcctCode}>{l.accountCode}</Text>
                <Text style={s.lineAcctName}>{l.accountName}</Text>
              </View>
              <Text style={[s.lineAmt, { color: l.debitAmount > 0 ? '#2563EB' : THEME.textMuted }]}>
                {l.debitAmount > 0 ? fmt(l.debitAmount) : '—'}
              </Text>
              <Text style={[s.lineAmt, { color: l.creditAmount > 0 ? THEME.brandDark : THEME.textMuted }]}>
                {l.creditAmount > 0 ? fmt(l.creditAmount) : '—'}
              </Text>
            </View>
          ))}
          <View style={s.divider} />
          <View style={s.lineRow}>
            <Text style={[s.lineAcctCode, { flex: 2, fontFamily: FONTS.bold }]}>Total</Text>
            <Text style={[s.lineAmt, { color: '#2563EB', fontFamily: FONTS.bold }]}>
              {fmt(selected.totalDebit)}
            </Text>
            <Text style={[s.lineAmt, { color: THEME.brandDark, fontFamily: FONTS.bold }]}>
              {fmt(selected.totalCredit)}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
    >
      <View style={s.filterRow}>
        <View style={s.filterItem}>
          <Text style={s.filterLabel}>From</Text>
          <Text style={s.filterValue}>{from}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={THEME.textSecondary} />
        <View style={s.filterItem}>
          <Text style={s.filterLabel}>To</Text>
          <Text style={s.filterValue}>{to}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.brand} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <EmptyState icon="document-text-outline" text="No journal entries in range" />
      ) : (
        <>
          {entries.map(e => (
            <TouchableOpacity key={e.id} style={s.journalRow} onPress={() => setSelected(e)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.journalNum}>{e.entryNumber}</Text>
                  <View style={[s.statusPill, { backgroundColor: statusBg(e.status) }]}>
                    <Text style={[s.statusPillText, { color: statusColor(e.status) }]}>{e.status}</Text>
                  </View>
                </View>
                <Text style={s.journalDesc} numberOfLines={1}>{e.narration}</Text>
                <Text style={s.journalMeta}>{dateStr(e.entryDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={THEME.textSecondary} />
            </TouchableOpacity>
          ))}

          <View style={s.paginationRow}>
            <TouchableOpacity
              onPress={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={[s.pageBtn, page === 0 && s.pageBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={16} color={page === 0 ? THEME.textMuted : THEME.brandDark} />
            </TouchableOpacity>
            <Text style={s.pageText}>Page {page + 1} of {totalPages}</Text>
            <TouchableOpacity
              onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={[s.pageBtn, page >= totalPages - 1 && s.pageBtnDisabled]}
            >
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages - 1 ? THEME.textMuted : THEME.brandDark} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

function TrialBalanceView() {
  const { data: fiscalYears = [], isLoading: loadingFY } = useQuery({
    queryKey: ['cfbos-fy'],
    queryFn: cfbosAccountingService.getFiscalYears,
  });

  const currentFY = useMemo(() => fiscalYears.find(y => y.isCurrent) ?? fiscalYears[0], [fiscalYears]);
  const [selectedFYId, setSelectedFYId] = useState<number | null>(null);
  const activeFYId = selectedFYId ?? currentFY?.id ?? null;

  const { data: tb, isLoading: loadingTB } = useQuery({
    queryKey: ['cfbos-tb', activeFYId],
    queryFn: () => cfbosAccountingService.getTrialBalance(activeFYId!),
    enabled: activeFYId !== null,
  });

  const groupedLines = useMemo(() => {
    if (!tb) return {} as Partial<Record<AccountType, { accountType: string; accountCode: string; accountName: string; debit: number; credit: number; }[]>>;
    const order: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    const result: Partial<Record<AccountType, typeof tb.lines>> = {};
    for (const t of order) {
      const lines = tb.lines.filter(l => l.accountType === t);
      if (lines.length > 0) result[t] = lines;
    }
    return result;
  }, [tb]);

  const isBalanced = tb ? tb.totalDebit === tb.totalCredit : false;

  if (loadingFY || loadingTB) {
    return <ActivityIndicator color={THEME.brand} style={{ marginTop: 60 }} />;
  }

  return (
    <ScrollView contentContainerStyle={s.listContent}>
      {/* FY Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {fiscalYears.map(fy => (
            <TouchableOpacity
              key={fy.id}
              onPress={() => setSelectedFYId(fy.id)}
              style={[s.fyChip, activeFYId === fy.id && s.fyChipActive]}
            >
              <Text style={[s.fyChipText, activeFYId === fy.id && s.fyChipTextActive]}>
                {fy.name}
              </Text>
              {fy.isCurrent && <View style={s.fyCurrentDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {tb && (
        <>
          {/* Balance check banner */}
          <View style={[s.balanceBanner, { backgroundColor: isBalanced ? THEME.brandLight : THEME.lossLight }]}>
            <Ionicons
              name={isBalanced ? 'checkmark-circle' : 'warning'}
              size={16}
              color={isBalanced ? THEME.brandDark : THEME.lossDark}
            />
            <Text style={[s.balanceBannerText, { color: isBalanced ? THEME.brandDark : THEME.lossDark }]}>
              {isBalanced
                ? 'Books are balanced — Debits = Credits'
                : `Out of balance by ₹${Math.abs(tb.totalDebit - tb.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </Text>
          </View>

          {/* Lines by type */}
          {(Object.entries(groupedLines) as [AccountType, typeof tb.lines][]).map(([type, lines]) => (
            <View key={type} style={s.tbTypeGroup}>
              <View style={[s.tbTypeHeader, { borderLeftColor: ACCOUNT_TYPE_COLOR[type] }]}>
                <Text style={[s.tbTypeLabel, { color: ACCOUNT_TYPE_COLOR[type] }]}>{type}</Text>
              </View>
              <View style={s.tbRow}>
                <Text style={[s.tbAcct, s.tbHeaderText]}>Account</Text>
                <Text style={[s.tbAmt, s.tbHeaderText]}>Debit</Text>
                <Text style={[s.tbAmt, s.tbHeaderText]}>Credit</Text>
              </View>
              {lines.map(l => (
                <View key={l.accountCode} style={s.tbRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={s.tbAcctCode}>{l.accountCode}</Text>
                    <Text style={s.tbAcctName}>{l.accountName}</Text>
                  </View>
                  <Text style={[s.tbAmt, { color: l.debitBalance > 0 ? '#2563EB' : THEME.textMuted }]}>
                    {l.debitBalance > 0 ? fmt(l.debitBalance) : '—'}
                  </Text>
                  <Text style={[s.tbAmt, { color: l.creditBalance > 0 ? THEME.brandDark : THEME.textMuted }]}>
                    {l.creditBalance > 0 ? fmt(l.creditBalance) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Grand total */}
          <View style={s.tbTotalCard}>
            <Text style={s.tbTotalLabel}>Grand Total</Text>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.tbTotalMeta}>Total Debits</Text>
                <Text style={[s.tbTotalAmt, { color: '#FFFFFF' }]}>{fmt(tb.totalDebit)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.tbTotalMeta}>Total Credits</Text>
                <Text style={[s.tbTotalAmt, { color: '#FFFFFF' }]}>{fmt(tb.totalCredit)}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {!tb && !loadingTB && (
        <EmptyState icon="stats-chart-outline" text="Select a fiscal year to view the trial balance" />
      )}
    </ScrollView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.emptyBox}>
      <Ionicons name={icon} size={40} color={THEME.textMuted} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'coa',     label: 'Chart',   icon: 'book-outline' },
  { key: 'journal', label: 'Journal', icon: 'list-outline' },
  { key: 'trial',   label: 'Trial',   icon: 'stats-chart-outline' },
];

export default function AccountingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('coa');

  return (
    <View style={s.screen}>
      {/* Top Nav */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabs/feed'))}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.navTitle}>Accounting Engine</Text>
          <Text style={s.navSub}>Double-Entry · CFBOS</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={15} color={activeTab === t.key ? '#FFFFFF' : THEME.textSecondary} />
            <Text style={[s.tabBtnText, activeTab === t.key && s.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'coa'     && <ChartOfAccountsView />}
      {activeTab === 'journal' && <JournalLedgerView />}
      {activeTab === 'trial'   && <TrialBalanceView />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
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
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  navSub:   { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 8,
    backgroundColor: THEME.surfaceMuted, borderWidth: 1, borderColor: THEME.border,
  },
  tabBtnActive: { backgroundColor: THEME.indigo, borderColor: THEME.indigo },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  tabBtnTextActive: { color: '#FFFFFF' },

  listContent: { padding: 14, gap: 10, paddingBottom: 40 },

  acctTypeGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: THEME.border,
    overflow: 'hidden', ...SHADOWS.card,
  },
  acctTypeHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  acctTypeDot: { width: 8, height: 8, borderRadius: 4 },
  acctTypeLabel: { flex: 1, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONTS.semiBold },
  acctTypeBal:   { fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },

  acctRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingRight: 14,
    borderTopWidth: 1, borderTopColor: THEME.border,
  },
  acctCode: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.semiBold },
  acctName: { fontSize: 12, color: THEME.textPrimary, fontFamily: FONTS.regular, marginTop: 1 },
  acctBal:  { fontSize: 12, fontWeight: '600', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },
  sysBadge: { backgroundColor: THEME.indigoLight, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  sysBadgeText: { fontSize: 8, fontWeight: '700', color: THEME.indigo },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: THEME.border,
  },
  filterItem: { flex: 1 },
  filterLabel: { fontSize: 10, color: THEME.textSecondary, fontFamily: FONTS.regular },
  filterValue: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginTop: 2 },

  journalRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: THEME.border,
  },
  journalNum:  { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  journalDesc: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  journalMeta: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  statusPillText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.semiBold },

  paginationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 8,
  },
  pageBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: THEME.border,
  },
  pageBtnDisabled: { backgroundColor: THEME.surfaceMuted, borderColor: THEME.border },
  pageText: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.medium },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  backText: { fontSize: 13, fontWeight: '600', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: THEME.border },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between', marginBottom: 4 },
  detailEntry: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  detailDesc:  { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 4 },
  detailMeta:  { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  detailLinesTitle: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginBottom: 8 },
  linesHeader: { flexDirection: 'row', marginBottom: 4 },
  linesCol: { flex: 1, fontSize: 10, fontWeight: '700', color: THEME.textSecondary, fontFamily: FONTS.semiBold, textTransform: 'uppercase' },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: THEME.border },
  lineAcctCode: { fontSize: 11, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  lineAcctName: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  lineAmt: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },

  balanceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 4,
  },
  balanceBannerText: { fontSize: 13, fontWeight: '600', fontFamily: FONTS.semiBold, flex: 1 },

  fyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1, borderColor: THEME.border,
  },
  fyChipActive: { backgroundColor: THEME.indigoLight, borderColor: THEME.indigo },
  fyChipText: { fontSize: 12.5, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  fyChipTextActive: { color: THEME.indigo },
  fyCurrentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.brand },

  tbTypeGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: THEME.border,
    overflow: 'hidden', marginBottom: 2,
  },
  tbTypeHeader: { borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 8 },
  tbTypeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONTS.semiBold },
  tbRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: THEME.border },
  tbHeaderText: { fontSize: 10, fontWeight: '700', color: THEME.textSecondary, textTransform: 'uppercase', fontFamily: FONTS.semiBold },
  tbAcct: { flex: 2 },
  tbAmt:  { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'right', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },
  tbAcctCode: { fontSize: 11, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  tbAcctName: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 1 },

  tbTotalCard: {
    backgroundColor: THEME.indigo, borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4,
  },
  tbTotalLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.displayBold },
  tbTotalMeta:  { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.regular },
  tbTotalAmt:   { fontSize: 15, fontWeight: '800', fontFamily: FONTS.displayBold, fontVariant: ['tabular-nums'], marginTop: 2 },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 13, color: THEME.textMuted, fontFamily: FONTS.regular },
});
