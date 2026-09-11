import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { COLORS } from '@/constants/config';
import { format } from 'date-fns';
import type { AnnouncementDto } from '@/types/api';

// ── Create announcement modal ──────────────────────────────────
function CreateModal({
  visible,
  onClose,
  onSaved,
}: {
  visible:  boolean;
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [urgent,   setUrgent]   = useState(false);
  const [pinned,   setPinned]   = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => adminService.createAnnouncement({
      title:    title.trim(),
      content:  content.trim(),
      priority: urgent ? 'URGENT' : 'NORMAL',
      pinned,
    }),
    onSuccess: () => {
      setTitle(''); setContent(''); setUrgent(false); setPinned(false);
      onSaved();
      onClose();
    },
    onError: () => Alert.alert('Error', 'Failed to create announcement.'),
  });

  const canSave = title.trim().length > 0 && content.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={m.container} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={m.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={m.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={m.title}>New Announcement</Text>
            <TouchableOpacity
              onPress={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={[m.save, !canSave && m.saveDisabled]}>Post</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={m.scroll} keyboardShouldPersistTaps="handled">
            {/* Priority banner */}
            {urgent && (
              <View style={m.urgentBanner}>
                <Text style={m.urgentText}>🚨 This will appear as URGENT to all members</Text>
              </View>
            )}

            <View style={m.field}>
              <Text style={m.label}>Title *</Text>
              <TextInput
                style={m.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Announcement title…"
                placeholderTextColor={COLORS.textMuted}
                maxLength={120}
              />
              <Text style={m.counter}>{title.length}/120</Text>
            </View>

            <View style={m.field}>
              <Text style={m.label}>Message *</Text>
              <TextInput
                style={[m.input, m.textarea]}
                value={content}
                onChangeText={setContent}
                placeholder="Write your announcement…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={m.counter}>{content.length}/1000</Text>
            </View>

            {/* Toggles */}
            <View style={m.toggleCard}>
              <View style={m.toggleRow}>
                <View>
                  <Text style={m.toggleLabel}>🚨 Mark as Urgent</Text>
                  <Text style={m.toggleSub}>Displays with red alert styling</Text>
                </View>
                <Switch
                  value={urgent}
                  onValueChange={setUrgent}
                  trackColor={{ false: COLORS.border, true: COLORS.error }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[m.toggleRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 }]}>
                <View>
                  <Text style={m.toggleLabel}>📌 Pin to Top</Text>
                  <Text style={m.toggleSub}>Always visible at top of feed</Text>
                </View>
                <Switch
                  value={pinned}
                  onValueChange={setPinned}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Push notification note */}
            <View style={m.note}>
              <Text style={m.noteText}>
                📱 A push notification will be sent to all community members.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:       { fontSize: 16, color: COLORS.textMuted },
  title:        { fontSize: 17, fontWeight: '700', color: COLORS.text },
  save:         { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  saveDisabled: { color: COLORS.textMuted },
  scroll:       { padding: 16, gap: 16 },
  urgentBanner: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  urgentText:   { color: '#991B1B', fontWeight: '600', fontSize: 13 },
  field:        { gap: 5 },
  label:        { fontSize: 13, fontWeight: '600', color: COLORS.text },
  input:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  textarea:     { minHeight: 120, paddingTop: 12 },
  counter:      { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  toggleCard:   { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel:  { fontSize: 15, fontWeight: '600', color: COLORS.text },
  toggleSub:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  note:         { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12 },
  noteText:     { color: COLORS.primary, fontSize: 13 },
});

// ── Announcement card ──────────────────────────────────────────
function AnnouncementCard({
  item, onPin, onDelete,
}: { item: AnnouncementDto; onPin: (a: AnnouncementDto) => void; onDelete: (a: AnnouncementDto) => void }) {
  return (
    <View style={[ac.card, item.priority === 'URGENT' && ac.urgent]}>
      <View style={ac.topRow}>
        {item.pinned && <Text style={ac.pin}>📌</Text>}
        {item.priority === 'URGENT' && (
          <View style={ac.urgentBadge}><Text style={ac.urgentText}>URGENT</Text></View>
        )}
        <Text style={ac.date}>{format(new Date(item.createdAt), 'dd MMM · h:mm a')}</Text>
      </View>
      <Text style={ac.title}>{item.title}</Text>
      <Text style={ac.content} numberOfLines={3}>{item.content}</Text>
      <View style={ac.actions}>
        <TouchableOpacity style={ac.actionBtn} onPress={() => onPin(item)}>
          <Text style={ac.actionText}>{item.pinned ? '📌 Unpin' : '📌 Pin'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ac.actionBtn, ac.deleteBtn]} onPress={() => onDelete(item)}>
          <Text style={[ac.actionText, { color: COLORS.error }]}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ac = StyleSheet.create({
  card:         { backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  urgent:       { borderLeftWidth: 4, borderLeftColor: COLORS.error },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pin:          { fontSize: 14 },
  urgentBadge:  { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  urgentText:   { fontSize: 10, fontWeight: '800', color: COLORS.error },
  date:         { fontSize: 12, color: COLORS.textMuted, marginLeft: 'auto' as any },
  title:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  content:      { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn:    { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  deleteBtn:    { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  actionText:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
});

// ── Screen ─────────────────────────────────────────────────────
export default function AnnouncementsScreen() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn:  () => adminService.getAnnouncements(),
  });

  const announcements = data?.content ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-announcements'] });

  const pinMutation    = useMutation({ mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => adminService.pinAnnouncement(id, pinned), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: adminService.deleteAnnouncement, onSuccess: invalidate });

  const handlePin = useCallback((a: AnnouncementDto) => {
    pinMutation.mutate({ id: a.id, pinned: !a.pinned });
  }, [pinMutation]);

  const handleDelete = useCallback((a: AnnouncementDto) => {
    Alert.alert('Delete Announcement', `Delete "${a.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(a.id) },
    ]);
  }, [deleteMutation]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Announcements</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.createText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => (
            <AnnouncementCard item={item} onPin={handlePin} onDelete={handleDelete} />
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📢</Text>
              <Text style={s.emptyText}>No announcements yet.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create First Announcement</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={invalidate}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:         { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:        { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  createBtn:    { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  createText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:   { fontSize: 48 },
  emptyText:    { fontSize: 16, color: COLORS.textMuted },
  emptyBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
