import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { foodOpsService, RecurringBasket, BasketFrequency, BasketStatus } from '@/services/foodOpsService';

const freqLabel: Record<BasketFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', FORTNIGHTLY: 'Fortnightly', MONTHLY: 'Monthly',
};

const statusStyle: Record<BasketStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  PAUSED: { bg: '#FEF3C7', text: '#92400E' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function BasketsScreen() {
  const router = useRouter();
  const [baskets, setBaskets] = useState<RecurringBasket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setBaskets(await foodOpsService.getMyBaskets());
    } catch {
      Alert.alert('Error', 'Failed to load baskets');
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePause = async (basket: RecurringBasket) => {
    try {
      if (basket.status === 'ACTIVE') {
        await foodOpsService.pauseBasket(basket.id);
      } else if (basket.status === 'PAUSED') {
        await foodOpsService.resumeBasket(basket.id);
      }
      load();
    } catch {
      Alert.alert('Error', 'Failed to update basket');
    }
  };

  const cancel = (basket: RecurringBasket) => {
    Alert.alert('Cancel Basket', `Cancel "${basket.name}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Basket', style: 'destructive', onPress: async () => {
          try {
            await foodOpsService.cancelBasket(basket.id);
            load();
          } catch {
            Alert.alert('Error', 'Failed to cancel basket');
          }
        }
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#10B981" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Recurring Baskets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {baskets.length === 0 ? (
          <Text style={styles.empty}>No recurring baskets</Text>
        ) : (
          baskets.map(basket => {
            const ss = statusStyle[basket.status];
            return (
              <View key={basket.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.name}>{basket.name}</Text>
                    <Text style={styles.sub}>Vendor #{basket.vendorId}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.badgeText, { color: ss.text }]}>{basket.status}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="refresh-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>{freqLabel[basket.frequency]}</Text>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" style={{ marginLeft: 12 }} />
                  <Text style={styles.infoText}>Next: {basket.nextOrderDate}</Text>
                </View>

                {basket.status !== 'CANCELLED' && (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => togglePause(basket)} style={styles.btnOutline}>
                      <Ionicons name={basket.status === 'ACTIVE' ? 'pause-outline' : 'play-outline'} size={14} color="#374151" />
                      <Text style={styles.btnOutlineText}>{basket.status === 'ACTIVE' ? 'Pause' : 'Resume'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => cancel(basket)} style={styles.btnDanger}>
                      <Text style={styles.btnDangerText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16 },
  empty: { textAlign: 'center', marginTop: 60, color: '#9CA3AF', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 8 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#fff' },
  btnOutlineText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  btnDanger: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, backgroundColor: '#FFF5F5', alignItems: 'center' },
  btnDangerText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
});
