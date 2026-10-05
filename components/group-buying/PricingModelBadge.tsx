import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PricingModel } from '@/types/groupBuying';

const MODEL_CONFIG: Record<PricingModel, { label: string; icon: string; bg: string; text: string }> = {
  GUARANTEED: { label: 'Guaranteed Tier', icon: 'shield-checkmark-outline', bg: '#DCFCE7', text: '#166534' },
  THRESHOLD: { label: 'Unlock Tier', icon: 'trending-down-outline', bg: '#EEF2FF', text: '#4338CA' },
  VOLUME: { label: 'Volume Slab', icon: 'layers-outline', bg: '#FEF3C7', text: '#92400E' },
  FLAT: { label: 'Flat Community Deal', icon: 'pricetag-outline', bg: '#F3E8FF', text: '#7C3AED' },
  TARGET_OR_CANCEL: { label: 'Target or Cancel', icon: 'alert-circle-outline', bg: '#FEE2E2', text: '#991B1B' },
};

export function PricingModelBadge({ model }: { model?: PricingModel }) {
  const config = MODEL_CONFIG[model || 'THRESHOLD'] || MODEL_CONFIG.THRESHOLD;
  return (
    <View style={[s.badge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={12} color={config.text} />
      <Text style={[s.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

export default PricingModelBadge;

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700' },
});
