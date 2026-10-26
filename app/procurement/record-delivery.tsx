import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, RADIUS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { PerformanceEventType } from '@/types/procurement';

const OUTCOME_OPTIONS: { value: PerformanceEventType; emoji: string; label: string; desc: string; color: string }[] = [
  { value: 'DELIVERY_ON_TIME', emoji: '✅', label: 'Delivered On Time',    desc: 'Goods arrived within promised delivery window',  color: '#059669' },
  { value: 'DELIVERY_LATE',    emoji: '🕐', label: 'Delivered Late',       desc: 'Goods arrived after the agreed delivery date',   color: '#D97706' },
  { value: 'DELIVERY_PARTIAL', emoji: '📦', label: 'Partial Delivery',     desc: 'Only part of the order was delivered',          color: '#7C3AED' },
  { value: 'DELIVERY_FAILED',  emoji: '❌', label: 'Delivery Failed',      desc: 'Supplier did not deliver / order was cancelled', color: '#DC2626' },
];

const STARS = [1, 2, 3, 4, 5];

export default function RecordDelivery() {
  const router = useRouter();
  const params = useLocalSearchParams<{ supplierId?: string; poId?: string; rfqId?: string }>();
  const qc = useQueryClient();

  const supplierId = params.supplierId ? Number(params.supplierId) : null;
  const poId       = params.poId       ? Number(params.poId)       : undefined;
  const rfqId      = params.rfqId      ? Number(params.rfqId)      : undefined;

  const [outcome, setOutcome] = useState<PerformanceEventType | null>(null);
  const [quality, setQuality] = useState<number>(0);
  const [notes, setNotes]     = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!supplierId || !outcome) throw new Error('Missing data');
      return procurementHubService.recordPerformanceEvent(supplierId, {
        poId, rfqId, eventType: outcome,
        numericValue: quality > 0 ? quality : undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (score) => {
      qc.invalidateQueries({ queryKey: ['supplier-reliability', supplierId] });
      qc.invalidateQueries({ queryKey: ['supplier-performance', supplierId] });
      qc.invalidateQueries({ queryKey: ['supplier', supplierId] });
      const tier = score.tier;
      Alert.alert(
        '✅ Recorded',
        `Reliability score updated: ${score.reliabilityScore.toFixed(0)}/100 (${tier})`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    },
    onError: () => Alert.alert('Error', 'Could not record event.'),
  });

  if (!supplierId) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>No supplier specified.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Delivery Outcome *</Text>
        <Text style={s.sectionSub}>What happened with this delivery?</Text>
        <View style={s.outcomeGrid}>
          {OUTCOME_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.value}
              style={[s.outcomeTile, outcome === o.value && { borderColor: o.color, backgroundColor: o.color + '15' }]}
              onPress={() => setOutcome(o.value)}
              activeOpacity={0.8}
            >
              <Text style={s.outcomeEmoji}>{o.emoji}</Text>
              <Text style={[s.outcomeLabel, outcome === o.value && { color: o.color }]}>{o.label}</Text>
              <Text style={s.outcomeDesc}>{o.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Quality Rating</Text>
        <Text style={s.sectionSub}>Rate the quality of goods received (optional)</Text>
        <View style={s.starsRow}>
          {STARS.map(n => (
            <TouchableOpacity key={n} onPress={() => setQuality(quality === n ? 0 : n)} hitSlop={8}>
              <Ionicons
                name={n <= quality ? 'star' : 'star-outline'}
                size={32}
                color={n <= quality ? '#F59E0B' : '#CBD5E1'}
              />
            </TouchableOpacity>
          ))}
          {quality > 0 && <Text style={s.qualityLabel}>{quality}/5</Text>}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Notes</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Anything worth noting — delays, quality issues, great service…"
          placeholderTextColor={COLORS.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Context refs */}
      {(poId || rfqId) && (
        <View style={s.refRow}>
          {poId  && <Text style={s.refText}>PO #{poId}</Text>}
          {rfqId && <Text style={s.refText}>RFQ #{rfqId}</Text>}
        </View>
      )}

      <TouchableOpacity
        style={[s.submitBtn, (!outcome || mutation.isPending) && { opacity: 0.5 }]}
        onPress={() => mutation.mutate()}
        disabled={!outcome || mutation.isPending}
      >
        {mutation.isPending
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.submitText}>Save Delivery Record</Text>
            </>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 14, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, color: COLORS.textMuted },
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: -4 },
  outcomeGrid: { gap: 8 },
  outcomeTile: {
    borderRadius: RADIUS.md, padding: 12, borderWidth: 1.5,
    borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  outcomeEmoji: { fontSize: 20, marginBottom: 4 },
  outcomeLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  outcomeDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qualityLabel: { fontSize: 14, fontWeight: '700', color: '#D97706', marginLeft: 4 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: '#F8FAFC',
  },
  refRow: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
  },
  refText: {
    fontSize: 12, color: '#64748B', backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  submitBtn: {
    backgroundColor: '#2563EB', borderRadius: RADIUS.md, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
