import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { healthGuardService } from '@/services/healthGuardService';
import type { EmergencyIncidentDto, IncidentStatus, IncidentSeverity } from '@/types/healthguard';

const SEV_COLOR: Record<IncidentSeverity, string> = {
  LEVEL_1_NOTICE: '#3b82f6',
  LEVEL_2_ATTENTION: '#f59e0b',
  LEVEL_3_POSSIBLE_EMERGENCY: '#f97316',
  LEVEL_4_CONFIRMED: '#ef4444',
};
const SEV_LABEL: Record<IncidentSeverity, string> = {
  LEVEL_1_NOTICE: 'Notice',
  LEVEL_2_ATTENTION: 'Attention',
  LEVEL_3_POSSIBLE_EMERGENCY: 'Possible Emergency',
  LEVEL_4_CONFIRMED: 'Confirmed Emergency',
};
const STATUS_ICON: Record<IncidentStatus, keyof typeof Ionicons.glyphMap> = {
  ACTIVE: 'alert-circle',
  ACKNOWLEDGED: 'time',
  ESCALATED: 'warning',
  RESOLVED: 'checkmark-circle',
  CANCELLED: 'close-circle',
};
const STATUS_COLOR: Record<IncidentStatus, string> = {
  ACTIVE: '#ef4444',
  ACKNOWLEDGED: '#f59e0b',
  ESCALATED: '#f97316',
  RESOLVED: '#22c55e',
  CANCELLED: '#9ca3af',
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function duration(start?: string, end?: string) {
  if (!start) return '';
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function IncidentsScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<EmergencyIncidentDto[]>([]);
  const [active, setActive] = useState<EmergencyIncidentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [history, act] = await Promise.all([
      healthGuardService.getIncidentHistory(),
      healthGuardService.getActiveIncident(),
    ]);
    setIncidents(history);
    setActive(act);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = (id: number) => {
    Alert.alert('Resolve', 'Mark this incident as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve', onPress: async () => {
          setActionId(id);
          try {
            await healthGuardService.resolveIncident(id);
            load();
          } finally { setActionId(null); }
        },
      },
    ]);
  };

  const handleCancel = (id: number) => {
    Alert.alert('Cancel SOS', 'Cancel this emergency alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel SOS', style: 'destructive', onPress: async () => {
          setActionId(id);
          try {
            await healthGuardService.cancelIncident(id);
            load();
          } finally { setActionId(null); }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Incident History</Text>
        <TouchableOpacity onPress={() => router.push('/healthguard/sos')} style={styles.sosBtn}>
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color={COLORS.primary} />
      ) : (
        <>
          {/* Active banner */}
          {active && (
            <TouchableOpacity
              style={styles.activeBanner}
              onPress={() => router.push('/healthguard/sos')}
              activeOpacity={0.85}
            >
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.activeBannerText}>Active SOS — tap to manage</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}

          {incidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={56} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No incidents recorded</Text>
              <Text style={styles.emptySubText}>Your emergency history will appear here</Text>
            </View>
          ) : (
            incidents.map(inc => {
              const sev = inc.severity as IncidentSeverity;
              const st = inc.status as IncidentStatus;
              const isOpen = st === 'ACTIVE' || st === 'ACKNOWLEDGED';
              return (
                <View key={inc.id} style={[styles.card, st === 'ACTIVE' && styles.cardActive]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusRow}>
                      <Ionicons name={STATUS_ICON[st] ?? 'help-circle'} size={18} color={STATUS_COLOR[st] ?? COLORS.textSecondary} />
                      <Text style={[styles.statusText, { color: STATUS_COLOR[st] }]}>{st}</Text>
                    </View>
                    {sev && (
                      <View style={[styles.sevBadge, { backgroundColor: SEV_COLOR[sev] + '20', borderColor: SEV_COLOR[sev] + '40' }]}>
                        <Text style={[styles.sevBadgeText, { color: SEV_COLOR[sev] }]}>{SEV_LABEL[sev]}</Text>
                      </View>
                    )}
                  </View>

                  {inc.description && <Text style={styles.desc}>{inc.description}</Text>}

                  <View style={styles.meta}>
                    <Text style={styles.metaItem}>⏱ {fmt(inc.triggeredAt)}</Text>
                    {inc.resolvedAt && <Text style={styles.metaItem}>✅ {duration(inc.triggeredAt, inc.resolvedAt)}</Text>}
                    {inc.alertsSent != null && <Text style={styles.metaItem}>👥 {inc.alertsSent} notified</Text>}
                  </View>

                  {inc.locationAddress && (
                    <Text style={styles.location}>📍 {inc.locationAddress}</Text>
                  )}

                  {isOpen && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.resolveBtn}
                        onPress={() => handleResolve(inc.id!)}
                        disabled={actionId === inc.id}
                      >
                        {actionId === inc.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.resolveBtnText}>I'm Safe</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancel(inc.id!)}
                        disabled={actionId === inc.id}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sosBtn: { backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.md },
  sosBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#ef4444', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md,
  },
  activeBannerText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardActive: { borderWidth: 1.5, borderColor: '#ef4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  sevBadgeText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 14, color: COLORS.text, marginBottom: 6 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 4 },
  metaItem: { fontSize: 12, color: COLORS.textSecondary },
  location: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  resolveBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  resolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#ef4444', borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});
