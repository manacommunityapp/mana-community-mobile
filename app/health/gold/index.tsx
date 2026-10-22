import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Plan = "monthly" | "annual";

interface GoldBenefit {
  icon: string;
  title: string;
  detail: string;
  value: string;
}

const BENEFITS: GoldBenefit[] = [
  { icon: "videocam", title: "Free Video Consultations", detail: "Unlimited teleconsults with any empanelled doctor", value: "Unlimited" },
  { icon: "flask", title: "Lab Test Discount", detail: "30% off on all lab packages & home collection", value: "30% off" },
  { icon: "medkit", title: "Medicine Discount", detail: "20% off on all pharmacy orders", value: "20% off" },
  { icon: "star", title: "Priority Booking", detail: "Skip the queue — instant slot confirmation", value: "Priority" },
  { icon: "shield-checkmark", title: "Annual Health Check", detail: "1 comprehensive annual health check-up included", value: "1 free / yr" },
  { icon: "person", title: "Dedicated Care Manager", detail: "Personal health navigator for your family", value: "Dedicated" },
  { icon: "heart", title: "Mental Wellness Sessions", detail: "4 free therapy/counselling sessions per month", value: "4 / month" },
  { icon: "call", title: "24×7 Doctor Helpline", detail: "On-call doctor for health queries anytime", value: "24×7" },
];

export default function ManaGoldScreen() {
  const [plan, setPlan] = useState<Plan>("annual");
  const [enrolled, setEnrolled] = useState(false);

  const pricing = {
    monthly: { price: 499, savings: null, tag: "Monthly" },
    annual: { price: 399, savings: 1200, tag: "Annual" },
  };

  const handleEnroll = () => {
    Alert.alert(
      "Confirm Mana Gold",
      `Subscribe to Mana Gold ${plan === "annual" ? "Annual" : "Monthly"} plan for ₹${pricing[plan].price}/${plan === "annual" ? "mo" : "mo"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () => {
            setEnrolled(true);
            Alert.alert("Welcome to Mana Gold! 🌟", "Your Gold membership is now active. All benefits are unlocked.");
          }
        }
      ]
    );
  };

  if (enrolled) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#854D0E", "#A16207", "#CA8A04"]} style={styles.goldHeader}>
          <Ionicons name="star" size={36} color="#FEF3C7" />
          <Text style={styles.goldActiveTitle}>Mana Gold Active 🌟</Text>
          <Text style={styles.goldActiveSub}>Your premium health membership is live</Text>
          <View style={styles.goldCardRow}>
            <View style={styles.goldCardStat}>
              <Text style={styles.goldCardVal}>∞</Text>
              <Text style={styles.goldCardLabel}>Free Consults</Text>
            </View>
            <View style={styles.goldCardStat}>
              <Text style={styles.goldCardVal}>30%</Text>
              <Text style={styles.goldCardLabel}>Lab Discount</Text>
            </View>
            <View style={styles.goldCardStat}>
              <Text style={styles.goldCardVal}>4</Text>
              <Text style={styles.goldCardLabel}>Free Therapy</Text>
            </View>
          </View>
        </LinearGradient>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.benefitsHeader}>Your Active Benefits</Text>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.activeBenefitRow}>
              <View style={styles.activeBenefitIcon}>
                <Ionicons name={b.icon as any} size={18} color="#A16207" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBenefitTitle}>{b.title}</Text>
                <Text style={styles.activeBenefitDetail}>{b.detail}</Text>
              </View>
              <View style={styles.valueBadge}>
                <Text style={styles.valueBadgeText}>{b.value}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.manageBtn} onPress={() => Alert.alert("Manage Subscription", "Plan: Annual · Renews 22 Oct 2027\n₹399/mo billed annually")}>
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero */}
      <LinearGradient colors={["#78350F", "#92400E", "#B45309"]} style={styles.hero}>
        <View style={styles.heroGlow}>
          <Ionicons name="star" size={42} color="#FDE68A" />
        </View>
        <Text style={styles.heroTitle}>Mana Gold</Text>
        <Text style={styles.heroTag}>Your Premium Health Membership</Text>
        <Text style={styles.heroDesc}>Unlimited consultations, priority care, exclusive discounts — everything your family needs, in one plan.</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Plan Toggle */}
        <View style={styles.planToggle}>
          {(["monthly", "annual"] as Plan[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.planOption, plan === p && styles.activePlanOption]}
              onPress={() => setPlan(p)}
            >
              {p === "annual" && <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE ₹1,200</Text></View>}
              <Text style={[styles.planLabel, plan === p && styles.activePlanLabel]}>
                {p === "monthly" ? "Monthly" : "Annual"}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, plan === p && styles.activePlanPrice]}>
                  ₹{pricing[p].price}
                </Text>
                <Text style={[styles.planPeriod, plan === p && styles.activePlanPeriod]}>/mo</Text>
              </View>
              {p === "annual" && <Text style={styles.annualNote}>Billed ₹{pricing.annual.price * 12}/year</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Benefits */}
        <Text style={styles.benefitsHeader}>What's Included</Text>
        {BENEFITS.map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons name={b.icon as any} size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitDetail}>{b.detail}</Text>
            </View>
            <View style={styles.benefitValueTag}>
              <Text style={styles.benefitValueText}>{b.value}</Text>
            </View>
          </View>
        ))}

        {/* Comparison callout */}
        <View style={styles.comparisonBox}>
          <Text style={styles.comparisonTitle}>Already saving with Gold</Text>
          {[
            { label: "1 video consult / month", saving: "₹500 saved" },
            { label: "1 lab test / month", saving: "₹240 saved" },
            { label: "Monthly medicines ~₹800", saving: "₹160 saved" },
          ].map((r, i) => (
            <View key={i} style={styles.compRow}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.compLabel}>{r.label}</Text>
              <Text style={styles.compSaving}>{r.saving}</Text>
            </View>
          ))}
          <View style={styles.compTotal}>
            <Text style={styles.compTotalLabel}>Total monthly value</Text>
            <Text style={styles.compTotalVal}>₹900 / mo</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.enrollBtn} onPress={handleEnroll} activeOpacity={0.85}>
          <LinearGradient colors={["#92400E", "#B45309"]} style={styles.enrollGradient}>
            <Ionicons name="star" size={18} color="#FDE68A" />
            <Text style={styles.enrollBtnText}>
              Get Mana Gold — ₹{pricing[plan].price}/mo
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.enrollNote}>Cancel anytime · No hidden charges · Instant activation</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: { padding: 24, alignItems: "center", gap: 8 },
  heroGlow: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  heroTitle: { fontSize: 30, fontWeight: "900", color: "#FDE68A" },
  heroTag: { fontSize: 13, color: "#FCD34D", fontWeight: "700" },
  heroDesc: { fontSize: 13, color: "#FEF3C7", textAlign: "center", lineHeight: 20, marginTop: 4 },
  goldHeader: { padding: 24, alignItems: "center", gap: 8 },
  goldActiveTitle: { fontSize: 24, fontWeight: "900", color: "#FDE68A" },
  goldActiveSub: { fontSize: 13, color: "#FCD34D" },
  goldCardRow: { flexDirection: "row", gap: 24, marginTop: 12 },
  goldCardStat: { alignItems: "center" },
  goldCardVal: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  goldCardLabel: { fontSize: 11, color: "#FDE68A", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  planToggle: { flexDirection: "row", gap: 12 },
  planOption: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#E5E7EB", alignItems: "center", gap: 4, position: "relative" },
  activePlanOption: { borderColor: "#B45309", backgroundColor: "#FFFBEB" },
  saveBadge: { position: "absolute", top: -10, right: 8, backgroundColor: "#DC2626", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  saveBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF" },
  planLabel: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  activePlanLabel: { color: "#92400E" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  planPrice: { fontSize: 24, fontWeight: "900", color: "#374151" },
  activePlanPrice: { color: "#B45309" },
  planPeriod: { fontSize: 12, color: "#9CA3AF" },
  activePlanPeriod: { color: "#B45309" },
  annualNote: { fontSize: 10, color: "#9CA3AF" },
  benefitsHeader: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  benefitRow: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  benefitIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  benefitTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  benefitDetail: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  benefitValueTag: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  benefitValueText: { fontSize: 10, fontWeight: "800", color: "#92400E" },
  activeBenefitRow: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#FDE68A" },
  activeBenefitIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  activeBenefitTitle: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  activeBenefitDetail: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  valueBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  valueBadgeText: { fontSize: 10, fontWeight: "800", color: "#92400E" },
  comparisonBox: { backgroundColor: "#F0FDF4", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#DCFCE7", gap: 8 },
  comparisonTitle: { fontSize: 14, fontWeight: "800", color: "#166534", marginBottom: 4 },
  compRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compLabel: { flex: 1, fontSize: 12, color: "#374151" },
  compSaving: { fontSize: 12, fontWeight: "700", color: "#059669" },
  compTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#DCFCE7", paddingTop: 8, marginTop: 4 },
  compTotalLabel: { fontSize: 13, fontWeight: "700", color: "#166534" },
  compTotalVal: { fontSize: 14, fontWeight: "900", color: "#059669" },
  enrollBtn: { borderRadius: 16, overflow: "hidden" },
  enrollGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  enrollBtnText: { color: "#FDE68A", fontWeight: "900", fontSize: 16 },
  enrollNote: { textAlign: "center", fontSize: 11, color: "#9CA3AF" },
  manageBtn: { borderWidth: 1, borderColor: "#B45309", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  manageBtnText: { color: "#92400E", fontWeight: "700", fontSize: 14 },
});
