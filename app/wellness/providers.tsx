import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS, RADIUS, FONTS, THEMES } from "@/constants/config";
import { wellnessService } from "@/services/wellnessService";
import { WellnessProviderDto } from "@/types/wellness";

const PROVIDER_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  DIETITIAN: { icon: "nutrition", color: "#10B981", bg: "#ECFDF5" },
  NUTRITIONIST: { icon: "leaf", color: "#059669", bg: "#D1FAE5" },
  PERSONAL_TRAINER: { icon: "barbell", color: "#F43F5E", bg: "#FFF1F2" },
  YOGA_INSTRUCTOR: { icon: "body", color: "#8B5CF6", bg: "#F5F3FF" },
  GYM: { icon: "fitness", color: "#F97316", bg: "#FFF7ED" },
};

export default function ProvidersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<WellnessProviderDto[]>([]);

  useEffect(() => {
    wellnessService.getProviders().then(p => { setProviders(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={THEMES.wellness.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {providers.map((p) => {
        const cfg = PROVIDER_CONFIG[p.providerType] || PROVIDER_CONFIG.DIETITIAN;
        return (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={24} color={cfg.color} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{p.name}</Text>
                  {p.verified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.spec}>
                  {p.providerType.replace(/_/g, " ")} | {p.specialization}
                </Text>
                <Text style={styles.exp}>{p.experienceYears} yrs exp | {p.languages.join(", ")}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{p.rating}</Text>
                <Ionicons name="star" size={10} color="#F59E0B" />
              </View>
            </View>

            <Text style={styles.about} numberOfLines={2}>{p.about}</Text>

            <View style={styles.footer}>
              <View style={styles.feeWrap}>
                <Text style={styles.fee}>Rs. {p.consultationFee}</Text>
                <Text style={styles.feeLabel}>per session</Text>
              </View>
              <View style={styles.slotWrap}>
                <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.slotText}>{p.nextAvailableSlot}</Text>
              </View>
              <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8} onPress={() => Alert.alert("Coming Soon", "Booking feature will be available shortly.")}>
                <Text style={styles.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, gap: 14 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },

  card: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.xs },
  verifiedText: { color: "#1D4ED8", fontSize: 9, fontFamily: FONTS.bold },
  spec: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 1 },
  exp: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.sm },
  ratingText: { fontSize: 13, fontFamily: FONTS.bold, color: "#92400E" },

  about: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18 },

  footer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10, gap: 8 },
  feeWrap: {},
  fee: { fontSize: 15, fontFamily: FONTS.displayBold, color: THEMES.wellness.primaryDark },
  feeLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted },
  slotWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  slotText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },
  bookBtn: { backgroundColor: THEMES.wellness.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.sm, ...SHADOWS.glowEmerald },
  bookBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: FONTS.bold },
});
