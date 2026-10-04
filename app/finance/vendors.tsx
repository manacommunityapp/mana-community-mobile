import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  societyFinanceService,
  SocietyVendorDto,
  CreateSocietyVendorDto,
  TdsSection,
} from '@/services/societyFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function SocietyVendorsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('Security Services');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [tdsSection, setTdsSection] = useState<TdsSection>('194C_CONTRACTOR');
  const [tdsRate, setTdsRate] = useState('2');

  const {
    data: vendors = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['society-vendors'],
    queryFn: societyFinanceService.getVendors,
  });

  const createMutation = useMutation({
    mutationFn: societyFinanceService.createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['society-vendors'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'New vendor added to society directory.');
    },
  });

  const resetForm = () => {
    setVendorName('');
    setCategory('Security Services');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setGstin('');
    setPanNumber('');
    setTdsSection('194C_CONTRACTOR');
    setTdsRate('2');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSave = () => {
    if (!vendorName.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please enter Vendor Name and Phone Number.');
      return;
    }
    createMutation.mutate({
      vendorName: vendorName.trim(),
      category,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      panNumber: panNumber.trim() || undefined,
      tdsSection,
      tdsRate: parseFloat(tdsRate) || 0,
    });
  };

  const filtered = vendors.filter(v => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return v.vendorName.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || (v.gstin && v.gstin.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── Search & Action ── */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors, GSTIN, categories..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="business-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Vendors Registered</Text>
            <Text style={styles.emptySub}>Add security, housekeeping, lift maintenance vendors.</Text>
          </View>
        ) : (
          filtered.map(ven => (
            <View key={ven.id} style={styles.vendorCard}>
              <View style={styles.vHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vName}>{ven.vendorName}</Text>
                  <Text style={styles.vCategory}>{ven.category}</Text>
                </View>
                <View style={styles.tdsTag}>
                  <Text style={styles.tdsTagText}>TDS {ven.tdsRate}% ({ven.tdsSection.split('_')[0]})</Text>
                </View>
              </View>

              <View style={styles.vDetails}>
                <Text style={styles.detailText}>📞 {ven.phone} {ven.contactPerson ? `• ${ven.contactPerson}` : ''}</Text>
                {ven.gstin && <Text style={styles.detailText}>🏢 GSTIN: {ven.gstin}</Text>}
              </View>

              <View style={styles.balanceStrip}>
                <View>
                  <Text style={styles.balSub}>Total Invoiced</Text>
                  <Text style={styles.balVal}>{formatCurrency(ven.totalBilled)}</Text>
                </View>
                <View>
                  <Text style={styles.balSub}>Paid</Text>
                  <Text style={[styles.balVal, { color: '#10B981' }]}>{formatCurrency(ven.totalPaid)}</Text>
                </View>
                <View>
                  <Text style={styles.balSub}>Outstanding</Text>
                  <Text style={[styles.balVal, { color: ven.outstandingBalance > 0 ? '#EF4444' : '#10B981' }]}>
                    {formatCurrency(ven.outstandingBalance)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add Vendor Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboard Society Vendor</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Vendor Company Name</Text>
              <TextInput style={styles.input} placeholder="e.g. Apex Security Services LLP" placeholderTextColor="#94A3B8" value={vendorName} onChangeText={setVendorName} />

              <Text style={styles.inputLabel}>Service Category</Text>
              <TextInput style={styles.input} placeholder="e.g. Security, Housekeeping, Lift AMC" placeholderTextColor="#94A3B8" value={category} onChangeText={setCategory} />

              <Text style={styles.inputLabel}>Contact Person & Phone</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Contact Name" placeholderTextColor="#94A3B8" value={contactPerson} onChangeText={setContactPerson} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone Number" placeholderTextColor="#94A3B8" value={phone} onChangeText={setPhone} />
              </View>

              <Text style={styles.inputLabel}>Tax Registration (GSTIN & PAN)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="GSTIN (15 Digits)" placeholderTextColor="#94A3B8" value={gstin} onChangeText={setGstin} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="PAN (10 Digits)" placeholderTextColor="#94A3B8" value={panNumber} onChangeText={setPanNumber} />
              </View>

              <Text style={styles.inputLabel}>Income Tax TDS Section</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                {[
                  { sec: '194C_CONTRACTOR', label: '194C (2% Contractor)' },
                  { sec: '194J_PROFESSIONAL', label: '194J (10% Prof)' },
                  { sec: 'NONE', label: 'No TDS' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.sec}
                    style={[styles.tdsChip, tdsSection === item.sec && styles.tdsChipActive]}
                    onPress={() => {
                      setTdsSection(item.sec as TdsSection);
                      setTdsRate(item.sec === '194C_CONTRACTOR' ? '2' : item.sec === '194J_PROFESSIONAL' ? '10' : '0');
                    }}
                  >
                    <Text style={[styles.tdsChipText, tdsSection === item.sec && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Register Vendor</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { flexDirection: 'row', padding: SPACING.md, gap: 8, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  list: { padding: SPACING.md, paddingBottom: 60 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  vHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  vCategory: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tdsTag: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tdsTagText: { fontSize: 11, color: '#6366F1', fontWeight: 'bold' },
  vDetails: { marginVertical: 8 },
  detailText: { fontSize: 12, color: '#475569', marginTop: 2 },
  balanceStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  balSub: { fontSize: 10, color: '#64748B' },
  balVal: { fontSize: 13, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: SPACING.sm, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: SPACING.xs,
  },
  tdsChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  tdsChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tdsChipText: { fontSize: 11, color: '#475569' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
