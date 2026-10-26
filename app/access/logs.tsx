import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { accessLogService, type AccessLogDto } from '@/services/accessLogService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';

export default function AccessLogsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AccessLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.communityId) { setError('Your community is not configured yet.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { setLogs((await accessLogService.getCommunityLogs(user.communityId)).content); }
    catch (e: any) { setError(e?.response?.data?.message || 'Access history is temporarily unavailable.'); }
    finally { setLoading(false); }
  }, [user?.communityId]);
  useEffect(() => { load(); }, [load]);
  const renderLog = ({ item }: { item: AccessLogDto }) => {
    const granted = item.accessDecision === 'ACCESS_GRANTED';
    return <View style={s.card}><View style={[s.icon, { backgroundColor: granted ? COLORS.successLight : COLORS.errorLight }]}><Ionicons name={granted ? 'checkmark' : 'close'} size={20} color={granted ? COLORS.successDark : COLORS.error} /></View><View style={{ flex: 1 }}><Text style={s.event}>{item.personName || 'Access attempt'}</Text><Text style={s.meta}>{item.turnstileName || 'Turnstile'}{item.unitNumber ? ` · ${item.unitNumber}` : ''}</Text><Text style={s.time}>{new Date(item.timestamp).toLocaleString()}</Text></View><Text style={[s.status, { color: granted ? COLORS.successDark : COLORS.error }]}>{item.accessDecision || 'UNKNOWN'}</Text></View>;
  };
  const empty = <View style={s.empty}><Ionicons name="footsteps-outline" size={42} color={COLORS.textMuted} /><Text style={s.emptyTitle}>No access events</Text><Text style={s.emptyText}>New turnstile activity will appear here.</Text></View>;
  return <SafeAreaView style={s.container} edges={['top', 'bottom']}><View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity><Text style={s.title}>Access history</Text><TouchableOpacity onPress={load}><Ionicons name="refresh" size={22} color={COLORS.primary} /></TouchableOpacity></View><Text style={s.subtitle}>Biometric and turnstile events recorded for your community.</Text>{loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : error ? <View style={s.empty}><Ionicons name="cloud-offline-outline" size={42} color={COLORS.warning} /><Text style={s.emptyTitle}>{error}</Text><TouchableOpacity onPress={load}><Text style={s.retry}>Try again</Text></TouchableOpacity></View> : <FlatList data={logs} keyExtractor={item => String(item.id)} renderItem={renderLog} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={s.list} ListEmptyComponent={empty} />}</SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, backgroundColor: COLORS.surface }, title: { fontSize: 20, fontWeight: '800', color: COLORS.text }, subtitle: { color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }, list: { padding: SPACING.lg, gap: 10 }, card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.sm }, icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, event: { fontWeight: '800', color: COLORS.text }, meta: { color: COLORS.textSecondary, marginTop: 2 }, time: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 }, status: { fontSize: 9, fontWeight: '800', maxWidth: 70, textAlign: 'right' }, empty: { alignItems: 'center', padding: 42 }, emptyTitle: { textAlign: 'center', color: COLORS.text, fontWeight: '700', marginTop: 10 }, emptyText: { color: COLORS.textMuted, marginTop: 4 }, retry: { color: COLORS.primary, fontWeight: '800', marginTop: 12 }, });
