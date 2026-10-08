import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { VendorProfile } from '@/types/vendor';

export default function VendorCard({ vendor }: { vendor: VendorProfile }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/group-buying/vendor/${vendor.id}` as any)} activeOpacity={0.8}>
      <View style={s.row}>
        <View style={s.avatar}><Text style={s.avatarText}>{vendor.businessName.charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{vendor.businessName}</Text>
            {vendor.isVerified && <Ionicons name="checkmark-circle" size={14} color="#059669" />}
          </View>
          <View style={s.statsRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={s.stat}>{vendor.rating}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.stat}>{vendor.totalOrders} orders</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.stat}>{vendor.fulfillmentRate}% fulfilled</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
      <View style={s.badges}>
        {vendor.isGSTVerified && <View style={s.badge}><Text style={s.badgeText}>GST ✓</Text></View>}
        {vendor.isFSSAIVerified && <View style={s.badge}><Text style={s.badgeText}>FSSAI ✓</Text></View>}
        {vendor.isCommunityApproved && <View style={[s.badge, { backgroundColor: '#DCFCE7' }]}><Text style={[s.badgeText, { color: '#166534' }]}>Community ✓</Text></View>}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, ...SHADOWS.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { fontSize: 12, color: COLORS.textSecondary },
  dot: { fontSize: 12, color: COLORS.textMuted },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: COLORS.surfaceAlt, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
});
