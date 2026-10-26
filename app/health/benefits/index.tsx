import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { HealthBenefitWalletDto } from "@/types/health";

type Tab = "wallet" | "ecard" | "claims";
type ClaimStep = "list" | "intimate" | "track";

interface InsuranceClaim {
  id: string;
  hospitalName: string;
  diagnosis: string;
  admissionDate: string;
  amount: number;
  status: "SUBMITTED" | "UNDER_REVIEW" | "DOCS_REQUIRED" | "APPROVED" | "REJECTED" | "SETTLED";
  claimNumber: string;
  tpa: string;
  updatedAt: string;
}

const SEED_CLAIMS: InsuranceClaim[] = [
  { id: "c1", hospitalName: "Apollo Hospitals", diagnosis: "Appendicitis - Appendectomy", admissionDate: "12 Sep 2026", amount: 85000, status: "SETTLED", claimNumber: "CLM-2026-00147", tpa: "Medi Assist", updatedAt: "28 Sep 2026" },
  { id: "c2", hospitalName: "Manipal Hospital", diagnosis: "Knee Replacement Surgery", admissionDate: "01 Oct 2026", amount: 230000, status: "UNDER_REVIEW", claimNumber: "CLM-2026-00298", tpa: "Medi Assist", updatedAt: "15 Oct 2026" },
];

const STATUS_CONFIG: Record<InsuranceClaim["status"], { label: string; color: string; bg: string }> = {
  SUBMITTED:     { label: "Submitted",      color: "#2563EB", bg: "#DBEAFE" },
  UNDER_REVIEW:  { label: "Under Review",   color: "#D97706", bg: "#FEF3C7" },
  DOCS_REQUIRED: { label: "Docs Required",  color: "#DC2626", bg: "#FEE2E2" },
  APPROVED:      { label: "Approved",       color: "#059669", bg: "#D1FAE5" },
  REJECTED:      { label: "Rejected",       color: "#9F1239", bg: "#FFE4E6" },
  SETTLED:       { label: "Settled ✓",      color: "#166534", bg: "#DCFCE7" },
};

const CLAIM_STEPS: InsuranceClaim["status"][] = ["SUBMITTED", "UNDER_REVIEW", "DOCS_REQUIRED", "APPROVED", "SETTLED"];

export default function HealthBenefitsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("wallet");
  const [wallet, setWallet] = useState<HealthBenefitWalletDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimStep, setClaimStep] = useState<ClaimStep>("list");
  const [claims, setClaims] = useState<InsuranceClaim[]>(SEED_CLAIMS);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [intimateForm, setIntimateForm] = useState({ hospital: "", diagnosis: "", date: "", amount: "", tpa: "Medi Assist" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    healthService.getBenefitWallet().then(w => { setWallet(w); setLoading(false); });
  }, []);

  const handleIntimateSubmit = () => {
    if (!intimateForm.hospital || !intimateForm.diagnosis) {
      Alert.alert("Missing Info", "Please fill in hospital name and diagnosis.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newClaim: InsuranceClaim = {
        id: `c${Date.now()}`,
        hospitalName: intimateForm.hospital,
        diagnosis: intimateForm.diagnosis,
        admissionDate: intimateForm.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        amount: parseInt(intimateForm.amount) || 0,
        status: "SUBMITTED",
        claimNumber: `CLM-2026-0${Math.floor(Math.random() * 900 + 100)}`,
        tpa: intimateForm.tpa,
        updatedAt: "Today",
      };
      setClaims(prev => [newClaim, ...prev]);
      setIntimateForm({ hospital: "", diagnosis: "", date: "", amount: "", tpa: "Medi Assist" });
      setSubmitting(false);
      setClaimStep("list");
      setActiveTab("claims");
      Alert.alert("Claim Intimated ✓", `Claim number ${newClaim.claimNumber} has been registered. Your TPA will contact you within 24 hours.`);
    }, 1200);
  };

  const tabs = [
    { id: "wallet" as Tab, label: "Health Wallet", icon: "card" },
    { id: "ecard" as Tab, label: "Insurance eCard", icon: "id-card" },
    { id: "claims" as Tab, label: "Claims", icon: "document-text" },
  ];

  if (loading || !wallet) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0D9488" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity key={t.id} style={[styles.tab, activeTab === t.id && styles.activeTab]} onPress={() => { setActiveTab(t.id); setClaimStep("list"); }}>
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.id ? "#0D9488" : "#6B7280"} />
            <Text style={[styles.tabText, activeTab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── WALLET TAB ── */}
        {activeTab === "wallet" && (
          <>
            <LinearGradient colors={["#1E3A8A", "#2563EB", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.creditCard}>
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
                      <Text style={[styles.statusText, claim.status === "REIMBURSED" ? styles.reimbursedText : styles.approvedText]}>{claim.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── eCARD TAB ── */}
        {activeTab === "ecard" && (
          <>
            <LinearGradient colors={["#1E40AF", "#2563EB", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ecardGradient}>
              <View style={styles.ecardHeader}>
                <View>
                  <Text style={styles.ecardTag}>HEALTH INSURANCE</Text>
                  <Text style={styles.ecardInsurer}>Star Health & Allied Insurance</Text>
                </View>
                <Ionicons name="shield-checkmark" size={28} color="#93C5FD" />
              </View>
              <View style={styles.ecardBody}>
                <View style={styles.ecardField}>
                  <Text style={styles.ecardFieldLabel}>Insured Name</Text>
                  <Text style={styles.ecardFieldVal}>Rahul Sharma</Text>
                </View>
                <View style={styles.ecardField}>
                  <Text style={styles.ecardFieldLabel}>Policy Number</Text>
                  <Text style={styles.ecardFieldVal}>P/211122/01/2026/012847</Text>
                </View>
                <View style={styles.ecardRow2}>
                  <View style={styles.ecardField}>
                    <Text style={styles.ecardFieldLabel}>Sum Insured</Text>
                    <Text style={styles.ecardFieldVal}>₹5,00,000</Text>
                  </View>
                  <View style={styles.ecardField}>
                    <Text style={styles.ecardFieldLabel}>Valid Till</Text>
                    <Text style={styles.ecardFieldVal}>31 Mar 2027</Text>
                  </View>
                </View>
              </View>
              <View style={styles.ecardFooter}>
                <View>
                  <Text style={styles.ecardFooterLabel}>TPA</Text>
                  <Text style={styles.ecardFooterVal}>Medi Assist India</Text>
                </View>
                <View>
                  <Text style={styles.ecardFooterLabel}>TPA Helpline</Text>
                  <Text style={styles.ecardFooterVal}>1800-419-9999</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Family Members Covered</Text>
              {["Rahul Sharma (Self)", "Sneha Sharma (Spouse)", "Arjun Sharma (Son, 8)", "Meena Sharma (Mother)"].map((m, i) => (
                <View key={i} style={styles.memberRow}>
                  <View style={styles.memberAvatar}><Ionicons name="person" size={14} color="#2563EB" /></View>
                  <Text style={styles.memberName}>{m}</Text>
                  <View style={styles.coveredBadge}><Text style={styles.coveredBadgeText}>Covered</Text></View>
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Cashless Network Hospitals</Text>
              <Text style={styles.sectionSub}>6,000+ hospitals across India</Text>
              <TouchableOpacity style={styles.findHospBtn} onPress={() => {}}>
                <Ionicons name="location" size={14} color="#2563EB" />
                <Text style={styles.findHospBtnText}>Find Nearest Network Hospital</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.downloadCardBtn} onPress={() => Alert.alert("eCard Downloaded", "Insurance eCard saved to your device gallery.")}>
              <Ionicons name="download" size={16} color="#FFFFFF" />
              <Text style={styles.downloadCardBtnText}>Download eCard</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── CLAIMS TAB ── */}
        {activeTab === "claims" && claimStep === "list" && (
          <>
            <View style={styles.claimsActionRow}>
              <TouchableOpacity style={styles.intimateBtn} onPress={() => setClaimStep("intimate")}>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.intimateBtnText}>Intimate Claim</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.downloadFormsBtn} onPress={() => Alert.alert("Download Forms", "Claim forms downloaded to your device.")}>
                <Ionicons name="download" size={14} color="#4F46E5" />
                <Text style={styles.downloadFormsBtnText}>Claim Forms</Text>
              </TouchableOpacity>
            </View>

            {claims.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <TouchableOpacity key={c.id} style={styles.insuranceClaimCard} onPress={() => { setSelectedClaim(c); setClaimStep("track"); }}>
                  <View style={styles.insuranceClaimTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insuranceClaimHosp}>{c.hospitalName}</Text>
                      <Text style={styles.insuranceClaimDiag}>{c.diagnosis}</Text>
                      <Text style={styles.insuranceClaimNum}>{c.claimNumber}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={styles.insuranceClaimAmt}>₹{c.amount.toLocaleString("en-IN")}</Text>
                      <View style={[styles.claimStatusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.claimStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.insuranceClaimMeta}>
                    <Text style={styles.insuranceClaimMetaText}>Admitted: {c.admissionDate}</Text>
                    <Text style={styles.insuranceClaimMetaText}>Updated: {c.updatedAt}</Text>
                  </View>
                  <View style={styles.trackHintRow}>
                    <Text style={styles.trackHintText}>Tap to track status</Text>
                    <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })}

            {claims.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No claims yet</Text>
                <Text style={styles.emptySub}>Use "Intimate Claim" when you get admitted to a hospital</Text>
              </View>
            )}
          </>
        )}

        {/* Intimate Claim Form */}
        {activeTab === "claims" && claimStep === "intimate" && (
          <>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={() => setClaimStep("list")}>
                <Ionicons name="arrow-back" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Intimate a Claim</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formNote}>Notify your insurer immediately on hospital admission. Do this within 24 hours for cashless claims.</Text>
              {[
                { label: "Hospital Name *", key: "hospital", placeholder: "e.g. Apollo Hospital, Bengaluru" },
                { label: "Diagnosis / Reason for Admission *", key: "diagnosis", placeholder: "e.g. Appendicitis" },
                { label: "Admission Date", key: "date", placeholder: "DD MMM YYYY" },
                { label: "Estimated Treatment Cost (₹)", key: "amount", placeholder: "e.g. 150000" },
              ].map(f => (
                <View key={f.key} style={styles.formField}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={intimateForm[f.key as keyof typeof intimateForm]}
                    onChangeText={v => setIntimateForm(prev => ({ ...prev, [f.key]: v }))}
                    keyboardType={f.key === "amount" ? "numeric" : "default"}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>TPA / Insurance Company</Text>
                <View style={styles.tpaRow}>
                  {["Medi Assist", "Paramount", "FHPL", "E-Meditek"].map(tpa => (
                    <TouchableOpacity
                      key={tpa}
                      style={[styles.tpaChip, intimateForm.tpa === tpa && styles.activeTpaChip]}
                      onPress={() => setIntimateForm(prev => ({ ...prev, tpa }))}
                    >
                      <Text style={[styles.tpaChipText, intimateForm.tpa === tpa && styles.activeTpaChipText]}>{tpa}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.submitClaimBtn, submitting && { opacity: 0.7 }]}
                onPress={handleIntimateSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitClaimBtnText}>{submitting ? "Submitting..." : "Submit Intimation"}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Track Claim */}
        {activeTab === "claims" && claimStep === "track" && selectedClaim && (
          <>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={() => setClaimStep("list")}>
                <Ionicons name="arrow-back" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.formTitle}>Track Claim</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.claimTrackHosp}>{selectedClaim.hospitalName}</Text>
              <Text style={styles.claimTrackDiag}>{selectedClaim.diagnosis}</Text>
              <Text style={styles.claimTrackNum}>{selectedClaim.claimNumber}</Text>
              <Text style={styles.claimTrackAmt}>₹{selectedClaim.amount.toLocaleString("en-IN")} claimed</Text>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Claim Journey</Text>
              {CLAIM_STEPS.map((step, i) => {
                const currentIdx = CLAIM_STEPS.indexOf(selectedClaim.status);
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const cfg = STATUS_CONFIG[step];
                return (
                  <View key={step} style={styles.trackStepRow}>
                    <View style={styles.trackStepLeft}>
                      <View style={[styles.trackDot, isDone && { backgroundColor: cfg.color }]}>
                        {isDone && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                      </View>
                      {i < CLAIM_STEPS.length - 1 && <View style={[styles.trackLine, isDone && { backgroundColor: cfg.color }]} />}
                    </View>
                    <View style={[styles.trackStepContent, isCurrent && styles.currentStepContent]}>
                      <Text style={[styles.trackStepLabel, isCurrent && { color: cfg.color, fontWeight: "800" }]}>{cfg.label}</Text>
                      {isCurrent && <Text style={styles.trackStepCurrent}>Current status · Updated {selectedClaim.updatedAt}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>TPA Contact</Text>
              <View style={styles.tpaContactRow}>
                <Ionicons name="call" size={14} color="#4F46E5" />
                <Text style={styles.tpaContactText}>{selectedClaim.tpa} · 1800-419-9999</Text>
              </View>
              <TouchableOpacity style={styles.callTpaBtn} onPress={() => Alert.alert("Calling TPA", `Connecting to ${selectedClaim.tpa}…`)}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.callTpaBtnText}>Call TPA Now</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#0D9488" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  activeTabText: { color: "#0D9488", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  creditCard: { borderRadius: 22, padding: 20, shadowColor: "#1E3A8A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
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
  sectionCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  sectionSub: { fontSize: 12, color: "#6B7280", marginTop: -4 },
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
  approvedText: { color: "#1D4ED8" },
  // eCard
  ecardGradient: { borderRadius: 22, padding: 20, gap: 12 },
  ecardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  ecardTag: { fontSize: 10, fontWeight: "800", color: "#93C5FD", letterSpacing: 1 },
  ecardInsurer: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  ecardBody: { gap: 10, marginTop: 8 },
  ecardRow2: { flexDirection: "row", gap: 24 },
  ecardField: { gap: 2 },
  ecardFieldLabel: { fontSize: 10, color: "#93C5FD", fontWeight: "600" },
  ecardFieldVal: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
  ecardFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 12 },
  ecardFooterLabel: { fontSize: 10, color: "#93C5FD" },
  ecardFooterVal: { fontSize: 12, color: "#FFFFFF", fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  memberAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  memberName: { flex: 1, fontSize: 13, color: "#1E293B", fontWeight: "600" },
  coveredBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  coveredBadgeText: { fontSize: 10, color: "#166534", fontWeight: "700" },
  findHospBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFF6FF", padding: 12, borderRadius: 12 },
  findHospBtnText: { fontSize: 13, color: "#2563EB", fontWeight: "700" },
  downloadCardBtn: { backgroundColor: "#2563EB", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  downloadCardBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  // Claims list
  claimsActionRow: { flexDirection: "row", gap: 10 },
  intimateBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 12 },
  intimateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  downloadFormsBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#4F46E5", borderRadius: 12, paddingVertical: 12 },
  downloadFormsBtnText: { color: "#4F46E5", fontWeight: "700", fontSize: 12 },
  insuranceClaimCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  insuranceClaimTop: { flexDirection: "row", gap: 10 },
  insuranceClaimHosp: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  insuranceClaimDiag: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  insuranceClaimNum: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  insuranceClaimAmt: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  claimStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  claimStatusText: { fontSize: 11, fontWeight: "700" },
  insuranceClaimMeta: { flexDirection: "row", justifyContent: "space-between" },
  insuranceClaimMetaText: { fontSize: 11, color: "#9CA3AF" },
  trackHintRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  trackHintText: { fontSize: 11, color: "#9CA3AF" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  // Intimate form
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  formTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 14 },
  formNote: { fontSize: 12, color: "#4F46E5", backgroundColor: "#EEF2FF", padding: 10, borderRadius: 10, lineHeight: 18 },
  formField: { gap: 6 },
  formLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  formInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 13, color: "#1E293B" },
  tpaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tpaChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  activeTpaChip: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  tpaChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  activeTpaChipText: { color: "#4F46E5", fontWeight: "700" },
  submitClaimBtn: { backgroundColor: "#4F46E5", borderRadius: 14, padding: 14, alignItems: "center" },
  submitClaimBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  // Track
  claimTrackHosp: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  claimTrackDiag: { fontSize: 13, color: "#4B5563" },
  claimTrackNum: { fontSize: 11, color: "#9CA3AF" },
  claimTrackAmt: { fontSize: 14, fontWeight: "700", color: "#4F46E5" },
  trackStepRow: { flexDirection: "row", gap: 12, minHeight: 44 },
  trackStepLeft: { alignItems: "center", width: 20 },
  trackDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  trackLine: { width: 2, flex: 1, backgroundColor: "#E5E7EB", marginTop: 2 },
  trackStepContent: { flex: 1, paddingBottom: 12 },
  currentStepContent: { backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginBottom: 4 },
  trackStepLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  trackStepCurrent: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  tpaContactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tpaContactText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },
  callTpaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4F46E5", borderRadius: 12, padding: 12, marginTop: 4 },
  callTpaBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
