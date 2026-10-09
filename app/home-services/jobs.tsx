import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, TextInput,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS } from '@/constants/config';
import { homeServicesService, StaffRole } from '@/services/homeServicesService';

const ROLES: { role: StaffRole; label: string }[] = [
  { role: 'MAID', label: 'Maid / Housekeeping' },
  { role: 'COOK', label: 'Cook / Chef' },
  { role: 'DRIVER', label: 'Driver' },
  { role: 'NANNY', label: 'Babysitter / Nanny' },
  { role: 'GARDENER', label: 'Gardener' },
  { role: 'HELPER', label: 'General Helper' },
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Community Help Board</Text>
        <TouchableOpacity style={styles.postBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobPosts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{item.title}</Text>
                <Text style={styles.postedBy}>Posted by {item.postedBy} • {item.postedAt}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.role}</Text>
              </View>
            </View>

            <Text style={styles.desc}>{item.description}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={13} color="#059669" />
                <Text style={styles.metaSalary}>{item.salaryRange}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.metaShift}>{item.shiftPreference}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.applicantText}>👥 {item.applicantCount} interested helpers</Text>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => Alert.alert('Recommend Staff', 'Do you want to recommend your helper for this post?', [
                  { text: 'Cancel' },
                  { text: 'Recommend Helper', onPress: () => Alert.alert('Sent', 'Recommendation shared with resident!') }
                ])}
              >
                <Text style={styles.applyBtnText}>Recommend</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No active job posts</Text>
            <Text style={styles.emptySub}>Post a requirement if you need a cook, maid, or driver</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Help Requirement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Role Needed</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.role}
                  style={[styles.roleChip, role === r.role && styles.roleChipActive]}
                  onPress={() => setRole(r.role)}
                >
                  <Text style={[styles.roleChipText, role === r.role && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Headline</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Need morning cook for South Indian breakfast"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Salary Budget</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹4,000 - ₹5,000/mo"
              placeholderTextColor="#94A3B8"
              value={salary}
              onChangeText={setSalary}
            />

            <Text style={styles.label}>Requirements & Timings</Text>
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
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Publish to Community</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  postBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  postedBy: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  desc: { fontSize: 13, color: '#334155', marginVertical: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  metaSalary: { fontSize: 11, fontWeight: '700', color: '#059669', marginLeft: 4 },
  metaShift: { fontSize: 11, color: '#64748B', marginLeft: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  applicantText: { fontSize: 12, color: '#64748B' },
  applyBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  applyBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  roleChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  roleChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  roleChipText: { fontSize: 11, color: '#64748B' },
  roleChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A', marginBottom: 12 },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#0F172A', textAlignVertical: 'top', height: 70, marginBottom: 16 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
