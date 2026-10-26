import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { safetyService, type SosIncidentResponse } from '@/services/safetyService';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

export default function GuardSosScreen() {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [incident, setIncident] = useState<SosIncidentResponse | null>(null);
  const send = () => Alert.alert('Send guard SOS?', 'This immediately alerts the control room and creates an incident for dispatch.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send SOS', style: 'destructive', onPress: async () => { setSending(true); try { const result = await safetyService.triggerSOS({ emergencyType: 'GENERAL_PANIC', severity: 'CRITICAL', flatNumber: user?.flatNumber, buildingBlock: user?.tower, locationDetails: 'Guard mobile SOS', notes: notes.trim() || 'Guard requested immediate assistance' }); setIncident(result); setNotes(''); Alert.alert('SOS dispatched', `Incident #${result.id} has been sent to the control room.`); } catch (e: any) { Alert.alert('SOS failed', e?.response?.data?.message || 'Call the control room directly.'); } finally { setSending(false); } } },
  ]);
  return <SafeAreaView style={s.container}><View style={s.header}><Text style={s.title}>Guard SOS</Text><Text style={s.subtitle}>Use only for an immediate safety or security threat.</Text></View><View style={s.body}><View style={s.warning}><Text style={s.warningTitle}>Emergency dispatch</Text><Text style={s.warningText}>The control room will receive your identity, community and current guard shift context.</Text></View><TextInput style={s.input} placeholder="What is happening? (optional)" placeholderTextColor={COLORS.textMuted} value={notes} onChangeText={setNotes} multiline numberOfLines={4} /><TouchableOpacity style={s.sosButton} disabled={sending} onPress={send}>{sending ? <ActivityIndicator color="#fff" /> : <><Text style={s.sosText}>SEND SOS</Text><Text style={s.sosSub}>Notify control room now</Text></>}</TouchableOpacity>{incident && <View style={s.confirm}><Text style={s.confirmTitle}>Incident #{incident.id}</Text><Text style={s.confirmText}>Status: {incident.status}. Keep your radio open for dispatch instructions.</Text></View>}</View></SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { padding: SPACING.lg, backgroundColor: GUARD_COLORS.navy }, title: { color: '#fff', fontSize: 25, fontWeight: '800' }, subtitle: { color: 'rgba(255,255,255,.75)', marginTop: 4 }, body: { padding: SPACING.lg }, warning: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: 18 }, warningTitle: { color: '#C2410C', fontWeight: '800' }, warningText: { color: '#9A3412', marginTop: 5, lineHeight: 20 }, input: { minHeight: 110, backgroundColor: COLORS.surface, borderColor: COLORS.borderSlate, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, textAlignVertical: 'top', color: COLORS.text }, sosButton: { backgroundColor: COLORS.error, borderRadius: RADIUS.full, height: 150, width: 150, alignSelf: 'center', marginTop: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 }, sosText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 }, sosSub: { color: '#FEE2E2', fontSize: 11, marginTop: 4 }, confirm: { backgroundColor: COLORS.successLight, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: 28 }, confirmTitle: { color: COLORS.successDark, fontWeight: '800' }, confirmText: { color: COLORS.textSecondary, marginTop: 4 } });
