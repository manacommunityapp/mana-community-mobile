import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, RefreshControl, Modal, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  intercomService,
  IntercomCall,
  IntercomDevice,
  IntercomCallStatus,
} from '@/services/intercomService';

const STATUS_META: Record<IntercomCallStatus, { color: string; bg: string; label: string }> = {
  RINGING:  { color: '#D97706', bg: '#FEF3C7', label: 'Ringing' },
  ANSWERED: { color: '#059669', bg: '#D1FAE5', label: 'Answered' },
  MISSED:   { color: '#EF4444', bg: '#FEE2E2', label: 'Missed'   },
  DECLINED: { color: '#6B7280', bg: '#F3F4F6', label: 'Declined' },
  ENDED:    { color: '#6B7280', bg: '#F3F4F6', label: 'Ended'    },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function CallDuration(from: string, to: string): string {
  const secs = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function IntercomScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeCall, setActiveCall] = useState<IntercomCall | null>(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'devices'>('log');

  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ['intercom-calls'],
    queryFn: () => intercomService.getRecentCalls(30),
    refetchInterval: 8000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['intercom-devices'],
    queryFn: () => intercomService.getDevices(),
  });

  const { data: incoming } = useQuery({
    queryKey: ['intercom-active'],
    queryFn: () => intercomService.getActiveCall(),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (incoming && !activeCall) {
      Vibration.vibrate([400, 200, 400, 200, 400]);
      setActiveCall(incoming);
      setCallModalVisible(true);
    }
  }, [incoming]);

  const answerMut = useMutation({
    mutationFn: (action: 'ANSWER' | 'DECLINE') =>
      intercomService.answerCall({ callId: activeCall!.id, action }),
    onSuccess: (_, action) => {
      if (action === 'DECLINE') {
        setCallModalVisible(false);
        setActiveCall(null);
      } else {
        qc.invalidateQueries({ queryKey: ['intercom-calls'] });
      }
    },
  });

  const actionMut = useMutation({
    mutationFn: (action: 'UNLOCK_GATE' | 'DENY_ENTRY' | 'END_CALL') =>
      intercomService.performCallAction({ callId: activeCall!.id, action }),
    onSuccess: (_, action) => {
      if (action === 'UNLOCK_GATE') {
        Alert.alert('Gate Unlocked', 'The gate has been unlocked for the visitor.');
      }
      if (action === 'END_CALL' || action === 'DENY_ENTRY') {
        setCallModalVisible(false);
        setActiveCall(null);
      }
      qc.invalidateQueries({ queryKey: ['intercom-calls'] });
    },
  });

  const unlockMut = useMutation({
    mutationFn: (deviceId: number) => intercomService.unlockGateRemote(deviceId),
    onSuccess: () => Alert.alert('Gate Unlocked', 'Remote unlock sent successfully.'),
  });

  const renderCall = ({ item }: { item: IntercomCall }) => {
    const meta = STATUS_META[item.status];
    return (
      <View style={styles.callCard}>
        <View style={[styles.callIcon, { backgroundColor: meta.bg }]}>
          <Ionicons
            name={item.status === 'MISSED' ? 'call-outline' : item.isVideoEnabled ? 'videocam-outline' : 'call-outline'}
            size={20}
            color={meta.color}
          />
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.callerName}>{item.callerName || 'Unknown Visitor'}</Text>
          <Text style={styles.callDevice}>{item.deviceName} · {formatTime(item.initiatedAt)}</Text>
          {item.visitorPassCode ? (
            <Text style={styles.passCode}>Pass: {item.visitorPassCode}</Text>
          ) : null}
        </View>
        <View style={styles.callRight}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.answeredAt && item.endedAt ? (
            <Text style={styles.duration}>{CallDuration(item.answeredAt, item.endedAt)}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderDevice = ({ item }: { item: IntercomDevice }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceLeft}>
        <Ionicons name="videocam-outline" size={22} color={COLORS.primary} />
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.deviceName}</Text>
          <Text style={styles.deviceLocation}>{item.location}</Text>
        </View>
      </View>
      <View style={styles.deviceRight}>
        <View style={[styles.statusDot, { backgroundColor: item.status === 'ONLINE' ? '#22C55E' : '#EF4444' }]} />
        {item.status === 'ONLINE' && (
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={() => Alert.alert(
              'Remote Unlock',
              `Unlock ${item.deviceName}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unlock', onPress: () => unlockMut.mutate(item.id) },
              ],
            )}
          >
            <Ionicons name="lock-open-outline" size={14} color="#fff" />
            <Text style={styles.unlockText}>Unlock</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const hasMissed = calls.filter(c => c.status === 'MISSED').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Intercom</Text>
        {hasMissed > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{hasMissed}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['log', 'devices'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'log' ? 'Call Log' : 'Devices'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'log' ? (
        <FlatList
          data={calls}
          keyExtractor={i => String(i.id)}
          renderItem={renderCall}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="call-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No intercom calls yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={devices}
          keyExtractor={i => String(i.id)}
          renderItem={renderDevice}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No intercom devices configured</Text>
            </View>
          }
        />
      )}

      {/* Incoming Call Modal */}
      <Modal visible={callModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.callModal}>
            <View style={styles.callRing}>
              <Ionicons name="videocam" size={40} color="#fff" />
            </View>
            <Text style={styles.incomingLabel}>Incoming Video Call</Text>
            <Text style={styles.incomingName}>{activeCall?.callerName || 'Visitor at Gate'}</Text>
            <Text style={styles.incomingDevice}>{activeCall?.deviceName}</Text>

            {activeCall?.status === 'RINGING' ? (
              <View style={styles.callActions}>
                <TouchableOpacity
                  style={[styles.callBtn, styles.declineBtn]}
                  onPress={() => answerMut.mutate('DECLINE')}
                >
                  <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                  <Text style={styles.callBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.callBtn, styles.answerBtn]}
                  onPress={() => answerMut.mutate('ANSWER')}
                >
                  <Ionicons name="call" size={28} color="#fff" />
                  <Text style={styles.callBtnText}>Answer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inCallActions}>
                <TouchableOpacity
                  style={[styles.inCallBtn, { backgroundColor: '#22C55E' }]}
                  onPress={() => actionMut.mutate('UNLOCK_GATE')}
                >
                  <Ionicons name="lock-open-outline" size={20} color="#fff" />
                  <Text style={styles.inCallBtnText}>Allow Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inCallBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => actionMut.mutate('DENY_ENTRY')}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.inCallBtnText}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inCallBtn, { backgroundColor: '#6B7280' }]}
                  onPress={() => actionMut.mutate('END_CALL')}
                >
                  <Ionicons name="call-outline" size={20} color="#fff" />
                  <Text style={styles.inCallBtnText}>End</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: 'DMSans-Bold' },
  list: { padding: SPACING.md, gap: 10 },
  callCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: RADIUS.lg, padding: 14, ...SHADOWS.sm },
  callIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  callInfo: { flex: 1 },
  callerName: { fontSize: 15, fontWeight: '600', color: THEME.text, fontFamily: 'DMSans-SemiBold' },
  callDevice: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  passCode: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontFamily: 'DMSans-Medium', fontWeight: '500' },
  callRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  duration: { fontSize: 11, color: COLORS.textMuted },
  deviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: RADIUS.lg, padding: 14, ...SHADOWS.sm },
  deviceLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceInfo: {},
  deviceName: { fontSize: 15, fontWeight: '600', color: THEME.text, fontFamily: 'DMSans-SemiBold' },
  deviceLocation: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deviceRight: { alignItems: 'flex-end', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  unlockText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'flex-end' },
  callModal: { width: '100%', backgroundColor: THEME.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, alignItems: 'center', gap: 8 },
  callRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  incomingLabel: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  incomingName: { fontSize: 22, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold', textAlign: 'center' },
  incomingDevice: { fontSize: 13, color: COLORS.textMuted },
  callActions: { flexDirection: 'row', gap: 40, marginTop: 20 },
  callBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', gap: 4 },
  declineBtn: { backgroundColor: '#EF4444' },
  answerBtn: { backgroundColor: '#22C55E' },
  callBtnText: { fontSize: 11, color: '#fff', fontWeight: '600', marginTop: 2 },
  inCallActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  inCallBtn: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 4 },
  inCallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
