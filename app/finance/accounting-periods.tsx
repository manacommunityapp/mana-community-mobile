import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { financeExtService } from '@/services/financeExtService';

export default function AccountingPeriodsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFreezeDate, setNewFreezeDate] = useState('');
  const [newFreezeNote, setNewFreezeNote] = useState('');
  const [setError, setSetError] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const { data: freeze, isLoading } = useQuery({
    queryKey: ['finance', 'accounting-periods', 'freeze'],
    queryFn: financeExtService.getFreezePeriod,
  });

  const setMutation = useMutation({
    mutationFn: () => financeExtService.setFreezePeriod(newFreezeDate, newFreezeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounting-periods'] });
      setSetError('');
    },
    onError: (err: any) => setSetError(err?.message || 'Failed to set freeze date.'),
  });

  const clearMutation = useMutation({
    mutationFn: () => financeExtService.clearFreezePeriod(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounting-periods'] });
      setShowConfirmClear(false);
    },
  });

  const isFrozen = !!freeze?.freezeDate;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Accounting Periods</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={THEME.brand} />
          </View>
        ) : (
          <>
            {/* Current Freeze Status */}
            {isFrozen ? (
              <View style={s.frozenCard}>
                <View style={s.frozenIconRow}>
                  <Text style={s.frozenIcon}>🔒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.frozenTitle}>Books Frozen</Text>
                    <Text style={s.frozenDate}>Until {freeze!.freezeDate}</Text>
                  </View>
                </View>
                {freeze!.freezeNote ? (
                  <Text style={s.frozenNote}>{freeze!.freezeNote}</Text>
                ) : null}
                <TouchableOpacity
                  style={s.removeFreezeBtn}
                  onPress={() => setShowConfirmClear(true)}
                >
                  <Ionicons name="lock-open-outline" size={14} color={THEME.lossDark} />
                  <Text style={s.removeFreezeBtnText}>Remove Freeze</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.openCard}>
                <Text style={s.openIcon}>✅</Text>
                <Text style={s.openTitle}>Books Open</Text>
                <Text style={s.openSub}>No accounting freeze is currently active.</Text>
              </View>
            )}

            {/* Set Freeze Section */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Set Freeze Date</Text>
              <Text style={s.sectionSub}>
                Prevent backdated voucher entries before this date.
              </Text>

              <View style={s.field}>
                <Text style={s.label}>Freeze Until Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  value={newFreezeDate}
                  onChangeText={setNewFreezeDate}
                  placeholder="e.g. 2026-03-31"
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Note (optional)</Text>
                <TextInput
                  style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                  value={newFreezeNote}
                  onChangeText={setNewFreezeNote}
                  placeholder="e.g. Year-end audit FY 2025-26"
                  placeholderTextColor={THEME.textMuted}
                  multiline
                />
              </View>

              {setError ? (
                <View style={s.errorBanner}>
                  <Ionicons name="alert-circle" size={14} color={THEME.lossDark} />
                  <Text style={s.errorText}>{setError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.freezeBtn, setMutation.isPending && { opacity: 0.6 }]}
                onPress={() => setMutation.mutate()}
                disabled={setMutation.isPending || !newFreezeDate}
                activeOpacity={0.85}
              >
                {setMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                    <Text style={s.freezeBtnText}>Freeze Books</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Warning Banner */}
            <View style={s.warningCard}>
              <Ionicons name="warning-outline" size={18} color="#92400E" />
              <Text style={s.warningText}>
                Freezing prevents any backdated voucher entry. Only a SUPER_ADMIN can remove the freeze once set.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirm Clear Modal */}
      <Modal
        visible={showConfirmClear}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmClear(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Remove Freeze?</Text>
              <TouchableOpacity onPress={() => setShowConfirmClear(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.confirmText}>
              This will allow backdated entries again. Ensure your audit is complete before removing.
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setShowConfirmClear(false)}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmRemoveBtn, clearMutation.isPending && { opacity: 0.6 }]}
                onPress={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
              >
                {clearMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmRemoveBtnText}>Remove Freeze</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  content: { padding: 16, gap: 14 },
  center: { alignItems: 'center', paddingVertical: 40 },
  frozenCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA', padding: 16, gap: 10,
  },
  frozenIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  frozenIcon: { fontSize: 28 },
  frozenTitle: { fontSize: 16, fontWeight: '700', color: '#991B1B', fontFamily: FONTS.displayBold },
  frozenDate: { fontSize: 13, color: THEME.lossDark, fontFamily: FONTS.semiBold, marginTop: 2 },
  frozenNote: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular },
  removeFreezeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#FECACA', alignSelf: 'flex-start',
  },
  removeFreezeBtnText: { fontSize: 13, fontWeight: '700', color: THEME.lossDark, fontFamily: FONTS.bold },
  openCard: {
    backgroundColor: '#ECFDF5', borderRadius: 14,
    borderWidth: 1, borderColor: '#A7F3D0', padding: 20,
    alignItems: 'center', gap: 4,
  },
  openIcon: { fontSize: 32 },
  openTitle: { fontSize: 16, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.displayBold },
  openSub: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border, padding: 16, gap: 14, ...SHADOWS.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  sectionSub: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: -8 },
  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  input: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10,
    borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: THEME.lossLight, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: THEME.lossBorder,
  },
  errorText: { flex: 1, fontSize: 12, color: THEME.lossDark, fontFamily: FONTS.medium },
  freezeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: THEME.lossDark, borderRadius: 12, paddingVertical: 14,
  },
  freezeBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  warningCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', fontFamily: FONTS.regular, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 14,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  confirmText: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.regular, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: THEME.surfaceMuted, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  confirmRemoveBtn: { flex: 1, backgroundColor: THEME.lossDark, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmRemoveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
