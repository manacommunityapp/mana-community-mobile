import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { CheckInOutButton } from '@/components/hrm/CheckInOutButton';
import { hrmService } from '@/services/hrmService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import type { AttendanceRecord, LeaveBalance } from '@/types/hrm';

function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

interface QuickLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  bgColor: string;
}

function QuickLink({ icon, label, onPress, color, bgColor }: QuickLinkProps) {
  return (
    <TouchableOpacity style={s.quickLink} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.quickIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HrmHomeScreen() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isManager = hasRole('ADMIN', 'SUPER_ADMIN', 'HR_ADMIN');

  const { from, to } = monthRange();

  // Bootstrap: get orgId from user's HR organizations first
  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['hrm-my-orgs'],
    queryFn: hrmService.getMyOrganizations,
  });
  const orgId = orgs?.[0]?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['hrm-profile', orgId],
    queryFn: () => hrmService.getMyProfile(orgId!),
    enabled: !!orgId,
  });

  const { data: attendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['hrm-attendance-month', orgId, from, to],
    queryFn: () => hrmService.getMyAttendance(orgId!, from, to),
    enabled: !!orgId,
  });

  const { data: leaveBalances } = useQuery({
    queryKey: ['hrm-leave-balance', orgId],
    queryFn: () => hrmService.getLeaveBalance(orgId!),
    enabled: !!orgId,
  });

  const todayRecord = attendance?.find(
    (a: AttendanceRecord) => a.attendanceDate === todayStr(),
  );
  const isCheckedIn = !!todayRecord?.firstCheckIn && !todayRecord?.lastCheckOut;

  async function getGpsCoords(): Promise<{ latitude?: number; longitude?: number }> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }
    } catch {
      // GPS unavailable — proceed without it
    }
    return {};
  }

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getGpsCoords();
      return hrmService.checkIn(orgId!, { source: 'MOBILE', ...coords });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-attendance-month'] });
    },
    onError: () => Alert.alert('Error', 'Failed to check in. Please try again.'),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getGpsCoords();
      return hrmService.checkOut(orgId!, { source: 'MOBILE', ...coords });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-attendance-month'] });
    },
    onError: () => Alert.alert('Error', 'Failed to check out. Please try again.'),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAttendance();
    await queryClient.invalidateQueries({ queryKey: ['hrm-leave-balance'] });
    setRefreshing(false);
  }, [refetchAttendance, queryClient]);

  const presentCount = attendance?.filter((a: AttendanceRecord) => a.attendanceStatus === 'PRESENT').length ?? 0;
  const absentCount = attendance?.filter((a: AttendanceRecord) => a.attendanceStatus === 'ABSENT').length ?? 0;
  const leaveCount = attendance?.filter((a: AttendanceRecord) => a.attendanceStatus === 'ON_LEAVE').length ?? 0;

  if (orgsLoading || profileLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading HR Portal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title="HR Portal"
        subtitle={profile ? `${profile.firstName} ${profile.lastName}` : 'Employee Self Service'}
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={s.scrollContent}
      >
        {/* Check In / Out */}
        <View style={s.checkInSection}>
          <CheckInOutButton
            isCheckedIn={isCheckedIn}
            lastEventTime={isCheckedIn ? formatTime(todayRecord?.firstCheckIn) : formatTime(todayRecord?.lastCheckOut)}
            onCheckIn={async () => { await checkInMutation.mutateAsync(); }}
            onCheckOut={async () => { await checkOutMutation.mutateAsync(); }}
          />
        </View>

        {/* Today's Status */}
        {todayRecord && (
          <View style={s.todayCard}>
            <Text style={s.todayTitle}>Today</Text>
            <View style={s.todayRow}>
              <View style={s.todayStat}>
                <Text style={s.todayStatLabel}>Check In</Text>
                <Text style={s.todayStatValue}>{formatTime(todayRecord.firstCheckIn)}</Text>
              </View>
              <View style={s.todayDivider} />
              <View style={s.todayStat}>
                <Text style={s.todayStatLabel}>Check Out</Text>
                <Text style={s.todayStatValue}>{formatTime(todayRecord.lastCheckOut)}</Text>
              </View>
              <View style={s.todayDivider} />
              <View style={s.todayStat}>
                <Text style={s.todayStatLabel}>Hours</Text>
                <Text style={s.todayStatValue}>
                  {todayRecord.totalWorkMinutes > 0
                    ? `${Math.floor(todayRecord.totalWorkMinutes / 60)}h ${todayRecord.totalWorkMinutes % 60}m`
                    : '--'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderLeftColor: COLORS.success }]}>
            <Text style={s.statValue}>{presentCount}</Text>
            <Text style={s.statLabel}>Present</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: COLORS.error }]}>
            <Text style={s.statValue}>{absentCount}</Text>
            <Text style={s.statLabel}>Absent</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: '#3B82F6' }]}>
            <Text style={s.statValue}>{leaveCount}</Text>
            <Text style={s.statLabel}>On Leave</Text>
          </View>
        </View>

        {/* Leave Balance Summary */}
        {leaveBalances && leaveBalances.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Leave Balance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.balanceScroll}>
              {leaveBalances.map((b: LeaveBalance) => (
                <View key={b.leaveTypeName} style={s.balanceMini}>
                  <Text style={s.balanceName}>{b.leaveTypeName}</Text>
                  <Text style={s.balanceNum}>{b.remainingBalance}/{b.totalBalance}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Links */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickGrid}>
            <QuickLink icon="calendar-outline" label="Attendance" onPress={() => router.push('/hrm/attendance')} color={COLORS.primary} bgColor={COLORS.primaryLight} />
            <QuickLink icon="document-text-outline" label="Apply Leave" onPress={() => router.push('/hrm/apply-leave')} color={COLORS.success} bgColor={COLORS.successLight} />
            <QuickLink icon="list-outline" label="My Leaves" onPress={() => router.push('/hrm/leaves')} color="#3B82F6" bgColor="#EFF6FF" />
            <QuickLink icon="time-outline" label="My Shifts" onPress={() => router.push('/hrm/shifts')} color="#8B5CF6" bgColor="#F5F3FF" />
            <QuickLink icon="person-outline" label="Profile" onPress={() => router.push('/hrm/profile')} color={COLORS.warning} bgColor={COLORS.warningLight} />
            <QuickLink icon="checkbox-outline" label="Onboarding" onPress={() => router.push('/hrm/onboarding')} color="#6366F1" bgColor="#EEF2FF" />
            <QuickLink icon="cash-outline" label="Payslips" onPress={() => router.push('/hrm/payslips')} color="#059669" bgColor="#ECFDF5" />
            <QuickLink icon="receipt-outline" label="Expenses" onPress={() => router.push('/hrm/expenses')} color="#D97706" bgColor="#FFFBEB" />
            <QuickLink icon="checkmark-circle-outline" label="My Tasks" onPress={() => router.push('/hrm/tasks')} color="#2563EB" bgColor="#EFF6FF" />
            <QuickLink icon="help-circle-outline" label="Help Desk" onPress={() => router.push('/hrm/helpdesk')} color="#7C3AED" bgColor="#F5F3FF" />
            {isManager && (
              <QuickLink icon="checkmark-done-outline" label="Approvals" onPress={() => router.push('/hrm/approvals')} color={COLORS.error} bgColor={COLORS.errorLight} />
            )}
            {isManager && (
              <QuickLink icon="bar-chart-outline" label="Analytics" onPress={() => router.push('/hrm/analytics')} color="#0369A1" bgColor="#E0F2FE" />
            )}
            {isManager && (
              <QuickLink icon="alert-circle-outline" label="Compliance" onPress={() => router.push('/hrm/compliance')} color="#B45309" bgColor="#FEF3C7" />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.medium },
  scrollContent: { paddingBottom: 40 },

  checkInSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  todayCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.md,
    padding: 14,
    ...SHADOWS.card,
  },
  todayTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayStatLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  todayStatValue: { fontSize: 15, fontFamily: FONTS.displaySemi, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  todayDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: 12,
    borderLeftWidth: 3,
    ...SHADOWS.sm,
  },
  statValue: { fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text, fontWeight: '700' },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 10,
  },

  balanceScroll: { gap: 10 },
  balanceMini: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  balanceName: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  balanceNum: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLink: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
