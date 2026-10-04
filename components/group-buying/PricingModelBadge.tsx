import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PricingModel } from '@/types/groupBuying';

const CONFIG: Record<PricingModel, { label: string; icon: string; bg: string; text: string }> = {
  GUARANTEED:       { label: 'Guaranteed Price',      icon: 'shield-checkmark-outline', bg: '#DCFCE7', text: '#166534' },
  THRESHOLD:        { label: 'Unlock More Savings',   icon: 'flame-outline',            bg: '#FEF3C7', text: '#92400E' },
  TARGET_OR_CANCEL: { label: 'Target or Cancel',      icon: 'alert-circle-outline',     bg: '#FEE2E2', text: '#991B1B' },
};

export default function PricingModelBadge({ model }: { model: PricingModel }) {
  const cfg = CONFIG[model] ?? CONFIG.GUARANTEED;
  return (
    <View style={[s.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={13} color={cfg.text} />
      <Text style={[s.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700' },
});
