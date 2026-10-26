import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, Modal, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { healthService } from "@/services/healthService";
import { MedicalRecordDto } from "@/types/health";

interface CartItem {
  name: string;
  qty: number;
  price: number;
  strip?: string;
}

interface RefillSubscription {
  id: string;
  medicineName: string;
  strip: string;
  price: number;
  frequency: "Monthly" | "Bi-Monthly" | "Weekly";
  nextDispatch: string;
  active: boolean;
}

const SEED_SUBSCRIPTIONS: RefillSubscription[] = [
  { id: "sub-1", medicineName: "Metformin 500mg", strip: "30 tabs • 1 month supply", price: 105, frequency: "Monthly", nextDispatch: "15 Nov 2026", active: true },
  { id: "sub-2", medicineName: "Amlodipine 5mg", strip: "30 tabs • 1 month supply", price: 144, frequency: "Monthly", nextDispatch: "15 Nov 2026", active: true },
  { id: "sub-3", medicineName: "Atorvastatin 20mg", strip: "30 tabs • 1 month supply", price: 245, frequency: "Monthly", nextDispatch: "20 Nov 2026", active: false },
];

const CHRONIC_MEDS = [
  { name: "Metformin 500mg", price: 105, strip: "30 tabs" },
  { name: "Amlodipine 5mg", price: 144, strip: "30 tabs" },
  { name: "Atorvastatin 20mg", price: 245, strip: "30 tabs" },
  { name: "Losartan 50mg", price: 182, strip: "30 tabs" },
  { name: "Levothyroxine 50mcg", price: 95, strip: "30 tabs" },
  { name: "Pantoprazole 40mg", price: 68, strip: "30 tabs" },
];

const POPULAR_MEDICINES: CartItem[] = [
  { name: "Paracetamol 500mg", qty: 1, price: 28, strip: "10 tablets" },
  { name: "Cetirizine 10mg", qty: 1, price: 42, strip: "10 tablets" },
  { name: "Omeprazole 20mg", qty: 1, price: 58, strip: "10 capsules" },
  { name: "Azithromycin 500mg", qty: 1, price: 165, strip: "3 tablets" },
  { name: "Metformin 500mg", qty: 1, price: 35, strip: "10 tablets" },
  { name: "Amlodipine 5mg", qty: 1, price: 48, strip: "10 tablets" },
];

const PARSED_FROM_RX: { [key: string]: CartItem[] } = {
  "rec-1": [
    { name: "Atorvastatin 20mg (Rosuvastatin 5mg)", qty: 1, price: 245, strip: "30 tabs • 1 month supply" },
    { name: "Ramipril 5mg", qty: 1, price: 195, strip: "30 caps" },
    { name: "Aspirin 75mg EC", qty: 1, price: 65, strip: "30 tabs" },
  ],
};

const DELIVERY_SLOTS = [
  { id: "express", label: "Express Delivery", time: "Within 2 Hours", fee: 49, icon: "flash" },
  { id: "same-day", label: "Same Day", time: "By 8 PM", fee: 0, icon: "today" },
  { id: "next-day", label: "Next Day", time: "9 AM – 6 PM", fee: 0, icon: "calendar" },
];

export default function PharmacyScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<"rx" | "otc" | "sub">("rx");
  const [subscriptions, setSubscriptions] = useState<RefillSubscription[]>(SEED_SUBSCRIPTIONS);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubMed, setNewSubMed] = useState(CHRONIC_MEDS[0].name);
  const [newSubFreq, setNewSubFreq] = useState<RefillSubscription["frequency"]>("Monthly");
  const [prescriptions, setPrescriptions] = useState<MedicalRecordDto[]>([]);
  const [selectedRxId, setSelectedRxId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState("same-day");
  const [showCartModal, setShowCartModal] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    healthService.getMedicalRecords().then(records => {
      setPrescriptions(records.filter(r => r.type === "PRESCRIPTION"));
    });
  }, []);

  const handleSelectRx = (rec: MedicalRecordDto) => {
    setSelectedRxId(rec.id);
    const meds = PARSED_FROM_RX[rec.id] ?? [
      { name: "Tablet as prescribed", qty: 1, price: 0, strip: "As per prescription" }
    ];
    setCart(meds);
  };

  const handleAddToCart = (med: CartItem) => {
    setCart(prev => {
      const exists = prev.find(c => c.name === med.name);
      if (exists) return prev.map(c => c.name === med.name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...med }];
    });
  };

  const handleChangeQty = (name: string, delta: number) => {
    setCart(prev =>
      prev.map(c => c.name === name ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  };

  const handleRemoveFromCart = (name: string) => {
    setCart(prev => prev.filter(c => c.name !== name));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const deliveryFee = DELIVERY_SLOTS.find(d => d.id === selectedDelivery)?.fee ?? 0;
  const grandTotal = cartTotal + deliveryFee;

  const filteredOtc = POPULAR_MEDICINES.filter(m =>
    m.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handlePlaceOrder = async () => {
    setOrdering(true);
    await new Promise(r => setTimeout(r, 1500));
    setOrdering(false);
    setOrdered(true);
    setShowCartModal(false);
  };

  if (ordered) {
    return (
      <View style={styles.successWrap}>
        <LinearGradient colors={["#0F766E", "#0D9488"]} style={styles.successHeader}>
          <Ionicons name="checkmark-circle" size={56} color="#FFFFFF" />
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSub}>Your medicines are being prepared for dispatch.</Text>
        </LinearGradient>
        <View style={styles.successBody}>
          <View style={styles.trackCard}>
            <Text style={styles.trackTitle}>Order Tracking</Text>
            {[
              { label: "Order Confirmed", done: true },
              { label: "Pharmacist Review", done: true },
              { label: "Packed & Dispatched", done: false },
              { label: "Out for Delivery", done: false },
              { label: "Delivered", done: false },
            ].map((step, idx) => (
              <View key={idx} style={styles.trackRow}>
                <Ionicons
                  name={step.done ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={step.done ? "#0D9488" : "#CBD5E1"}
                />
                <Text style={[styles.trackStep, step.done && { color: "#0D9488", fontWeight: "700" }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.vaultNote}>
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text style={styles.vaultNoteText}>Purchase receipt saved to your Health Vault automatically.</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Health Hub</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0F766E", "#0D9488", "#14B8A6"]} style={styles.header}>
        <Text style={styles.headerTitle}>💊 Medicine Delivery</Text>
        <Text style={styles.headerSub}>Doorstep delivery from NABL-certified pharmacy partners</Text>
        {cart.length > 0 && (
          <TouchableOpacity style={styles.cartBadge} onPress={() => setShowCartModal(true)}>
            <Ionicons name="cart" size={16} color="#0D9488" />
            <Text style={styles.cartBadgeText}>{cart.length} items • ₹{grandTotal}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "rx" && styles.tabBtnActive]}
          onPress={() => setTab("rx")}
        >
          <Ionicons name="document-text" size={14} color={tab === "rx" ? "#FFFFFF" : "#64748B"} />
          <Text style={[styles.tabText, tab === "rx" && { color: "#FFFFFF" }]}>By Rx</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "otc" && styles.tabBtnActive]}
          onPress={() => setTab("otc")}
        >
          <Ionicons name="search" size={14} color={tab === "otc" ? "#FFFFFF" : "#64748B"} />
          <Text style={[styles.tabText, tab === "otc" && { color: "#FFFFFF" }]}>OTC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "sub" && styles.tabBtnActive]}
          onPress={() => setTab("sub")}
        >
          <Ionicons name="repeat" size={14} color={tab === "sub" ? "#FFFFFF" : "#64748B"} />
          <Text style={[styles.tabText, tab === "sub" && { color: "#FFFFFF" }]}>Auto-Refill</Text>
          {subscriptions.filter(s => s.active).length > 0 && (
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>{subscriptions.filter(s => s.active).length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* PRESCRIPTION TAB */}
        {tab === "rx" && (
          <>
            <Text style={styles.tabHeading}>Select Prescription from Vault</Text>
            {prescriptions.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={36} color="#94A3B8" />
                <Text style={styles.emptyText}>No prescriptions found in your Health Vault.</Text>
                <Text style={styles.emptySub}>Upload a prescription or visit a doctor to get one.</Text>
              </View>
            )}
            {prescriptions.map(rx => (
              <TouchableOpacity
                key={rx.id}
                style={[styles.rxCard, selectedRxId === rx.id && styles.rxCardActive]}
                onPress={() => handleSelectRx(rx)}
              >
                <View style={styles.rxIcon}>
                  <Ionicons name="document-text" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rxTitle}>{rx.title}</Text>
                  <Text style={styles.rxSub}>By {rx.doctorOrLabName} • {rx.date}</Text>
                  <Text style={styles.rxPatient}>For: {rx.patientName}</Text>
                </View>
                {selectedRxId === rx.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#0D9488" />
                )}
              </TouchableOpacity>
            ))}

            {selectedRxId && cart.length > 0 && (
              <>
                <Text style={styles.tabHeading}>AI-Parsed Medicines from Rx</Text>
                {cart.map((med, idx) => (
                  <View key={idx} style={styles.medCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medStrip}>{med.strip}</Text>
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity onPress={() => handleChangeQty(med.name, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={14} color="#0D9488" />
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{med.qty}</Text>
                      <TouchableOpacity onPress={() => handleChangeQty(med.name, 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={14} color="#0D9488" />
                      </TouchableOpacity>
                    </View>
                    {med.price > 0 && <Text style={styles.medPrice}>₹{med.price * med.qty}</Text>}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* OTC TAB */}
        {tab === "otc" && (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines, vitamins, devices..."
              value={searchText}
              onChangeText={setSearchText}
            />
            <Text style={styles.tabHeading}>Popular OTC Medicines</Text>
            {filteredOtc.map((med, idx) => (
              <View key={idx} style={styles.medCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medStrip}>{med.strip}</Text>
                </View>
                <Text style={styles.medPrice}>₹{med.price}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(med)}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* AUTO-REFILL SUBSCRIPTIONS TAB */}
        {tab === "sub" && (
          <>
            <View style={styles.subHeaderRow}>
              <View>
                <Text style={styles.subHeaderTitle}>Monthly Refill Subscriptions</Text>
                <Text style={styles.subHeaderSub}>Never miss a dose — auto-dispatched before you run out</Text>
              </View>
              <TouchableOpacity style={styles.addSubBtn} onPress={() => setShowAddSubModal(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addSubBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {subscriptions.map(sub => (
              <View key={sub.id} style={[styles.subCard, !sub.active && styles.subCardPaused]}>
                <View style={styles.subCardLeft}>
                  <View style={[styles.subIcon, { backgroundColor: sub.active ? "#CCFBF1" : "#F1F5F9" }]}>
                    <Ionicons name="repeat" size={18} color={sub.active ? "#0D9488" : "#94A3B8"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subMedName}>{sub.medicineName}</Text>
                    <Text style={styles.subStrip}>{sub.strip} • {sub.frequency}</Text>
                    <Text style={[styles.subNext, !sub.active && { color: "#94A3B8" }]}>
                      {sub.active ? `Next dispatch: ${sub.nextDispatch}` : "Paused"}
                    </Text>
                  </View>
                </View>
                <View style={styles.subCardRight}>
                  <Text style={styles.subPrice}>₹{sub.price}</Text>
                  <TouchableOpacity
                    style={[styles.subToggle, sub.active ? styles.subTogglePause : styles.subToggleResume]}
                    onPress={() => setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, active: !s.active } : s))}
                  >
                    <Text style={styles.subToggleText}>{sub.active ? "Pause" : "Resume"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {subscriptions.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="repeat-outline" size={36} color="#94A3B8" />
                <Text style={styles.emptyText}>No auto-refill subscriptions yet.</Text>
                <Text style={styles.emptySub}>Set up recurring delivery for chronic medicines.</Text>
              </View>
            )}

            <View style={styles.subInfoBanner}>
              <Ionicons name="information-circle" size={16} color="#2563EB" />
              <Text style={styles.subInfoText}>
                Subscriptions are auto-dispatched 3 days before your supply runs out. Cancel anytime.
              </Text>
            </View>
          </>
        )}

        {/* Delivery Slot Selector */}
        {cart.length > 0 && tab !== "sub" && (
          <>
            <Text style={styles.tabHeading}>Delivery Options</Text>
            {DELIVERY_SLOTS.map(slot => (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotCard, selectedDelivery === slot.id && styles.slotCardActive]}
                onPress={() => setSelectedDelivery(slot.id)}
              >
                <Ionicons
                  name={slot.icon as any}
                  size={20}
                  color={selectedDelivery === slot.id ? "#0D9488" : "#94A3B8"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.slotLabel, selectedDelivery === slot.id && { color: "#0D9488" }]}>
                    {slot.label}
                  </Text>
                  <Text style={styles.slotTime}>{slot.time}</Text>
                </View>
                <Text style={[styles.slotFee, slot.fee === 0 && { color: "#059669" }]}>
                  {slot.fee === 0 ? "FREE" : `₹${slot.fee}`}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      {cart.length > 0 && tab !== "sub" && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomItems}>{cart.length} items</Text>
            <Text style={styles.bottomTotal}>₹{grandTotal} total</Text>
          </View>
          <TouchableOpacity style={styles.orderBtn} onPress={() => setShowCartModal(true)}>
            <Ionicons name="cart" size={18} color="#FFFFFF" />
            <Text style={styles.orderBtnText}>Review & Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Subscription Modal */}
      <Modal visible={showAddSubModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Up Auto-Refill</Text>
              <TouchableOpacity onPress={() => setShowAddSubModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.addSubLabel}>Choose Medicine</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CHRONIC_MEDS.map(m => (
                  <TouchableOpacity
                    key={m.name}
                    style={[styles.medChip, newSubMed === m.name && styles.medChipActive]}
                    onPress={() => setNewSubMed(m.name)}
                  >
                    <Text style={[styles.medChipText, newSubMed === m.name && { color: "#FFFFFF" }]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.addSubLabel}>Dispatch Frequency</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(["Monthly", "Bi-Monthly", "Weekly"] as RefillSubscription["frequency"][]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, newSubFreq === f && styles.freqChipActive]}
                  onPress={() => setNewSubFreq(f)}
                >
                  <Text style={[styles.freqChipText, newSubFreq === f && { color: "#FFFFFF" }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.placeOrderBtn}
              onPress={() => {
                const med = CHRONIC_MEDS.find(m => m.name === newSubMed)!;
                const newSub: RefillSubscription = {
                  id: `sub-${Date.now()}`, medicineName: med.name, strip: `${med.strip} • 1 month supply`,
                  price: med.price, frequency: newSubFreq, nextDispatch: "15 Dec 2026", active: true,
                };
                setSubscriptions(prev => [newSub, ...prev]);
                setShowAddSubModal(false);
                Alert.alert("Auto-Refill Set!", `${med.name} will be dispatched ${newSubFreq.toLowerCase()} to your address.`);
              }}
            >
              <Ionicons name="repeat" size={18} color="#FFFFFF" />
              <Text style={styles.placeOrderText}>Activate Auto-Refill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cart Review Modal */}
      <Modal visible={showCartModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Review</Text>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              {cart.map((item, idx) => (
                <View key={idx} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemStrip}>{item.strip} × {item.qty}</Text>
                  </View>
                  <Text style={styles.cartItemPrice}>₹{item.price * item.qty}</Text>
                  <TouchableOpacity onPress={() => handleRemoveFromCart(item.name)} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>₹{cartTotal}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery</Text>
                <Text style={[styles.totalVal, deliveryFee === 0 && { color: "#059669" }]}>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </Text>
              </View>
              <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.totalLabel, { fontWeight: "800", color: "#0F172A", fontSize: 15 }]}>Grand Total</Text>
                <Text style={[styles.totalVal, { fontWeight: "800", color: "#0D9488", fontSize: 16 }]}>₹{grandTotal}</Text>
              </View>
            </View>

            <View style={styles.deliverToRow}>
              <Ionicons name="location" size={14} color="#0D9488" />
              <Text style={styles.deliverToText}>Deliver to: Flat 302, Tower C, Mana Residency</Text>
            </View>

            <TouchableOpacity
              style={[styles.placeOrderBtn, ordering && { opacity: 0.7 }]}
              onPress={handlePlaceOrder}
              disabled={ordering}
            >
              {ordering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.placeOrderText}>Place Order • ₹{grandTotal}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, gap: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "#CCFBF1" },
  cartBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  cartBadgeText: { fontSize: 12, fontWeight: "700", color: "#0D9488" },

  tabRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", padding: 10, gap: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F1F5F9" },
  tabBtnActive: { backgroundColor: "#0D9488" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#64748B" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 100 },
  tabHeading: { fontSize: 14, fontWeight: "700", color: "#1E293B" },

  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#64748B", textAlign: "center" },
  emptySub: { fontSize: 12, color: "#94A3B8", textAlign: "center" },

  rxCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#E2E8F0" },
  rxCardActive: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  rxIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  rxTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  rxSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  rxPatient: { fontSize: 11, color: "#0D9488", fontWeight: "600", marginTop: 1 },

  medCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", gap: 10 },
  medName: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  medStrip: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  medPrice: { fontSize: 14, fontWeight: "700", color: "#0D9488" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#0D9488", justifyContent: "center", alignItems: "center" },
  qtyVal: { fontSize: 13, fontWeight: "700", color: "#1E293B", minWidth: 20, textAlign: "center" },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#0D9488", justifyContent: "center", alignItems: "center" },

  searchInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: "#FFFFFF" },

  slotCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "#E2E8F0" },
  slotCardActive: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  slotLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  slotTime: { fontSize: 12, color: "#64748B", marginTop: 2 },
  slotFee: { fontSize: 13, fontWeight: "700", color: "#0D9488" },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  bottomItems: { fontSize: 12, color: "#64748B" },
  bottomTotal: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  orderBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0D9488", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  orderBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cartItemName: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  cartItemStrip: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  cartItemPrice: { fontSize: 13, fontWeight: "700", color: "#0D9488" },
  totalSection: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14, gap: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, color: "#64748B" },
  totalVal: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  deliverToRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10 },
  deliverToText: { fontSize: 12, color: "#1D4ED8", fontWeight: "600", flex: 1 },
  placeOrderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0D9488", paddingVertical: 16, borderRadius: 14 },
  placeOrderText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },

  // Subscription tab
  subHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  subHeaderTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  subHeaderSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  addSubBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0D9488", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addSubBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  subCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", gap: 12 },
  subCardPaused: { borderColor: "#E2E8F0", opacity: 0.7 },
  subCardLeft: { flex: 1 },
  subCardRight: { alignItems: "flex-end", gap: 6 },
  subIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#CCFBF1", justifyContent: "center", alignItems: "center" },
  subMedName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  subStrip: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  subNext: { fontSize: 11, color: "#0D9488", fontWeight: "600", marginTop: 3 },
  subPrice: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  subToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  subTogglePause: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  subToggleResume: { borderColor: "#0D9488", backgroundColor: "#F0FDFA" },
  subToggleText: { fontSize: 11, fontWeight: "700" },
  subBadge: { backgroundColor: "#0D9488", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 18, alignItems: "center" },
  subBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  subInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EFF6FF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE" },
  subInfoText: { fontSize: 12, color: "#1D4ED8", flex: 1, lineHeight: 17 },

  // Add subscription modal
  addSubLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  medChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
  medChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  medChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  freqChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", alignItems: "center" },
  freqChipActive: { backgroundColor: "#0D9488", borderColor: "#0D9488" },
  freqChipText: { fontSize: 12, fontWeight: "700", color: "#374151" },

  // Success
  successWrap: { flex: 1, backgroundColor: "#F8FAFC" },
  successHeader: { paddingTop: 60, paddingBottom: 30, alignItems: "center", gap: 10 },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  successSub: { fontSize: 13, color: "#CCFBF1" },
  successBody: { padding: 20, gap: 16 },
  trackCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", gap: 12 },
  trackTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackStep: { fontSize: 13, color: "#94A3B8" },
  vaultNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", padding: 12, borderRadius: 12 },
  vaultNoteText: { fontSize: 12, color: "#065F46", flex: 1 },
  doneBtn: { backgroundColor: "#0D9488", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  doneBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
