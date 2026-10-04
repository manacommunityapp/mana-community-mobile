import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { foodService, DiningEventDto, TableReservationDto } from '@/services/foodService';

type TabKey = 'events' | 'reservations';

export default function DiningScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('events');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DiningEventDto | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/food');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedEvent) { setSelectedEvent(null); return true; }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack, selectedEvent])
  );

  const {
    data: events = [],
    isLoading: loadingEvents,
    refetch: refetchEvents,
  } = useQuery<DiningEventDto[]>({
    queryKey: ['food', 'dining-events'],
    queryFn: () => foodService.getDiningEvents(),
    staleTime: 60_000,
  });

  const {
    data: reservations = [],
    isLoading: loadingReservations,
    refetch: refetchReservations,
  } = useQuery<TableReservationDto[]>({
    queryKey: ['food', 'my-reservations'],
    queryFn: () => foodService.getMyReservations(),
    staleTime: 30_000,
  });

  const rsvpMutation = useMutation({
    mutationFn: (payload: { eventId: string; guests: number }) => foodService.rsvpDiningEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setSelectedEvent(null);
      Alert.alert('RSVP Confirmed!', 'You are registered for the community dining event.');
    },
    onError: () => Alert.alert('Error', 'Could not RSVP. Please try again.'),
  });

  const cancelReservation = useMutation({
    mutationFn: (resId: string) => foodService.cancelReservation(resId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      Alert.alert('Cancelled', 'Reservation has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Could not cancel reservation.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.allSettled([refetchEvents(), refetchReservations()]); }
    finally { setRefreshing(false); }
  }, [refetchEvents, refetchReservations]);

  const isInitialLoading = (loadingEvents || loadingReservations) && events.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Community Dining</Text>
          <Text style={styles.headerSub}>Events, potlucks & table bookings</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* Hero */}
        <LinearGradient colors={['#EC4899', '#DB2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="people" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>COMMUNITY DINING</Text>
              </View>
              <Text style={styles.heroTitle}>Dine Together</Text>
              <Text style={styles.heroSubtitle}>Potluck dinners, festival meals, clubhouse table reservations & community cooking events</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="wine" size={26} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{events.length}</Text>
              <Text style={styles.heroStatLabel}>Upcoming Events</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{reservations.length}</Text>
              <Text style={styles.heroStatLabel}>My Reservations</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['events', 'reservations'] as TabKey[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabItem, activeTab === t && styles.tabItemActive]} onPress={() => setActiveTab(t)} activeOpacity={0.7}>
              <Ionicons name={t === 'events' ? 'calendar' : 'bookmark'} size={16} color={activeTab === t ? '#DB2777' : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'events' ? 'Events & Potlucks' : 'My Reservations'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isInitialLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading dining events...</Text>
          </View>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {events.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Upcoming Events</Text>
                <Text style={styles.emptySub}>Community dining events will appear here when scheduled.</Text>
              </View>
            ) : (
              events.map((event) => (
                <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => setSelectedEvent(event)} activeOpacity={0.8}>
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.eventDateDay}>{event.date.split(' ')[0]}</Text>
                    <Text style={styles.eventDateMonth}>{event.date.split(' ')[1]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      {event.type === 'POTLUCK' && <View style={styles.potluckTag}><Text style={styles.potluckTagText}>Potluck</Text></View>}
                    </View>
                    <Text style={styles.eventMeta}>{event.time} · {event.venue}</Text>
                    <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
                    <View style={styles.eventFooter}>
                      <Text style={styles.eventCapacity}>{event.registeredCount}/{event.capacity} spots</Text>
                      {event.pricePerPerson > 0 && <Text style={styles.eventPrice}>₹{event.pricePerPerson}/person</Text>}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {reservations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bookmark-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Reservations</Text>
                <Text style={styles.emptySub}>RSVP to a dining event to see your bookings here.</Text>
              </View>
            ) : (
              reservations.map((res) => {
                const isConfirmed = res.status === 'CONFIRMED';
                return (
                  <View key={res.id} style={styles.resCard}>
                    <View style={styles.resHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resTitle}>{res.eventTitle}</Text>
                        <Text style={styles.resMeta}>{res.date} · {res.time} · {res.venue}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isConfirmed ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[styles.statusText, { color: isConfirmed ? '#059669' : '#EF4444' }]}>{res.status}</Text>
                      </View>
                    </View>
                    <View style={styles.resDetails}>
                      <Text style={styles.resDetailItem}>Guests: {res.guests}</Text>
                      {res.totalAmount > 0 && <Text style={styles.resDetailItem}>Amount: ₹{res.totalAmount}</Text>}
                    </View>
                    {isConfirmed && (
                      <TouchableOpacity
                        style={styles.cancelResBtn}
                        onPress={() => {
                          Alert.alert('Cancel Reservation', 'Are you sure?', [
                            { text: 'Keep' },
                            { text: 'Cancel', style: 'destructive', onPress: () => cancelReservation.mutate(res.id) },
                          ]);
                        }}
                        disabled={cancelReservation.isPending}
                      >
                        <Text style={styles.cancelResBtnText}>Cancel Reservation</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* RSVP Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RSVP to Event</Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <View style={{ gap: SPACING.md }}>
                <Text style={styles.modalEventTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalEventDesc}>{selectedEvent.description}</Text>

                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date & Time</Text>
                    <Text style={styles.summaryVal}>{selectedEvent.date} at {selectedEvent.time}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Venue</Text>
                    <Text style={styles.summaryVal}>{selectedEvent.venue}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Spots Left</Text>
                    <Text style={styles.summaryVal}>{selectedEvent.capacity - selectedEvent.registeredCount}</Text>
                  </View>
                  {selectedEvent.pricePerPerson > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cost per Person</Text>
                      <Text style={[styles.summaryVal, { color: '#DB2777', fontWeight: '900' }]}>₹{selectedEvent.pricePerPerson}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedEvent(null)} disabled={rsvpMutation.isPending}>
                    <Text style={styles.modalCancelText}>Maybe Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, rsvpMutation.isPending && { opacity: 0.6 }]}
                    onPress={() => rsvpMutation.mutate({ eventId: selectedEvent.id, guests: 1 })}
                    disabled={rsvpMutation.isPending}
                  >
                    {rsvpMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Confirm RSVP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroSubtitle: { fontSize: 12, color: '#FDF2F8', marginTop: 2, lineHeight: 17, fontFamily: 'DMSans-Regular' },
  heroIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroStatLabel: { fontSize: 10, color: '#FDF2F8', marginTop: 1, fontFamily: 'DMSans-Medium' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.md, gap: 5 },
  tabItemActive: { backgroundColor: '#FDF2F8' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#DB2777', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular' },

  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: SPACING.md, ...SHADOWS.sm },
  eventDateBadge: { width: 48, height: 52, borderRadius: 12, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  eventDateDay: { fontSize: 18, fontWeight: '900', color: '#DB2777', fontFamily: 'Outfit-Bold' },
  eventDateMonth: { fontSize: 10, fontWeight: '700', color: '#DB2777', fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  eventTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  potluckTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  potluckTagText: { fontSize: 8, fontWeight: '800', color: '#B45309', fontFamily: 'Outfit-Bold' },
  eventMeta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  eventDesc: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17, marginTop: 3 },
  eventFooter: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  eventCapacity: { fontSize: 11, color: COLORS.primary, fontWeight: '600', fontFamily: 'DMSans-Medium' },
  eventPrice: { fontSize: 11, color: '#DB2777', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  resCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm, gap: SPACING.sm },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  resMeta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  resDetails: { flexDirection: 'row', gap: SPACING.lg },
  resDetailItem: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  cancelResBtn: { backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 4 },
  cancelResBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444', fontFamily: 'Outfit-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalEventTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalEventDesc: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },
  summaryBox: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  summaryVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  modalConfirmBtn: { flex: 1.6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#DB2777', alignItems: 'center', ...SHADOWS.sm },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
