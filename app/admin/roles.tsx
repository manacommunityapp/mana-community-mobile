import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import roleManagementService, { RoleDto } from '@/services/roleManagementService';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#7C3AED', SUPER_ADMIN: '#4F46E5', COMMUNITY_ADMIN: '#6366F1',
  MODERATOR: '#8B5CF6', MEMBER: '#059669', USER: '#6B7280',
  GUARD: '#D97706', SECURITY: '#B45309', VENDOR: '#2563EB',
  SPORTS_ADMIN: '#DC2626', EVENT_ADMIN: '#0891B2', FINANCE_MGMT_ADMIN: '#065F46',
  HELPDESK_ADMIN: '#9333EA', ACCOUNTANT: '#0F766E', READONLY_ADMIN: '#64748B',
};

function roleColor(name: string): string {
  return ROLE_COLORS[name] ?? '#6366F1';
}

function RoleCard({ role, onPress }: { role: RoleDto; onPress: () => void }) {
  const color = roleColor(role.name);
  const initials = role.name.slice(0, 2).toUpperCase();
  const label = role.name.replace(/_/g, ' ');
  return (
    <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[rc.badge, { backgroundColor: color + '20' }]}>
        <Text style={[rc.badgeText, { color }]}>{initials}</Text>
      </View>
      <View style={rc.info}>
        <Text style={rc.name} numberOfLines={1}>{label}</Text>
        <Text style={rc.sub}>{role.userCount ?? 0} members</Text>
      </View>
      <View style={rc.right}>
        {role.communityId != null && (
          <View style={rc.customTag}>
            <Text style={rc.customTagText}>Custom</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function RolesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [createError, setCreateError] = useState('');

  const { data: roles = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: roleManagementService.getRoleDetails,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => roleManagementService.createRole(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setShowCreate(false);
      setNewRoleName('');
      setCreateError('');
    },
    onError: (err: any) => {
      setCreateError(err?.response?.data?.message || 'Failed to create role.');
    },
  });

  const handleCreate = () => {
    const name = newRoleName.trim();
    if (!name) { setCreateError('Role name is required.'); return; }
    if (!/^[A-Za-z0-9_]+$/.test(name)) { setCreateError('Use only letters, numbers and underscores.'); return; }
    setCreateError('');
    createMutation.mutate(name);
  };

  const renderItem = ({ item }: ListRenderItemInfo<RoleDto>) => (
    <RoleCard
      role={item}
      onPress={() => router.push({ pathname: '/admin/assign-role' as any, params: { roleFilter: item.name } })}
    />
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>Roles & Access</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={s.addBtn} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => String(item.id ?? item.name)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.infoBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
              <Text style={s.infoText}>
                Tap a role to view and assign members. Use + to create a custom role.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="lock-open-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No roles found</Text>
            </View>
          }
        />
      )}

      {/* Create Role Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={s.overlay} onPress={() => setShowCreate(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Create Custom Role</Text>
          <Text style={s.sheetSub}>Enter a unique name for the new role (e.g. SECURITY_LEAD)</Text>

          <TextInput
            style={s.input}
            placeholder="ROLE_NAME"
            placeholderTextColor={COLORS.textMuted}
            value={newRoleName}
            onChangeText={t => setNewRoleName(t.toUpperCase())}
            autoCapitalize="characters"
            autoFocus
          />
          {createError ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
              <Text style={s.errorText}>{createError}</Text>
            </View>
          ) : null}

          <View style={s.sheetBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreate(false); setNewRoleName(''); setCreateError(''); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.createBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.createText}>Create Role</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const rc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    marginBottom: 10, ...SHADOWS.sm,
  },
  badge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', textTransform: 'capitalize' },
  sub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customTag: {
    backgroundColor: '#FEF3C7', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  customTagText: { fontSize: 10, color: '#92400E', fontWeight: '700', fontFamily: 'Outfit-Bold' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  addBtn: { padding: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  list: { padding: SPACING.md, paddingBottom: 40 },

  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: '#4338CA', fontFamily: 'DMSans-Regular', lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg, paddingBottom: 36,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginBottom: 16, lineHeight: 18 },

  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, fontFamily: 'DMSans-Regular',
    letterSpacing: 1,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },

  sheetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  createBtn: {
    flex: 2, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center',
    ...SHADOWS.sm,
  },
  createText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
