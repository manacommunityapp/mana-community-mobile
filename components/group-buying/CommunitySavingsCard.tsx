import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS } from '@/constants/config';
import type { CommunitySavings } from '@/types/groupBuying';

function fmt(n: number) { return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`; }

export default function CommunitySavingsCard({ data }: { data: CommunitySavings }) {
  return (
    <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      <Text style={s.label}>YOUR COMMUNITY SAVED</Text>
      <Text style={s.amount}>{fmt(data.totalSavedThisMonth)}</Text>
      <Text style={s.sub}>this month through Group Buying</Text>
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statNum}>{data.totalOrders.toLocaleString()}</Text><Text style={s.statLabel}>orders</Text></View>
        <View style={s.divider} />
        <View style={s.stat}><Text style={s.statNum}>{data.activeDeals}</Text><Text style={s.statLabel}>active deals</Text></View>
        <View style={s.divider} />
        <View style={s.stat}><Text style={s.statNum}>₹{data.avgSavingPerOrder}</Text><Text style={s.statLabel}>avg saving</Text></View>
      </View>
      {data.totalKgsBought && (
        <Text style={s.kgs}>🛒 Together we bought {data.totalKgsBought.toLocaleString()} KG of groceries</Text>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: 20, gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 },
  amount: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  kgs: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
});
