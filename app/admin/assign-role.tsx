import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Pressable,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING, getInitials } from '@/constants/config';
import { THEME } from '@/constants/theme';
import roleManagementService, { UserRoleSummary } from '@/services/roleManagementService';
import { adminService } from '@/services/adminService';
import type { AdminMemberDto } from '@/types/api';

// Mode: either list members of a role, or assign roles to a specific user
// params: roleFilter (show users of that role), OR userId + userName (assign roles to specific user)

export default function AssignRoleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { roleFilter, userId: userIdParam, userName } = useLocalSearchParams<{
    roleFilter?: string;
    userId?: string;
    userName?: string;
  }>();

  const userId = userIdParam ? Number(userIdParam) : null;
  const isAssignMode = userId != null;

  // ── Assign roles to a specific user ────────────────────────────
  const { data: allRoles = [] } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: roleManagementService.getRoles,
    staleTime: 60_000,
  });

  const { data: currentRoles = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ['admin', 'user-roles', userId],
    queryFn: () => roleManagementService.getUserRoles(userId!),
    enabled: isAssignMode,
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolesInitialised, setRolesInitialised] = useState(false);

  useEffect(() => {
    if (!rolesInitialised && currentRoles.length > 0) {
      setSelectedRoles(currentRoles.map(r => r.name));
      setRolesInitialised(true);
    }
  }, [currentRoles, rolesInitialised]);

  const assignMutation = useMutation({
    mutationFn: () => roleManagementService.assignRoles(userId!, selectedRoles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      router.back();
    },
    onError: () => {
      setAssignError('Failed to update roles. Please try again.');
    },
  });

  const [assignError, setAssignError] = useState('');

  const toggleRole = (name: string) => {
    if (name === 'USER') return; // USER is always retained by backend
    setSelectedRoles(prev =>
      prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]
    );
  };

  // ── List users of a specific role ──────────────────────────────
  const { data: roleUsers = [], isLoading: loadingRoleUsers } = useQuery({
    queryKey: ['admin', 'role-users', roleFilter],
    queryFn: () => roleManagementService.getUsersByRole(roleFilter!),
    enabled: !isAssignMode && !!roleFilter,
    staleTime: 30_000,
  });

  // ── Render ──────────────────────────────────────────────────────

  if (isAssignMode) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>Assign Roles</Text>
          <TouchableOpacity
            style={[s.saveBtn, assignMutation.isPending && { opacity: 0.6 }]}
            onPress={() => { setAssignError(''); assignMutation.mutate(); }}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {loadingCurrent ? (
          <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
        ) : (
          <FlatList
            data={allRoles.filter(r => r.name !== 'USER')}
            keyExtractor={item => String(item.id ?? item.name)}
            contentContainerStyle={s.list}
            ListHeaderComponent={
              <>
                <View style={s.userCard}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{getInitials(userName || 'U')}</Text>
                  </View>
                  <View>
                    <Text style={s.userName}>{userName || `User #${userId}`}</Text>
                    <Text style={s.userSub}>{selectedRoles.length} role(s) assigned</Text>
                  </View>
                </View>
                {assignError ? (
                  <View style={s.errorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
                    <Text style={s.errorText}>{assignError}</Text>
                  </View>
                ) : null}
                <Text style={s.sectionLabel}>SELECT ROLES</Text>
              </>
            }
            renderItem={({ item }) => {
              const active = selectedRoles.includes(item.name);
              const label = item.name.replace(/_/g, ' ');
              return (
                <TouchableOpacity
                  style={[s.roleRow, active && s.roleRowActive]}
                  onPress={() => toggleRole(item.name)}
                  activeOpacity={0.85}
                >
                  <View style={[s.roleCheck, active && s.roleCheckActive]}>
                    {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[s.roleLabel, active && { color: COLORS.primary }]}>{label}</Text>
                  {item.userCount != null && (
                    <Text style={s.roleCount}>{item.userCount} members</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Role-member list view ───────────────────────────────────────
  const title = roleFilter ? roleFilter.replace(/_/g, ' ') : 'Role Members';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loadingRoleUsers ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={roleUsers}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No members assigned to this role</Text>
            </View>
          }
          renderItem={({ item }: ListRenderItemInfo<UserRoleSummary>) => (
            <View style={s.memberCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{getInitials(item.fullName)}</Text>
              </View>
              <View style={s.memberInfo}>
                <Text style={s.memberName}>{item.fullName}</Text>
                <Text style={s.memberEmail} numberOfLines={1}>{item.email ?? ''}</Text>
                <View style={s.rolesRow}>
                  {item.roles.map(r => (
                    <View key={r} style={s.roleTag}>
                      <Text style={s.roleTagText}>{r.replace(/_/g, ' ')}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => router.push({
                  pathname: '/admin/assign-role' as any,
                  params: { userId: String(item.id), userName: item.fullName },
                })}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

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
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', textTransform: 'capitalize' },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: RADIUS.md, minWidth: 60, alignItems: 'center', ...SHADOWS.sm,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center' },
  list: { padding: SPACING.md, paddingBottom: 40 },

  // Assign mode — user card at top
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  userSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8,
    fontFamily: 'DMSans-Medium', marginBottom: 8, marginTop: 4,
  },

  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'transparent',
  },
  roleRowActive: {
    borderColor: COLORS.primary + '40',
    backgroundColor: '#EEF2FF',
  },
  roleCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  roleCheckActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: 'Outfit-Bold', textTransform: 'capitalize' },
  roleCount: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  // Error banner
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },

  // Role-member list view
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: 10, ...SHADOWS.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  memberEmail: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  roleTag: {
    backgroundColor: '#EEF2FF', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  roleTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  editBtn: { padding: 4 },

  // Shared avatar
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
});
