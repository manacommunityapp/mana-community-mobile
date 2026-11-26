import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, BackHandler, Linking, Modal, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobilityOpsService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS, CONFIG } from '@/constants/config';
import type { MobilityServiceZoneDto } from '@/types/mobility';

type Tab = 'DOCUMENTS' | 'TRIPS' | 'ZONES' | 'ANALYTICS';

const DOC_LABEL: Record<string, string> = {
  DRIVING_LICENCE:     'Driving Licence',
  VEHICLE_RC:          'Vehicle RC',
  INSURANCE:           'Insurance',
  FITNESS_CERTIFICATE: 'Fitness Certificate',
  PERMIT:              'Permit',
  PAN_CARD:            'PAN Card',
  AADHAAR:             'Aadhaar',
};

export default function OpsScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('DOCUMENTS');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; driver: string; url: string } | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<MobilityServiceZoneDto | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneLat, setZoneLat] = useState('17.4401');
  const [zoneLng, setZoneLng] = useState('78.3489');
  const [zoneRadius, setZoneRadius] = useState('15');

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
      return () => sub.remove();
    }, [router]),
  );

  const { data: docsData, isLoading: loadingDocs, refetch: refetchDocs, isRefetching: refetchingDocs } = useQuery({
    queryKey: ['ops-pending-docs'],
    queryFn:  () => mobilityOpsService.getPendingDocuments(),
    enabled:  tab === 'DOCUMENTS',
  });

  const { data: tripsData, isLoading: loadingTrips, refetch: refetchTrips, isRefetching: refetchingTrips } = useQuery({
    queryKey: ['ops-active-trips'],
    queryFn:  () => mobilityOpsService.getActiveTrips(),
    enabled:  tab === 'TRIPS',
    refetchInterval: 20_000,
  });

  const { data: zonesData, isLoading: loadingZones, refetch: refetchZones } = useQuery({
    queryKey: ['ops-service-zones'],
    queryFn:  mobilityOpsService.getAllServiceZones,
    enabled:  tab === 'ZONES',
  });

  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['ops-analytics'],
    queryFn:  mobilityOpsService.getAnalytics,
    enabled:  tab === 'ANALYTICS',
  });

  const saveZoneMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: zoneName.trim(),
        centerLat: Number(zoneLat),
        centerLng: Number(zoneLng),
        radiusKm: Number(zoneRadius),
        active: editingZone ? editingZone.active : true,
      };
      return editingZone
        ? mobilityOpsService.updateServiceZone(editingZone.id, payload)
        : mobilityOpsService.createServiceZone(payload);
    },
    onSuccess: () => {
      setZoneModalOpen(false);
      setEditingZone(null);
      queryClient.invalidateQueries({ queryKey: ['ops-service-zones'] });
      queryClient.invalidateQueries({ queryKey: ['mobility-service-zones'] });
    },
    onError: () => Alert.alert('Error', 'Please check zone coordinates and radius.'),
  });

  const toggleZoneMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      mobilityOpsService.updateServiceZoneStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-service-zones'] });
      queryClient.invalidateQueries({ queryKey: ['mobility-service-zones'] });
    },
    onError: () => Alert.alert('Error', 'Could not update zone status.'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ driverId, documentId, approved, reason }: {
      driverId: number; documentId: number; approved: boolean; reason?: string;
    }) => mobilityOpsService.reviewDocument(driverId, documentId, { approved, rejectReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-pending-docs'] });
    },
    onError: () => Alert.alert('Error', 'Could not submit review.'),
  });

  function handleReview(driverId: number, documentId: number, driverName: string, docType: string) {
    Alert.alert(
      `Review: ${DOC_LABEL[docType] ?? docType}`,
      `Driver: ${driverName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            Alert.prompt('Rejection reason', 'Enter a reason for the driver', (reason) => {
              reviewMutation.mutate({ driverId, documentId, approved: false, reason: reason ?? '' });
            });
          },
        },
        {
          text: 'Approve',
          onPress: () => reviewMutation.mutate({ driverId, documentId, approved: true }),
        },
      ],
    );
  }

  const docs  = docsData?.content ?? [];
  const trips = tripsData?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Mobility Ops</Text>
          <Text style={s.headerSub}>Operations dashboard</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>Admin</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {([
          ['DOCUMENTS', 'Docs', 'document-text-outline'],
          ['TRIPS', 'Trips', 'navigate-outline'],
          ['ZONES', 'Zones', 'map-outline'],
          ['ANALYTICS', 'Analytics', 'stats-chart-outline'],
        ] as const).map(
          ([key, label, icon]) => (
            <TouchableOpacity
              key={key}
              style={[s.tab, tab === key && s.tabActive]}
              onPress={() => setTab(key)}
            >
              <Ionicons name={icon} size={15} color={tab === key ? COLORS.primary : COLORS.textMuted} />
              <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>{label}</Text>
              {key === 'DOCUMENTS' && (docsData?.totalElements ?? 0) > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeText}>{docsData?.totalElements}</Text></View>
              )}
            </TouchableOpacity>
          ),
        )}
      </View>

      {/* ── Document Review Tab ─────────────────────────────────── */}
      {tab === 'DOCUMENTS' && (
        loadingDocs ? (
          <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : docs.length === 0 ? (
          <View style={s.centered}>
            <View style={s.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={36} color={COLORS.success} />
            </View>
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptySubtitle}>No pending document reviews</Text>
          </View>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(item) => `${item.driverId}-${item.documentId}`}
            renderItem={({ item }) => (
              <View style={s.docCard}>
                <View style={s.docTop}>
                  <View style={s.docIcon}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                  </View>
                  <View style={s.docInfo}>
                    <Text style={s.docType}>{DOC_LABEL[item.documentType] ?? item.documentType}</Text>
                    <Text style={s.docDriver}>{item.driverName}</Text>
                    <Text style={s.docDate}>
                      {new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <View style={s.docActions}>
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => {
                      if (!item.fileUrl) {
                        Alert.alert('Document unavailable', 'No file is attached to this review.');
                        return;
                      }
                      const url = /^https?:\/\//i.test(item.fileUrl)
                        ? item.fileUrl
                        : `${CONFIG.API_BASE_URL}${item.fileUrl.startsWith('/api') ? '' : '/api'}${item.fileUrl}`;
                      setPreviewDoc({
                        title: DOC_LABEL[item.documentType] ?? item.documentType,
                        driver: item.driverName,
                        url,
                      });
                    }}
                  >
                    <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
                    <Text style={s.viewBtnText}>Preview</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.reviewBtn}
                    onPress={() => handleReview(item.driverId, item.documentId, item.driverName, item.documentType)}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.reviewBtnText}>Review</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={s.list}
            onRefresh={refetchDocs}
            refreshing={refetchingDocs}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Text style={s.footerNote}>{docsData?.totalElements ?? 0} pending reviews</Text>
            }
          />
        )
      )}

      {/* ── Active Trips Tab ────────────────────────────────────── */}
      {tab === 'TRIPS' && (
        loadingTrips ? (
          <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : trips.length === 0 ? (
          <View style={s.centered}>
            <View style={s.emptyIcon}>
              <Ionicons name="car-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>No active trips</Text>
            <Text style={s.emptySubtitle}>All trips are idle right now</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={s.tripCard}>
                <View style={s.tripTop}>
                  <Text style={s.tripRef}>#{item.tripRef}</Text>
                  <View style={[s.statusPill, { backgroundColor: '#4F46E520' }]}>
                    <Text style={[s.statusText, { color: '#4F46E5' }]}>{item.status}</Text>
                  </View>
                </View>
                <View style={s.tripPassenger}>
                  <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
                  <Text style={s.tripPassengerText}>{item.passengerName}</Text>
                  {item.driver && (
                    <>
                      <Text style={s.tripDot}>·</Text>
                      <Ionicons name="car-outline" size={13} color={COLORS.textMuted} />
                      <Text style={s.tripPassengerText}>{item.driver.driverName}</Text>
                    </>
                  )}
                </View>
                <View style={s.tripRoute}>
                  <Ionicons name="location" size={13} color="#10B981" />
                  <Text style={s.tripRouteText} numberOfLines={1}>{item.pickup.address}</Text>
                </View>
                <View style={s.tripRoute}>
                  <Ionicons name="flag" size={13} color="#EF4444" />
                  <Text style={s.tripRouteText} numberOfLines={1}>{item.destination.address}</Text>
                </View>
                <Text style={s.tripFare}>₹{(item.finalFare ?? item.fareQuote?.total ?? 0).toFixed(2)}</Text>
              </View>
            )}
            contentContainerStyle={s.list}
            onRefresh={refetchTrips}
            refreshing={refetchingTrips}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Text style={s.footerNote}>{tripsData?.totalElements ?? 0} active trips</Text>
            }
          />
        )
      )}

      {/* ── Service Zones Tab ──────────────────────────────────── */}
      {tab === 'ZONES' && (
        loadingZones ? (
          <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={s.addZoneBtn}
              onPress={() => {
                setEditingZone(null);
                setZoneName('');
                setZoneLat('17.4401');
                setZoneLng('78.3489');
                setZoneRadius('15');
                setZoneModalOpen(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.reviewBtnText}>Create Service Zone</Text>
            </TouchableOpacity>

            {(zonesData ?? []).map((zone) => (
              <View key={zone.id} style={s.docCard}>
                <View style={s.tripTop}>
                  <Text style={s.docType}>{zone.name}</Text>
                  <View style={[s.statusPill, { backgroundColor: zone.active ? '#ECFDF5' : '#F3F4F6' }]}>
                    <Text style={[s.statusText, { color: zone.active ? '#059669' : COLORS.textMuted }]}>
                      {zone.active ? 'ACTIVE' : 'DISABLED'}
                    </Text>
                  </View>
                </View>
                <Text style={s.docDriver}>
                  Center: {zone.centerLat.toFixed(4)}, {zone.centerLng.toFixed(4)} · Radius: {zone.radiusKm} km
                </Text>
                <View style={s.docActions}>
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => {
                      setEditingZone(zone);
                      setZoneName(zone.name);
                      setZoneLat(String(zone.centerLat));
                      setZoneLng(String(zone.centerLng));
                      setZoneRadius(String(zone.radiusKm));
                      setZoneModalOpen(true);
                    }}
                  >
                    <Text style={s.viewBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.reviewBtn, !zone.active && { backgroundColor: '#059669' }]}
                    onPress={() => toggleZoneMutation.mutate({ id: zone.id, active: !zone.active })}
                    disabled={toggleZoneMutation.isPending}
                  >
                    <Text style={s.reviewBtnText}>{zone.active ? 'Disable' : 'Enable'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {(zonesData ?? []).length === 0 && (
              <View style={s.centered}>
                <Text style={s.emptyTitle}>No service zones configured</Text>
                <Text style={s.emptySubtitle}>Create a geofenced community zone above.</Text>
              </View>
            )}
          </ScrollView>
        )
      )}

      {/* ── Analytics Tab ──────────────────────────────────────── */}
      {tab === 'ANALYTICS' && (
        loadingAnalytics ? (
          <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : !analytics ? (
          <View style={s.centered}>
            <Text style={s.emptyTitle}>Analytics unavailable</Text>
            <TouchableOpacity style={s.viewBtn} onPress={() => refetchAnalytics()}><Text style={s.viewBtnText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            <View style={s.kpiGrid}>
              {[
                { label: 'Gross Revenue', value: `₹${Number(analytics.grossRevenue || 0).toFixed(0)}`, sub: `Platform fee ₹${Number(analytics.platformFeeRevenue || 0).toFixed(0)}` },
                { label: 'Online vs Cash', value: `₹${Number(analytics.onlineRevenue || 0).toFixed(0)}`, sub: `Cash ₹${Number(analytics.cashRevenue || 0).toFixed(0)}` },
                { label: 'Trip Completion', value: `${analytics.completedTrips}/${analytics.totalTrips}`, sub: `Cancel rate ${Number(analytics.cancellationRatePct || 0).toFixed(1)}%` },
                { label: 'Driver SLA', value: `${Number(analytics.averageDriverRating || 0).toFixed(1)}★`, sub: `${analytics.onlineDrivers}/${analytics.approvedDrivers} online · ${Number(analytics.averageTripDurationMin || 0).toFixed(0)}m avg` },
                { label: 'Settlements', value: `₹${Number(analytics.pendingDriverSettlement || 0).toFixed(0)}`, sub: `Settled ₹${Number(analytics.settledDriverPayouts || 0).toFixed(0)}` },
                { label: 'Carpool Utilization', value: `${Number(analytics.carpoolUtilizationPct || 0).toFixed(1)}%`, sub: `${analytics.bookedCarpoolSeats}/${analytics.totalCarpoolSeats} seats · Refunded ₹${Number(analytics.totalRefunded || 0).toFixed(0)}` },
              ].map((kpi) => (
                <View key={kpi.label} style={s.kpiCard}>
                  <Text style={s.kpiLabel}>{kpi.label}</Text>
                  <Text style={s.kpiValue}>{kpi.value}</Text>
                  <Text style={s.kpiSub}>{kpi.sub}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.viewBtn} onPress={() => { refetchZones(); refetchAnalytics(); }}>
              <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
              <Text style={s.viewBtnText}>Refresh Metrics</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* ── In-App Document Preview Modal ──────────────────────── */}
      <Modal visible={!!previewDoc} animationType="slide" onRequestClose={() => setPreviewDoc(null)}>
        <SafeAreaView style={s.container} edges={['top', 'bottom']}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setPreviewDoc(null)} style={s.backBtn}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>{previewDoc?.title}</Text>
              <Text style={s.headerSub}>{previewDoc?.driver}</Text>
            </View>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => previewDoc?.url && Linking.openURL(previewDoc.url).catch(() => undefined)}
            >
              <Ionicons name="open-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {previewDoc && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(previewDoc.url) ? (
            <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <Image source={{ uri: previewDoc.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
          ) : previewDoc ? (
            <WebView source={{ uri: previewDoc.url }} style={{ flex: 1 }} startInLoadingState />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* ── Service Zone Create/Edit Modal ─────────────────────── */}
      <Modal visible={zoneModalOpen} transparent animationType="slide" onRequestClose={() => setZoneModalOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.emptyTitle}>{editingZone ? 'Edit Service Zone' : 'New Service Zone'}</Text>
            <TextInput style={s.zoneInput} placeholder="Zone name (e.g. Gachibowli Core)" value={zoneName} onChangeText={setZoneName} />
            <TextInput style={s.zoneInput} placeholder="Center latitude" value={zoneLat} onChangeText={setZoneLat} keyboardType="numeric" />
            <TextInput style={s.zoneInput} placeholder="Center longitude" value={zoneLng} onChangeText={setZoneLng} keyboardType="numeric" />
            <TextInput style={s.zoneInput} placeholder="Radius (km)" value={zoneRadius} onChangeText={setZoneRadius} keyboardType="numeric" />
            <View style={s.docActions}>
              <TouchableOpacity style={s.viewBtn} onPress={() => setZoneModalOpen(false)}>
                <Text style={s.viewBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.reviewBtn}
                disabled={saveZoneMutation.isPending || !zoneName.trim()}
                onPress={() => saveZoneMutation.mutate()}
              >
                <Text style={s.reviewBtnText}>{saveZoneMutation.isPending ? 'Saving…' : 'Save Zone'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },

  header:          {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:         {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerCenter:    { flex: 1 },
  headerTitle:     { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  headerSub:       { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium, marginTop: 1 },
  badge:           {
    backgroundColor: '#FEF2F2', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText:       { fontSize: 11, fontFamily: FONTS.bold, color: '#EF4444' },

  tabs:            {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab:             {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:       { borderBottomColor: COLORS.primary },
  tabLabel:        { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  tabLabelActive:  { color: COLORS.primary },
  tabBadge:        {
    backgroundColor: COLORS.error, borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeText:    { color: '#fff', fontSize: 9, fontFamily: FONTS.bold },

  list:            { padding: 14, gap: 12, paddingBottom: 32 },

  docCard:         {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  docTop:          { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  docIcon:         {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  docInfo:         { flex: 1 },
  docType:         { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  docDriver:       { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  docDate:         { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  docActions:      { flexDirection: 'row', gap: 10 },
  viewBtn:         {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 8,
  },
  viewBtnText:     { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.semiBold },
  reviewBtn:       {
    flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 8, alignItems: 'center', ...SHADOWS.primary,
  },
  reviewBtnText:   { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

  tripCard:        {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    gap: 8, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  tripTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripRef:         { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text },
  statusPill:      { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:      { fontSize: 11, fontFamily: FONTS.bold },
  tripPassenger:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripPassengerText: { fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular },
  tripDot:         { color: COLORS.textMuted },
  tripRoute:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripRouteText:   { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  tripFare:        { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },

  footerNote:      { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, padding: 12 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyIcon:       { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:      { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text },
  emptySubtitle:   { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center' },
  addZoneBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12 },
  kpiGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard:         { width: '48%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 13, gap: 4, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  kpiLabel:        { fontSize: 11, fontFamily: FONTS.semiBold, color: COLORS.textMuted },
  kpiValue:        { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  kpiSub:          { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  modalBackdrop:   { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 10 },
  zoneInput:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, color: COLORS.text },
});
