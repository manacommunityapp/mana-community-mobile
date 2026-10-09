import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

const ROLE_ICONS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  MAID: { label: 'Maid', icon: 'sparkles', color: '#DB2777', bg: '#FCE7F3' },
  COOK: { label: 'Cook', icon: 'restaurant', color: '#EA580C', bg: '#FFF7ED' },
  DRIVER: { label: 'Driver', icon: 'car', color: '#2563EB', bg: '#DBEAFE' },
  NANNY: { label: 'Nanny', icon: 'heart', color: '#E11D48', bg: '#FFE4E6' },
  GARDENER: { label: 'Gardener', icon: 'leaf', color: '#059669', bg: '#DCFCE7' },
  HELPER: { label: 'Helper', icon: 'hand-left', color: '#7C3AED', bg: '#EDE9FE' },
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>My Domestic Staff</Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/home-services/jobs')}
        >
          <Ionicons name="person-add" size={16} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={staffList}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const rcfg = ROLE_ICONS[item.role] || ROLE_ICONS.HELPER;
          const todayAtt = attendance.find(a => a.staffId === item.id);

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: rcfg.bg }]}>
                  <Ionicons name={rcfg.icon} size={22} color={rcfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: todayAtt?.status === 'CHECKED_IN' ? '#DCFCE7' : '#F1F5F9' }]}>
                      <Text style={[styles.statusText, { color: todayAtt?.status === 'CHECKED_IN' ? '#059669' : '#64748B' }]}>
                        {todayAtt?.status === 'CHECKED_IN' ? 'In Society' : 'Out'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roleText}>{rcfg.label} • {item.shiftTime}</Text>
                  <Text style={styles.towerText}>Working: {item.workingTowers}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                {item.policeVerified && (
                  <View style={styles.chip}>
                    <Ionicons name="shield-checkmark" size={12} color="#059669" />
                    <Text style={styles.chipText}>Police Verified</Text>
                  </View>
                )}
                {item.aadhaarOnFile && (
                  <View style={styles.chip}>
                    <Ionicons name="card" size={12} color="#0284C7" />
                    <Text style={styles.chipText}>Aadhaar Verified</Text>
                  </View>
                )}
                <View style={styles.chip}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.chipText}>{item.rating} ({item.reviewCount})</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call" size={14} color="#059669" />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.salaryBtn}
                  onPress={() => router.push('/home-services/packages')}
                >
                  <Ionicons name="wallet-outline" size={14} color="#4F46E5" />
                  <Text style={styles.salaryBtnText}>₹{item.monthlySalary.toLocaleString()}/mo</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No domestic staff registered</Text>
            <Text style={styles.emptySub}>Post a requirement on the job board to find verified help</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  roleText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  towerText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 10, color: '#334155', fontWeight: '600', marginLeft: 4 },
  cardActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', paddingVertical: 9, borderRadius: 10, marginRight: 8 },
  callBtnText: { color: '#059669', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  salaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', paddingVertical: 9, borderRadius: 10 },
  salaryBtnText: { color: '#4F46E5', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
});
