import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { HealthBenefitWalletDto } from "@/types/health";

export default function HealthBenefitsScreen() {
  const [wallet, setWallet] = useState<HealthBenefitWalletDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    healthService.getBenefitWallet().then(w => {
      setWallet(w);
      setLoading(false);
    });
  }, []);

  if (loading || !wallet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Wallet Credit Card Gradient */}
        <LinearGradient
          colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creditCard}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTag}>COMMUNITY HEALTH ALLOWANCE</Text>
              <Text style={styles.cardSub}>Sponsored by Mana RWA & Partners</Text>
            </View>
            <Ionicons name="card-outline" size={28} color="#93C5FD" />
          </View>

          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>Remaining Credit</Text>
            <Text style={styles.balanceAmount}>₹{wallet.remainingAllowance.toLocaleString("en-IN")}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>Valid through: 31 Dec 2026</Text>
            <Text style={styles.cardFooterStatus}>● Cashless Active</Text>
          </View>
        </LinearGradient>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Annual Cap</Text>
            <Text style={styles.metricVal}>₹{wallet.communityAllowance}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Utilized</Text>
            <Text style={[styles.metricVal, { color: "#D97706" }]}>₹{wallet.usedAllowance}</Text>
          </View>
        </View>

        {/* Covered Services */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Covered Services & Packages</Text>
          <View style={styles.chipsWrap}>
            {wallet.coveredServices.map((svc, idx) => (
              <View key={idx} style={styles.chip}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.chipText}>{svc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Claims */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Claims & Direct Reimbursements</Text>
          {wallet.recentClaims.map(claim => (
            <View key={claim.id} style={styles.claimRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.claimName}>{claim.serviceName}</Text>
                <Text style={styles.claimDate}>Processed: {claim.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.claimAmt}>₹{claim.amount}</Text>
                <View style={[styles.statusTag, claim.status === "REIMBURSED" ? styles.reimbursedTag : styles.approvedTag]}>
                  <Text style={[styles.statusText, claim.status === "REIMBURSED" ? styles.reimbursedText : styles.approvedText]}>
                    {claim.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  creditCard: {
    borderRadius: 22,
    padding: 20,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTag: { fontSize: 11, fontWeight: "800", color: "#93C5FD", letterSpacing: 0.8 },
  cardSub: { fontSize: 12, color: "#BFDBFE", marginTop: 2 },
  balanceWrap: { marginTop: 24, marginBottom: 20 },
  balanceLabel: { fontSize: 12, color: "#E0E7FF", fontWeight: "600" },
  balanceAmount: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", marginTop: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 12 },
  cardFooterText: { fontSize: 11, color: "#BFDBFE" },
  cardFooterStatus: { fontSize: 11, color: "#86EFAC", fontWeight: "700" },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCard: { flex: 1, backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  metricLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  metricVal: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 4 },
  sectionCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 12 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#DCFCE7" },
  chipText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  claimRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  claimName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  claimDate: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  claimAmt: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  reimbursedTag: { backgroundColor: "#DCFCE7" },
  approvedTag: { backgroundColor: "#DBEAFE" },
  statusText: { fontSize: 10, fontWeight: "800" },
  reimbursedText: { color: "#15803D" },
  approvedText: { color: "#1D4ED8" }
});
