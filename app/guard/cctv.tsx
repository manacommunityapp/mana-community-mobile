import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { cctvService, Camera, CameraLocation, CameraStatus } from '@/services/cctvService';

const LOCATION_META: Record<CameraLocation, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  MAIN_GATE:  { icon: 'enter-outline',         label: 'Main Gate'   },
  EXIT_GATE:  { icon: 'exit-outline',          label: 'Exit Gate'   },
  PARKING:    { icon: 'car-outline',           label: 'Parking'     },
  LOBBY:      { icon: 'business-outline',      label: 'Lobby'       },
  CORRIDOR:   { icon: 'git-merge-outline',     label: 'Corridor'    },
  PLAYGROUND: { icon: 'football-outline',      label: 'Playground'  },
};

const STATUS_META: Record<CameraStatus, { color: string; label: string }> = {
  ONLINE:      { color: '#22C55E', label: 'Online'      },
  OFFLINE:     { color: '#EF4444', label: 'Offline'     },
  MAINTENANCE: { color: '#F59E0B', label: 'Maintenance' },
};

const MOCK_CAMERAS: Camera[] = [
  { id: 1, name: 'Main Gate',      location: 'MAIN_GATE',  status: 'ONLINE',      isNightMode: false },
  { id: 2, name: 'Exit Gate',      location: 'EXIT_GATE',  status: 'ONLINE',      isNightMode: false },
  { id: 3, name: 'Parking A',      location: 'PARKING',    status: 'ONLINE',      isNightMode: false },
  { id: 4, name: 'Lobby Tower A',  location: 'LOBBY',      status: 'OFFLINE',     isNightMode: false },
  { id: 5, name: 'Lobby Tower B',  location: 'LOBBY',      status: 'MAINTENANCE', isNightMode: false },
  { id: 6, name: 'Playground',     location: 'PLAYGROUND', status: 'ONLINE',      isNightMode: true,
    lastSnapshotAt: new Date(Date.now() - 5 * 60000).toISOString() },
];

function formatSnapshotTime(iso?: string) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CCTVScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [snapshots, setSnapshots] = useState<Record<number, { url: string; capturedAt: string }>>({});
  const [capturingId, setCapturingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: raw, isLoading, refetch } = useQuery<Camera[]>({
    queryKey: ['guard', 'cameras'],
    queryFn: () => cctvService.getCameras(),
    staleTime: 60_000,
  });
  const cameras = raw && raw.length > 0 ? raw : MOCK_CAMERAS;

  const onlineCount = cameras.filter(c => c.status === 'ONLINE').length;
  const offlineCount = cameras.filter(c => c.status === 'OFFLINE').length;
  const maintenanceCount = cameras.filter(c => c.status === 'MAINTENANCE').length;

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const handleCapture = async (camera: Camera) => {
    if (camera.status !== 'ONLINE') return;
    setCapturingId(camera.id);
    try {
      const result = await cctvService.getSnapshot(camera.id);
      if (result) {
        setSnapshots(prev => ({ ...prev, [camera.id]: result }));
      }
    } finally {
      setCapturingId(null);
    }
  };

  const renderCamera = ({ item }: { item: Camera }) => {
    const loc = LOCATION_META[item.location] ?? { icon: 'videocam-outline' as any, label: item.location };
    const statusMeta = STATUS_META[item.status];
    const isOffline = item.status !== 'ONLINE';
    const capturing = capturingId === item.id;
    const snap = snapshots[item.id];
    const lastSnap = snap?.capturedAt ?? item.lastSnapshotAt;

    return (
      <View style={s.cameraCard}>
        {/* Camera header */}
        <View style={s.camHeader}>
          <View style={[s.statusDot, { backgroundColor: statusMeta.color }]} />
          <Text style={s.camName} numberOfLines={1}>{item.name}</Text>
          {item.isNightMode && (
            <View style={s.nightBadge}>
              <Ionicons name="moon-outline" size={10} color="#7C3AED" />
              <Text style={s.nightBadgeText}>Night</Text>
            </View>
          )}
        </View>

        {/* Location badge */}
        <View style={s.locRow}>
          <Ionicons name={loc.icon} size={11} color={COLORS.textMuted} />
          <Text style={s.locText}>{loc.label}</Text>
        </View>

        {/* Snapshot area */}
        <View style={s.snapArea}>
          {isOffline ? (
            <View style={s.offlineOverlay}>
              <Ionicons name="videocam-off-outline" size={28} color="#EF4444" />
              <Text style={s.offlineText}>{item.status === 'MAINTENANCE' ? 'Under Maintenance' : 'Camera Offline'}</Text>
            </View>
          ) : snap?.url ? (
            <Image source={{ uri: snap.url }} style={s.snapImage} resizeMode="cover" />
          ) : (
            <View style={s.snapPlaceholder}>
              <Ionicons name="videocam-outline" size={28} color="#475569" />
              <Text style={s.snapPlaceholderText}>Tap to capture snapshot</Text>
            </View>
          )}
          {lastSnap && !isOffline && (
            <View style={s.snapTimestamp}>
              <Text style={s.snapTimestampText}>{formatSnapshotTime(lastSnap)}</Text>
            </View>
          )}
        </View>

        {/* Capture button */}
        <TouchableOpacity
          style={[s.captureBtn, isOffline && s.captureBtnDisabled]}
          onPress={() => handleCapture(item)}
          disabled={isOffline || capturing}
          activeOpacity={0.8}
        >
          {capturing ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <>
              <Text style={[s.captureBtnText, isOffline && s.captureBtnTextDisabled]}>
                📷 {snap ? 'Refresh Snapshot' : 'Capture Snapshot'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>CCTV Monitor</Text>
        <TouchableOpacity onPress={onRefresh} style={s.headerBtn} hitSlop={8} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color="#94A3B8" />
            : <Ionicons name="refresh-outline" size={20} color="#E2E8F0" />
          }
        </TouchableOpacity>
      </View>

      {/* Status bar */}
      <View style={s.statusBar}>
        <View style={s.statusItem}>
          <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
          <Text style={s.statusBarText}>{onlineCount} Online</Text>
        </View>
        {offlineCount > 0 && (
          <View style={s.statusItem}>
            <View style={[s.statusDot, { backgroundColor: '#EF4444' }]} />
            <Text style={s.statusBarText}>{offlineCount} Offline</Text>
          </View>
        )}
        {maintenanceCount > 0 && (
          <View style={s.statusItem}>
            <View style={[s.statusDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={s.statusBarText}>{maintenanceCount} Maintenance</Text>
          </View>
        )}
        <Text style={s.cameraCount}>{cameras.length} cameras</Text>
      </View>

      {isLoading ? (
        <View style={s.loading}><ActivityIndicator size="large" color="#94A3B8" /></View>
      ) : (
        <FlatList
          data={cameras}
          keyExtractor={item => String(item.id)}
          renderItem={renderCamera}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#94A3B8" />}
          ListFooterComponent={
            <View style={s.footer}>
              <Ionicons name="information-circle-outline" size={13} color="#475569" />
              <Text style={s.footerText}>Snapshots are taken on-demand. Live stream available in security room.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: '#F1F5F9' },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E293B',
    paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBarText: { fontSize: 12, color: '#94A3B8', fontFamily: 'DMSans-Regular' },
  cameraCount: { marginLeft: 'auto', fontSize: 11, color: '#64748B', fontFamily: 'DMSans-Regular' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: SPACING.sm, paddingBottom: 40 },
  row: { gap: SPACING.sm, marginBottom: SPACING.sm },

  cameraCard: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: '#334155',
  },
  camHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: SPACING.sm },
  camName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#E2E8F0', fontFamily: 'Outfit-Bold' },
  nightBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#EDE9FE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  nightBadgeText: { fontSize: 9, fontWeight: '700', color: '#7C3AED', fontFamily: 'Outfit-Bold' },

  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm },
  locText: { fontSize: 10, color: '#64748B', fontFamily: 'DMSans-Regular' },

  snapArea: { height: 110, backgroundColor: '#0F172A', position: 'relative' },
  snapImage: { width: '100%', height: '100%' },
  snapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  snapPlaceholderText: { fontSize: 10, color: '#475569', fontFamily: 'DMSans-Regular', textAlign: 'center', paddingHorizontal: 8 },
  offlineOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)' },
  offlineText: { fontSize: 10, color: '#EF4444', fontFamily: 'DMSans-Medium', fontWeight: '600', textAlign: 'center' },
  snapTimestamp: { position: 'absolute', bottom: 4, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  snapTimestampText: { fontSize: 9, color: '#94A3B8', fontFamily: 'monospace' },

  captureBtn: { paddingVertical: 8, alignItems: 'center', backgroundColor: '#334155', borderTopWidth: 1, borderTopColor: '#1E293B' },
  captureBtnDisabled: { backgroundColor: '#1E293B' },
  captureBtnText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit-Bold' },
  captureBtnTextDisabled: { color: '#475569' },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, margin: SPACING.md, marginTop: 0 },
  footerText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'DMSans-Regular', lineHeight: 16 },
});
