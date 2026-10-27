import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { airportRideService } from '@/services/airportRideService';
import type { AirportRideDirection, AirportRideDto } from '@/types/airportRides';

const DEFAULT_AIRPORT = { code: 'HYD', name: 'Rajiv Gandhi International Airport' };

function RideCard({ ride, onJoin, joining }: { ride: AirportRideDto; onJoin: () => void; joining: boolean }) {
  const time = new Date(ride.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.driverAvatar}><Text style={styles.avatarText}>{ride.driverName.split(' ').map(x => x[0]).join('').slice(0, 2)}</Text></View>
        <View style={styles.driverInfo}><Text style={styles.driverName}>{ride.driverName}</Text><Text style={styles.muted}>{ride.vehicleModel || 'Verified community driver'}{ride.driverRating ? ` · ★ ${ride.driverRating.toFixed(1)}` : ''}</Text></View>
        <View style={styles.timeBox}><Text style={styles.time}>{time}</Text><Text style={styles.muted}>{ride.availableSeats} seat{ride.availableSeats === 1 ? '' : 's'} left</Text></View>
      </View>
      <View style={styles.route}><View style={styles.routeDot} /><Text style={styles.routeText}>{ride.origin}</Text><Ionicons name="arrow-forward" size={16} color="#94A3B8" /><Text style={styles.routeText}>{ride.destination}</Text></View>
      <View style={styles.metaRow}><Text style={styles.badge}>{ride.direction === 'TO_AIRPORT' ? 'To airport' : 'From airport'}</Text><Text style={styles.muted}>{ride.flightNumber ? `Flight ${ride.flightNumber}` : ride.airportCode}{ride.terminal ? ` · T${ride.terminal}` : ''}</Text><Text style={styles.price}>₹{ride.pricePerSeat}/seat</Text></View>
      <TouchableOpacity style={styles.joinButton} onPress={onJoin} disabled={joining || ride.availableSeats < 1}>{joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinText}>{ride.availableSeats ? 'Request seat' : 'Full'}</Text>}</TouchableOpacity>
    </View>
  );
}

export default function AirportRidesScreen() {
  const router = useRouter();
  const [direction, setDirection] = useState<AirportRideDirection>('TO_AIRPORT');
  const [area, setArea] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 10));
  const [searched, setSearched] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const airportsQuery = useQuery({ queryKey: ['airport-rides-airports'], queryFn: airportRideService.getAirports });
  const airport = airportsQuery.data?.[0] ?? DEFAULT_AIRPORT;
  const search = useQuery({
    queryKey: ['airport-rides-search', direction, airport.code, area, travelDate],
    queryFn: () => airportRideService.search({ direction, airportCode: airport.code, area: area || undefined, travelDate }),
    enabled: searched,
  });
  const join = useMutation({
    mutationFn: (id: number) => airportRideService.join(id),
    onMutate: id => setJoiningId(id),
    onSuccess: () => { setJoiningId(null); search.refetch(); Alert.alert('Seat requested', 'Your seat has been reserved for this airport ride.'); },
    onError: () => { setJoiningId(null); Alert.alert('Unable to join', 'That seat may no longer be available. Please search again.'); },
  });
  const results = useMemo(() => search.data?.content ?? [], [search.data]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color="#0F172A" /></TouchableOpacity><View style={{ flex: 1, marginLeft: 14 }}><Text style={styles.title}>Airport Rides</Text><Text style={styles.subtitle}>Share a safe ride with verified neighbours</Text></View><TouchableOpacity onPress={() => router.push('/mobility/airport-rides/create' as any)}><Ionicons name="add-circle" size={28} color="#2563EB" /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.directionRow}><TouchableOpacity style={[styles.direction, direction === 'TO_AIRPORT' && styles.directionSelected]} onPress={() => setDirection('TO_AIRPORT')}><Ionicons name="airplane" size={18} color={direction === 'TO_AIRPORT' ? '#fff' : '#2563EB'} /><Text style={[styles.directionText, direction === 'TO_AIRPORT' && styles.selectedText]}>Going to airport</Text></TouchableOpacity><TouchableOpacity style={[styles.direction, direction === 'FROM_AIRPORT' && styles.directionSelected]} onPress={() => setDirection('FROM_AIRPORT')}><Ionicons name="home" size={18} color={direction === 'FROM_AIRPORT' ? '#fff' : '#2563EB'} /><Text style={[styles.directionText, direction === 'FROM_AIRPORT' && styles.selectedText]}>Coming from airport</Text></TouchableOpacity></View>
        <View style={styles.formCard}><Text style={styles.label}>Airport</Text><View style={styles.readonly}><Ionicons name="location" size={18} color="#2563EB" /><Text style={styles.readonlyText}>{airport.code} · {airport.name}</Text></View><Text style={styles.label}>{direction === 'TO_AIRPORT' ? 'Pickup area' : 'Destination area'}</Text><TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. Nizampet, Miyapur" placeholderTextColor="#94A3B8"/><Text style={styles.label}>Travel date (YYYY-MM-DD)</Text><TextInput style={styles.input} value={travelDate} onChangeText={setTravelDate} placeholder="2026-11-05" placeholderTextColor="#94A3B8"/><TouchableOpacity style={styles.searchButton} onPress={() => setSearched(true)}><Ionicons name="search" size={18} color="#fff" /><Text style={styles.searchText}>Find shared rides</Text></TouchableOpacity></View>
        {searched && <View style={{ marginTop: 22 }}><View style={styles.resultsHeader}><Text style={styles.sectionTitle}>Available rides</Text>{search.isFetching && <ActivityIndicator color="#2563EB" />}</View>{!search.isFetching && results.length === 0 ? <View style={styles.empty}><Ionicons name="car-outline" size={36} color="#94A3B8" /><Text style={styles.emptyTitle}>No matching rides yet</Text><Text style={styles.muted}>Offer a ride and help your community travel together.</Text></View> : results.map(ride => <RideCard key={ride.id} ride={ride} joining={joiningId === ride.id} onJoin={() => join.mutate(ride.id)} />)}</View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }, title: { fontSize: 20, fontWeight: '800', color: '#0F172A' }, subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 }, directionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 }, direction: { flex: 1, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, paddingVertical: 13, alignItems: 'center', gap: 5 }, directionSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' }, directionText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' }, selectedText: { color: '#fff' }, formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }, label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 10 }, readonly: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12 }, readonlyText: { color: '#1E3A8A', fontWeight: '600', flex: 1 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#0F172A' }, searchButton: { marginTop: 16, backgroundColor: '#2563EB', borderRadius: 11, padding: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, searchText: { color: '#fff', fontWeight: '800' }, resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 }, cardHeader: { flexDirection: 'row', alignItems: 'center' }, driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#1D4ED8', fontWeight: '800' }, driverInfo: { flex: 1, marginLeft: 10 }, driverName: { fontWeight: '800', color: '#0F172A' }, muted: { color: '#64748B', fontSize: 12 }, timeBox: { alignItems: 'flex-end' }, time: { color: '#0F172A', fontWeight: '800', fontSize: 16 }, route: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 }, routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }, routeText: { flex: 1, color: '#334155', fontWeight: '600' }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, badge: { color: '#1D4ED8', backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '700' }, price: { marginLeft: 'auto', color: '#059669', fontWeight: '800' }, joinButton: { marginTop: 12, backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 11, alignItems: 'center' }, joinText: { color: '#fff', fontWeight: '800' }, empty: { backgroundColor: '#fff', padding: 30, alignItems: 'center', borderRadius: 16 }, emptyTitle: { color: '#0F172A', fontWeight: '800', marginTop: 10 },
});
