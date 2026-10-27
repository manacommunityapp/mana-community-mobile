import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { journeySharingService } from '@/services/journeySharingService';
import type { JourneyPassenger } from '@/types/journeySharing';

export default function JourneyPassengersScreen() {
  const router = useRouter();
  const { offerId } = useLocalSearchParams<{ offerId?: string }>();
  const [passengers, setPassengers] = useState<JourneyPassenger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offerId) return;
    journeySharingService.getPassengers(Number(offerId)).then(setPassengers)
      .catch(() => Alert.alert('Unable to load passengers', 'Only the journey owner can view confirmed passengers.'))
      .finally(() => setLoading(false));
  }, [offerId]);

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity><Text style={s.title}>Confirmed passengers</Text></View>
    {loading ? <ActivityIndicator color={COLORS.primary} /> : passengers.length === 0 ? <View style={s.empty}><Ionicons name="people-outline" size={40} color={COLORS.primary} /><Text style={s.emptyTitle}>No confirmed passengers yet</Text><Text style={s.muted}>People who join your journey will appear here.</Text></View> : passengers.map((passenger) => <View key={passenger.id} style={s.card}><View style={s.row}><Text style={s.name}>{passenger.userName || 'Community member'}</Text><Text style={s.seats}>{passenger.seats} seat{passenger.seats === 1 ? '' : 's'}</Text></View><Text style={s.muted}>Confirmed · joined {new Date(passenger.bookedAt).toLocaleString('en-IN')}</Text></View>)}
  </ScrollView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, gap: 12, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }, title: { color: COLORS.text, fontFamily: FONTS.displayBold, fontSize: 22 }, card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, gap: 7, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, name: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 14 }, seats: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 12 }, muted: { color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 11 }, empty: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 8 }, emptyTitle: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 16 } });
