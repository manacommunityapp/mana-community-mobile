import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import { vehicleCareService, VendorJob, BookingStatus } from '@/services/vehicleCareService';

const SCREEN_W = Dimensions.get('window').width;

type JobTab = 'TODAY' | 'UPCOMING' | 'HISTORY';

const STATUS_ORDER: BookingStatus[] = ['CONFIRMED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; emoji: string; nextAction?: string; nextStatus?: BookingStatus }> = {
  CONFIRMED:   { label: 'Confirmed',   color: '#2563EB', bg: '#DBEAFE', emoji: '📅', nextAction: 'Accept Job',   nextStatus: 'ASSIGNED' },
  ASSIGNED:    { label: 'Accepted',    color: '#7C3AED', bg: '#EDE9FE', emoji: '👷', nextAction: 'Start Route',   nextStatus: 'EN_ROUTE' },
  EN_ROUTE:    { label: 'En Route',    color: '#0284C7', bg: '#E0F2FE', emoji: '🚗', nextAction: 'Mark Arrived',  nextStatus: 'ARRIVED' },
  ARRIVED:     { label: 'Arrived',     color: '#0891B2', bg: '#CFFAFE', emoji: '📍', nextAction: 'Start Service', nextStatus: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'In Progress', color: '#4F46E5', bg: '#EEF2FF', emoji: '🧽', nextAction: 'Complete Job',  nextStatus: 'COMPLETED' },
  COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#DCFCE7', emoji: '✅' },
  CANCELLED:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2', emoji: '❌' },
};

const TODAY_STATUSES: BookingStatus[] = ['CONFIRMED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const COMPLETED_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

function JobCard({ job, onStatusChange }: { job: VendorJob; onStatusChange: (id: string, status: BookingStatus) => void }) {
  const cfg = STATUS_CFG[job.status] ?? STATUS_CFG.CONFIRMED;
  const [checklistDone, setChecklistDone] = useState(job.checklistCompleted ?? false);

  const CHECKLIST = [
    'Vehicle inspected before service',
    'Cleaning products verified safe',
    'Service completed per standard',
    'Vehicle left in clean condition',
    'Customer confirmation obtained',
  ];
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  function toggleCheck(i: number) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function handleComplete() {
    if (checkedItems.size < CHECKLIST.length) {
      Alert.alert('Checklist Incomplete', 'Please complete all checklist items before marking the job as done.');
      return;
    }
    Alert.alert('Complete Job', 'Confirm that all services are complete and the customer is satisfied?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete', onPress: () => onStatusChange(job.id, 'COMPLETED'),
      },
    ]);
  }

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobTop}>
        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.jobBookingNum}>#{job.bookingNumber}</Text>
          <Text style={styles.jobService}>{job.serviceName}</Text>
          {job.addonNames.length > 0 && (
            <Text style={styles.jobAddons}>+ {job.addonNames.join(', ')}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Resident & vehicle info */}
      <View style={[styles.infoBox, { backgroundColor: cfg.bg }]}>
        <InfoRow icon="person-outline" text={job.residentName} />
        <InfoRow icon="location-outline" text={job.address} />
        <InfoRow icon="car-outline" text={job.vehicleDisplay} />
        <InfoRow icon="time-outline" text={`${job.scheduledDate} at ${job.scheduledTime}`} />
        <InfoRow icon="cash-outline" text={`₹${job.amount}`} />
      </View>

      {/* Job status progression */}
      {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
        <View style={styles.progressRow}>
          {STATUS_ORDER.map((s, i) => {
            const isActive = STATUS_ORDER.indexOf(job.status as BookingStatus) >= i;
            return (
              <React.Fragment key={s}>
                <View style={[styles.progressDot, isActive && styles.progressDotActive]}>
                  {isActive && <Ionicons name="checkmark" size={9} color="#fff" />}
                </View>
                {i < STATUS_ORDER.length - 1 && <View style={[styles.progressLine, isActive && STATUS_ORDER.indexOf(job.status as BookingStatus) > i && styles.progressLineActive]} />}
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Checklist for IN_PROGRESS */}
      {job.status === 'IN_PROGRESS' && (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Service Checklist</Text>
          {CHECKLIST.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => toggleCheck(i)} style={styles.checklistRow}>
              <View style={[styles.checkBox, checkedItems.has(i) && styles.checkBoxActive]}>
                {checkedItems.has(i) && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[styles.checklistItem, checkedItems.has(i) && styles.checklistItemDone]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action button */}
      {cfg.nextAction && cfg.nextStatus && (
        <TouchableOpacity
          onPress={() => {
            if (cfg.nextStatus === 'COMPLETED') { handleComplete(); return; }
            onStatusChange(job.id, cfg.nextStatus!);
          }}
          style={styles.actionBtn}
        >
          <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.actionBtnGrad}>
            <Text style={styles.actionBtnText}>{cfg.nextAction}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={13} color="#64748B" />
      <Text style={styles.infoText} numberOfLines={2}>{text}</Text>
    </View>
  );
}

export default function VendorPortalScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<JobTab>('TODAY');

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['vc-vendor-jobs'],
    queryFn: vehicleCareService.getVendorJobs,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      vehicleCareService.updateJobStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vc-vendor-jobs'] }),
    onError: () => Alert.alert('Error', 'Could not update job status. Please try again.'),
  });

  function handleStatusChange(id: string, status: BookingStatus) {
    statusMutation.mutate({ id, status });
  }

  const todayJobs = jobs.filter(j => TODAY_STATUSES.includes(j.status));
  const completedJobs = jobs.filter(j => COMPLETED_STATUSES.includes(j.status));
  const upcomingJobs = jobs.filter(j => j.status === 'CONFIRMED' || j.status === 'ASSIGNED');

  function visibleJobs(): VendorJob[] {
    if (tab === 'TODAY') return todayJobs;
    if (tab === 'UPCOMING') return upcomingJobs;
    return completedJobs;
  }

  const todayEarnings = completedJobs.reduce((s, j) => s + j.amount, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Vendor / Tech Portal</Text>
          <Text style={styles.headerSub}>Washcaro Partner Dashboard</Text>
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{todayJobs.length}</Text>
          <Text style={styles.statLabel}>Today's Jobs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{completedJobs.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: COLORS.success }]}>₹{todayEarnings}</Text>
          <Text style={styles.statLabel}>Today's Revenue</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['TODAY', 'UPCOMING', 'HISTORY'] as JobTab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'TODAY' ? `Today (${todayJobs.length})` : t === 'UPCOMING' ? 'Upcoming' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}
        {!isLoading && visibleJobs().length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
            <Text style={styles.emptyText}>No {tab.toLowerCase()} jobs</Text>
          </View>
        )}
        {visibleJobs().map(job => (
          <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#94A3B8', marginTop: 2 },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNum: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: '#64748B', marginTop: 2 },

  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#64748B' },
  tabTextActive: { color: COLORS.primary },

  scroll: { padding: 16, gap: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 15, color: '#64748B' },

  jobCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOWS.card },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  jobBookingNum: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8' },
  jobService: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  jobAddons: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11 },

  infoBox: { marginHorizontal: 14, borderRadius: 12, padding: 12, gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { fontFamily: FONTS.regular, fontSize: 12, color: '#374151', flex: 1 },

  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 14 },
  progressDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressLine: { flex: 1, height: 2, backgroundColor: '#CBD5E1', marginHorizontal: 2 },
  progressLineActive: { backgroundColor: COLORS.primary },

  checklist: { marginHorizontal: 14, marginBottom: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  checklistTitle: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginBottom: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checklistItem: { fontFamily: FONTS.regular, fontSize: 13, color: '#374151', flex: 1 },
  checklistItemDone: { color: '#94A3B8', textDecorationLine: 'line-through' },

  actionBtn: { marginHorizontal: 14, marginBottom: 14 },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, gap: 8 },
  actionBtnText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
});
