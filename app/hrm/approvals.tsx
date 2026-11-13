import { useState, useCallback } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, Alert, TextInput, Modal, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { LeaveRequestItem } from '@/components/hrm/LeaveRequestItem';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { LeaveRequest } from '@/types/hrm';

export default function ApprovalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data: requestsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-pending-leaves', orgId],
    queryFn: () => hrmService.getPendingLeaveRequests(orgId!, 0, 50),
    enabled: !!orgId,
  });

  const [actionModal, setActionModal] = useState<{ id: number; type: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      hrmService.approveLeave(id, orgId!, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-pending-leaves'] });
      setActionModal(null);
      setRemarks('');
      Alert.alert('Done', 'Leave request approved.');
    },
    onError: () => Alert.alert('Error', 'Failed to approve request.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      hrmService.rejectLeave(id, orgId!, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-pending-leaves'] });
      setActionModal(null);
      setRemarks('');
      Alert.alert('Done', 'Leave request rejected.');
    },
    onError: () => Alert.alert('Error', 'Failed to reject request.'),
  });

  const handleAction = () => {
    if (!actionModal) return;
    const payload = { id: actionModal.id, remarks: remarks.trim() || undefined };
    if (actionModal.type === 'approve') {
      approveMutation.mutate(payload);
    } else {
      rejectMutation.mutate(payload);
    }
  };

  const requests = requestsData?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Leave Approvals" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <FlatList
        data={requests}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={s.itemWrap}>
            <LeaveRequestItem
              request={item}
              showEmployee
              onApprove={id => { setActionModal({ id, type: 'approve' }); setRemarks(''); }}
              onReject={id => { setActionModal({ id, type: 'reject' }); setRemarks(''); }}
            />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Pending Requests</Text>
            <View style={s.countBadge}>
              <Text style={s.countText}>{requests.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="checkmark-done-outline" size={36} color={COLORS.success} />
              </View>
              <Text style={s.emptyTitle}>All Caught Up</Text>
              <Text style={s.emptySub}>No pending leave requests to review.</Text>
            </View>
          )
        }
      />

      {/* Remarks Modal */}
      <Modal visible={!!actionModal} transparent animationType="fade" onRequestClose={() => setActionModal(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setActionModal(null)}>
          <TouchableOpacity style={s.modal} activeOpacity={1}>
            <Text style={s.modalTitle}>
              {actionModal?.type === 'approve' ? 'Approve Leave' : 'Reject Leave'}
            </Text>
            <Text style={s.modalSub}>Add optional remarks:</Text>
            <TextInput
              style={s.remarksInput}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Enter remarks..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setActionModal(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.confirmBtn,
                  { backgroundColor: actionModal?.type === 'approve' ? COLORS.success : COLORS.error },
                ]}
                onPress={handleAction}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {(approveMutation.isPending || rejectMutation.isPending) ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>
                    {actionModal?.type === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { paddingBottom: 40 },
  itemWrap: { paddingHorizontal: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.warning,
    fontWeight: '700',
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text, fontWeight: '700' },
  emptySub: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  remarksInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 70,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
