import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { OrderDispute } from '@/types/groupBuying';

const DISPUTE_REASONS: Array<{ key: OrderDispute['reason']; label: string; desc: string }> = [
  { key: 'DAMAGED_ITEMS', label: 'Damaged / Broken Items', desc: 'Package or items arrived in damaged condition' },
  { key: 'MISSING_QUANTITY', label: 'Missing Quantity', desc: 'Received fewer items than ordered' },
  { key: 'POOR_QUALITY', label: 'Poor Quality / Expired', desc: 'Freshness, taste or expiry issues' },
  { key: 'WRONG_ITEM', label: 'Wrong Item Delivered', desc: 'Received different brand or pack size' },
  { key: 'NOT_DELIVERED', label: 'Not Received at Desk', desc: 'Order missing from pickup handover' },
];

export default function OrderDisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [reason, setReason] = useState<OrderDispute['reason']>('DAMAGED_ITEMS');
  const [resolution, setResolution] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [claimAmount, setClaimAmount] = useState('250');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide specific details about the issue.');
      return;
    }

    setSubmitting(true);
    try {
      const disp = await groupBuyingService.raiseOrderDispute({
        orderId: id || 'GB-2026-00101',
        dealId: 'd1',
        dealTitle: 'Aashirvaad Atta 10 KG',
        residentName: 'Sandeep V',
        flat: 'Tower A - 402',
        reason,
        requestedResolution: resolution,
        claimAmount: parseFloat(claimAmount) || 0,
        description: description.trim(),
      });

      Alert.alert(
        '🛡️ Dispute Claim Filed',
        `Ticket #${disp.id} submitted. The supplier has 24 hours to replace or process refund under Mana Escrow Protection.`,
        [{ text: 'View Orders', onPress: () => router.replace('/group-buying/orders') }]
      );
    } catch {
      Alert.alert('Error', 'Unable to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Report Issue / Dispute', headerBackTitle: 'Order' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Protection Banner */}
        <View style={s.bannerCard}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Mana Community Escrow Protection</Text>
            <Text style={s.bannerSub}>Supplier funds remain in escrow hold until issues are settled.</Text>
          </View>
        </View>

        {/* Reason Selector */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Select Issue Reason</Text>
          {DISPUTE_REASONS.map(r => {
            const active = reason === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[s.reasonCard, active && s.reasonCardActive]}
                onPress={() => setReason(r.key)}
                activeOpacity={0.8}
              >
                <View style={s.radioCircle}>
                  {active && <View style={s.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reasonLabel}>{r.label}</Text>
                  <Text style={s.reasonDesc}>{r.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Desired Resolution */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Preferred Resolution</Text>
          <View style={s.resolutionRow}>
            <TouchableOpacity
              style={[s.resolutionChip, resolution === 'REFUND' && s.resolutionChipActive]}
              onPress={() => setResolution('REFUND')}
            >
              <Ionicons name="cash-outline" size={18} color={resolution === 'REFUND' ? '#fff' : COLORS.textSecondary} />
              <Text style={[s.resolutionChipText, resolution === 'REFUND' && s.resolutionChipTextActive]}>
                Refund to Source
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.resolutionChip, resolution === 'REPLACEMENT' && s.resolutionChipActive]}
              onPress={() => setResolution('REPLACEMENT')}
            >
              <Ionicons name="repeat-outline" size={18} color={resolution === 'REPLACEMENT' ? '#fff' : COLORS.textSecondary} />
              <Text style={[s.resolutionChipText, resolution === 'REPLACEMENT' && s.resolutionChipTextActive]}>
                Vendor Replacement
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.sectionTitle, { marginTop: 8 }]}>Claim Amount (₹)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={claimAmount}
            onChangeText={setClaimAmount}
            placeholder="Claim amount"
          />
        </View>

        {/* Description */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Describe the Problem</Text>
          <TextInput
            style={s.textArea}
            placeholder="Explain what was wrong with the order so the supplier can review..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Submit Dispute Claim</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: 14 },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  bannerSub: { fontSize: 12, color: '#047857', marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  reasonCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  reasonLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  reasonDesc: { fontSize: 11, color: COLORS.textMuted },
  resolutionRow: { flexDirection: 'row', gap: 10 },
  resolutionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resolutionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  resolutionChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  resolutionChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    ...SHADOWS.md,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
