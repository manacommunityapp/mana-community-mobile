import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ScanType = "xray" | "ultrasound" | "ct" | "mri" | "pet" | "mammogram";
type TabType = "book" | "centers" | "my";

interface ScanCategory {
  id: ScanType;
  label: string;
  icon: string;
  color: string;
  bg: string;
  basePrice: number;
  duration: string;
  preparation: string;
  contrast?: boolean;
}

interface Center {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  accreditation: string[];
  availableScans: ScanType[];
  reportTurnaround: string;
  rating: number;
  homeService: boolean;
  openNow: boolean;
}

interface BodyPart {
  id: string;
  label: string;
  scanTypes: ScanType[];
}

const SCAN_CATEGORIES: ScanCategory[] = [
  { id: "xray", label: "X-Ray", icon: "scan", color: "#0891B2", bg: "#ECFEFF", basePrice: 300, duration: "10–15 min", preparation: "Remove metal objects. No special prep." },
  { id: "ultrasound", label: "Ultrasound", icon: "radio-button-on", color: "#2563EB", bg: "#EFF6FF", basePrice: 799, duration: "20–30 min", preparation: "Abdominal USG: 4-hr fasting. Pelvic: full bladder." },
  { id: "ct", label: "CT Scan", icon: "aperture", color: "#7C3AED", bg: "#F5F3FF", basePrice: 2500, duration: "15–30 min", preparation: "Contrast CT: no food 4 hrs prior. Wear loose clothing.", contrast: true },
  { id: "mri", label: "MRI", icon: "magnet", color: "#059669", bg: "#ECFDF5", basePrice: 5000, duration: "30–60 min", preparation: "Remove all metal. Inform if claustrophobic or pregnant. No ferromagnetic implants." },
  { id: "pet", label: "PET-CT", icon: "nuclear", color: "#DC2626", bg: "#FEF2F2", basePrice: 18000, duration: "3–4 hrs", preparation: "12-hr fasting. No strenuous activity 24 hrs prior. Diabetics: insulin timing adjusted." },
  { id: "mammogram", label: "Mammography", icon: "woman", color: "#DB2777", bg: "#FDF2F8", basePrice: 1500, duration: "20–30 min", preparation: "Schedule D7–10 of cycle. No deodorant/powder on day." },
];

const BODY_PARTS: BodyPart[] = [
  { id: "chest", label: "Chest / Lungs", scanTypes: ["xray", "ct", "pet"] },
  { id: "abdomen", label: "Abdomen", scanTypes: ["ultrasound", "ct", "mri"] },
  { id: "brain", label: "Brain / Head", scanTypes: ["ct", "mri", "pet"] },
  { id: "spine", label: "Spine / Back", scanTypes: ["xray", "mri", "ct"] },
  { id: "knee", label: "Knee / Joint", scanTypes: ["xray", "mri"] },
  { id: "pelvis", label: "Pelvis / Gynaec", scanTypes: ["ultrasound", "mri", "mammogram"] },
  { id: "cardiac", label: "Heart / Cardiac", scanTypes: ["ct", "mri", "pet"] },
  { id: "thyroid", label: "Thyroid / Neck", scanTypes: ["ultrasound", "ct"] },
];

const CENTERS: Center[] = [
  {
    id: "c1", name: "Manipal Imaging & Diagnostics", address: "Sarjapur Main Road, Bengaluru",
    distanceKm: 2.3, accreditation: ["NABH", "ISO 9001", "ACR"], availableScans: ["xray", "ultrasound", "ct", "mri", "pet", "mammogram"],
    reportTurnaround: "Same day / 4–6 hrs", rating: 4.8, homeService: false, openNow: true
  },
  {
    id: "c2", name: "Apollo Radiology Centre", address: "Outer Ring Road, HSR Layout, Bengaluru",
    distanceKm: 3.7, accreditation: ["NABH", "JCI"], availableScans: ["xray", "ultrasound", "ct", "mri", "pet"],
    reportTurnaround: "2–4 hrs", rating: 4.9, homeService: false, openNow: true
  },
  {
    id: "c3", name: "SRL Diagnostics @ Mana", address: "Community Clubhouse, Ground Floor",
    distanceKm: 0.1, accreditation: ["NABL", "CAP"], availableScans: ["xray", "ultrasound"],
    reportTurnaround: "1–3 hrs", rating: 4.6, homeService: true, openNow: true
  },
  {
    id: "c4", name: "Medvision Imaging Koramangala", address: "5th Block, Koramangala, Bengaluru",
    distanceKm: 5.1, accreditation: ["NABH"], availableScans: ["xray", "ultrasound", "ct", "mri", "mammogram"],
    reportTurnaround: "6–12 hrs", rating: 4.5, homeService: false, openNow: false
  },
];

const MY_SCANS = [
  { id: "s1", type: "MRI", bodyPart: "Right Knee", center: "Manipal Imaging", date: "18 Oct 2026", status: "REPORT_READY", reportLink: "#" },
  { id: "s2", type: "Ultrasound", bodyPart: "Abdomen", center: "SRL Diagnostics", date: "5 Sep 2026", status: "REPORT_READY", reportLink: "#" },
  { id: "s3", type: "X-Ray", bodyPart: "Chest", center: "Apollo Radiology", date: "20 Aug 2026", status: "REPORT_READY", reportLink: "#" },
];

const TODAY = new Date();
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY); d.setDate(TODAY.getDate() + i);
  return { key: d.toISOString().split("T")[0], day: d.toLocaleDateString("en-IN", { weekday: "short" }), date: d.getDate(), month: d.toLocaleDateString("en-IN", { month: "short" }) };
});
const TIME_SLOTS = ["08:00 AM", "09:30 AM", "11:00 AM", "12:30 PM", "02:00 PM", "03:30 PM", "05:00 PM"];

export default function RadiologyScreen() {
  const [tab, setTab] = useState<TabType>("book");
  const [selectedScan, setSelectedScan] = useState<ScanType | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(DATES[0].key);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [referralDoc, setReferralDoc] = useState("");

  const scanInfo = selectedScan ? SCAN_CATEGORIES.find(s => s.id === selectedScan) : null;
  const centerInfo = selectedCenter ? CENTERS.find(c => c.id === selectedCenter) : null;

  const filteredCenters = selectedScan
    ? CENTERS.filter(c => c.availableScans.includes(selectedScan))
    : CENTERS;

  const handleConfirm = () => {
    if (!patientName.trim()) { Alert.alert("Required", "Enter patient name."); return; }
    if (!selectedTime) { Alert.alert("Required", "Select a time slot."); return; }
    setShowBookModal(false);
    Alert.alert(
      "Scan Booked ✓",
      `${scanInfo?.label} at ${centerInfo?.name}\n${selectedDate} at ${selectedTime}\n\nA confirmation will be sent. Bring your doctor's referral if available.`
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="scan" size={22} color="#94A3B8" />
          <View>
            <Text style={styles.headerTitle}>Radiology & Imaging</Text>
            <Text style={styles.headerSub}>X-Ray · Ultrasound · CT · MRI · PET-CT · Mammography</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabRow}>
        {(["book", "centers", "my"] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "book" ? "Book Scan" : t === "centers" ? "Imaging Centers" : "My Scans"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── BOOK TAB ── */}
        {tab === "book" && (
          <>
            <Text style={styles.sectionTitle}>Select Scan Type</Text>
            <View style={styles.scanGrid}>
              {SCAN_CATEGORIES.map(scan => (
                <TouchableOpacity
                  key={scan.id}
                  style={[styles.scanCard, { backgroundColor: scan.bg, borderColor: selectedScan === scan.id ? scan.color : "#E5E7EB" }, selectedScan === scan.id && { borderWidth: 2 }]}
                  onPress={() => setSelectedScan(selectedScan === scan.id ? null : scan.id)}
                >
                  <Ionicons name={scan.icon as any} size={24} color={scan.color} />
                  <Text style={[styles.scanLabel, { color: scan.color }]}>{scan.label}</Text>
                  <Text style={styles.scanPrice}>from ₹{scan.basePrice}</Text>
                  <Text style={styles.scanDuration}>{scan.duration}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {scanInfo && (
              <View style={[styles.prepCard, { borderLeftColor: scanInfo.color }]}>
                <Text style={styles.prepTitle}>Preparation — {scanInfo.label}</Text>
                <Text style={styles.prepText}>{scanInfo.preparation}</Text>
                {scanInfo.contrast && (
                  <View style={styles.contrastAlert}>
                    <Ionicons name="warning" size={13} color="#D97706" />
                    <Text style={styles.contrastText}>Contrast variant available — inform doctor about kidney function / allergies.</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Select Body Part</Text>
            <View style={styles.bodyGrid}>
              {BODY_PARTS.filter(b => !selectedScan || b.scanTypes.includes(selectedScan)).map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bodyChip, selectedBodyPart === b.id && styles.bodyChipActive]}
                  onPress={() => setSelectedBodyPart(selectedBodyPart === b.id ? null : b.id)}
                >
                  <Text style={[styles.bodyChipText, selectedBodyPart === b.id && styles.bodyChipTextActive]}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Select Imaging Center</Text>
            {filteredCenters.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.centerCard, selectedCenter === c.id && styles.centerCardActive]}
                onPress={() => setSelectedCenter(selectedCenter === c.id ? null : c.id)}
              >
                <View style={styles.centerTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.centerName}>{c.name}</Text>
                    <Text style={styles.centerAddress}>{c.address}</Text>
                  </View>
                  <View style={styles.centerRating}>
                    <Text style={styles.centerRatingText}>⭐ {c.rating}</Text>
                  </View>
                </View>
                <View style={styles.centerMetaRow}>
                  <Text style={styles.centerMeta}>{c.distanceKm} km away</Text>
                  <Text style={styles.centerMeta}>📋 Report: {c.reportTurnaround}</Text>
                  {c.openNow ? <Text style={styles.openNow}>Open Now</Text> : <Text style={styles.closedNow}>Closed</Text>}
                </View>
                <View style={styles.accredRow}>
                  {c.accreditation.map(a => (
                    <View key={a} style={styles.accredBadge}><Text style={styles.accredText}>{a}</Text></View>
                  ))}
                  {c.homeService && <View style={styles.homeBadge}><Text style={styles.homeText}>🏡 Home X-Ray</Text></View>}
                </View>
              </TouchableOpacity>
            ))}

            {selectedScan && selectedCenter && (
              <TouchableOpacity style={styles.proceedBtn} onPress={() => setShowBookModal(true)}>
                <Text style={styles.proceedBtnText}>Proceed to Book</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── CENTERS TAB ── */}
        {tab === "centers" && CENTERS.map(c => (
          <View key={c.id} style={styles.centerCard}>
            <View style={styles.centerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.centerName}>{c.name}</Text>
                <Text style={styles.centerAddress}>{c.address}</Text>
              </View>
              <View style={styles.centerRating}>
                <Text style={styles.centerRatingText}>⭐ {c.rating}</Text>
              </View>
            </View>
            <View style={styles.centerMetaRow}>
              <Text style={styles.centerMeta}>{c.distanceKm} km</Text>
              <Text style={styles.centerMeta}>Report: {c.reportTurnaround}</Text>
              {c.openNow ? <Text style={styles.openNow}>Open Now</Text> : <Text style={styles.closedNow}>Closed</Text>}
            </View>
            <View style={styles.accredRow}>
              {c.accreditation.map(a => <View key={a} style={styles.accredBadge}><Text style={styles.accredText}>{a}</Text></View>)}
            </View>
            <Text style={styles.availScans}>
              Available: {c.availableScans.map(s => SCAN_CATEGORIES.find(sc => sc.id === s)?.label).join(" · ")}
            </Text>
          </View>
        ))}

        {/* ── MY SCANS TAB ── */}
        {tab === "my" && MY_SCANS.map(scan => (
          <View key={scan.id} style={styles.myScanCard}>
            <View style={styles.myScanTopRow}>
              <View style={styles.myScanTypeBox}>
                <Text style={styles.myScanType}>{scan.type}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.myScanBody}>{scan.bodyPart}</Text>
                <Text style={styles.myScanCenter}>{scan.center}</Text>
              </View>
              <View style={styles.myScanReady}>
                <Text style={styles.myScanReadyText}>Report Ready</Text>
              </View>
            </View>
            <View style={styles.myScanFooter}>
              <Text style={styles.myScanDate}>{scan.date}</Text>
              <TouchableOpacity
                style={styles.viewReportBtn}
                onPress={() => Alert.alert("Report", "Opening encrypted report from Health Vault...")}
              >
                <Ionicons name="document-text" size={13} color="#0D9488" />
                <Text style={styles.viewReportText}>View Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={showBookModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            <TouchableOpacity onPress={() => setShowBookModal(false)}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View style={styles.bookingSummary}>
              <Text style={styles.summaryLabel}>Scan Type</Text>
              <Text style={styles.summaryValue}>{scanInfo?.label}</Text>
              <Text style={styles.summaryLabel}>Center</Text>
              <Text style={styles.summaryValue}>{centerInfo?.name}</Text>
              {selectedBodyPart && (<><Text style={styles.summaryLabel}>Body Part</Text><Text style={styles.summaryValue}>{BODY_PARTS.find(b => b.id === selectedBodyPart)?.label}</Text></>)}
            </View>

            <Text style={styles.fieldLabel}>Patient Name *</Text>
            <TextInput style={styles.input} placeholder="Full patient name" value={patientName} onChangeText={setPatientName} />

            <Text style={styles.fieldLabel}>Referring Doctor (optional)</Text>
            <TextInput style={styles.input} placeholder="Dr. Name / Hospital" value={referralDoc} onChangeText={setReferralDoc} />

            <Text style={styles.fieldLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {DATES.map(d => (
                <TouchableOpacity key={d.key} style={[styles.dateChip, selectedDate === d.key && styles.dateChipActive]} onPress={() => setSelectedDate(d.key)}>
                  <Text style={[styles.dateDay, selectedDate === d.key && { color: "#FFFFFF" }]}>{d.day}</Text>
                  <Text style={[styles.dateNum, selectedDate === d.key && { color: "#FFFFFF" }]}>{d.date}</Text>
                  <Text style={[styles.dateMon, selectedDate === d.key && { color: "#CBD5E1" }]}>{d.month}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Select Time Slot</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity key={slot} style={[styles.timeChip, selectedTime === slot && styles.timeChipActive]} onPress={() => setSelectedTime(slot)}>
                  <Text style={[styles.timeChipText, selectedTime === slot && styles.timeChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {scanInfo && (
              <View style={styles.prepReminder}>
                <Ionicons name="information-circle" size={14} color="#2563EB" />
                <Text style={styles.prepReminderText}>{scanInfo.preparation}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm Scan Booking — ₹{scanInfo?.basePrice ?? 0}+</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  tabRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#0F172A" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#0F172A", fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  scanGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  scanCard: { width: "30%", borderRadius: 12, padding: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  scanLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  scanPrice: { fontSize: 10, color: "#6B7280" },
  scanDuration: { fontSize: 9, color: "#9CA3AF" },
  prepCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderWidth: 1, borderColor: "#E5E7EB", gap: 6 },
  prepTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  prepText: { fontSize: 12, color: "#4B5563", lineHeight: 17 },
  contrastAlert: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#FFFBEB", padding: 8, borderRadius: 8 },
  contrastText: { fontSize: 11, color: "#92400E", flex: 1 },
  bodyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bodyChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  bodyChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  bodyChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  bodyChipTextActive: { color: "#FFFFFF" },
  centerCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  centerCardActive: { borderColor: "#0D9488", borderWidth: 2 },
  centerTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  centerName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  centerAddress: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  centerRating: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  centerRatingText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
  centerMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  centerMeta: { fontSize: 11, color: "#6B7280" },
  openNow: { fontSize: 11, fontWeight: "700", color: "#059669", backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  closedNow: { fontSize: 11, fontWeight: "700", color: "#DC2626", backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  accredRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  accredBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  accredText: { fontSize: 9, fontWeight: "700", color: "#475569" },
  homeBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  homeText: { fontSize: 9, fontWeight: "700", color: "#065F46" },
  availScans: { fontSize: 11, color: "#64748B", lineHeight: 16 },
  proceedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0F172A", paddingVertical: 13, borderRadius: 12 },
  proceedBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  myScanCard: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  myScanTopRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  myScanTypeBox: { backgroundColor: "#1E293B", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  myScanType: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  myScanBody: { fontSize: 14, fontWeight: "700", color: "#111827" },
  myScanCenter: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  myScanReady: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  myScanReadyText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  myScanFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  myScanDate: { fontSize: 12, color: "#6B7280" },
  viewReportBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewReportText: { fontSize: 12, fontWeight: "700", color: "#0D9488" },
  // Modal
  modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  bookingSummary: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 4 },
  summaryLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 4 },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827" },
  dateChip: { width: 52, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  dateChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  dateDay: { fontSize: 10, fontWeight: "600", color: "#6B7280" },
  dateNum: { fontSize: 17, fontWeight: "800", color: "#111827" },
  dateMon: { fontSize: 9, color: "#9CA3AF" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  timeChipActive: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  timeChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  timeChipTextActive: { color: "#FFFFFF" },
  prepReminder: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10 },
  prepReminderText: { fontSize: 11, color: "#1D4ED8", flex: 1, lineHeight: 16 },
  confirmBtn: { backgroundColor: "#0F172A", paddingVertical: 13, borderRadius: 12, alignItems: "center", marginTop: 4 },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
