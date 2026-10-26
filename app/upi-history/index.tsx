import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, StatusBar, SectionList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { upiHistoryService, UpiTransaction, TxnFilter, TxnType, TxnStatus } from '@/services/upiHistoryService';

const FILTER_TABS: { key: TxnFilter; label: string; icon: string }[] = [
  { key: 'ALL',              label: 'All',          icon: '🔄' },
  { key: 'TRANSFER_SENT',    label: 'Sent',         icon: '↑' },
  { key: 'TRANSFER_RECEIVED',label: 'Received',     icon: '↓' },
  { key: 'BILL',             label: 'Bills',        icon: '⚡' },
  { key: 'RECHARGE',         label: 'Recharge',     icon: '📱' },
  { key: 'INVESTMENT',       label: 'Investment',   icon: '📈' },
  { key: 'ENTERTAINMENT',    label: 'Movies',       icon: '🎬' },
  { key: 'LOAN_EMI',         label: 'Loan EMI',     icon: '💸' },
];

function StatusBadge({ status }: { status: TxnStatus }) {
  const map = {
    SUCCESS: { color: '#16A34A', bg: '#DCFCE7', label: 'Success' },
    PENDING: { color: '#D97706', bg: '#FEF9C3', label: 'Pending' },
    FAILED:  { color: '#DC2626', bg: '#FEE2E2', label: 'Failed'  },
  };
  const s = map[status];
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 9, color: s.color }}>{s.label}</Text>
    </View>
  );
}

function TxnRow({ txn }: { txn: UpiTransaction }) {
  const isCredit = txn.amount > 0;
  const amtStr = `${isCredit ? '+' : ''}₹${Math.abs(txn.amount).toLocaleString('en-IN')}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' }}>
      {/* Icon circle */}
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: txn.category_bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Text style={{ fontSize: 20 }}>{txn.icon}</Text>
      </View>
      {/* Details */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }} numberOfLines={1}>{txn.merchant}</Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }} numberOfLines={1}>{txn.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>{txn.time}</Text>
          <StatusBadge status={txn.status} />
        </View>
      </View>
      {/* Amount */}
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: isCredit ? '#16A34A' : txn.status === 'FAILED' ? '#DC2626' : THEME.text, flexShrink: 0 }}>
        {txn.status === 'FAILED' ? <Text style={{ textDecorationLine: 'line-through' }}>{amtStr}</Text> : amtStr}
      </Text>
    </View>
  );
}

function groupByDate(txns: UpiTransaction[]): { title: string; data: UpiTransaction[] }[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const map = new Map<string, UpiTransaction[]>();
  for (const t of txns) {
    let label = t.date === today ? 'Today' : t.date === yesterday ? 'Yesterday' : formatDate(t.date);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(t);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m) - 1]}`;
}

export default function UpiHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<TxnFilter>('ALL');
  const [search, setSearch] = useState('');

  const { data: allTxns = [], isLoading } = useQuery({
    queryKey: ['upi-history'],
    queryFn: () => upiHistoryService.getTransactions(),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let txns = upiHistoryService.filterByType(allTxns, filter);
    if (search.trim()) txns = upiHistoryService.search(txns, search);
    return txns;
  }, [allTxns, filter, search]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);
  const totals = useMemo(() => upiHistoryService.getTotals(allTxns), [allTxns]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ backgroundColor: '#0F766E', paddingTop: Platform.OS === 'ios' ? 52 : 20, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>📋 UPI History</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Summary row */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>₹{totals.sent.toLocaleString('en-IN')}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total Sent</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>₹{totals.received.toLocaleString('en-IN')}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Total Received</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>{allTxns.length}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Transactions</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8 }}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search merchant, amount…"
            placeholderTextColor={THEME.muted}
            style={{ flex: 1, fontFamily: FONTS.regular, fontSize: 13, color: THEME.text }}
            returnKeyType="search"
          />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: THEME.muted }}>✕</Text></TouchableOpacity>}
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {FILTER_TABS.map(tab => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? '#0F766E' : '#F5F5F7', borderWidth: active ? 0 : 1, borderColor: '#E8E9F0' }}
              >
                <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: active ? '#fff' : THEME.text }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transaction list */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator color="#0F766E" size="large" />
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted }}>Loading transactions…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
          <Text style={{ fontSize: 40 }}>📭</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text }}>No transactions found</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, textAlign: 'center' }}>
            {search.trim() ? `No results for "${search}"` : 'No transactions in this category'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TxnRow txn={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ backgroundColor: '#F8F8FB', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8E9F0' }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted }}>{title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
}
