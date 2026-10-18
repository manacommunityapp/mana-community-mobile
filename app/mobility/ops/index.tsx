import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, BackHandler, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobilityOpsService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';

type Tab = 'DOCUMENTS' | 'TRIPS';

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

  const reviewMutation = useMutation({
    mutationFn: ({ driverId, documentId, status, reason }: {
      driverId: number; documentId: number; status: 'APPROVED' | 'REJECTED'; reason?: string;
    }) => mobilityOpsService.reviewDocument(driverId, documentId, { status, rejectedReason: reason }),
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
              reviewMutation.mutate({ driverId, documentId, status: 'REJECTED', reason: reason ?? '' });
            });
          },
        },
        {
          text: 'Approve',
          onPress: () => reviewMutation.mutate({ driverId, documentId, status: 'APPROVED' }),
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
        {([['DOCUMENTS', 'Documents', 'document-text-outline'], ['TRIPS', 'Active Trips', 'navigate-outline']] as const).map(
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
                  <TouchableOpacity style={s.viewBtn} onPress={() => Alert.alert('Document', 'Open document viewer — connect to file viewer')}>
                    <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
                    <Text style={s.viewBtnText}>View</Text>
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
});
