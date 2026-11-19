import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CARDS = [
  { title: 'Prescription Follow-ups', subtitle: 'Track medication follow-ups', icon: 'medical-outline' as const, route: '/healthcare/followups' },
  { title: 'Referrals', subtitle: 'Manage specialist referrals', icon: 'git-merge-outline' as const, route: '/healthcare/referrals' },
  { title: 'Provider Credentials', subtitle: 'Monitor certifications', icon: 'ribbon-outline' as const, route: '/healthcare/credentials' },
  { title: 'Diagnostics SLA', subtitle: 'Track report delivery', icon: 'flask-outline' as const, route: '/healthcare/diagnostics' },
];

export default function HealthcareIndex() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Healthcare</Text>
        <Text style={styles.sub}>Clinical operations and care management</Text>
        {CARDS.map(card => (
          <TouchableOpacity key={card.route} style={styles.card} onPress={() => router.push(card.route as any)}>
            <View style={styles.icon}><Ionicons name={card.icon} size={24} color="#059669" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSub}>{card.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  scroll: { padding: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  icon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
