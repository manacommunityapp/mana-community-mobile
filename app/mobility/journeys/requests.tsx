import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { journeySharingService } from '@/services/journeySharingService';
import type { JourneyDemand, JourneyOffer } from '@/types/journeySharing';

export default function JourneyRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<JourneyDemand[]>([]);
  const [matches, setMatches] = useState<Record<number, JourneyOffer[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    journeySharingService.getMyRequests().then((page) => setRequests(page.content ?? []))
      .catch(() => Alert.alert('Unable to load requests', 'Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const findMatches = async (id: number) => {
    setLoadingId(id);
    try {
      const result = await journeySharingService.getRequestMatches(id);
      setMatches((current) => ({ ...current, [id]: result.content ?? [] }));
    } catch { Alert.alert('Unable to find matches', 'Matching rides are temporarily unavailable.'); }
    finally { setLoadingId(null); }
  };

  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity><Text style={s.title}>My journey requests</Text></View>
    {loading ? <ActivityIndicator color={COLORS.primary} /> : requests.length === 0 ? <View style={s.empty}><Ionicons name="people-outline" size={40} color={COLORS.primary} /><Text style={s.emptyTitle}>No requests yet</Text><Text style={s.muted}>Tell Mana where and when you want to travel.</Text><TouchableOpacity style={s.button} onPress={() => router.push('/mobility/journeys/request' as any)}><Text style={s.buttonText}>Find me a group</Text></TouchableOpacity></View> : requests.map((request) => <View key={request.id} style={s.card}><View style={s.row}><Text style={s.cardTitle}>{request.journeyType} · {request.hubCode}</Text><Text style={s.status}>{request.status}</Text></View><Text style={s.route}>{request.area}</Text><Text style={s.muted}>{new Date(request.travelAt).toLocaleString('en-IN')} · {request.seats} seat{request.seats === 1 ? '' : 's'} · ±{request.timeWindowMinutes} min</Text><TouchableOpacity style={s.matchButton} onPress={() => findMatches(request.id)} disabled={loadingId === request.id}>{loadingId === request.id ? <ActivityIndicator color={COLORS.primary} /> : <><Ionicons name="search" size={16} color={COLORS.primary} /><Text style={s.matchText}>Find compatible rides</Text></>}</TouchableOpacity>{matches[request.id]?.map((offer) => <View key={offer.id} style={s.match}><View style={{ flex: 1 }}><Text style={s.matchRoute}>{offer.origin} → {offer.destination}</Text><Text style={s.muted}>{new Date(offer.departureTime).toLocaleString('en-IN')} · {offer.availableSeats} seats · ₹{Number(offer.pricePerSeat || 0).toFixed(0)}</Text></View><TouchableOpacity style={s.joinButton} onPress={() => journeySharingService.join(offer.id).then(() => Alert.alert('Joined', 'You joined this journey.')).catch(() => Alert.alert('Unable to join', 'Seats may no longer be available.'))}><Text style={s.joinText}>Join</Text></TouchableOpacity></View>)}</View>)}</ScrollView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, gap: 12, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 }, title: { color: COLORS.text, fontFamily: FONTS.displayBold, fontSize: 22 }, card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, cardTitle: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 14 }, status: { color: '#059669', fontFamily: FONTS.bold, fontSize: 11 }, route: { color: COLORS.text, fontFamily: FONTS.semiBold }, muted: { color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 11 }, matchButton: { borderRadius: RADIUS.md, backgroundColor: '#EEF2FF', minHeight: 38, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, matchText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 12 }, match: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 9 }, matchRoute: { color: COLORS.text, fontFamily: FONTS.semiBold, fontSize: 12 }, joinButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 }, joinText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }, empty: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 8 }, emptyTitle: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 16 }, button: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 11, marginTop: 8 }, buttonText: { color: '#fff', fontFamily: FONTS.bold } });
