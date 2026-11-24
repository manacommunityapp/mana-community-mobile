import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, TextInput, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  familyService,
  FamilyMember,
  FamilyMemberType,
  AddFamilyMemberRequest,
} from '@/services/familyService';

const RELATION_META: Record<FamilyMemberType, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  SPOUSE:  { label: 'Spouse',  color: '#DB2777', bg: '#FCE7F3', icon: 'heart-outline' },
  CHILD:   { label: 'Child',   color: '#D97706', bg: '#FEF3C7', icon: 'happy-outline' },
  PARENT:  { label: 'Parent',  color: '#7C3AED', bg: '#F5F3FF', icon: 'people-outline' },
  SIBLING: { label: 'Sibling', color: '#2563EB', bg: '#DBEAFE', icon: 'person-outline' },
  OTHER:   { label: 'Other',   color: '#6B7280', bg: '#F3F4F6', icon: 'person-outline' },
};

const BLANK: AddFamilyMemberRequest = {
  name: '', relation: 'SPOUSE', phone: '', isEmergencyContact: false, isMinor: false,
};

export default function FamilyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddFamilyMemberRequest>({ ...BLANK });
  const [confirmRemove, setConfirmRemove] = useState<FamilyMember | null>(null);
  const [formErr, setFormErr] = useState('');
  const [mutErr, setMutErr] = useState('');

  const { data: raw, isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family', 'members'],
    queryFn: () => familyService.getMyFamily(),
    staleTime: 30_000,
  });
  const members = raw ?? [];

  const addMutation = useMutation({
    mutationFn: (data: AddFamilyMemberRequest) => familyService.addFamilyMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
      setShowModal(false);
      setForm({ ...BLANK });
      setFormErr('');
    },
    onError: (err: any) => setFormErr(err.message || 'Failed to add family member.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => familyService.removeFamilyMember(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['family'] }); setConfirmRemove(null); },
    onError: (err: any) => { setMutErr(err.message || 'Failed to remove member.'); setConfirmRemove(null); },
  });

  const handleLongPress = (item: FamilyMember) => setConfirmRemove(item);

  const handleAdd = () => {
    if (!form.name.trim()) { setFormErr('Please enter a name.'); return; }
    setFormErr('');
    addMutation.mutate(form);
  };

  const renderItem = ({ item }: { item: FamilyMember }) => {
    const meta = RELATION_META[item.relation];
    return (
      <TouchableOpacity
        style={s.card}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.85}
      >
        <View style={[s.avatar, { backgroundColor: meta.bg }]}>
          <Text style={[s.avatarText, { color: meta.color }]}>{item.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <View style={s.nameRow}>
            <Text style={s.memberName}>{item.name}</Text>
            {item.isEmergencyContact && (
              <Ionicons name="star" size={13} color="#D97706" style={{ marginLeft: 5 }} />
            )}
          </View>
          <View style={s.metaRow}>
            <View style={[s.relationBadge, { backgroundColor: meta.bg }]}>
              <Text style={[s.relationText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.isMinor && (
              <View style={s.minorBadge}>
                <Text style={s.minorText}>Minor</Text>
              </View>
            )}
          </View>
          {item.phone && (
            <Text style={s.phone}>{item.phone}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Family Members</Text>
          <Text style={s.headerSub}>Security knows who can enter your home</Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={s.addBtn} hitSlop={8}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
        <Text style={s.infoText}>Guards use this list to verify family members at the gate</Text>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No family members added</Text>
              <Text style={s.emptySub}>Add family members so security knows who can enter your home</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                <Text style={s.emptyBtnText}>Add Family Member</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Mutation error banner */}
      {!!mutErr && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMutErr('')}>
            <View style={s.errBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={s.errBannerText}>{mutErr}</Text>
              <TouchableOpacity onPress={() => setMutErr('')} hitSlop={8}>
                <Ionicons name="close" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Remove confirm */}
      <Modal visible={!!confirmRemove} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setConfirmRemove(null)}>
          <View style={s.confirmSheet}>
            <Text style={s.confirmTitle}>Remove Member</Text>
            <Text style={s.confirmMsg}>Remove {confirmRemove?.name} from your family list?</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirmRemove(null)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmOkRed}
                onPress={() => confirmRemove && removeMutation.mutate(confirmRemove.id)}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmOkText}>Remove</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm({ ...BLANK }); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {!!formErr && (
              <View style={s.inlineErr}>
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text style={s.inlineErrText}>{formErr}</Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Name *</Text>
              <TextInput
                style={s.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={s.label}>Relation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(Object.keys(RELATION_META) as FamilyMemberType[]).map(rel => {
                    const m = RELATION_META[rel];
                    const active = form.relation === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        style={[s.relChip, active && { backgroundColor: m.color, borderColor: m.color }]}
                        onPress={() => setForm(f => ({ ...f, relation: rel }))}
                      >
                        <Text style={[s.relChipText, active && { color: '#fff' }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={s.label}>Phone (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              />

              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Emergency Contact</Text>
                  <Text style={s.toggleSub}>Notify this person in emergencies</Text>
                </View>
                <Switch
                  value={form.isEmergencyContact}
                  onValueChange={v => setForm(f => ({ ...f, isEmergencyContact: v }))}
                  trackColor={{ true: '#7C3AED' }}
                />
              </View>

              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Minor (under 18)</Text>
                  <Text style={s.toggleSub}>Child or dependent</Text>
                </View>
                <Switch
                  value={form.isMinor}
                  onValueChange={v => setForm(f => ({ ...f, isMinor: v }))}
                  trackColor={{ true: '#7C3AED' }}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.submitBtn, addMutation.isPending && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Add Member</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 12, color: '#1E40AF', fontFamily: 'DMSans-Regular' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.sm,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Outfit-Bold', fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  relationBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  relationText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  minorBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  minorText: { fontSize: 11, color: '#6B7280', fontFamily: 'DMSans-Regular' },
  phone: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, fontFamily: 'DMSans-Regular' },

  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32, fontFamily: 'DMSans-Regular', lineHeight: 19 },
  emptyBtn: { marginTop: SPACING.md, backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 11, borderRadius: RADIUS.md, ...SHADOWS.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '85%' },
  confirmSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, gap: SPACING.md },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  confirmMsg: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  confirmBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  confirmOkRed: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#DC2626' },
  confirmOkText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: 'auto' as any },
  errBannerText: { flex: 1, fontSize: 13, color: '#DC2626', fontFamily: 'DMSans-Regular' },
  inlineErr: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  inlineErrText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular', lineHeight: 17 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  relChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  relChipText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  toggleSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  submitBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.sm },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
