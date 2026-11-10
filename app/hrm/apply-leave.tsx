import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { LeaveType } from '@/types/hrm';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

export default function ApplyLeaveScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['hrm-profile'],
    queryFn: hrmService.getMyProfile,
  });

  const { data: leaveTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['hrm-leave-types', profile?.organizationId],
    queryFn: () => hrmService.getLeaveTypes(profile!.organizationId),
    enabled: !!profile?.organizationId,
  });

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const totalDays = useMemo(() => diffDays(fromDate, toDate), [fromDate, toDate]);

  const applyMutation = useMutation({
    mutationFn: () =>
      hrmService.applyLeave({
        leaveTypeId: selectedTypeId!,
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
        totalDays,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-balance'] });
      Alert.alert('Success', 'Leave request submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to submit leave request.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    if (!selectedTypeId) {
      Alert.alert('Required', 'Please select a leave type.');
      return;
    }
    if (toDate < fromDate) {
      Alert.alert('Invalid', 'To date must be after from date.');
      return;
    }
    applyMutation.mutate();
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="Apply Leave" leftIcon="close" onLeftPress={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Leave Type Selection */}
        <Text style={s.label}>Leave Type *</Text>
        {typesLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
        ) : (
          <View style={s.typeGrid}>
            {(leaveTypes ?? []).map((lt: LeaveType) => {
              const active = selectedTypeId === lt.id;
              return (
                <TouchableOpacity
                  key={lt.id}
                  style={[s.typeChip, active && s.typeChipActive]}
                  onPress={() => setSelectedTypeId(lt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.typeText, active && s.typeTextActive]}>{lt.leaveTypeName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* From Date */}
        <Text style={s.label}>From Date *</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setShowFromPicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          <Text style={s.dateText}>{formatDate(fromDate)}</Text>
        </TouchableOpacity>
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowFromPicker(Platform.OS === 'ios');
              if (date) {
                setFromDate(date);
                if (date > toDate) setToDate(date);
              }
            }}
          />
        )}

        {/* To Date */}
        <Text style={s.label}>To Date *</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setShowToPicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          <Text style={s.dateText}>{formatDate(toDate)}</Text>
        </TouchableOpacity>
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            minimumDate={fromDate}
            onChange={(_, date) => {
              setShowToPicker(Platform.OS === 'ios');
              if (date) setToDate(date);
            }}
          />
        )}

        {/* Days Count */}
        <View style={s.daysCard}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} />
          <Text style={s.daysText}>
            {totalDays} {totalDays === 1 ? 'day' : 'days'}
          </Text>
        </View>

        {/* Reason */}
        <Text style={s.label}>Reason</Text>
        <TextInput
          style={s.textArea}
          value={reason}
          onChangeText={setReason}
          placeholder="Describe the reason for leave..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, applyMutation.isPending && s.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={s.submitBtnText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  typeTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },

  daysCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  daysText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    fontWeight: '700',
  },

  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 100,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: 24,
    ...SHADOWS.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
