import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService, type HomeServiceBookingDto } from '@/services/homeServicesService';

export default function ProviderDeckScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [selectedJob, setSelectedJob] = useState<HomeServiceBookingDto | null>(null);
  const [pin, setPin] = useState('');
  const [beforePhoto, setBeforePhoto] = useState('https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=500');
  const [afterPhoto, setAfterPhoto] = useState('https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500');

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['provider-deck-bookings'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, otp, beforePhotoUrl, afterPhotoUrl }: { id: string; otp: string; beforePhotoUrl: string; afterPhotoUrl: string }) =>
      homeServicesService.completeJobWithProof(id, { otp, beforePhotoUrl, afterPhotoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-deck-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-home-service-bookings'] });
      setSelectedJob(null);
      setPin('');
      Alert.alert('Job Completed!', 'Service visit successfully marked with proof and photo timestamp.');
    },
    onError: (err: any) => Alert.alert('Verification Failed', err?.message || 'Invalid Resident PIN'),
  });

  const pendingJobs = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS');
  const completedJobs = bookings.filter((b) => b.status === 'COMPLETED');
  const displayList = activeTab === 'PENDING' ? pendingJobs : completedJobs;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>🛠️ Provider Job Deck</Text>
            <Text style={styles.sub}>Field execution & proof uploads</Text>
          </View>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineDot}>🟢</Text>
            <Text style={styles.onlineText}>On Duty</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'PENDING' && styles.tabItemActive]}
            onPress={() => setActiveTab('PENDING')}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
              📋 Pending ({pendingJobs.length})
            </Text>
            {activeTab === 'PENDING' && <View style={styles.tabDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'COMPLETED' && styles.tabItemActive]}
            onPress={() => setActiveTab('COMPLETED')}
          >
            <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
              ✅ Done ({completedJobs.length})
            </Text>
            {activeTab === 'COMPLETED' && <View style={styles.tabDot} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={displayList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => {
          const isDone = item.status === 'COMPLETED';

          return (
            <View style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: isDone ? '#10B981' : '#D97706' }]} />
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobCategory}>🏷️ {item.category}</Text>
                  <Text style={styles.jobFlat}>🏠 Flat #{item.id.replace(/\D/g, '') || 'A-204'} • Tower B</Text>
                </View>
                <View style={[styles.badge, isDone ? styles.badgeDone : styles.badgePending]}>
                  <Text style={styles.badgeEmoji}>{isDone ? '✅' : '⏳'}</Text>
                  <Text style={[styles.badgeText, isDone ? styles.badgeTextDone : styles.badgeTextPending]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.timeChip}>
                <Text style={styles.timeText}>🕐 {item.timeSlot} • 📅 {item.date}</Text>
              </View>

              <Text style={styles.issueText}>
                📝 {item.issue || 'Doorstep scheduled service'}
              </Text>

              {item.beforePhotoUrl && (
                <View style={styles.photoProofRow}>
                  <Text style={styles.photoProofText}>📸 Proof photos uploaded</Text>
                </View>
              )}

              {!isDone ? (
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => {
                    setSelectedJob(item);
                    setPin(item.completionOtp || '');
                  }}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.verifyGrad}
                  >
                    <Text style={styles.verifyBtnText}>🔑 Verify PIN & Submit Proof</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedFoot}>
                  <Text style={styles.completedFootText}>✅ Service verified & closed</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>{activeTab === 'PENDING' ? '📋' : '✅'}</Text>
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} jobs</Text>
            <Text style={styles.emptySub}>All scheduled tasks for this shift are caught up</Text>
          </View>
        }
      />

      {selectedJob && (
        <Modal visible={!!selectedJob} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalAccent} />
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>🔐 Complete Job #{selectedJob.id.slice(0, 6)}</Text>
                  <Text style={styles.modalSub}>🏷️ {selectedJob.category} • 🏠 Flat A-204</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedJob(null)}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>🔑 Enter Resident's 4-Digit Start PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="0000"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.fieldLabel}>📸 Service Verification Photos</Text>
                <View style={styles.photoBoxRow}>
                  <View style={styles.photoBox}>
                    <Text style={styles.photoBoxEmoji}>📷</Text>
                    <Text style={styles.photoBoxText}>Before Photo</Text>
                    <View style={styles.photoBoxStatus}>
                      <Text style={styles.photoBoxStatusText}>✅ Attached</Text>
                    </View>
                  </View>
                  <View style={styles.photoBox}>
                    <Text style={styles.photoBoxEmoji}>✨</Text>
                    <Text style={styles.photoBoxText}>After Photo</Text>
                    <View style={styles.photoBoxStatus}>
                      <Text style={styles.photoBoxStatusText}>✅ Attached</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.finishBtn, completeMutation.isPending && { opacity: 0.6 }]}
                  onPress={() => {
                    if (selectedJob) {
                      completeMutation.mutate({
                        id: selectedJob.id,
                        otp: pin,
                        beforePhotoUrl: beforePhoto,
                        afterPhotoUrl: afterPhoto,
                      });
                    }
                  }}
                  disabled={completeMutation.isPending}
                >
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.finishGrad}
                  >
                    <Text style={styles.finishBtnText}>✅ Confirm Visit & Sign-off</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 18, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  sub: { fontSize: 11, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  onlineDot: { fontSize: 8, marginRight: 4 },
  onlineText: { fontSize: 10, fontFamily: FONTS.bold, color: '#34D399' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 12, fontFamily: FONTS.semiBold, color: '#94A3B8' },
  tabTextActive: { color: '#0F172A', fontFamily: FONTS.bold },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginTop: 4,
  },

  list: { padding: 16, paddingBottom: 32 },

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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobCategory: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  jobFlat: { fontSize: 12, fontFamily: FONTS.semiBold, color: '#4F46E5', marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePending: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  badgeDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeEmoji: { fontSize: 11, marginRight: 4 },
  badgeText: { fontSize: 10, fontFamily: FONTS.bold },
  badgeTextPending: { color: '#D97706' },
  badgeTextDone: { color: '#059669' },

  timeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
  },
  timeText: { fontSize: 12, fontFamily: FONTS.medium, color: '#64748B' },
  issueText: { fontSize: 12, fontFamily: FONTS.regular, color: '#334155', lineHeight: 18, marginTop: 8 },
  photoProofRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  photoProofText: { fontSize: 11, fontFamily: FONTS.bold, color: '#059669' },

  verifyBtn: { marginTop: 12, borderRadius: 14, overflow: 'hidden' },
  verifyGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 11 },
  verifyBtnText: { color: '#FFFFFF', fontSize: 12, fontFamily: FONTS.bold },

  completedFoot: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  completedFootText: { fontSize: 12, fontFamily: FONTS.bold, color: '#059669' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#334155' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#059669',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 4,
  },
  modalTitle: { fontSize: 16, fontFamily: FONTS.displayEB, color: '#0F172A' },
  modalSub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 12, fontFamily: FONTS.bold, color: '#334155', marginBottom: 8, marginTop: 6 },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 16,
    fontSize: 24,
    fontFamily: FONTS.displayEB,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#4F46E5',
    paddingVertical: 12,
    marginBottom: 14,
  },
  photoBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  photoBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  photoBoxEmoji: { fontSize: 24, marginBottom: 6 },
  photoBoxText: { fontSize: 11, fontFamily: FONTS.bold, color: '#475569', textAlign: 'center' },
  photoBoxStatus: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
  },
  photoBoxStatusText: { fontSize: 10, fontFamily: FONTS.bold, color: '#059669' },
  finishBtn: { borderRadius: 16, overflow: 'hidden' },
  finishGrad: { paddingVertical: 14, alignItems: 'center' },
  finishBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.bold },
});
