import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { journeySharingService } from '@/services/journeySharingService';
import type { JourneyOffer, JourneyTypeCode, JourneyTypeConfig } from '@/types/journeySharing';

const ICONS: Record<JourneyTypeCode, keyof typeof Ionicons.glyphMap> = {
  OFFICE: 'business-outline', SCHOOL: 'school-outline', EVENT: 'people-outline', SPORTS: 'trophy-outline',
  RAILWAY: 'train-outline', BUS_TERMINAL: 'bus-outline', AIRPORT: 'airplane-outline',
};

export default function JourneySharingScreen() {
  const router = useRouter();
  const [configs, setConfigs] = useState<JourneyTypeConfig[]>([]);
  const [selected, setSelected] = useState<JourneyTypeCode>('OFFICE');
  const [hubCode, setHubCode] = useState('');
  const [area, setArea] = useState('');
  const [travelAt, setTravelAt] = useState('');
  const [offers, setOffers] = useState<JourneyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    journeySharingService.getConfigs().then(setConfigs).catch(() => Alert.alert('Unable to load journey types', 'Please try again.')).finally(() => setLoading(false));
  }, []);

  const search = async () => {
    if (!hubCode.trim()) { Alert.alert('Hub required', 'Enter a route hub, venue, station or terminal code.'); return; }
    setSearching(true);
    try {
      const result = await journeySharingService.search({ journeyType: selected, hubCode: hubCode.trim().toUpperCase(), area: area.trim() || undefined, travelAt: travelAt.trim() || undefined });
      setOffers(result.content ?? []);
    } catch { Alert.alert('Search failed', 'Could not find matching community journeys.'); }
    finally { setSearching(false); }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity><View><Text style={s.title}>Group travel</Text><Text style={s.subtitle}>Share one matching engine across every journey</Text></View></View>
      {loading ? <ActivityIndicator color={COLORS.primary} /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {configs.map((config) => <TouchableOpacity key={config.code} style={[s.chip, selected === config.code && s.chipActive]} onPress={() => setSelected(config.code)}><Ionicons name={ICONS[config.code]} size={16} color={selected === config.code ? '#fff' : COLORS.primary} /><Text style={[s.chipText, selected === config.code && s.chipTextActive]}>{config.label}</Text></TouchableOpacity>)}
      </ScrollView>}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Find a shared journey</Text>
        <TextInput style={s.input} placeholder="Hub code (e.g. HITEC_CITY, MGBS)" value={hubCode} onChangeText={setHubCode} autoCapitalize="characters" />
        <TextInput style={s.input} placeholder="Neighbourhood or origin (optional)" value={area} onChangeText={setArea} />
        <TextInput style={s.input} placeholder="Travel time ISO-8601 (optional)" value={travelAt} onChangeText={setTravelAt} autoCapitalize="none" />
        <TouchableOpacity style={s.primaryButton} onPress={search} disabled={searching}>{searching ? <ActivityIndicator color="#fff" /> : <><Ionicons name="search" size={17} color="#fff" /><Text style={s.primaryText}>Search matching rides</Text></>}</TouchableOpacity>
      </View>
      <View style={s.actions}><TouchableOpacity style={s.secondaryButton} onPress={() => router.push(`/mobility/journeys/request?journeyType=${selected}` as any)}><Ionicons name="hand-left-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>Request a journey</Text></TouchableOpacity><TouchableOpacity style={s.secondaryButton} onPress={() => router.push(`/mobility/journeys/offer?journeyType=${selected}` as any)}><Ionicons name="add-circle-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>Offer a journey</Text></TouchableOpacity></View>
      <TouchableOpacity style={s.requestsLink} onPress={() => router.push('/mobility/journeys/requests' as any)}><Ionicons name="albums-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>View my requests and compatible rides</Text><Ionicons name="chevron-forward" size={16} color={COLORS.primary} /></TouchableOpacity>
      <TouchableOpacity style={s.requestsLink} onPress={() => router.push('/commute' as any)}><Ionicons name="repeat-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>Set up a recurring office commute</Text><Ionicons name="chevron-forward" size={16} color={COLORS.primary} /></TouchableOpacity>
      <TouchableOpacity style={s.requestsLink} onPress={() => router.push(`/mobility/journeys/slots?journeyType=${selected}` as any)}><Ionicons name="calendar-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>Browse scheduled community departures</Text><Ionicons name="chevron-forward" size={16} color={COLORS.primary} /></TouchableOpacity>
      <TouchableOpacity style={s.requestsLink} onPress={() => router.push('/mobility/journeys/proposals' as any)}><Ionicons name="sparkles-outline" size={17} color={COLORS.primary} /><Text style={s.secondaryText}>Review match proposals</Text><Ionicons name="chevron-forward" size={16} color={COLORS.primary} /></TouchableOpacity>
      {offers.map((offer) => <View key={offer.id} style={s.offer}><View style={s.offerTop}><View><Text style={s.offerRoute}>{offer.origin} → {offer.destination}</Text><Text style={s.offerMeta}>{new Date(offer.departureTime).toLocaleString()} · {offer.driverName}</Text></View><Text style={s.price}>₹{Number(offer.pricePerSeat || 0).toFixed(0)}</Text></View><View style={s.offerBottom}><Text style={s.offerMeta}>{offer.availableSeats} seats · {offer.luggageCapacity} bags{offer.vehicleModel ? ` · ${offer.vehicleModel}` : ''}</Text><View style={s.offerActions}><TouchableOpacity style={s.joinButton} onPress={() => journeySharingService.join(offer.id).then(() => { Alert.alert('Joined', 'You joined this journey.'); search(); }).catch(() => Alert.alert('Unable to join', 'Seats may no longer be available.'))}><Text style={s.joinText}>Join</Text></TouchableOpacity><TouchableOpacity style={s.waitlistButton} onPress={() => journeySharingService.waitlist(offer.id).then(() => Alert.alert('Waitlisted', 'We’ll notify you if a seat opens.')).catch(() => Alert.alert('Unable to waitlist', 'Please try again.'))}><Text style={s.waitlistText}>Waitlist</Text></TouchableOpacity></View></View></View>)}
      {!searching && offers.length === 0 && <Text style={s.empty}>Search a hub to see live offers from verified community members.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, gap: 14, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 }, title: { fontFamily: FONTS.displayBold, fontSize: 23, color: COLORS.text }, subtitle: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  chips: { gap: 8, paddingVertical: 2 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 9 }, chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, chipText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 12 }, chipTextActive: { color: '#fff' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, ...SHADOWS.sm }, sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 2 }, input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.text, fontFamily: FONTS.regular, backgroundColor: COLORS.background }, primaryButton: { minHeight: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 }, primaryText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }, actions: { flexDirection: 'row', gap: 10 }, secondaryButton: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, secondaryText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 12 }, requestsLink: { minHeight: 42, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, offer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm }, offerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, offerRoute: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 14, flexShrink: 1 }, offerMeta: { color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: 11, marginTop: 4 }, price: { color: COLORS.primary, fontFamily: FONTS.displayBold, fontSize: 17 }, offerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, offerActions: { flexDirection: 'row', gap: 6 }, joinButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 }, joinText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }, waitlistButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 }, waitlistText: { color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 12 }, empty: { color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.regular, fontSize: 12, paddingVertical: 20 },
});
