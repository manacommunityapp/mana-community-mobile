import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { eventSponsorService } from '@/services/eventSponsorService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { EventSponsorResponse } from '@/types/events';

const TIER_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  TITLE: { bg: '#FEF3C7', text: '#B45309', badge: '👑 Title Sponsor' },
  PLATINUM: { bg: '#EDE9FE', text: '#6D28D9', badge: '💎 Platinum' },
  GOLD: { bg: '#FEF08A', text: '#854D0E', badge: '🥇 Gold' },
  SILVER: { bg: '#F1F5F9', text: '#475569', badge: '🥈 Silver' },
  BRONZE: { bg: '#FFEDD5', text: '#C2410C', badge: '🥉 Bronze' },
};

export default function EventSponsorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
  });

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['event-sponsors', eventId],
    queryFn: () => eventSponsorService.getAll(eventId),
    enabled: !!eventId,
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Event Sponsors & Partners</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.banner}>
          <Text style={s.bannerTitle}>✨ Powered by Our Generous Sponsors</Text>
          <Text style={s.bannerSub}>Special thanks to all community partners supporting this event.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
        ) : sponsors.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No Sponsors Listed</Text>
            <Text style={s.emptySub}>Interested in sponsoring? Contact the event organizing committee.</Text>
          </View>
        ) : (
          sponsors.map((sp) => {
            const tierInfo = TIER_COLORS[sp.tier?.toUpperCase()] || TIER_COLORS.GOLD;
            return (
              <View key={sp.id} style={s.sponsorCard}>
                <View style={s.cardHeader}>
                  <View style={s.logoWrap}>
                    {sp.logoUrl ? (
                      <Image source={{ uri: sp.logoUrl }} style={s.logo} resizeMode="contain" />
                    ) : (
                      <Text style={s.logoPlaceholder}>{sp.name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.spName}>{sp.name}</Text>
                    <View style={[s.tierBadge, { backgroundColor: tierInfo.bg }]}>
                      <Text style={[s.tierText, { color: tierInfo.text }]}>{tierInfo.badge}</Text>
                    </View>
                  </View>
                </View>

                {sp.contactEmail && (
                  <TouchableOpacity
                    style={s.contactRow}
                    onPress={() => Linking.openURL(`mailto:${sp.contactEmail}`)}
                  >
                    <Ionicons name="mail-outline" size={14} color={COLORS.primary} />
                    <Text style={s.contactText}>{sp.contactEmail}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  content: { padding: 16 },
  banner: {
    backgroundColor: '#F3E8FF', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#9333EA',
  },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#6B21A8' },
  bannerSub: { fontSize: 12, color: '#7E22CE', marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  sponsorCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 12, ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrap: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: 40, height: 40 },
  logoPlaceholder: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  spName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  tierText: { fontSize: 10, fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  contactText: { fontSize: 12, color: COLORS.primary },
});
