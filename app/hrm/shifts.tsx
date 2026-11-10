import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { HrEmployeeShift, ShiftSwapRequest } from '@/types/hrm';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(offset: number): { from: string; to: string; dates: Date[] } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(dates[0]), to: fmt(dates[6]), dates };
}

function formatShortDate(d: Date): string {
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}

export default function ShiftsScreen() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps'>('schedule');
  const [incomingSwaps, setIncomingSwaps] = useState<ShiftSwapRequest[]>([]);
  const [mySwaps, setMySwaps] = useState<ShiftSwapRequest[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    const loadSwaps = async () => {
      try {
        const orgs = await hrmService.getMyOrganizations();
        if (orgs.length > 0) {
          const oid = orgs[0].id;
          setOrgId(oid);
          const [incoming, mine] = await Promise.all([
            hrmService.getIncomingSwapRequests(oid),
            hrmService.getMySwapRequests(oid),
          ]);
          setIncomingSwaps(incoming);
          setMySwaps(mine);
        }
      } catch (err) {
        console.error('Failed to load swap requests:', err);
      }
    };
    loadSwaps();
  }, []);

  const handleRespondSwap = async (swapId: number, accepted: boolean) => {
    if (!orgId) return;
    Alert.alert(
      accepted ? 'Accept Swap' : 'Decline Swap',
      `Are you sure you want to ${accepted ? 'accept' : 'decline'} this swap?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accepted ? 'Accept' : 'Decline',
          style: accepted ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await hrmService.respondToSwap(orgId, swapId, accepted);
              const [incoming, mine] = await Promise.all([
                hrmService.getIncomingSwapRequests(orgId),
                hrmService.getMySwapRequests(orgId),
              ]);
              setIncomingSwaps(incoming);
              setMySwaps(mine);
            } catch {
              Alert.alert('Error', 'Failed to respond to swap request');
            }
          },
        },
      ],
    );
  };

  const { from, to, dates } = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const { data: shifts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-shifts', from, to],
    queryFn: () => hrmService.getMyShifts(from, to),
  });

  const shiftMap = new Map<string, HrEmployeeShift>();
  (shifts ?? []).forEach((s: HrEmployeeShift) => shiftMap.set(s.shiftDate, s));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const swapCount = incomingSwaps.filter(sw => sw.status === 'PENDING_COLLEAGUE').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="My Shifts" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'schedule' && s.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[s.tabText, activeTab === 'schedule' && s.tabTextActive]}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'swaps' && s.tabActive]}
          onPress={() => setActiveTab('swaps')}
        >
          <Text style={[s.tabText, activeTab === 'swaps' && s.tabTextActive]}>
            Swap Requests{swapCount > 0 ? ` (${swapCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'swaps' ? (
        <ScrollView contentContainerStyle={s.content}>
          {incomingSwaps.length === 0 && mySwaps.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 40 }}>No swap requests</Text>
          ) : null}

          {incomingSwaps.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={s.sectionTitle}>Incoming Requests</Text>
              {incomingSwaps.map(sw => (
                <View key={sw.id} style={[s.swapCard, { borderColor: '#fde68a', backgroundColor: '#fffbeb' }]}>
                  <Text style={s.swapFrom}>From: {sw.requesterEmployee.firstName} {sw.requesterEmployee.lastName}</Text>
                  <Text style={s.swapDates}>{sw.requesterShiftDate} ↔ {sw.targetShiftDate}</Text>
                  {sw.reason ? <Text style={s.swapReason}>{sw.reason}</Text> : null}
                  {sw.status === 'PENDING_COLLEAGUE' && (
                    <View style={s.swapActions}>
                      <TouchableOpacity onPress={() => handleRespondSwap(sw.id, true)} style={s.acceptBtn}>
                        <Text style={s.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRespondSwap(sw.id, false)} style={s.declineBtn}>
                        <Text style={s.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {mySwaps.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>My Requests</Text>
              {mySwaps.map(sw => (
                <View key={sw.id} style={s.swapCard}>
                  <Text style={s.swapFrom}>With: {sw.targetEmployee.firstName} {sw.targetEmployee.lastName}</Text>
                  <Text style={s.swapDates}>{sw.requesterShiftDate} ↔ {sw.targetShiftDate}</Text>
                  <Text style={[s.swapStatus, { color: sw.status === 'APPROVED' ? '#16a34a' : sw.status === 'REJECTED' ? '#dc2626' : '#d97706' }]}>
                    {sw.status.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
      {/* Week Navigator */}
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.weekLabel}>
          {formatShortDate(dates[0])} – {formatShortDate(dates[6])}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
        {weekOffset !== 0 && (
          <TouchableOpacity style={s.todayBtn} onPress={() => setWeekOffset(0)} activeOpacity={0.7}>
            <Text style={s.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={s.content}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          dates.map(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const shift = shiftMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const isPast = date < today && !isToday;

            return (
              <View key={dateStr} style={[s.dayCard, isToday && s.dayCardToday, isPast && s.dayCardPast]}>
                <View style={s.dayHeader}>
                  <Text style={[s.dayName, isToday && s.dayNameToday]}>
                    {DAY_NAMES[date.getDay()]}
                  </Text>
                  <Text style={[s.dayDate, isToday && s.dayDateToday]}>
                    {formatShortDate(date)}
                  </Text>
                  {isToday && (
                    <View style={s.todayBadge}>
                      <Text style={s.todayBadgeText}>TODAY</Text>
                    </View>
                  )}
                </View>
                {shift ? (
                  <View style={s.shiftInfo}>
                    <View style={s.shiftNameRow}>
                      <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                      <Text style={s.shiftName}>{shift.shiftName}</Text>
                    </View>
                    <Text style={s.shiftTime}>
                      {shift.startTime} – {shift.endTime}
                      {shift.breakMinutes > 0 && ` (${shift.breakMinutes}m break)`}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.noShift}>No shift assigned</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontWeight: '600' },

  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  swapCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  swapFrom: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, fontWeight: '600' },
  swapDates: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  swapReason: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  swapStatus: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', marginTop: 6 },
  swapActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: {
    flex: 1, backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  declineBtn: {
    flex: 1, backgroundColor: '#dc2626', paddingVertical: 8, borderRadius: RADIUS.sm, alignItems: 'center',
  },
  declineBtnText: { color: '#fff', fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekLabel: {
    fontSize: 14,
    fontFamily: FONTS.displaySemi,
    color: COLORS.text,
    fontWeight: '600',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xs,
  },
  todayBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontWeight: '700',
  },

  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  dayCardToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.card,
  },
  dayCardPast: { opacity: 0.6 },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dayName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  dayNameToday: { color: COLORS.primary },
  dayDate: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  dayDateToday: { color: COLORS.primary },
  todayBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  shiftInfo: { marginTop: 4 },
  shiftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shiftName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    fontWeight: '600',
  },
  shiftTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 22,
  },
  noShift: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
