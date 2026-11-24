import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Switch, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { socialGroupService, type SocialGroup, type GroupType, type CreateGroupRequest } from '@/services/socialGroupService';
import { useTenantContext } from '@/context/TenantContext';

const GROUP_TYPE_META: Record<GroupType, { emoji: string; label: string }> = {
  BOOK_CLUB:    { emoji: '📚', label: 'Book Club' },
  FITNESS:      { emoji: '💪', label: 'Fitness' },
  PARENTS:      { emoji: '👨‍👩‍👧', label: 'Parents' },
  HOBBY:        { emoji: '🎨', label: 'Hobby' },
  PROFESSIONAL: { emoji: '💼', label: 'Professional' },
  INTEREST:     { emoji: '🌟', label: 'Interest' },
  GENERAL:      { emoji: '💬', label: 'General' },
};

const GROUP_TYPES: GroupType[] = ['BOOK_CLUB', 'FITNESS', 'PARENTS', 'HOBBY', 'PROFESSIONAL', 'INTEREST', 'GENERAL'];

function GroupCard({ group, onPress, onJoin }: { group: SocialGroup; onPress: () => void; onJoin: () => void }) {
  const meta = GROUP_TYPE_META[group.groupType] ?? { emoji: '💬', label: group.groupType };
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardEmoji}>
        <Text style={styles.emojiText}>{meta.emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.groupMeta}>{meta.label} · {group.memberCount} members</Text>
        {group.description ? (
          <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.joinBtn, group.isMember && styles.joinBtnMuted]}
        onPress={group.isMember ? onPress : onJoin}
      >
        <Text style={[styles.joinBtnText, group.isMember && styles.joinBtnTextMuted]}>
          {group.isMember ? 'Open' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SocialGroupsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { communityId } = useTenantContext();
  const [tab, setTab] = useState<'my' | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGroupRequest>({
    name: '', groupType: 'GENERAL', description: '', isPrivate: false,
  });

  const { data: allGroups = [], isLoading: loadingAll } = useQuery({
    queryKey: ['social-groups-all', communityId],
    queryFn: () => socialGroupService.getCommunityGroups(communityId ?? 1),
  });

  const { data: myGroups = [], isLoading: loadingMy } = useQuery({
    queryKey: ['social-groups-my'],
    queryFn: socialGroupService.getMyGroups,
  });

  const joinMutation = useMutation({
    mutationFn: (groupId: number) => socialGroupService.join(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-groups-all'] });
      qc.invalidateQueries({ queryKey: ['social-groups-my'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupRequest) =>
      socialGroupService.createGroup(communityId ?? 0, data),
    onSuccess: (newGroup) => {
      qc.invalidateQueries({ queryKey: ['social-groups-all'] });
      qc.invalidateQueries({ queryKey: ['social-groups-my'] });
      setShowCreate(false);
      setCreateForm({ name: '', groupType: 'GENERAL', description: '', isPrivate: false });
      router.push(`/social/${newGroup.id}` as any);
    },
  });

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const rawGroups = tab === 'my' ? myGroups : allGroups;
  const groups = rawGroups.map(g => ({
    ...g,
    isMember: Boolean(g.isMember || tab === 'my' || myGroupIds.has(g.id)),
  }));
  const isLoading = tab === 'my' ? loadingMy : loadingAll;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Social Circles</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.fabInline}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['all', 'my'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'all' ? 'All Groups' : 'My Groups'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => String(g.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => router.push(`/social/${item.id}` as any)}
              onJoin={() => joinMutation.mutate(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {tab === 'my' ? 'You haven\'t joined any groups yet.' : 'No groups in this community.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLabel}>Group Name *</Text>
            <TextInput
              style={styles.input}
              value={createForm.name}
              onChangeText={v => setCreateForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Tower A Book Club"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {GROUP_TYPES.map(t => {
                const m = GROUP_TYPE_META[t];
                const sel = createForm.groupType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, sel && styles.typeChipActive]}
                    onPress={() => setCreateForm(f => ({ ...f, groupType: t }))}
                  >
                    <Text style={styles.typeChipEmoji}>{m.emoji}</Text>
                    <Text style={[styles.typeChipLabel, sel && styles.typeChipLabelActive]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={createForm.description}
              onChangeText={v => setCreateForm(f => ({ ...f, description: v }))}
              placeholder="What is this group about?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Private Group</Text>
              <Switch
                value={createForm.isPrivate}
                onValueChange={v => setCreateForm(f => ({ ...f, isPrivate: v }))}
                trackColor={{ true: COLORS.primary }}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, (!createForm.name.trim() || createMutation.isPending) && styles.createBtnDisabled]}
              onPress={() => createMutation.mutate(createForm)}
              disabled={!createForm.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text },
  fabInline: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.backgroundAlt, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10, ...SHADOWS.sm,
  },
  cardEmoji: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  emojiText: { fontSize: 22 },
  cardBody: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  groupMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  groupDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  joinBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, marginLeft: 10,
  },
  joinBtnMuted: { backgroundColor: COLORS.backgroundAlt },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  joinBtnTextMuted: { color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderSlate,
    backgroundColor: COLORS.surface, marginRight: 8,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeChipEmoji: { fontSize: 16, marginRight: 6 },
  typeChipLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  typeChipLabelActive: { color: COLORS.primary, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 28,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
