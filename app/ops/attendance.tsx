import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, StaffShiftStatus } from '@/services/communityOpsService';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceScreen() {
  const [status, setStatus] = useState<StaffShiftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await communityOpsService.getShiftStatus()); } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleToggle = async () => {
    if (!status) return;
    const action = status.clockedIn ? 'Clock Out' : 'Clock In';
    Alert.alert(action, `Confirm ${action.toLowerCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, onPress: async () => {
        setActing(true);
        try {
          const updated = status.clockedIn
            ? await communityOpsService.clockOut()
            : await communityOpsService.clockIn();
          setStatus(updated);
        } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message ?? 'Failed');
        } finally { setActing(false); }
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const isClockedIn = status?.clockedIn ?? false;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Attendance</Text>
      </View>

      <View style={styles.body}>
        {/* Status indicator */}
        <View style={[styles.statusCard, { backgroundColor: isClockedIn ? '#F0FDF4' : '#FFF5F5' }]}>
          <View style={[styles.statusDot, { backgroundColor: isClockedIn ? '#059669' : '#DC2626' }]} />
          <View>
            <Text style={[styles.statusLabel, { color: isClockedIn ? '#059669' : '#DC2626' }]}>
              {isClockedIn ? 'On Duty' : 'Off Duty'}
            </Text>
            {isClockedIn && status?.clockedInSince && (
              <Text style={styles.statusSub}>Since {formatTime(status.clockedInSince)}</Text>
            )}
          </View>
        </View>

        {/* Shift summary */}
        {status && status.totalMinutesToday > 0 && (
          <View style={styles.summaryCard}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.summaryText}>Today: {formatDuration(status.totalMinutesToday)} worked</Text>
          </View>
        )}

        {/* Clock in/out button */}
        <TouchableOpacity
          style={[styles.clockBtn, { backgroundColor: isClockedIn ? '#DC2626' : '#059669' }, acting && { opacity: 0.6 }]}
          onPress={handleToggle}
          disabled={acting}
          activeOpacity={0.85}
        >
          {acting ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isClockedIn ? 'log-out-outline' : 'log-in-outline'}
                size={36}
                color="#fff"
              />
              <Text style={styles.clockBtnText}>{isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isClockedIn
            ? 'Tap to record your clock-out time'
            : 'Tap to start your shift'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, width: '100%', marginBottom: 16 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  statusLabel: { fontSize: 18, fontWeight: '800' },
  statusSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 14, width: '100%', marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  summaryText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  clockBtn: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8 },
  clockBtnText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  hint: { marginTop: 24, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
