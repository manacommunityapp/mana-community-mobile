import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTS, RADIUS } from '@/constants/config';
import { journeySharingService } from '@/services/journeySharingService';
import type { JourneyTypeCode } from '@/types/journeySharing';

export default function JourneyRequestScreen() {
  const router = useRouter(); const params = useLocalSearchParams<{ journeyType?: string }>();
  const [journeyType, setJourneyType] = useState<JourneyTypeCode>((params.journeyType as JourneyTypeCode) || 'OFFICE'); const [direction, setDirection] = useState<'TO_HUB' | 'FROM_HUB'>('TO_HUB');
  const [hubCode, setHubCode] = useState(''); const [area, setArea] = useState(''); const [contextName, setContextName] = useState(''); const [travelAt, setTravelAt] = useState(''); const [seats, setSeats] = useState('1'); const [bags, setBags] = useState('0'); const [saving, setSaving] = useState(false);
  const submit = async () => { if (!hubCode.trim() || !area.trim() || !travelAt.trim()) { Alert.alert('Missing details', 'Hub, area and ISO-8601 travel time are required.'); return; } setSaving(true); try { await journeySharingService.createRequest({ journeyType, direction, hubCode: hubCode.trim().toUpperCase(), area: area.trim(), contextName: contextName.trim() || undefined, travelAt: travelAt.trim(), timeWindowMinutes: 30, seats: Number(seats) || 1, luggageCount: Number(bags) || 0 }); Alert.alert('Request posted', 'We will match you with nearby community journeys.', [{ text: 'Done', onPress: () => router.back() }]); } catch { Alert.alert('Unable to post request', 'Please check the time format and try again.'); } finally { setSaving(false); } };
  const fields: [string, string, (v: string) => void][] = [
    ['Hub code', hubCode, setHubCode], ['Area / origin', area, setArea],
    ['Event or route name (optional)', contextName, setContextName],
    ['Travel time (ISO-8601)', travelAt, setTravelAt], ['Seats', seats, setSeats], ['Luggage count', bags, setBags],
  ];
  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>‹ Back</Text></TouchableOpacity>
    <Text style={s.title}>Request a journey</Text><Text style={s.subtitle}>Tell the community what you need.</Text>
    <View style={s.card}><Text style={s.type}>Journey type: {journeyType}</Text>
      {fields.map(([label, value, setter], i) => <View key={label}><Text style={s.label}>{label}</Text><TextInput style={s.input} value={value} onChangeText={setter} autoCapitalize={i === 0 ? 'characters' : 'none'} keyboardType={i > 3 ? 'numeric' : 'default'} /></View>)}
      <Text style={s.label}>Direction</Text><View style={s.row}>{(['TO_HUB', 'FROM_HUB'] as const).map((item) => <TouchableOpacity key={item} style={[s.toggle, direction === item && s.toggleActive]} onPress={() => setDirection(item)}><Text style={[s.toggleText, direction === item && s.toggleTextActive]}>{item === 'TO_HUB' ? 'To hub' : 'From hub'}</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={s.button} onPress={submit} disabled={saving}><Text style={s.buttonText}>{saving ? 'Posting…' : 'Post request'}</Text></TouchableOpacity>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 18, gap: 8, paddingBottom: 40 }, back: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 14 }, title: { color: COLORS.text, fontFamily: FONTS.displayBold, fontSize: 25, marginTop: 8 }, subtitle: { color: COLORS.textMuted, fontFamily: FONTS.regular, marginBottom: 8 }, card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 9 }, type: { color: COLORS.primary, fontFamily: FONTS.bold, marginBottom: 2 }, label: { color: COLORS.textMuted, fontFamily: FONTS.semiBold, fontSize: 12, marginBottom: 4 }, input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 11, paddingVertical: 10, color: COLORS.text, fontFamily: FONTS.regular }, row: { flexDirection: 'row', gap: 8, marginBottom: 4 }, toggle: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' }, toggleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, toggleText: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 12 }, toggleTextActive: { color: '#fff' }, button: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, alignItems: 'center', paddingVertical: 13, marginTop: 6 }, buttonText: { color: '#fff', fontFamily: FONTS.bold } });
