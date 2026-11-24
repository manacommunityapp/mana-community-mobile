import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  jewelleryService,
  JewelleryCategory,
  JewelleryMaterial,
  JewelleryProduct,
  JewelleryAppointment,
  AppointmentStatus,
} from '@/services/jewelleryService';

const CATEGORIES: JewelleryCategory[] = [
  'EARRINGS', 'NECKLACE', 'RING', 'BANGLE', 'BRACELET', 'PENDANT', 'MAANG_TIKKA',
];

const MATERIALS: JewelleryMaterial[] = [
  'GOLD', 'DIAMOND', 'SILVER', 'PLATINUM', 'GEMSTONE', 'ARTIFICIAL',
];

export default function JewellerMerchantConsoleScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'CATALOGUE' | 'APPOINTMENTS' | 'PROFILE'>('CATALOGUE');
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Registration form state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [specialties, setSpecialties] = useState('Bridal, Gold, Diamond');
  const [bisLicense, setBisLicense] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // New Product form state
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<JewelleryCategory>('EARRINGS');
  const [prodMaterial, setProdMaterial] = useState<JewelleryMaterial>('GOLD');
  const [prodPurity, setProdPurity] = useState('22K (916)');
  const [prodWeight, setProdWeight] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('5');
  const [prodHuid, setProdHuid] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodTryOnUrl, setProdTryOnUrl] = useState('');
  const [prodDropMm, setProdDropMm] = useState('');
  const [prodNecklaceIn, setProdNecklaceIn] = useState('');

  const { data: vendor, isLoading: loadingVendor, refetch: refetchVendor } = useQuery({
    queryKey: ['jewellery-my-vendor'],
    queryFn: jewelleryService.getMyVendorProfile,
  });

  const { data: myProducts = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['jewellery-vendor-products', vendor?.id],
    queryFn: () => jewelleryService.getVendorProducts(vendor!.id),
    enabled: !!vendor?.id,
  });

  const { data: vendorAppointments = [], isLoading: loadingAppts, refetch: refetchAppts } = useQuery({
    queryKey: ['jewellery-vendor-appointments'],
    queryFn: jewelleryService.getVendorAppointments,
    enabled: !!vendor?.id,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      jewelleryService.registerVendor({
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        specialties: specialties.trim() || undefined,
        bisHallmarkLicense: bisLicense.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-my-vendor'] });
      Alert.alert('Store Registered!', 'Your jeweller profile has been created.');
    },
    onError: (err: any) =>
      Alert.alert('Registration Failed', err?.message || 'Please check your 10-digit phone number and details.'),
  });

  const createProductMutation = useMutation({
    mutationFn: () =>
      jewelleryService.createProduct({
        name: prodName.trim(),
        category: prodCategory,
        material: prodMaterial,
        purity: prodPurity.trim() || undefined,
        netWeightG: prodWeight ? Number(prodWeight) : undefined,
        totalPrice: Number(prodPrice),
        stockQuantity: Number(prodStock || 1),
        huid: prodHuid.trim() || undefined,
        imageUrls: prodImageUrl.trim() ? [prodImageUrl.trim()] : undefined,
        tryOnAssetUrl: prodTryOnUrl.trim() || undefined,
        dropLengthMm: prodDropMm ? Number(prodDropMm) : undefined,
        necklaceLengthIn: prodNecklaceIn ? Number(prodNecklaceIn) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-products'] });
      setShowAddProduct(false);
      setProdName('');
      setProdPrice('');
      setProdWeight('');
      setProdHuid('');
      setProdImageUrl('');
      setProdTryOnUrl('');
      setProdDropMm('');
      setProdNecklaceIn('');
      Alert.alert('Product Published!', 'Your jewellery item is now live in the catalogue.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not publish product.'),
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'ACTIVE' | 'OUT_OF_STOCK' }) =>
      jewelleryService.updateProductStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-products'] });
    },
    onError: () => Alert.alert('Error', 'Could not update product status.'),
  });

  const updateApptStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      jewelleryService.updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-vendor-appointments'] });
    },
    onError: () => Alert.alert('Error', 'Could not update appointment status.'),
  });

  if (loadingVendor) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Vendor Onboarding Form (if not registered yet) ─────────────────────────
  if (!vendor) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.formWrap}>
        <View style={styles.formHeader}>
          <Ionicons name="storefront" size={36} color="#B45309" />
          <Text style={styles.formTitle}>Register Your Jewellery Store</Text>
          <Text style={styles.formSub}>
            List BIS Hallmarked collections, enable Virtual Try-On, and accept resident consultation appointments.
          </Text>
        </View>

        <Text style={styles.label}>Shop Name *</Text>
        <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="e.g. Mana Heritage Jewellers" />

        <Text style={styles.label}>Owner / Manager Name *</Text>
        <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="e.g. Rajesh Verma" />

        <Text style={styles.label}>10-Digit Mobile Number *</Text>
        <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" />

        <Text style={styles.label}>Showroom Address *</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Full street address" />

        <Text style={styles.label}>Specialties (comma-separated)</Text>
        <TextInput style={styles.input} value={specialties} onChangeText={setSpecialties} placeholder="Bridal, Gold, Diamond, Temple" />

        <Text style={styles.label}>BIS Hallmark License No.</Text>
        <TextInput style={styles.input} value={bisLicense} onChangeText={setBisLicense} placeholder="Optional BIS license" />

        <Text style={styles.label}>GSTIN</Text>
        <TextInput style={styles.input} value={gstNumber} onChangeText={setGstNumber} placeholder="Optional GST number" />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => {
            if (!shopName.trim() || !ownerName.trim() || !/^[6-9]\d{9}$/.test(phoneNumber.trim()) || !address.trim()) {
              Alert.alert('Missing Details', 'Please enter shop name, owner name, a valid 10-digit mobile number, and address.');
              return;
            }
            registerMutation.mutate();
          }}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Create Jeweller Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      {/* Store Banner */}
      <View style={styles.storeBanner}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.storeName}>{vendor.shopName}</Text>
            <View style={[styles.verifyChip, { backgroundColor: vendor.isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: vendor.isVerified ? '#15803D' : '#B45309' }}>
                {vendor.isVerified ? 'VERIFIED' : 'PENDING REVIEW'}
              </Text>
            </View>
          </View>
          <Text style={styles.storeSub}>{vendor.address}</Text>
        </View>
        <TouchableOpacity style={styles.addProdBtn} onPress={() => setShowAddProduct(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addProdBtnText}>Add SKU</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['CATALOGUE', 'APPOINTMENTS', 'PROFILE'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'CATALOGUE'
                ? `Catalogue (${myProducts.length})`
                : tab === 'APPOINTMENTS'
                ? `Appointments (${vendorAppointments.length})`
                : 'Store Profile'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loadingProducts || loadingAppts}
            onRefresh={() => {
              refetchVendor();
              refetchProducts();
              refetchAppts();
            }}
          />
        }
      >
        {activeTab === 'CATALOGUE' && (
          <>
            {myProducts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="diamond-outline" size={44} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Jewellery SKUs Listed</Text>
                <TouchableOpacity style={styles.submitBtn} onPress={() => setShowAddProduct(true)}>
                  <Text style={styles.submitBtnText}>+ Add Your First Product</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myProducts.map((p: JewelleryProduct) => (
                <View key={p.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{p.name}</Text>
                      <Text style={styles.cardMeta}>
                        {p.category} · {p.material} {p.purity ? `· ${p.purity}` : ''} {p.netWeightG ? `· ${p.netWeightG}g` : ''}
                      </Text>
                      <Text style={styles.cardPrice}>₹{p.totalPrice.toLocaleString('en-IN')}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.statusToggle,
                        { backgroundColor: p.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                      onPress={() =>
                        toggleProductStatusMutation.mutate({
                          id: p.id,
                          nextStatus: p.status === 'ACTIVE' ? 'OUT_OF_STOCK' : 'ACTIVE',
                        })
                      }
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: p.status === 'ACTIVE' ? '#15803D' : '#DC2626',
                        }}
                      >
                        {p.status}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'APPOINTMENTS' && (
          <>
            {vendorAppointments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={44} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Customer Appointments Yet</Text>
              </View>
            ) : (
              vendorAppointments.map((appt: JewelleryAppointment) => (
                <View key={appt.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.cardTitle}>
                      {appt.customerName || 'Community Resident'}
                    </Text>
                    <Text style={styles.apptStatus}>{appt.status}</Text>
                  </View>
                  <Text style={styles.cardMeta}>
                    {appt.date} at {appt.time} · Purpose: {appt.purpose}
                  </Text>
                  {appt.customerPhone && (
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${appt.customerPhone}`)}
                    >
                      <Ionicons name="call-outline" size={13} color={COLORS.primary} />
                      <Text style={styles.phoneText}>{appt.customerPhone}</Text>
                    </TouchableOpacity>
                  )}
                  {appt.notes ? <Text style={styles.notesText}>Note: {appt.notes}</Text> : null}

                  {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                    <View style={styles.apptActions}>
                      {appt.status === 'PENDING' && (
                        <TouchableOpacity
                          style={[styles.apptBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => updateApptStatusMutation.mutate({ id: appt.id, status: 'CONFIRMED' })}
                        >
                          <Text style={styles.apptBtnText}>Confirm</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.apptBtn, { backgroundColor: COLORS.primary }]}
                        onPress={() => updateApptStatusMutation.mutate({ id: appt.id, status: 'COMPLETED' })}
                      >
                        <Text style={styles.apptBtnText}>Mark Completed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.apptBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => updateApptStatusMutation.mutate({ id: appt.id, status: 'CANCELLED' })}
                      >
                        <Text style={styles.apptBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'PROFILE' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{vendor.shopName}</Text>
            <Text style={styles.cardMeta}>Owner: {vendor.ownerName}</Text>
            <Text style={styles.cardMeta}>Phone: {vendor.phoneNumber || '—'}</Text>
            <Text style={styles.cardMeta}>Address: {vendor.address}</Text>
            <Text style={styles.cardMeta}>
              Specialties: {vendor.specialties?.join(', ') || 'General Jewellery'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={showAddProduct} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.root} contentContainerStyle={styles.formWrap}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.formTitle}>Add Jewellery SKU</Text>
            <TouchableOpacity onPress={() => setShowAddProduct(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Product Name *</Text>
          <TextInput style={styles.input} value={prodName} onChangeText={setProdName} placeholder="e.g. 22K Temple Jhumka Earrings" />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 4 }}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, prodCategory === c && styles.chipActive]}
                onPress={() => setProdCategory(c)}
              >
                <Text style={[styles.chipText, prodCategory === c && { color: '#FFFFFF' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Material</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 4 }}>
            {MATERIALS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, prodMaterial === m && styles.chipActive]}
                onPress={() => setProdMaterial(m)}
              >
                <Text style={[styles.chipText, prodMaterial === m && { color: '#FFFFFF' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Purity (e.g. 22K 916, 18K, 925)</Text>
          <TextInput style={styles.input} value={prodPurity} onChangeText={setProdPurity} />

          <Text style={styles.label}>Net Weight (grams)</Text>
          <TextInput style={styles.input} value={prodWeight} onChangeText={setProdWeight} keyboardType="numeric" placeholder="e.g. 12.5" />

          <Text style={styles.label}>Total Price (₹) *</Text>
          <TextInput style={styles.input} value={prodPrice} onChangeText={setProdPrice} keyboardType="numeric" placeholder="e.g. 85000" />

          <Text style={styles.label}>Stock Quantity *</Text>
          <TextInput style={styles.input} value={prodStock} onChangeText={setProdStock} keyboardType="numeric" />

          <Text style={styles.label}>BIS HUID Code</Text>
          <TextInput style={styles.input} value={prodHuid} onChangeText={setProdHuid} placeholder="6-digit HUID" />

          <Text style={styles.label}>Catalogue Image URL</Text>
          <TextInput style={styles.input} value={prodImageUrl} onChangeText={setProdImageUrl} placeholder="https://..." />

          <Text style={styles.label}>Virtual Try-On Overlay Asset URL (PNG)</Text>
          <TextInput style={styles.input} value={prodTryOnUrl} onChangeText={setProdTryOnUrl} placeholder="https://..." />

          {prodCategory === 'EARRINGS' && (
            <>
              <Text style={styles.label}>Earring Drop Length (mm) — for Fit Profile matching</Text>
              <TextInput style={styles.input} value={prodDropMm} onChangeText={setProdDropMm} keyboardType="numeric" placeholder="e.g. 35" />
            </>
          )}

          {prodCategory === 'NECKLACE' && (
            <>
              <Text style={styles.label}>Necklace Length (inches) — for Fit Profile matching</Text>
              <TextInput style={styles.input} value={prodNecklaceIn} onChangeText={setProdNecklaceIn} keyboardType="numeric" placeholder="e.g. 18" />
            </>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => {
              if (!prodName.trim() || !prodPrice || Number(prodPrice) <= 0) {
                Alert.alert('Missing Details', 'Please enter product name and a valid price.');
                return;
              }
              createProductMutation.mutate();
            }}
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Publish Product</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  formWrap: { padding: SPACING.md, paddingBottom: 48 },
  formHeader: { alignItems: 'center', marginBottom: 16, gap: 6 },
  formTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  formSub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#B45309', paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: 20, paddingHorizontal: 20,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  storeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: SPACING.md, borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  storeName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  storeSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  verifyChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  addProdBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#B45309', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md,
  },
  addProdBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cardMeta: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  cardPrice: { fontSize: 14, fontWeight: '900', color: '#B45309', marginTop: 4 },
  statusToggle: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  apptStatus: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  phoneText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  notesText: { fontSize: 11, color: '#475569', marginTop: 4, fontStyle: 'italic' },
  apptActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  apptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm },
  apptBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
});
