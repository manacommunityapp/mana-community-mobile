import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CARDS = [
  { title: 'Court Subscriptions', subtitle: 'Recurring slot bookings', icon: 'calendar-outline' as const, route: '/sports-ops/subscriptions' },
  { title: 'Open Play', subtitle: 'Join or create sessions', icon: 'people-outline' as const, route: '/sports-ops/open-play' },
  { title: 'Player Ratings', subtitle: 'Rate & review players', icon: 'star-outline' as const, route: '/sports-ops/ratings' },
  { title: 'Coaching Packages', subtitle: 'Enroll in coaching sessions', icon: 'school-outline' as const, route: '/sports-ops/coaching' },
];

export default function SportsOpsIndex() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Sports Operations</Text>
        <Text style={styles.sub}>Manage courts, sessions, coaching & more</Text>
        {CARDS.map(card => (
          <TouchableOpacity key={card.route} style={styles.card} onPress={() => router.push(card.route as any)}>
            <View style={styles.icon}><Ionicons name={card.icon} size={24} color="#2563eb" /></View>
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
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  icon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
});
