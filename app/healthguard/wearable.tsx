import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { healthGuardService } from '@/services/healthGuardService';
import type { WearableDeviceDto, WearableHealthEventDto, WearableEventType } from '@/types/healthguard';

const DEVICE_ICONS: Record<string, string> = {
  APPLE_WATCH: '⌚',
  FITBIT: '🏃',
  GARMIN: '🧭',
  SAMSUNG_GALAXY_WATCH: '⌚',
  GENERIC_BLUETOOTH: '📶',
  MANUAL: '📱',
};

const EVENT_ICON: Record<WearableEventType, string> = {
  FALL_DETECTED: '🆘',
  HIGH_HEART_RATE: '❤️‍🔥',
  LOW_HEART_RATE: '💙',
  IRREGULAR_HEART_RATE: '💔',
  LOW_SPO2: '💧',
  INACTIVITY_ALERT: '⏰',
  LOW_BATTERY: '🔋',
  DEVICE_DISCONNECTED: '📵',
  MANUAL_CHECK_IN: '✅',
};

const EVENT_LABEL: Record<WearableEventType, string> = {
  FALL_DETECTED: 'Fall Detected',
  HIGH_HEART_RATE: 'High Heart Rate',
  LOW_HEART_RATE: 'Low Heart Rate',
  IRREGULAR_HEART_RATE: 'Irregular Heart Rate',
  LOW_SPO2: 'Low Blood Oxygen',
  INACTIVITY_ALERT: 'Inactivity Alert',
  LOW_BATTERY: 'Low Battery',
  DEVICE_DISCONNECTED: 'Device Disconnected',
  MANUAL_CHECK_IN: 'Manual Check-In',
};

const CRITICAL_EVENTS: WearableEventType[] = ['FALL_DETECTED', 'LOW_SPO2'];

// Simulated "live" metrics for demo (wearable SDKs not available in Expo)
function useSimulatedMetrics() {
  const [bpm, setBpm] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [steps, setSteps] = useState(3400);

  useEffect(() => {
    const id = setInterval(() => {
      setBpm(b => Math.max(55, Math.min(110, b + Math.round((Math.random() - 0.5) * 4))));
      setSpo2(s => Math.max(94, Math.min(100, s + Math.round((Math.random() - 0.5) * 1))));
      setSteps(s => s + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return { bpm, spo2, steps };
}

export default function WearableScreen() {
  const router = useRouter();
  const { bpm, spo2, steps } = useSimulatedMetrics();
  const [devices, setDevices] = useState<WearableDeviceDto[]>([]);
  const [events, setEvents] = useState<WearableHealthEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<WearableEventType | null>(null);

  const load = useCallback(async () => {
    const [d, e] = await Promise.all([
      healthGuardService.getWearableDevices(),
      healthGuardService.getRecentWearableEvents(),
    ]);
    setDevices(d);
    setEvents(e);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectDemo = () => {
    Alert.alert(
      'Connect Wearable',
      'In production, this opens your wearable\'s pairing flow (Bluetooth). For demo, we\'ll register a simulated device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Register Demo Device', onPress: async () => {
            try {
              await healthGuardService.registerWearableDevice({
                deviceIdentifier: `demo-${Date.now()}`,
                deviceType: 'GENERIC_BLUETOOTH',
                deviceName: 'Demo Health Band',
              });
              load();
            } catch (e) {
              Alert.alert('Error', 'Could not register device.');
            }
          },
        },
      ],
    );
  };

  const removeDevice = (device: WearableDeviceDto) => {
    Alert.alert('Remove Device', `Remove ${device.deviceName ?? device.deviceIdentifier}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          if (device.id) {
            await healthGuardService.removeWearableDevice(device.id);
            load();
          }
        },
      },
    ]);
  };

  const simulateEvent = async (eventType: WearableEventType) => {
    const isCritical = CRITICAL_EVENTS.includes(eventType);
    if (isCritical) {
      Alert.alert(
        `Simulate ${EVENT_LABEL[eventType]}`,
        'This will trigger an automatic SOS. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate', style: 'destructive', onPress: () => doSubmit(eventType) },
        ],
      );
    } else {
      doSubmit(eventType);
    }
  };

  const doSubmit = async (eventType: WearableEventType) => {
    setSubmitting(eventType);
    try {
      const dto: WearableHealthEventDto = {
        eventType,
        heartRateBpm: ['HIGH_HEART_RATE', 'LOW_HEART_RATE', 'IRREGULAR_HEART_RATE'].includes(eventType)
          ? (eventType === 'HIGH_HEART_RATE' ? 185 : eventType === 'LOW_HEART_RATE' ? 33 : bpm)
          : undefined,
        spo2Percent: eventType === 'LOW_SPO2' ? 88 : spo2,
        deviceId: devices[0]?.id,
      };
      const result = await healthGuardService.submitWearableEvent(dto);
      if (result.sosTriggered) {
        Alert.alert('🆘 SOS Triggered', 'An emergency incident has been created and your contacts have been notified.');
      } else {
        Alert.alert('Alert Sent', `${EVENT_LABEL[eventType]} alert submitted.`);
      }
      load();
    } catch {
      Alert.alert('Error', 'Could not submit event. Check your connection.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Wearable Monitor</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Live Metrics */}
      <View style={styles.metricsRow}>
        <MetricTile icon="❤️" label="Heart Rate" value={`${bpm}`} unit="bpm"
          color={bpm > 130 || bpm < 50 ? '#ef4444' : bpm > 100 ? '#f59e0b' : '#22c55e'} />
        <MetricTile icon="💧" label="SpO₂" value={`${spo2}`} unit="%"
          color={spo2 < 94 ? '#ef4444' : spo2 < 96 ? '#f59e0b' : '#22c55e'} />
        <MetricTile icon="👣" label="Steps" value={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`} unit="today"
          color={COLORS.primary} />
      </View>

      {/* Devices */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Connected Devices</Text>
          <TouchableOpacity onPress={connectDemo} style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⌚</Text>
            <Text style={styles.emptyText}>No wearable connected</Text>
            <Text style={styles.emptySub}>Connect a device to enable automatic health monitoring</Text>
            <TouchableOpacity style={styles.connectBtn} onPress={connectDemo}>
              <Text style={styles.connectBtnText}>Connect Device</Text>
            </TouchableOpacity>
          </View>
        ) : (
          devices.map(d => (
            <View key={d.id} style={styles.deviceCard}>
              <Text style={styles.deviceIcon}>{DEVICE_ICONS[d.deviceType ?? 'GENERIC_BLUETOOTH'] ?? '⌚'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{d.deviceName ?? d.deviceIdentifier}</Text>
                <Text style={styles.deviceSub}>{d.deviceType?.replace(/_/g, ' ')} · {d.isActive ? '🟢 Active' : '⚫ Inactive'}</Text>
                {d.lastSyncAt && (
                  <Text style={styles.deviceSub}>Last sync: {new Date(d.lastSyncAt).toLocaleTimeString()}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => removeDevice(d)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Simulate Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Alerts</Text>
        <Text style={styles.sectionHint}>Simulate wearable events to test the alert pipeline</Text>
        <View style={styles.eventGrid}>
          {(Object.keys(EVENT_LABEL) as WearableEventType[]).filter(t => t !== 'DEVICE_DISCONNECTED').map(eventType => (
            <TouchableOpacity
              key={eventType}
              style={[
                styles.eventBtn,
                CRITICAL_EVENTS.includes(eventType) && styles.eventBtnCritical,
                submitting === eventType && styles.eventBtnDisabled,
              ]}
              onPress={() => simulateEvent(eventType)}
              disabled={submitting !== null}
            >
              {submitting === eventType ? (
                <ActivityIndicator size="small" color={CRITICAL_EVENTS.includes(eventType) ? '#fff' : COLORS.primary} />
              ) : (
                <Text style={styles.eventBtnIcon}>{EVENT_ICON[eventType]}</Text>
              )}
              <Text style={[
                styles.eventBtnLabel,
                CRITICAL_EVENTS.includes(eventType) && styles.eventBtnLabelCritical,
              ]}>
                {EVENT_LABEL[eventType]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Events (24h)</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>No events in the last 24 hours</Text>
        ) : (
          events.slice(0, 15).map(e => (
            <View key={e.id} style={[styles.eventRow, e.sosTriggered && styles.eventRowCritical]}>
              <Text style={styles.eventRowIcon}>{EVENT_ICON[e.eventType]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventRowLabel}>{EVENT_LABEL[e.eventType]}</Text>
                {e.heartRateBpm && <Text style={styles.eventRowMeta}>{e.heartRateBpm} bpm</Text>}
                {e.spo2Percent && <Text style={styles.eventRowMeta}>SpO₂ {e.spo2Percent}%</Text>}
                <Text style={styles.eventRowTime}>
                  {e.eventAt ? new Date(e.eventAt).toLocaleString() : ''}
                </Text>
              </View>
              {e.sosTriggered && (
                <View style={styles.sosBadge}>
                  <Text style={styles.sosBadgeText}>SOS</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function MetricTile({ icon, label, value, unit, color }: {
  icon: string; label: string; value: string; unit: string; color: string;
}) {
  return (
    <View style={[styles.metricTile, { borderTopColor: color }]}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },

  metricsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  metricTile: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', borderTopWidth: 3, ...SHADOWS.sm,
  },
  metricIcon: { fontSize: 20, marginBottom: 2 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricUnit: { fontSize: 11, color: COLORS.textSecondary, marginTop: -2 },
  metricLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  section: { marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  connectBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md },
  connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  deviceCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs, ...SHADOWS.sm },
  deviceIcon: { fontSize: 28 },
  deviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  deviceSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  removeBtn: { padding: 8 },

  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  eventBtn: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  eventBtnCritical: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  eventBtnDisabled: { opacity: 0.5 },
  eventBtnIcon: { fontSize: 22 },
  eventBtnLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  eventBtnLabelCritical: { color: '#dc2626', fontWeight: '600' },

  noEvents: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: SPACING.lg },
  eventRow: { backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.sm, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.xs, ...SHADOWS.sm },
  eventRowCritical: { backgroundColor: '#fff1f2', borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  eventRowIcon: { fontSize: 20, marginTop: 2 },
  eventRowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  eventRowMeta: { fontSize: 12, color: COLORS.textSecondary },
  eventRowTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sosBadge: { backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  sosBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
