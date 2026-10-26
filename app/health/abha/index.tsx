import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AbhaRecord {
  id: string;
  abhaNumber: string;
  name: string;
  dob: string;
  gender: string;
  linkedHospitals: number;
  linkedRecords: number;
  createdOn: string;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_ABHA: AbhaRecord = {
  id: "abha1",
  abhaNumber: "23-4521-6789-0012",
  name: "Raghunath Krishnamurthy",
  dob: "15/08/1985",
  gender: "Male",
  linkedHospitals: 4,
  linkedRecords: 12,
  createdOn: "March 2025",
};

const CONSENT_REQUESTS = [
  { id: "c1", from: "Apollo Hospital", purpose: "View OPD Records", date: "21 Oct 2026", status: "Pending" },
  { id: "c2", from: "Yashoda Hospital", purpose: "Upload Discharge Summary", date: "10 Sep 2026", status: "Approved" },
  { id: "c3", from: "Star Lab Diagnostics", purpose: "Share Lab Reports", date: "5 Aug 2026", status: "Approved" },
];

const LINKED_RECORDS = [
  { type: "Prescription", title: "Antibiotic Course — Dr. Mehta", date: "12 Oct 2026", hospital: "Apollo Hospital" },
  { type: "Lab Report", title: "HbA1c & Lipid Panel", date: "3 Sep 2026", hospital: "Star Lab Diagnostics" },
  { type: "Discharge", title: "Appendectomy Discharge Summary", date: "15 Aug 2026", hospital: "Yashoda Hospital" },
  { type: "Scan", title: "Chest X-Ray (PA view)", date: "29 Jul 2026", hospital: "Care Hospitals" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type FlowStep = "home" | "create_aadhar" | "create_otp" | "create_success" | "link_abha" | "linked_success";
type Tab = "card" | "records" | "consent";

export default function AbhaScreen() {
  const router = useRouter();
  const [isLinked, setIsLinked] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("home");
  const [tab, setTab] = useState<Tab>("card");
  const [aadhar, setAadhar] = useState("");
  const [otp, setOtp] = useState("");
  const [abhaInput, setAbhaInput] = useState("");
  const [consentRequests, setConsentRequests] = useState(CONSENT_REQUESTS);

  const handleApproveConsent = (id: string) => {
    setConsentRequests(prev => prev.map(c => c.id === id ? { ...c, status: "Approved" } : c));
    Alert.alert("Consent Granted", "The healthcare provider can now access the specified records.");
  };

  const handleRevokeConsent = (id: string) => {
    setConsentRequests(prev => prev.map(c => c.id === id ? { ...c, status: "Revoked" } : c));
  };

  // ── Flow: Not Linked ─────────────────────────────────────────────────────

  if (!isLinked) {
    if (flowStep === "home") {
      return (
        <View style={styles.container}>
          <LinearGradient colors={["#1E40AF", "#2563EB", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ABHA Health ID</Text>
            <Text style={styles.headerSub}>India's Digital Health Identity — by NHA</Text>
          </LinearGradient>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={24} color="#2563EB" />
              <Text style={styles.infoText}>ABHA (Ayushman Bharat Health Account) is your national digital health ID. It securely links all your medical records across hospitals and labs.</Text>
            </View>
            {/* Benefits */}
            <View style={styles.benefitCard}>
              <Text style={styles.benefitTitle}>Why link your ABHA?</Text>
              {[
                { icon: "shield-checkmark", text: "All medical records in one secure place" },
                { icon: "share-social", text: "Share records with any hospital instantly" },
                { icon: "lock-closed", text: "You control who sees your data (consent-based)" },
                { icon: "document-text", text: "Paperless OPD, prescriptions & reports" },
                { icon: "infinite", text: "Linked for life — never lose a medical record" },
              ].map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name={b.icon as any} size={18} color="#2563EB" />
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
            {/* Actions */}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setFlowStep("create_aadhar")} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Create ABHA ID with Aadhaar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setFlowStep("link_abha")} activeOpacity={0.85}>
              <Ionicons name="link" size={18} color="#2563EB" />
              <Text style={styles.secondaryBtnText}>Link Existing ABHA Number</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    if (flowStep === "create_aadhar") {
      return (
        <View style={styles.container}>
          <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.header}>
            <TouchableOpacity onPress={() => setFlowStep("home")} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create ABHA ID</Text>
            <Text style={styles.headerSub}>Step 1 of 2 — Enter Aadhaar number</Text>
          </LinearGradient>
          <View style={{ padding: 24, gap: 16 }}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} /><View style={styles.stepLine} /><View style={styles.stepDot} />
            </View>
            <Text style={styles.fieldLabel}>Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              placeholder="XXXX XXXX XXXX"
              keyboardType="numeric"
              maxLength={12}
              value={aadhar}
              onChangeText={setAadhar}
            />
            <Text style={styles.fieldHint}>An OTP will be sent to your Aadhaar-linked mobile number.</Text>
            <View style={styles.securityBadge}>
              <Ionicons name="lock-closed" size={14} color="#059669" />
              <Text style={styles.securityText}>End-to-end encrypted · ABDM compliant</Text>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, aadhar.length < 12 && { opacity: 0.5 }]} onPress={() => { if (aadhar.length === 12) setFlowStep("create_otp"); }} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (flowStep === "create_otp") {
      return (
        <View style={styles.container}>
          <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.header}>
            <TouchableOpacity onPress={() => setFlowStep("create_aadhar")} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify OTP</Text>
            <Text style={styles.headerSub}>Step 2 of 2 — Enter 6-digit OTP</Text>
          </LinearGradient>
          <View style={{ padding: 24, gap: 16 }}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} /><View style={[styles.stepLine, { backgroundColor: "#2563EB" }]} /><View style={[styles.stepDot, styles.stepDotActive]} />
            </View>
            <Text style={styles.fieldLabel}>OTP sent to ••••••{aadhar.slice(-4)}-linked mobile</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              keyboardType="numeric"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <TouchableOpacity style={[styles.primaryBtn, otp.length < 6 && { opacity: 0.5 }]} onPress={() => { if (otp.length === 6) { setIsLinked(true); setFlowStep("home"); } }} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Verify & Create ABHA ID</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("OTP Resent", "A new OTP has been sent to your registered mobile.")} style={{ alignItems: "center" }}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (flowStep === "link_abha") {
      return (
        <View style={styles.container}>
          <LinearGradient colors={["#1E40AF", "#2563EB"]} style={styles.header}>
            <TouchableOpacity onPress={() => setFlowStep("home")} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Link Existing ABHA</Text>
            <Text style={styles.headerSub}>Enter your 14-digit ABHA number</Text>
          </LinearGradient>
          <View style={{ padding: 24, gap: 16 }}>
            <Text style={styles.fieldLabel}>Your ABHA Number</Text>
            <TextInput
              style={styles.input}
              placeholder="XX-XXXX-XXXX-XXXX"
              keyboardType="numeric"
              value={abhaInput}
              onChangeText={setAbhaInput}
            />
            <TouchableOpacity style={[styles.primaryBtn, abhaInput.length < 14 && { opacity: 0.5 }]} onPress={() => { if (abhaInput.length >= 14) { setIsLinked(true); } }} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Link & Verify</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  // ── Flow: Linked (Dashboard) ─────────────────────────────────────────────

  const abha = SEED_ABHA;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1E40AF", "#2563EB", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ABHA Health ID</Text>
        <Text style={styles.headerSub}>Linked · All records synced</Text>
      </LinearGradient>

      {/* ABHA Card */}
      <LinearGradient colors={["#1E40AF", "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.abhaCard}>
        <View style={styles.abhaCardHeader}>
          <Text style={styles.abhaCardLabel}>ABHA Health ID</Text>
          <View style={styles.abhaLinkedBadge}><Ionicons name="shield-checkmark" size={12} color="#34D399" /><Text style={styles.abhaLinkedText}>Verified</Text></View>
        </View>
        <Text style={styles.abhaNumber}>{abha.abhaNumber}</Text>
        <Text style={styles.abhaName}>{abha.name}</Text>
        <View style={styles.abhaMetaRow}>
          <Text style={styles.abhaMeta}>DOB: {abha.dob}</Text>
          <Text style={styles.abhaMeta}>Gender: {abha.gender}</Text>
        </View>
        <View style={styles.abhaStatsRow}>
          <View style={styles.abhaStatItem}><Text style={styles.abhaStatNum}>{abha.linkedHospitals}</Text><Text style={styles.abhaStatLabel}>Hospitals</Text></View>
          <View style={styles.abhaStatDivider} />
          <View style={styles.abhaStatItem}><Text style={styles.abhaStatNum}>{abha.linkedRecords}</Text><Text style={styles.abhaStatLabel}>Records</Text></View>
          <View style={styles.abhaStatDivider} />
          <View style={styles.abhaStatItem}><Text style={styles.abhaStatNum}>Since</Text><Text style={styles.abhaStatLabel}>{abha.createdOn}</Text></View>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["records", "consent"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "records" ? "Linked Records" : "Consent Manager"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Records Tab */}
      {tab === "records" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Text style={styles.sectionLabel}>{LINKED_RECORDS.length} Records Linked to ABHA</Text>
          {LINKED_RECORDS.map((rec, i) => (
            <View key={i} style={styles.recordCard}>
              <View style={styles.recordTypeChip}>
                <Text style={styles.recordTypeText}>{rec.type}</Text>
              </View>
              <Text style={styles.recordTitle}>{rec.title}</Text>
              <View style={styles.recordMeta}>
                <Ionicons name="business" size={12} color="#94A3B8" />
                <Text style={styles.recordMetaText}>{rec.hospital}</Text>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={styles.recordMetaText}>{rec.date}</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert("View Record", `Record: ${rec.title}\n\nFull document viewer available in the complete build.`)}>
                <Text style={styles.viewRecordLink}>View →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Consent Tab */}
      {tab === "consent" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Text style={styles.sectionLabel}>Consent Requests</Text>
          {consentRequests.map(cr => (
            <View key={cr.id} style={styles.consentCard}>
              <View style={styles.consentHeader}>
                <Text style={styles.consentFrom}>{cr.from}</Text>
                <View style={[styles.consentStatusBadge, { backgroundColor: cr.status === "Pending" ? "#FEF3C7" : cr.status === "Approved" ? "#D1FAE5" : "#FEE2E2" }]}>
                  <Text style={[styles.consentStatusText, { color: cr.status === "Pending" ? "#B45309" : cr.status === "Approved" ? "#059669" : "#DC2626" }]}>{cr.status}</Text>
                </View>
              </View>
              <Text style={styles.consentPurpose}>{cr.purpose}</Text>
              <Text style={styles.consentDate}>{cr.date}</Text>
              {cr.status === "Pending" && (
                <View style={styles.consentActions}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveConsent(cr.id)}>
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevokeConsent(cr.id)}>
                    <Text style={styles.revokeBtnText}>Deny</Text>
                  </TouchableOpacity>
                </View>
              )}
              {cr.status === "Approved" && (
                <TouchableOpacity onPress={() => handleRevokeConsent(cr.id)}>
                  <Text style={styles.revokeLink}>Revoke Access</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 18, gap: 4 },
  backBtn: { marginBottom: 6 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", fontFamily: FONTS.displayBold },
  headerSub: { color: "#BFDBFE", fontSize: 12, fontFamily: FONTS.regular },

  infoBanner: { backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg, padding: 14, flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  infoText: { fontSize: 13, color: "#1D4ED8", flex: 1, lineHeight: 20 },

  benefitCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 12, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  benefitTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 13, color: "#334155", flex: 1 },

  stepIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 },
  stepDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#E2E8F0", borderWidth: 2, borderColor: "#94A3B8" },
  stepDotActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#E2E8F0", maxWidth: 80 },

  fieldLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  fieldHint: { fontSize: 12, color: "#94A3B8" },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: RADIUS.md, padding: 14, fontSize: 16, color: "#0F172A", letterSpacing: 2 },
  securityBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", borderRadius: RADIUS.md, padding: 10 },
  securityText: { fontSize: 12, color: "#059669", fontWeight: "600" },
  resendText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },

  primaryBtn: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, ...SHADOWS.sm },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  secondaryBtn: { backgroundColor: "#EFF6FF", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#BFDBFE" },
  secondaryBtnText: { color: "#2563EB", fontWeight: "800", fontSize: 15 },

  abhaCard: { margin: 16, borderRadius: RADIUS.squircle, padding: 20, gap: 8, ...SHADOWS.md },
  abhaCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  abhaCardLabel: { color: "#BFDBFE", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  abhaLinkedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  abhaLinkedText: { color: "#34D399", fontSize: 11, fontWeight: "700" },
  abhaNumber: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: 2, fontFamily: FONTS.displayBold },
  abhaName: { color: "#BFDBFE", fontSize: 15, fontWeight: "600" },
  abhaMetaRow: { flexDirection: "row", gap: 16 },
  abhaMeta: { color: "#93C5FD", fontSize: 12 },
  abhaStatsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: RADIUS.md, padding: 12, marginTop: 4 },
  abhaStatItem: { flex: 1, alignItems: "center", gap: 2 },
  abhaStatNum: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  abhaStatLabel: { color: "#BFDBFE", fontSize: 10 },
  abhaStatDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },

  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2563EB" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#2563EB", fontWeight: "700" },

  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },

  recordCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 14, gap: 6, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  recordTypeChip: { backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, alignSelf: "flex-start" },
  recordTypeText: { fontSize: 10, fontWeight: "700", color: "#1D4ED8", textTransform: "uppercase" },
  recordTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  recordMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  recordMetaText: { fontSize: 11, color: "#94A3B8" },
  viewRecordLink: { fontSize: 13, fontWeight: "700", color: "#2563EB" },

  consentCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 14, gap: 8, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  consentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  consentFrom: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  consentStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  consentStatusText: { fontSize: 11, fontWeight: "700" },
  consentPurpose: { fontSize: 13, color: "#475569" },
  consentDate: { fontSize: 11, color: "#94A3B8" },
  consentActions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, backgroundColor: "#2563EB", paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: "center" },
  approveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  revokeBtn: { flex: 1, backgroundColor: "#FEE2E2", paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: "center" },
  revokeBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
  revokeLink: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
});
