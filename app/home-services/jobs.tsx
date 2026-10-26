import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, TextInput,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService, StaffRole } from '@/services/homeServicesService';

const ROLES: { role: StaffRole; label: string; emoji: string }[] = [
  { role: 'MAID',     label: 'Maid / Housekeeping', emoji: '✨' },
  { role: 'COOK',     label: 'Cook / Chef',         emoji: '👩‍🍳' },
  { role: 'DRIVER',   label: 'Driver',              emoji: '🚗' },
  { role: 'NANNY',    label: 'Babysitter / Nanny',  emoji: '👶' },
  { role: 'GARDENER', label: 'Gardener',            emoji: '🌿' },
  { role: 'HELPER',   label: 'General Helper',      emoji: '🤝' },
];

export default function JobsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<StaffRole>('MAID');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('Morning (7 AM - 11 AM)');

  const { data: jobPosts = [], isLoading, refetch } = useQuery({
    queryKey: ['staff-job-posts-screen'],
    queryFn: () => homeServicesService.getJobPosts(),
  });

  const createMutation = useMutation({
    mutationFn: () => homeServicesService.createJobPost({
      title: title.trim(),
      role,
      description: description.trim(),
      salaryRange: salary.trim() || 'Negotiable',
      shiftPreference: shift,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-job-posts-screen'] });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setSalary('');
      Alert.alert('Posted!', 'Your requirement is now visible to community staff.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not post job requirement.'),
  });

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
            <Text style={styles.headerTitle}>📢 Community Help Board</Text>
            <Text style={styles.headerSub}>Post requirements & find helpers</Text>
          </View>
          <TouchableOpacity style={styles.postBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.postBtnText}>➕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={styles.statVal}>{jobPosts.length}</Text>
            <Text style={styles.statLbl}>Active Posts</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statVal}>{jobPosts.reduce((s, j) => s + (j.applicantCount || 0), 0)}</Text>
            <Text style={styles.statLbl}>Interested</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        style={{ flex: 1 }}
        data={jobPosts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const roleCfg = ROLES.find(r => r.role === item.role);
          return (
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.postedBy}>👤 {item.postedBy} • 🕐 {item.postedAt}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeEmoji}>{roleCfg?.emoji || '👤'}</Text>
                  <Text style={styles.badgeText}>{item.role}</Text>
                </View>
              </View>

              <Text style={styles.desc}>{item.description}</Text>

              <View style={styles.metaRow}>
                <View style={[styles.metaChip, { borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.metaChipText, { color: '#059669' }]}>💰 {item.salaryRange}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>🕐 {item.shiftPreference}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.applicantChip}>
                  <Text style={styles.applicantText}>👥 {item.applicantCount} interested</Text>
                </View>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => Alert.alert('Recommend Staff', 'Do you want to recommend your helper for this post?', [
                    { text: 'Cancel' },
                    { text: 'Recommend Helper', onPress: () => Alert.alert('Sent', 'Recommendation shared with resident!') }
                  ])}
                >
                  <Text style={styles.applyBtnText}>🤝 Recommend</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyEmoji}>📢</Text>
            </View>
            <Text style={styles.emptyTitle}>No active job posts</Text>
            <Text style={styles.emptySub}>Post a requirement if you need a cook, maid, or driver</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCtaGrad}
              >
                <Text style={styles.emptyCtaText}>➕ Post Requirement</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccent} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Post Help Requirement</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>👤 Role Needed</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.role}
                  style={[styles.roleChip, role === r.role && styles.roleChipActive]}
                  onPress={() => setRole(r.role)}
                >
                  <Text style={styles.roleChipEmoji}>{r.emoji}</Text>
                  <Text style={[styles.roleChipText, role === r.role && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>✏️ Headline</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Need morning cook for South Indian breakfast"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>💰 Salary Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹4,000 - ₹5,000/mo"
              placeholderTextColor="#94A3B8"
              value={salary}
              onChangeText={setSalary}
            />

            <Text style={styles.label}>📝 Requirements & Timings</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. 2 hours daily, hygiene conscious, vegetarian prep..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                if (!title.trim() || !description.trim()) {
                  Alert.alert('Incomplete', 'Please fill in all details.');
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGrad}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>📢 Publish to Community</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  postBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtnText: { fontSize: 16 },

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
    backgroundColor: '#7C3AED',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  postedBy: { fontSize: 11, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  badgeEmoji: { fontSize: 12, marginRight: 4 },
  badgeText: { fontSize: 10, fontFamily: FONTS.bold, color: '#7C3AED' },
  desc: { fontSize: 13, fontFamily: FONTS.regular, color: '#334155', marginVertical: 10, lineHeight: 19 },

  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  metaChipText: { fontSize: 11, fontFamily: FONTS.semiBold, color: '#64748B' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applicantChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  applicantText: { fontSize: 12, fontFamily: FONTS.medium, color: '#64748B' },
  applyBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  applyBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#4F46E5' },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0F172A' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 4, textAlign: 'center' },
  emptyCta: { marginTop: 16, borderRadius: 12, overflow: 'hidden' },
  emptyCtaGrad: { paddingHorizontal: 24, paddingVertical: 10 },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#7C3AED',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  modalTitle: { fontSize: 17, fontFamily: FONTS.displayEB, color: '#0F172A' },
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
  label: { fontSize: 12, fontFamily: FONTS.bold, color: '#334155', marginBottom: 8 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 6 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  roleChipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  roleChipEmoji: { fontSize: 14, marginRight: 6 },
  roleChipText: { fontSize: 11, fontFamily: FONTS.medium, color: '#64748B' },
  roleChipTextActive: { color: '#7C3AED', fontFamily: FONTS.bold },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#0F172A',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 75,
    marginBottom: 16,
  },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.bold },
});
