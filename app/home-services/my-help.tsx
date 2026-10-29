import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService, type DomesticStaffDto } from '@/services/homeServicesService';
import { WorkerGatePassModal } from '@/components/home-services/WorkerGatePassModal';

const ROLE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  MAID:     { label: 'Maid',     emoji: '✨', color: '#DB2777', bg: '#FCE7F3', border: '#F9A8D4' },
  COOK:     { label: 'Cook',     emoji: '👩‍🍳', color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
  DRIVER:   { label: 'Driver',   emoji: '🚗', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  NANNY:    { label: 'Nanny',    emoji: '👶', color: '#E11D48', bg: '#FFE4E6', border: '#FDA4AF' },
  GARDENER: { label: 'Gardener', emoji: '🌿', color: '#059669', bg: '#DCFCE7', border: '#86EFAC' },
  HELPER:   { label: 'Helper',   emoji: '🤝', color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
};

export default function MyHelpScreen() {
  const router = useRouter();

  const { data: staffList = [], isLoading, refetch } = useQuery({
    queryKey: ['my-domestic-staff'],
    queryFn: () => homeServicesService.getDomesticStaff(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['my-staff-attendance'],
    queryFn: () => homeServicesService.getStaffAttendance(),
  });

  const [gatePassStaff, setGatePassStaff] = React.useState<DomesticStaffDto | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>👥 My Domestic Staff</Text>
            <Text style={styles.headerSub}>Manage your household helpers</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/home-services/jobs')}>
            <Text style={styles.addBtnText}>➕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statVal}>{staffList.length}</Text>
            <Text style={styles.statLbl}>Total Staff</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🟢</Text>
            <Text style={styles.statVal}>{attendance.filter(a => a.status === 'CHECKED_IN').length}</Text>
            <Text style={styles.statLbl}>In Society</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statVal}>{staffList.filter(s => s.policeVerified).length}</Text>
            <Text style={styles.statLbl}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={staffList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); }} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const rcfg = ROLE_CONFIG[item.role] || ROLE_CONFIG.HELPER;
          const todayAtt = attendance.find(a => a.staffId === item.id);
          const isIn = todayAtt?.status === 'CHECKED_IN';

          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: rcfg.color }]} />
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: rcfg.bg, borderColor: rcfg.border }]}>
                  <Text style={styles.avatarEmoji}>{rcfg.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: isIn ? '#ECFDF5' : '#F8FAFC',
                      borderColor: isIn ? '#A7F3D0' : '#E8E8F0',
                    }]}>
                      <Text style={styles.statusDot}>{isIn ? '🟢' : '⚪'}</Text>
                      <Text style={[styles.statusText, { color: isIn ? '#059669' : '#94A3B8' }]}>
                        {isIn ? 'In Society' : 'Out'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roleText}>{rcfg.label} • 🕐 {item.shiftTime}</Text>
                  <Text style={styles.towerText}>🏠 Working: {item.workingTowers}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                {item.policeVerified && (
                  <View style={[styles.chip, { borderColor: '#A7F3D0' }]}>
                    <Text style={styles.chipEmoji}>🛡️</Text>
                    <Text style={[styles.chipText, { color: '#059669' }]}>Police Verified</Text>
                  </View>
                )}
                {item.aadhaarOnFile && (
                  <View style={[styles.chip, { borderColor: '#93C5FD' }]}>
                    <Text style={styles.chipEmoji}>🪪</Text>
                    <Text style={[styles.chipText, { color: '#0284C7' }]}>Aadhaar</Text>
                  </View>
                )}
                <View style={[styles.chip, { borderColor: '#FDE68A' }]}>
                  <Text style={styles.chipEmoji}>⭐</Text>
                  <Text style={[styles.chipText, { color: '#D97706' }]}>{item.rating} ({item.reviewCount})</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gatePassBtn}
                  onPress={() => setGatePassStaff(item)}
                >
                  <Text style={styles.gatePassBtnText}>🪪 Gate Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.salaryBtn}
                  onPress={() => router.push('/home-services/packages')}
                >
                  <Text style={styles.salaryBtnText}>💰 ₹{item.monthlySalary.toLocaleString()}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>No domestic staff registered</Text>
            <Text style={styles.emptySub}>Post a requirement on the job board to find verified help</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/home-services/jobs')}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCtaGrad}
              >
                <Text style={styles.emptyCtaText}>📢 Post Requirement</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <WorkerGatePassModal
        visible={!!gatePassStaff}
        staff={gatePassStaff}
        onClose={() => setGatePassStaff(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  headerSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#C7D2FE', marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 16 },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 16, marginBottom: 2 },
  statVal: { fontSize: 18, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  statLbl: { fontSize: 10, fontFamily: FONTS.medium, color: '#C7D2FE' },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: { fontSize: 8, marginRight: 4 },
  statusText: { fontSize: 10, fontFamily: FONTS.bold },
  roleText: { fontSize: 12, fontFamily: FONTS.medium, color: '#64748B', marginTop: 3 },
  towerText: { fontSize: 11, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: 2 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 12, marginRight: 4 },
  chipText: { fontSize: 10, fontFamily: FONTS.bold },

  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#059669' },
  gatePassBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  gatePassBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#334155' },
  salaryBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  salaryBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#4F46E5' },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0F172A' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  emptyCta: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  emptyCtaGrad: { paddingHorizontal: 24, paddingVertical: 10 },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },
});
