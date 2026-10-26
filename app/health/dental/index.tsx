import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RADIUS, SHADOWS, FONTS } from "@/constants/config";

// ── Seed Data ─────────────────────────────────────────────────────────────────

const DENTISTS = [
  { id: "d1", name: "Dr. Ramesh Gupta", specialty: "Prosthodontics & Implants", exp: 15, rating: 4.9, fee: 400, nextSlot: "Today 5:00 PM", verified: true, consultations: 342 },
  { id: "d2", name: "Dr. Sunita Agarwal", specialty: "Orthodontics (Braces)", exp: 12, rating: 4.8, fee: 350, nextSlot: "Tomorrow 10:00 AM", verified: true, consultations: 280 },
  { id: "d3", name: "Dr. Kiran Reddy", specialty: "Root Canal & Endodontics", exp: 10, rating: 4.7, fee: 300, nextSlot: "Today 7:00 PM", verified: true, consultations: 215 },
  { id: "d4", name: "Dr. Meena Joshi", specialty: "Pediatric Dentistry", exp: 8, rating: 4.8, fee: 250, nextSlot: "Tomorrow 9:00 AM", verified: false, consultations: 178 },
];

const PACKAGES = [
  { id: "p1", name: "Basic Dental Checkup", icon: "search", color: "#0D9488", bg: "#CCFBF1", price: 299, original: 499, desc: "Oral exam, X-ray, cleaning advice", includes: ["Full mouth examination", "Dental X-ray", "Plaque assessment", "Treatment recommendations"], popular: false },
  { id: "p2", name: "Scaling & Polishing", icon: "sparkles", color: "#6366F1", bg: "#EEF2FF", price: 799, original: 1200, desc: "Professional cleaning & tartar removal", includes: ["Ultrasonic scaling", "Manual tartar removal", "Polish & stain removal", "Fluoride application"], popular: true },
  { id: "p3", name: "Root Canal Treatment", icon: "construct", color: "#D97706", bg: "#FEF3C7", price: 2999, original: 4500, desc: "Single tooth root canal therapy", includes: ["Pulp removal & cleaning", "Canal shaping & filling", "Temporary cap", "Follow-up visit"], popular: false },
  { id: "p4", name: "Teeth Whitening", icon: "sunny", color: "#DB2777", bg: "#FCE7F3", price: 1999, original: 3500, desc: "Professional in-chair whitening", includes: ["Shade assessment", "Bleaching treatment", "Post-whitening kit", "Maintenance tips"], popular: false },
  { id: "p5", name: "Dental Crown / Cap", icon: "shield", color: "#7C3AED", bg: "#EDE9FE", price: 4999, original: 7000, desc: "Permanent ceramic crown for damaged tooth", includes: ["Crown preparation", "Impression & lab work", "Crown fitting & cementation", "Bite adjustment"], popular: false },
  { id: "p6", name: "Braces Consultation", icon: "git-merge", color: "#059669", bg: "#D1FAE5", price: 0, original: 500, desc: "Free orthodontic assessment", includes: ["3D bite analysis", "Photo documentation", "Treatment timeline", "Metal / ceramic / aligners comparison"], popular: false },
];

const DENTAL_FINDINGS = [
  { id: "f1", date: "12 Aug 2026", dentist: "Dr. Ramesh Gupta", finding: "Mild tartar buildup on lower incisors", treatment: "Scaling done", nextVisit: "6 months" },
  { id: "f2", date: "3 Mar 2026", dentist: "Dr. Sunita Agarwal", finding: "Slight crowding (lower arch)", treatment: "Braces consultation advised", nextVisit: "3 months" },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = "dentists" | "packages" | "vault";

export default function DentalScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dentists");
  const [selectedPkg, setSelectedPkg] = useState<typeof PACKAGES[0] | null>(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#1D4ED8", "#2563EB", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dental Care</Text>
        <Text style={styles.headerSub}>Find dentists • Packages • Dental records</Text>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["dentists", "packages", "vault"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "dentists" ? "Find Dentist" : t === "packages" ? "Packages" : "Dental Vault"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab: Find Dentist ────────────────────────────────────────────────── */}
      {tab === "dentists" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>Community Verified Dentists</Text>
          {DENTISTS.map(doc => (
            <View key={doc.id} style={styles.dentistCard}>
              <View style={styles.dentistHeader}>
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.dentistName}>{doc.name}</Text>
                    {doc.verified && <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>}
                  </View>
                  <Text style={styles.dentistSpec}>{doc.specialty} · {doc.exp} yrs</Text>
                </View>
                <Text style={styles.ratingBadge}>⭐ {doc.rating}</Text>
              </View>
              <View style={styles.dentistMetaRow}>
                <Text style={styles.metaText}>{doc.consultations} community consults</Text>
                <Text style={styles.nextSlot}>🕐 {doc.nextSlot}</Text>
              </View>
              <View style={styles.dentistFooter}>
                <Text style={styles.feeText}>₹{doc.fee} / visit</Text>
                <TouchableOpacity onPress={() => Alert.alert("Book Slot", `Booking dental consultation with ${doc.name}\n\nNext slot: ${doc.nextSlot}\n\nYou will receive a confirmation SMS.`, [{ text: "Confirm" }])} style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Tab: Packages ─────────────────────────────────────────────────── */}
      {tab === "packages" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>Dental Treatment Packages</Text>
          {PACKAGES.map(pkg => (
            <TouchableOpacity key={pkg.id} style={styles.pkgCard} onPress={() => setSelectedPkg(pkg)} activeOpacity={0.85}>
              <View style={styles.pkgHeader}>
                <View style={[styles.pkgIcon, { backgroundColor: pkg.bg }]}>
                  <Ionicons name={pkg.icon as any} size={20} color={pkg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.pkgTitleRow}>
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    {pkg.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
                  </View>
                  <Text style={styles.pkgDesc}>{pkg.desc}</Text>
                </View>
              </View>
              <View style={styles.pkgFooter}>
                <View>
                  {pkg.price === 0
                    ? <Text style={styles.pkgFree}>FREE</Text>
                    : <>
                        <Text style={styles.pkgPrice}>₹{pkg.price}</Text>
                        <Text style={styles.pkgOriginal}>₹{pkg.original}</Text>
                      </>
                  }
                </View>
                <View style={styles.pkgSeeMore}>
                  <Text style={styles.pkgSeeMoreText}>View & Book →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Tab: Dental Vault ─────────────────────────────────────────────── */}
      {tab === "vault" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          <View style={styles.vaultBanner}>
            <Ionicons name="shield-checkmark" size={28} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.vaultTitle}>Your Dental History</Text>
              <Text style={styles.vaultSub}>All dental findings, treatments & follow-up reminders in one place</Text>
            </View>
          </View>
          {DENTAL_FINDINGS.length === 0 ? (
            <Text style={styles.emptyText}>No dental records yet. Book a checkup to start your dental vault.</Text>
          ) : (
            DENTAL_FINDINGS.map(f => (
              <View key={f.id} style={styles.findingCard}>
                <View style={styles.findingHeader}>
                  <Text style={styles.findingDate}>{f.date}</Text>
                  <Text style={styles.findingDentist}>{f.dentist}</Text>
                </View>
                <Text style={styles.findingLabel}>Finding</Text>
                <Text style={styles.findingText}>{f.finding}</Text>
                <Text style={styles.findingLabel}>Treatment Given</Text>
                <Text style={styles.findingText}>{f.treatment}</Text>
                <View style={styles.nextVisitRow}>
                  <Ionicons name="time-outline" size={14} color="#2563EB" />
                  <Text style={styles.nextVisitText}>Next visit in: {f.nextVisit}</Text>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addRecordBtn} onPress={() => Alert.alert("Upload Record", "Tap 'Upload' to add dental X-rays, prescriptions or treatment notes.\n\n(Full camera & document picker available in complete build)")}>
            <Ionicons name="cloud-upload" size={18} color="#2563EB" />
            <Text style={styles.addRecordText}>Upload Dental Record</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Package Detail Modal */}
      {selectedPkg && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setSelectedPkg(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalDrag} />
              <View style={styles.modalHeader}>
                <View style={[styles.pkgIcon, { backgroundColor: selectedPkg.bg }]}>
                  <Ionicons name={selectedPkg.icon as any} size={22} color={selectedPkg.color} />
                </View>
                <Text style={styles.modalTitle}>{selectedPkg.name}</Text>
              </View>
              <Text style={styles.modalDesc}>{selectedPkg.desc}</Text>
              <Text style={styles.modalIncludesTitle}>What's Included</Text>
              {selectedPkg.includes.map((item, i) => (
                <View key={i} style={styles.includeRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                  <Text style={styles.includeText}>{item}</Text>
                </View>
              ))}
              <View style={styles.modalPriceRow}>
                {selectedPkg.price === 0
                  ? <Text style={styles.modalFree}>FREE</Text>
                  : <><Text style={styles.modalPrice}>₹{selectedPkg.price}</Text><Text style={styles.modalOriginal}>₹{selectedPkg.original}</Text></>
                }
              </View>
              <TouchableOpacity style={[styles.bookBtn, { paddingHorizontal: 0, width: "100%" }]} onPress={() => { setSelectedPkg(null); Alert.alert("Package Booked", `Your ${selectedPkg.name} package has been confirmed. A dentist will contact you to schedule the session.`); }}>
                <Text style={styles.bookBtnText}>Book This Package</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedPkg(null)} style={{ alignItems: "center", paddingVertical: 14 }}>
                <Text style={{ color: "#94A3B8", fontWeight: "600" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#2563EB" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#2563EB", fontWeight: "700" },

  scrollContent: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },

  dentistCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, gap: 10, borderWidth: 1, borderColor: "#E2E8F0", ...SHADOWS.card },
  dentistHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dentistName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  verifiedText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  dentistSpec: { fontSize: 12, color: "#64748B", marginTop: 2 },
  ratingBadge: { fontSize: 12, fontWeight: "700", color: "#92400E", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  dentistMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaText: { fontSize: 11, color: "#94A3B8" },
  nextSlot: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  dentistFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10 },
  feeText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  bookBtn: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: "center" },
  bookBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  pkgCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 12, ...SHADOWS.card },
  pkgHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pkgIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  pkgTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pkgName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  popularBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  popularText: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  pkgDesc: { fontSize: 12, color: "#64748B", marginTop: 3 },
  pkgFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10 },
  pkgFree: { fontSize: 18, fontWeight: "900", color: "#059669" },
  pkgPrice: { fontSize: 18, fontWeight: "900", color: "#2563EB" },
  pkgOriginal: { fontSize: 12, color: "#94A3B8", textDecorationLine: "line-through" },
  pkgSeeMore: {},
  pkgSeeMoreText: { color: "#2563EB", fontSize: 13, fontWeight: "700" },

  vaultBanner: { backgroundColor: "#DBEAFE", borderRadius: RADIUS.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  vaultTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8" },
  vaultSub: { fontSize: 12, color: "#3B82F6", marginTop: 2 },
  emptyText: { color: "#94A3B8", textAlign: "center", paddingVertical: 24, fontSize: 13 },

  findingCard: { backgroundColor: "#FFFFFF", borderRadius: RADIUS.squircle, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 8, ...SHADOWS.card },
  findingHeader: { flexDirection: "row", justifyContent: "space-between" },
  findingDate: { fontSize: 12, color: "#94A3B8" },
  findingDentist: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  findingLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 },
  findingText: { fontSize: 13, color: "#1E293B" },
  nextVisitRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", borderRadius: RADIUS.sm, padding: 8 },
  nextVisitText: { fontSize: 12, fontWeight: "600", color: "#1D4ED8" },

  addRecordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#DBEAFE", borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: "#BFDBFE" },
  addRecordText: { fontSize: 14, fontWeight: "700", color: "#2563EB" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, paddingBottom: 32 },
  modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", flex: 1 },
  modalDesc: { fontSize: 13, color: "#64748B" },
  modalIncludesTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 4 },
  includeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  includeText: { fontSize: 13, color: "#1E293B", flex: 1 },
  modalPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  modalFree: { fontSize: 24, fontWeight: "900", color: "#059669" },
  modalPrice: { fontSize: 24, fontWeight: "900", color: "#2563EB" },
  modalOriginal: { fontSize: 14, color: "#94A3B8", textDecorationLine: "line-through" },
});
