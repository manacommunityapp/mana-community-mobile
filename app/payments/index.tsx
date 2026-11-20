import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CARDS = [
  { key: 'timeline', label: 'Timeline', icon: 'time-outline' as const, color: '#2563eb', desc: 'All payment events' },
  { key: 'reminders', label: 'Bill Reminders', icon: 'alarm-outline' as const, color: '#f59e0b', desc: 'Track upcoming bills' },
  { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' as const, color: '#10b981', desc: 'Browse past receipts' },
  { key: 'disputes', label: 'Disputes', icon: 'alert-circle-outline' as const, color: '#dc2626', desc: 'Raise or view disputes' },
  { key: 'rewards', label: 'Rewards', icon: 'gift-outline' as const, color: '#7c3aed', desc: 'Points & redemptions' },
];

export default function PaymentsIndex() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Payments</Text>
        {CARDS.map(c => (
          <TouchableOpacity key={c.key} style={styles.card} onPress={() => router.push(`/payments/${c.key}` as any)}>
            <View style={[styles.iconBox, { backgroundColor: `${c.color}18` }]}>
              <Ionicons name={c.icon} size={28} color={c.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{c.label}</Text>
              <Text style={styles.cardDesc}>{c.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
