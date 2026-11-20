import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { iotService, type IoTSensor, type SensorAnomaly } from '@/services/iotService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const SENSOR_ICONS: Record<string, IoniconsName> = {
  WATER_TANK: 'water-outline',
  WATER_METER: 'water-outline',
  ELECTRICITY_METER: 'flash-outline',
  GENERATOR: 'battery-charging-outline',
  SOLAR: 'sunny-outline',
  default: 'hardware-chip-outline',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#65A30D',
  INFO: '#0369A1',
};

function SeverityIcon({ severity }: { severity: string }) {
  const color = SEVERITY_COLOR[severity] ?? '#6B7280';
  const icon: IoniconsName = severity === 'CRITICAL' || severity === 'HIGH'
    ? 'alert-circle'
    : 'warning-outline';
  return <Ionicons name={icon} size={18} color={color} />;
}

function SensorCard({ sensor }: { sensor: IoTSensor }) {
  const icon = SENSOR_ICONS[sensor.sensorType] ?? SENSOR_ICONS.default;
  const readingStr = sensor.lastReading != null
    ? `${sensor.lastReading}${sensor.unit ? ' ' + sensor.unit : ''}`
    : '—';
  return (
    <View style={styles.sensorCard}>
      <Ionicons name={icon} size={22} color={THEME.brandDark} />
      <Text style={styles.sensorReading}>{readingStr}</Text>
      <Text style={styles.sensorName} numberOfLines={1}>{sensor.sensorName}</Text>
      <Text style={styles.sensorLocation} numberOfLines={1}>{sensor.location}</Text>
    </View>
  );
}

function AnomalyCard({ anomaly, isAdmin, onResolve }: {
  anomaly: SensorAnomaly;
  isAdmin: boolean;
  onResolve: (id: number) => void;
}) {
  const color = SEVERITY_COLOR[anomaly.severity] ?? '#6B7280';
  const bg = color + '12';
  const timeDiff = Date.now() - new Date(anomaly.detectedAt).getTime();
  const mins = Math.floor(timeDiff / 60000);
  const ago = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;

  return (
    <View style={[styles.anomalyCard, { borderLeftColor: color, backgroundColor: bg }]}>
      <View style={styles.anomalyTop}>
        <SeverityIcon severity={anomaly.severity} />
        <View style={styles.anomalyInfo}>
          <Text style={styles.anomalyTitle}>{anomaly.sensorName ?? `Sensor ${anomaly.sensorId}`}</Text>
          {anomaly.location && <Text style={styles.anomalyLoc}>{anomaly.location}</Text>}
        </View>
        <Text style={styles.anomalyTime}>{ago}</Text>
      </View>
      {anomaly.description && (
        <Text style={styles.anomalyDesc}>{anomaly.description}</Text>
      )}
      {isAdmin && (
        <TouchableOpacity style={[styles.resolveBtn, { borderColor: color }]} onPress={() => onResolve(anomaly.id)}>
          <Text style={[styles.resolveBtnText, { color }]}>Resolve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CommunityIoTScreen() {
  const { user } = useAuth();
  const communityId = user?.communityId ?? 0;
  const isAdmin = user?.role === 'FM' || user?.role === 'ADMIN';

  const { data: sensors = [], isLoading: sensorsLoading } = useQuery({
    queryKey: ['iot-sensors', communityId],
    queryFn: () => iotService.getPublicSensors(communityId),
    staleTime: 60_000,
    enabled: communityId > 0,
  });

  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery({
    queryKey: ['iot-anomalies', communityId],
    queryFn: () => iotService.getActiveAnomalies(communityId),
    staleTime: 30_000,
    enabled: communityId > 0,
  });

  const handleResolve = (_id: number) => {
    // TODO: wire to resolve endpoint when backend is ready
  };

  const isLoading = sensorsLoading || anomaliesLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Infrastructure</Text>
        <Text style={styles.subtitle}>Sensors &amp; system status</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator style={{ marginVertical: 32 }} color={THEME.brandDark} />}

        {/* Utility meters */}
        {sensors.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Utility Meters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sensorScroll}>
              {sensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
            </ScrollView>
          </>
        )}

        {/* Active anomalies */}
        <Text style={styles.sectionTitle}>System Alerts</Text>
        {anomalies.length === 0 && !isLoading ? (
          <View style={styles.allClear}>
            <Ionicons name="checkmark-circle" size={40} color="#059669" />
            <Text style={styles.allClearText}>All systems normal</Text>
          </View>
        ) : (
          anomalies.map((a) => (
            <AnomalyCard key={a.id} anomaly={a} isAdmin={isAdmin} onResolve={handleResolve} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold, marginBottom: 10, marginTop: 4 },

  sensorScroll: { marginBottom: 20 },
  sensorCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginRight: 10, alignItems: 'center', width: 110,
    ...SHADOWS.sm,
  },
  sensorReading: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.bold, marginTop: 6 },
  sensorName: { fontSize: 11, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.semiBold, marginTop: 4, textAlign: 'center' },
  sensorLocation: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center', marginTop: 2 },

  anomalyCard: {
    borderRadius: RADIUS.md, borderLeftWidth: 4, padding: 14, marginBottom: 10,
    ...SHADOWS.sm,
  },
  anomalyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  anomalyInfo: { flex: 1 },
  anomalyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold },
  anomalyLoc: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  anomalyTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },
  anomalyDesc: { fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular, marginTop: 6 },
  resolveBtn: {
    marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  resolveBtnText: { fontSize: 12, fontFamily: FONTS.semiBold },

  allClear: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  allClearText: { color: '#059669', fontSize: 15, fontWeight: '600', fontFamily: FONTS.semiBold },
});
