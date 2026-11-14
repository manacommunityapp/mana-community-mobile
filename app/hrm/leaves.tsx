import { useState, useCallback } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Header } from '@/components/common/Header';
import { LeaveBalanceCard } from '@/components/hrm/LeaveBalanceCard';
import { LeaveRequestItem } from '@/components/hrm/LeaveRequestItem';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { LeaveBalance, LeaveRequest } from '@/types/hrm';

export default function LeavesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['hrm-leave-balance', orgId],
    queryFn: () => hrmService.getLeaveBalance(orgId!),
    enabled: !!orgId,
  });

  const { data: requestsData, isLoading: requestsLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-leave-requests', orgId],
    queryFn: () => hrmService.getMyLeaveRequests(orgId!, 0, 50),
    enabled: !!orgId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => hrmService.cancelLeave(id, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-balance'] });
    },
    onError: () => Alert.alert('Error', 'Failed to cancel leave request.'),
  });

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Leave', 'Are you sure you want to cancel this leave request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  };

  const requests = requestsData?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header
        title="Leaves"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        actions={[{
          icon: 'add-circle',
          onPress: () => router.push('/hrm/apply-leave'),
        }]}
      />

      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={s.itemWrap}>
            <LeaveRequestItem request={item} onCancel={handleCancel} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Leave Balances */}
            {balancesLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : balances && balances.length > 0 ? (
              <View style={s.balanceSection}>
                <Text style={s.sectionTitle}>Leave Balance</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.balanceScroll}>
                  {balances.map((b: LeaveBalance) => (
                    <LeaveBalanceCard key={b.leaveTypeName} balance={b} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={s.requestsHeader}>
              <Text style={s.sectionTitle}>My Requests</Text>
              <Text style={s.countBadge}>{requests.length}</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          requestsLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={s.emptyTitle}>No Leave Requests</Text>
              <Text style={s.emptySub}>Your leave request history will appear here.</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/hrm/apply-leave')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.emptyBtnText}>Apply Leave</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Floating Apply Button */}
      {requests.length > 0 && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/hrm/apply-leave')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { paddingBottom: 80 },
  itemWrap: { paddingHorizontal: 16 },

  balanceSection: { paddingTop: 16, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  balanceScroll: { paddingHorizontal: 16, gap: 10 },

  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  countBadge: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },

  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 13,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.primary,
  },
});
