import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const cards = [
  { label: 'Delivery Slots', icon: 'time-outline' as const, color: '#3B82F6', bg: '#EFF6FF', route: '/food/slots', desc: 'View and book delivery slots' },
  { label: 'My Baskets', icon: 'cart-outline' as const, color: '#10B981', bg: '#D1FAE5', route: '/food/baskets', desc: 'Manage recurring orders' },
  { label: 'Refunds', icon: 'return-down-back-outline' as const, color: '#F59E0B', bg: '#FEF3C7', route: '/food/refunds', desc: 'Track and review refunds' },
];

export default function FoodHub() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Food & Grocery</Text>
        <Text style={styles.subtitle}>Operations Hub</Text>
        <View style={styles.grid}>
          {cards.map(card => (
            <TouchableOpacity key={card.label} style={styles.card} onPress={() => router.push(card.route as Parameters<typeof router.push>[0])} activeOpacity={0.7}>
              <View style={[styles.iconWrap, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon} size={28} color={card.color} />
              </View>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  grid: { gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6B7280' },
});
