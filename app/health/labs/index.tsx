import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { healthService } from "@/services/healthService";
import { LabPackageDto } from "@/types/health";

const LAB_CATEGORIES = [
  { id: "all", label: "All Packages", icon: "grid" },
  { id: "Full Body", label: "Full Body", icon: "body" },
  { id: "Diabetes", label: "Diabetes", icon: "water" },
  { id: "Heart", label: "Heart", icon: "heart" },
  { id: "Cancer", label: "Cancer", icon: "ribbon" },
  { id: "Women Health", label: "Women", icon: "woman" },
  { id: "Men Health", label: "Men", icon: "man" },
  { id: "Vitamin", label: "Vitamin", icon: "sunny" },
  { id: "Senior Citizen", label: "Senior", icon: "people" },
  { id: "Kids", label: "Kids", icon: "happy" },
  { id: "individual", label: "Individual Tests", icon: "flask" },
] as const;

const INDIVIDUAL_TESTS = [
  { id: "vit-b12", name: "Vitamin B12 – Serum", price: 822, originalPrice: 1259, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "vit-d", name: "Vitamin D (25-OH)", price: 1225, originalPrice: 2519, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "hba1c", name: "HbA1c (Glycosylated Haemoglobin)", price: 549, originalPrice: 839, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "thyroid", name: "Thyroid Profile (T3, T4 & TSH)", price: 601, originalPrice: 839, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "cbc", name: "Complete Blood Count (CBC)", price: 416, originalPrice: 839, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "lipid", name: "Lipid Profile", price: 380, originalPrice: 650, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "lft", name: "Liver Function Test (LFT)", price: 480, originalPrice: 750, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "kft", name: "Kidney Function Test (KFT)", price: 520, originalPrice: 800, turnaround: "8–72 Hrs", availability: ["Home", "Center"] },
  { id: "uric-acid", name: "Uric Acid – Serum", price: 220, originalPrice: 380, turnaround: "8–72 Hrs", availability: ["Center"] },
  { id: "dengue", name: "Dengue NS1 Antigen", price: 350, originalPrice: 600, turnaround: "4–24 Hrs", availability: ["Home", "Center"] },
];

type CategoryId = typeof LAB_CATEGORIES[number]["id"];

export default function LabsScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<LabPackageDto[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");

  useEffect(() => {
    healthService.getLabPackages().then(setPackages);
  }, []);

  const handleBook = (pkg: LabPackageDto) => {
    router.push({
      pathname: "/health/labs/book",
      params: {
        pkgId: pkg.id,
        pkgName: pkg.name,
        pkgPrice: String(pkg.price),
        turnaround: String(pkg.reportTurnaroundHours),
        fastingRequired: String(pkg.fastingRequired),
      }
    } as any);
  };

  const visiblePackages = activeCategory === "all" || activeCategory === "individual"
    ? packages
    : packages.filter(p => p.name.toLowerCase().includes(activeCategory.toLowerCase()) || p.category?.toLowerCase() === activeCategory.toLowerCase());

  const discountPct = (orig: number, price: number) => Math.round((1 - price / orig) * 100);

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.heroBanner}>
        <Ionicons name="flask" size={28} color="#D97706" />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Lab Tests & Health Checks</Text>
          <Text style={styles.heroSub}>Home collection · Reports in 8–72 hrs · NABL certified labs</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {LAB_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={13} color={activeCategory === cat.id ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Individual Tests Section */}
        {activeCategory === "individual" ? (
          <>
            <Text style={styles.sectionHeader}>Popular Individual Tests</Text>
            {INDIVIDUAL_TESTS.map(test => (
              <View key={test.id} style={styles.testCard}>
                <View style={styles.testTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testName}>{test.name}</Text>
                    <Text style={styles.testSub}>Reports in {test.turnaround}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.testPrice}>₹{test.price}/-</Text>
                    <Text style={styles.testOrig}>₹{test.originalPrice}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPct(test.originalPrice, test.price)}% OFF</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.testFooter}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {test.availability.map(a => (
                      <View key={a} style={styles.availBadge}>
                        <Ionicons name={a === "Home" ? "home" : "business"} size={11} color="#059669" />
                        <Text style={styles.availText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/health/labs/book" as any)}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>
              {activeCategory === "all" ? `All Health Check-up Packages (${packages.length})` : `${activeCategory} Packages`}
            </Text>
            {visiblePackages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No packages found in this category.</Text>
              </View>
            )}
            {visiblePackages.map(pkg => (
              <View key={pkg.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <Text style={styles.pkgCount}>{pkg.testCount} Parameters · Reports in {pkg.reportTurnaroundHours}h</Text>
                    {pkg.fastingRequired && (
                      <Text style={styles.fastingText}>🕐 Fasting: {pkg.fastingHours ?? "8–12"} hrs required</Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.price}>₹{pkg.price}/-</Text>
                    <Text style={styles.origPrice}>₹{pkg.originalPrice}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPct(pkg.originalPrice, pkg.price)}% OFF</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.testsWrap}>
                  {pkg.testsIncluded.slice(0, 4).map((t, idx) => (
                    <View key={idx} style={styles.testBadge}>
                      <Text style={styles.testText}>{t}</Text>
                    </View>
                  ))}
                  {pkg.testsIncluded.length > 4 && (
                    <View style={styles.testBadge}>
                      <Text style={styles.testText}>+{pkg.testsIncluded.length - 4} more</Text>
                    </View>
                  )}
                </View>

                <View style={styles.footerRow}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={styles.perk}>
                      <Ionicons name="home" size={13} color="#059669" />
                      <Text style={styles.perkText}>Home Collection</Text>
                    </View>
                    <View style={styles.perk}>
                      <Ionicons name="shield-checkmark" size={13} color="#0D9488" />
                      <Text style={styles.perkText}>NABL Certified</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(pkg)}>
                    <Text style={styles.bookBtnText}>Book Slot</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Trust Indicators */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={styles.trustLabel}>Govt. Approved Labs</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="home" size={20} color="#0D9488" />
            <Text style={styles.trustLabel}>Home Collection</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="document-text" size={20} color="#4F46E5" />
            <Text style={styles.trustLabel}>Reports in App</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  heroBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FEF3C7", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  heroTitle: { fontSize: 16, fontWeight: "bold", color: "#92400E" },
  heroSub: { fontSize: 11, color: "#B45309", marginTop: 2 },
  catScroll: { maxHeight: 42, marginVertical: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
  catChipActive: { backgroundColor: "#D97706", borderColor: "#D97706" },
  catChipText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  catChipTextActive: { color: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#374151" },
  emptyState: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#9CA3AF" },
  card: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pkgName: { fontSize: 14, fontWeight: "bold", color: "#111827", flex: 1, paddingRight: 8 },
  pkgCount: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  fastingText: { fontSize: 10, color: "#D97706", marginTop: 3, fontWeight: "600" },
  price: { fontSize: 17, fontWeight: "bold", color: "#D97706" },
  origPrice: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through", textAlign: "right" },
  discountBadge: { backgroundColor: "#D1FAE5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  discountText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  testsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  testBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  testText: { fontSize: 10, color: "#374151" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  perk: { flexDirection: "row", alignItems: "center", gap: 4 },
  perkText: { fontSize: 10, color: "#059669", fontWeight: "600" },
  bookBtn: { backgroundColor: "#D97706", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  testCard: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  testTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  testName: { fontSize: 13, fontWeight: "bold", color: "#111827" },
  testSub: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  testPrice: { fontSize: 16, fontWeight: "bold", color: "#D97706" },
  testOrig: { fontSize: 10, color: "#9CA3AF", textDecorationLine: "line-through", textAlign: "right" },
  testFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  availText: { fontSize: 10, color: "#059669", fontWeight: "600" },
  addBtn: { backgroundColor: "#D97706", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  trustRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 4 },
  trustItem: { alignItems: "center", gap: 6 },
  trustLabel: { fontSize: 10, color: "#374151", fontWeight: "600", textAlign: "center" },
});
