import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrmService } from '@/services/hrmService';
import type { Recognition } from '@/types/hrm';

const TYPE_COLORS: Record<Recognition['recognitionType'], { bg: string; text: string }> = {
  KUDOS: { bg: '#dbeafe', text: '#1d4ed8' },
  AWARD: { bg: '#fef3c7', text: '#92400e' },
  MILESTONE: { bg: '#ede9fe', text: '#6d28d9' },
};

function RecognitionCard({ item }: { item: Recognition }) {
  const colors = TYPE_COLORS[item.recognitionType];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.giverEmployee.firstName[0]}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardNames}>
            <Text style={styles.boldName}>{item.giverEmployee.firstName} {item.giverEmployee.lastName}</Text>
            <Text style={styles.mutedText}> recognized </Text>
            <Text style={styles.boldName}>{item.receiverEmployee.firstName} {item.receiverEmployee.lastName}</Text>
          </Text>
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.typeBadgeText, { color: colors.text }]}>{item.recognitionType}</Text>
        </View>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      {item.category && <Text style={styles.category}>#{item.category}</Text>}
      {item.points > 0 && <Text style={styles.points}>+{item.points} pts</Text>}
    </View>
  );
}

export default function RecognitionScreen() {
  const { data: orgs } = useQuery({ queryKey: ['hrm-my-orgs'], queryFn: hrmService.getMyOrganizations });
  const orgId = orgs?.[0]?.id;
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    receiverEmployeeId: '',
    recognitionType: 'KUDOS' as Recognition['recognitionType'],
    message: '',
    points: '10',
    category: '',
    isPublic: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['hrm-recognitions', orgId],
    queryFn: () => hrmService.getPublicRecognitions(orgId!),
    enabled: !!orgId,
  });

  const give = useMutation({
    mutationFn: () =>
      hrmService.giveRecognition(orgId!, {
        receiverEmployeeId: Number(form.receiverEmployeeId),
        recognitionType: form.recognitionType,
        message: form.message,
        points: Number(form.points),
        isPublic: form.isPublic,
        category: form.category || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrm-recognitions', orgId] });
      setShowModal(false);
      setForm({ receiverEmployeeId: '', recognitionType: 'KUDOS', message: '', points: '10', category: '', isPublic: true });
      Alert.alert('Done!', 'Recognition sent successfully.');
    },
    onError: () => Alert.alert('Error', 'Failed to send recognition. Please try again.'),
  });

  if (!orgId) return <ActivityIndicator style={{ flex: 1 }} />;

  const recognitions = data?.content ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recognition Wall</Text>
        <TouchableOpacity style={styles.giveBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.giveBtnText}>+ Give</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {recognitions.map((r: Recognition) => (
            <RecognitionCard key={r.id} item={r} />
          ))}
          {recognitions.length === 0 && (
            <Text style={styles.empty}>No recognitions yet. Be the first to appreciate a colleague!</Text>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Give Recognition</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.label}>Employee ID to Recognize *</Text>
            <TextInput style={styles.input} value={form.receiverEmployeeId} onChangeText={v => setForm(f => ({ ...f, receiverEmployeeId: v }))} keyboardType="numeric" placeholder="Enter employee ID" />

            <Text style={styles.label}>Recognition Type</Text>
            <View style={styles.typeRow}>
              {(['KUDOS', 'AWARD', 'MILESTONE'] as Recognition['recognitionType'][]).map(t => (
                <TouchableOpacity key={t}
                  style={[styles.typeBtn, form.recognitionType === t && { backgroundColor: TYPE_COLORS[t].bg, borderColor: TYPE_COLORS[t].text }]}
                  onPress={() => setForm(f => ({ ...f, recognitionType: t }))}>
                  <Text style={[styles.typeBtnText, form.recognitionType === t && { color: TYPE_COLORS[t].text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Message *</Text>
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={form.message} onChangeText={v => setForm(f => ({ ...f, message: v }))}
              multiline placeholder="What did they do that was great?" />

            <Text style={styles.label}>Category (optional)</Text>
            <TextInput style={styles.input} value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} placeholder="e.g. teamwork, innovation" />

            <Text style={styles.label}>Points</Text>
            <TextInput style={styles.input} value={form.points} onChangeText={v => setForm(f => ({ ...f, points: v }))} keyboardType="numeric" />

            <TouchableOpacity
              style={[styles.publicToggle, form.isPublic && styles.publicToggleActive]}
              onPress={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}>
              <Text style={form.isPublic ? styles.publicToggleActiveText : styles.publicToggleText}>
                {form.isPublic ? '✓ Public — visible on recognition wall' : 'Private — only visible to recipient'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn}
              disabled={!form.message || !form.receiverEmployeeId || give.isPending}
              onPress={() => give.mutate()}>
              <Text style={styles.submitBtnText}>{give.isPending ? 'Sending…' : 'Send Recognition'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  giveBtn: { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  giveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardMeta: { flex: 1 },
  cardNames: { fontSize: 13, lineHeight: 18 },
  boldName: { fontWeight: '600', color: '#111827' },
  mutedText: { color: '#6b7280' },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  message: { fontSize: 14, color: '#374151', lineHeight: 20 },
  category: { fontSize: 12, color: '#6366f1', marginTop: 6 },
  points: { fontSize: 12, color: '#059669', marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 },
  modal: { flex: 1, backgroundColor: '#f8f9fa' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#6b7280', paddingHorizontal: 8 },
  modalBody: { padding: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  publicToggle: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  publicToggleActive: { borderColor: '#6366f1', backgroundColor: '#ede9fe' },
  publicToggleText: { fontSize: 13, color: '#6b7280' },
  publicToggleActiveText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  submitBtn: { marginTop: 20, backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
