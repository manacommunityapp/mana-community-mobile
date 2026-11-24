import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { LeaveRequest } from '@/types/hrm';

interface LeaveRequestItemProps {
  request: LeaveRequest;
  onCancel?: (id: number) => void;
  showEmployee?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onL2Approve?: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
  APPROVED:    { bg: '#ECFDF5', text: '#059669', label: 'Approved' },
  REJECTED:    { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
  CANCELLED:   { bg: '#F1F5F9', text: '#64748B', label: 'Cancelled' },
  L1_APPROVED: { bg: '#DBEAFE', text: '#2563EB', label: 'L1 Approved' },
  L1_REJECTED: { bg: '#FFEDD5', text: '#EA580C', label: 'L1 Rejected' },
};

export function LeaveRequestItem({
  request,
  onCancel,
  showEmployee,
  onApprove,
  onReject,
  onL2Approve,
}: LeaveRequestItemProps) {
  const status = STATUS_CONFIG[request.approvalStatus] ?? STATUS_CONFIG.PENDING;

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View style={s.leftCol}>
          {showEmployee && request.employeeName && (
            <Text style={s.empName}>{request.employeeName}</Text>
          )}
          <Text style={s.leaveType}>{request.leaveTypeName}</Text>
          <Text style={s.dates}>
            {request.fromDate} — {request.toDate} ({request.totalDays}d)
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: status.bg }]}>
          <Text style={[s.badgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      {request.reason ? (
        <Text style={s.reason} numberOfLines={2}>{request.reason}</Text>
      ) : null}

      {request.approverRemarks ? (
        <Text style={s.remarks} numberOfLines={1}>Remarks: {request.approverRemarks}</Text>
      ) : null}

      <View style={s.actions}>
        {request.approvalStatus === 'PENDING' && onCancel && (
          <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(request.id)} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={14} color={COLORS.error} />
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {request.approvalStatus === 'PENDING' && onApprove && (
          <View style={s.approvalActions}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: COLORS.successLight }]}
              onPress={() => onApprove(request.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={16} color={COLORS.success} />
              <Text style={[s.actionBtnText, { color: COLORS.success }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: COLORS.errorLight }]}
              onPress={() => onReject?.(request.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color={COLORS.error} />
              <Text style={[s.actionBtnText, { color: COLORS.error }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {request.approvalStatus === 'L1_APPROVED' && onL2Approve && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#DBEAFE' }]}
            onPress={() => onL2Approve(request.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
            <Text style={[s.actionBtnText, { color: '#2563EB' }]}>HR Approve</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftCol: { flex: 1, marginRight: 8 },
  empName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  leaveType: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    fontWeight: '600',
  },
  dates: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  reason: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  remarks: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: { marginTop: 8 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.error,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
