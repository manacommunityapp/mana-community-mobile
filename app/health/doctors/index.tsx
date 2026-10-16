import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Linking, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { DoctorDto, ProviderCategory, ConsultationMode } from "@/types/health";

const CATEGORY_TABS: { id: ProviderCategory | "ALL"; label: string; icon: string }[] = [
  { id: "ALL", label: "All", icon: "grid-outline" },
  { id: "DOCTOR", label: "Doctors", icon: "medkit-outline" },
  { id: "CLINIC", label: "Clinics", icon: "business-outline" },
  { id: "DENTIST", label: "Dentists", icon: "happy-outline" },
  { id: "DIAGNOSTIC_CENTER", label: "Labs", icon: "flask-outline" },
  { id: "PHARMACY", label: "Pharmacy", icon: "bandage-outline" },
  { id: "PHYSIOTHERAPIST", label: "Physio", icon: "fitness-outline" },
  { id: "HOME_CARE", label: "Home Care", icon: "home-outline" }
];

const DISTANCE_OPTIONS = [
  { label: "All Distance", value: 999 },
  { label: "In-Campus", value: 0.1 },
  { label: "< 1 km", value: 1.0 },
  { label: "< 3 km", value: 3.0 },
  { label: "< 5 km", value: 5.0 }
];

const FEE_OPTIONS = [
  { label: "All Fees", min: 0, max: 99999 },
  { label: "Free (₹0)", min: 0, max: 0 },
  { label: "Under ₹500", min: 1, max: 500 },
  { label: "₹500 - ₹1000", min: 501, max: 1000 },
  { label: "₹1000+", min: 1001, max: 99999 }
];

export default function HealthcareDirectoryScreen() {
  const router = useRouter();
  const { specialty } = useLocalSearchParams<{ specialty?: string }>();
  const [providers, setProviders] = useState<DoctorDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState(specialty ?? "");
  const [selectedDistance, setSelectedDistance] = useState<number>(999);
  const [selectedFeeIndex, setSelectedFeeIndex] = useState<number>(0);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    healthService.getDoctors().then(setProviders);
  }, []);

  const filtered = useMemo(() => {
    return providers.filter(p => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSpecialty = p.specialty.toLowerCase().includes(q);
        const matchesClinic = p.clinicName.toLowerCase().includes(q);
        const matchesAddress = p.clinicAddress.toLowerCase().includes(q);
        if (!matchesName && !matchesSpecialty && !matchesClinic && !matchesAddress) {
          return false;
        }
      }

      // Distance
      if (selectedDistance !== 999) {
        const d = p.distanceKm ?? 999;
        if (d > selectedDistance) return false;
      }

      // Fee
      const feeRange = FEE_OPTIONS[selectedFeeIndex];
      if (p.consultationFee < feeRange.min || p.consultationFee > feeRange.max) {
        return false;
      }

      // Today
      if (availableTodayOnly) {
        const next = p.nextAvailableSlot.toLowerCase();
        if (!next.includes("today") && !next.includes("available on") && !next.includes("24x7")) {
          return false;
        }
      }

      // Open now
      if (openNowOnly && !p.openNow) {
        return false;
      }

      return true;
    });
  }, [providers, selectedCategory, searchQuery, selectedDistance, selectedFeeIndex, availableTodayOnly, openNowOnly]);

  return (
    <View style={styles.container}>
      {/* ── 1. EMERGENCY TOP ALERT ── */}
      <View style={styles.emergencyBar}>
        <View style={styles.emergencyLeft}>
          <Ionicons name="warning" size={18} color="#EF4444" />
          <Text style={styles.emergencyTitle}>Community SOS (24x7)</Text>
        </View>
        <TouchableOpacity
          style={styles.emergencyCallBtn}
          onPress={() => Linking.openURL("tel:+919876543210")}
        >
          <Ionicons name="call" size={13} color="#FFFFFF" />
          <Text style={styles.emergencyCallText}>Ambulance Gate 1</Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. SEARCH & FILTER ROW ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search doctor, clinic, specialty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, (selectedDistance !== 999 || selectedFeeIndex !== 0 || availableTodayOnly || openNowOnly) && styles.filterBtnActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <Ionicons name="filter" size={18} color={selectedDistance !== 999 || selectedFeeIndex !== 0 || availableTodayOnly || openNowOnly ? "#0D9488" : "#4B5563"} />
        </TouchableOpacity>
      </View>

      {/* ── 3. CATEGORY TABS HORIZONTAL SCROLL ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {CATEGORY_TABS.map(tab => {
          const isActive = selectedCategory === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setSelectedCategory(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={isActive ? "#FFFFFF" : "#4B5563"}
              />
              <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 4. ZERO-LEAK PRIVACY BADGE ── */}
      <View style={styles.privacyBanner}>
        <Ionicons name="shield-checkmark" size={14} color="#0D9488" />
        <Text style={styles.privacyText}>
          Mana Privacy Shield: Searches & medical history are never shared.
        </Text>
      </View>

      {/* ── 5. PROVIDERS LIST ── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No healthcare providers found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search keywords.</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
                setSelectedDistance(999);
                setSelectedFeeIndex(0);
                setAvailableTodayOnly(false);
                setOpenNowOnly(false);
              }}
            >
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.card}
              onPress={() => router.push(`/health/doctors/${doc.id}`)}
              activeOpacity={0.88}
            >
              <View style={styles.topRow}>
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={22} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.name}>{doc.name}</Text>
                    {doc.verifiedBadge && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.specialty}>{doc.specialty}</Text>
                  <Text style={styles.quals}>
                    {doc.qualifications.join(", ")} • {doc.experienceYears} yrs exp
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {doc.rating}</Text>
                </View>
              </View>

              {/* Council & Registration Tag */}
              <View style={styles.regRow}>
                <Text style={styles.regLabel}>Reg: {doc.registrationNumber}</Text>
                <Text style={styles.regCouncil} numberOfLines={1}>{doc.medicalCouncil}</Text>
              </View>

              {/* Clinic Location & Distance */}
              <View style={styles.clinicRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.clinicText} numberOfLines={1}>
                  {doc.clinicName} ({doc.clinicAddress})
                </Text>
                {doc.distanceKm !== undefined && (
                  <View style={styles.distBadge}>
                    <Text style={styles.distText}>
                      {doc.distanceKm === 0 ? "On-Campus" : `${doc.distanceKm} km`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Exclusive Society Offer */}
              {doc.communityOffer && (
                <View style={styles.offerBadge}>
                  <Ionicons name="pricetag" size={12} color="#B45309" />
                  <Text style={styles.offerText} numberOfLines={1}>
                    {doc.communityOffer.title} ({doc.communityOffer.badge})
                  </Text>
                </View>
              )}

              {/* Trust Metric & Status */}
              <View style={styles.trustBanner}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="shield-checkmark" size={13} color="#065F46" />
                  <Text style={styles.trustText}>{doc.verifiedCommunityConsultations} neighbors consulted</Text>
                </View>
                {doc.openNow && (
                  <View style={styles.openNowBadge}>
                    <Text style={styles.openNowText}>● Open Now</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View>
                  <Text style={styles.feeText}>
                    {doc.consultationFee === 0 ? "Free Checkup" : `₹${doc.consultationFee}`}
                  </Text>
                  <Text style={styles.slotText}>Next: {doc.nextAvailableSlot}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {doc.phone && (
                    <TouchableOpacity
                      style={styles.callIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${doc.phone?.replace(/[^0-9+]/g, "")}`);
                      }}
                    >
                      <Ionicons name="call" size={14} color="#0D9488" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.bookBtn}>
                    <Text style={styles.bookBtnText}>View & Book</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── FILTER MODAL ── */}
      <Modal visible={showFiltersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Providers</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Distance Options */}
            <Text style={styles.sectionHeader}>Max Distance</Text>
            <View style={styles.chipsRow}>
              {DISTANCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalChip, selectedDistance === opt.value && styles.modalChipActive]}
                  onPress={() => setSelectedDistance(opt.value)}
                >
                  <Text style={[styles.modalChipText, selectedDistance === opt.value && styles.modalChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fee Options */}
            <Text style={styles.sectionHeader}>Consultation Fee</Text>
            <View style={styles.chipsRow}>
              {FEE_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.modalChip, selectedFeeIndex === idx && styles.modalChipActive]}
                  onPress={() => setSelectedFeeIndex(idx)}
                >
                  <Text style={[styles.modalChipText, selectedFeeIndex === idx && styles.modalChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggles */}
            <Text style={styles.sectionHeader}>Availability</Text>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAvailableTodayOnly(!availableTodayOnly)}
            >
              <Ionicons
                name={availableTodayOnly ? "checkbox" : "square-outline"}
                size={20}
                color={availableTodayOnly ? "#0D9488" : "#9CA3AF"}
              />
              <Text style={styles.checkboxLabel}>Available Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setOpenNowOnly(!openNowOnly)}
            >
              <Ionicons
                name={openNowOnly ? "checkbox" : "square-outline"}
                size={20}
                color={openNowOnly ? "#0D9488" : "#9CA3AF"}
              />
              <Text style={styles.checkboxLabel}>Open Now</Text>
            </TouchableOpacity>

            {/* Apply & Reset */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  setSelectedDistance(999);
                  setSelectedFeeIndex(0);
                  setAvailableTodayOnly(false);
                  setOpenNowOnly(false);
                }}
              >
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  emergencyBar: {
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  emergencyLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  emergencyTitle: { fontSize: 12, fontWeight: "bold", color: "#991B1B" },
  emergencyCallBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  emergencyCallText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  searchRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8
  },
  input: { flex: 1, fontSize: 13, color: "#111827" },
  filterBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  filterBtnActive: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  tabsScroll: { maxHeight: 42, marginVertical: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  tabChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  tabChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  tabChipTextActive: { color: "#FFFFFF" },
  privacyBanner: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDFA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  privacyText: { fontSize: 10, color: "#0F766E", flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  emptyState: { padding: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "bold", color: "#374151", marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: "#6B7280", marginTop: 4, textAlign: "center" },
  resetBtn: { marginTop: 12, backgroundColor: "#0D9488", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  resetBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 9 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  specialty: { fontSize: 13, color: "#0D9488", fontWeight: "600", marginTop: 1 },
  quals: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  verifiedBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { color: "#1D4ED8", fontSize: 10, fontWeight: "bold" },
  ratingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  ratingText: { fontSize: 11, fontWeight: "bold", color: "#92400E" },
  regRow: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  regLabel: { fontSize: 10, color: "#475569", fontWeight: "600" },
  regCouncil: { fontSize: 10, color: "#64748B", maxWidth: "55%" },
  clinicRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clinicText: { fontSize: 11, color: "#6B7280", flex: 1 },
  distBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  distText: { fontSize: 10, color: "#0F766E", fontWeight: "bold" },
  offerBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  offerText: { fontSize: 10, color: "#92400E", fontWeight: "bold", flex: 1 },
  trustBanner: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  trustText: { fontSize: 11, color: "#065F46", fontWeight: "600" },
  openNowBadge: { backgroundColor: "#059669", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  openNowText: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  feeText: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  slotText: { fontSize: 10, color: "#059669", marginTop: 1 },
  callIconBtn: {
    borderWidth: 1,
    borderColor: "#CCFBF1",
    backgroundColor: "#F0FDFA",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  bookBtn: { backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  sectionHeader: { fontSize: 12, fontWeight: "bold", color: "#374151", textTransform: "uppercase" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  modalChipText: { fontSize: 11, color: "#374151", fontWeight: "600" },
  modalChipTextActive: { color: "#FFFFFF" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  checkboxLabel: { fontSize: 13, color: "#1F2937", fontWeight: "500" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalResetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  modalResetText: { color: "#6B7280", fontWeight: "600", fontSize: 13 },
  modalApplyBtn: { flex: 2, paddingVertical: 10, borderRadius: 10, backgroundColor: "#0D9488", alignItems: "center" },
  modalApplyText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 }
});