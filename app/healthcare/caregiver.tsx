import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, TouchableOpacity, Switch, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  healthcareOpsService,
  CaregiverConsentDto,
  GrantCaregiverConsentRequest,
} from '../../services/healthcareOpsService';

const PLACEHOLDER_PATIENT_ID = 1; // replaced with auth context in production

function PermissionToggle({
  label, icon, value, onChange,
}: { label: string; icon: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.permRow}>
      <Ionicons name={icon as any} size={18} color="#64748b" style={{ marginRight: 8 }} />
      <Text style={styles.permLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
        thumbColor={value ? '#2563eb' : '#94a3b8'}
      />
    </View>
  );
}

export default function CaregiverScreen() {
  const [consents, setConsents] = useState<CaregiverConsentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [caregiverId, setCaregiverId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [canView, setCanView] = useState(true);
  const [canBook, setCanBook] = useState(false);
  const [canReport, setCanReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConsents(await healthcareOpsService.getCaregiverConsents(PLACEHOLDER_PATIENT_ID));
    } catch {
      Alert.alert('Error', 'Failed to load caregiver access list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = useCallback((item: CaregiverConsentDto) => {
    Alert.alert(
      'Revoke Access',
      `Remove caregiver access for user #${item.caregiverUserId}? They will no longer be able to access your health records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke', style: 'destructive',
          onPress: async () => {
            try {
              await healthcareOpsService.revokeCaregiverConsent(item.id);
              setConsents(prev => prev.filter(c => c.id !== item.id));
            } catch {
              Alert.alert('Error', 'Failed to revoke access');
            }
          },
        },
      ]
    );
  }, []);

  const grant = useCallback(async () => {
    const id = parseInt(caregiverId, 10);
    if (!id || isNaN(id)) { Alert.alert('Invalid', 'Enter a valid caregiver user ID'); return; }
    if (!relationship.trim()) { Alert.alert('Required', 'Enter the relationship (e.g. Spouse, Parent)'); return; }

    const req: GrantCaregiverConsentRequest = {
      caregiverUserId: id,
      relationship: relationship.trim(),
      canViewRecords: canView,
      canBookAppointments: canBook,
      canReceiveReports: canReport,
    };

    setSubmitting(true);
    try {
      const created = await healthcareOpsService.grantCaregiverConsent(req);
      setConsents(prev => [created, ...prev]);
      setModalVisible(false);
      setCaregiverId('');
      setRelationship('');
      setCanView(true);
      setCanBook(false);
      setCanReport(false);
    } catch {
      Alert.alert('Error', 'Failed to grant caregiver access');
    } finally {
      setSubmitting(false);
    }
  }, [caregiverId, relationship, canView, canBook, canReport]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#2563eb" />
        <Text style={styles.infoText}>
          Only you can manage who has access to your health records.
        </Text>
      </View>

      <FlatList
        data={consents}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No caregiver access granted</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isActive && styles.cardInactive]}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.name}>Caregiver #{item.caregiverUserId}</Text>
                <Text style={styles.relationship}>{item.relationship}</Text>
              </View>
              {item.isActive ? (
                <TouchableOpacity onPress={() => revoke(item)} style={styles.revokeBtn}>
                  <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                  <Text style={styles.revokeTxt}>Revoke</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.badgeTxt, { color: '#94a3b8' }]}>Inactive</Text>
                </View>
              )}
            </View>

            {/* Permissions */}
            <View style={styles.permsRow}>
              <PermChip
                icon="eye-outline" label="View records"
                active={item.canViewRecords} />
              <PermChip
                icon="calendar-outline" label="Book appts"
                active={item.canBookAppointments} />
              <PermChip
                icon="document-text-outline" label="Reports"
                active={item.canReceiveReports} />
            </View>

            <Text style={styles.since}>
              Granted {new Date(item.grantedAt).toLocaleDateString()}
              {item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}
            </Text>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="person-add-outline" size={22} color="#fff" />
        <Text style={styles.fabTxt}>Add Caregiver</Text>
      </TouchableOpacity>

      {/* Grant modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grant Caregiver Access</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>Caregiver User ID *</Text>
            <TextInput
              style={styles.input}
              value={caregiverId}
              onChangeText={setCaregiverId}
              keyboardType="numeric"
              placeholder="Enter user ID"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Relationship *</Text>
            <TextInput
              style={styles.input}
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. Spouse, Parent, Child"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Permissions</Text>
            <View style={styles.permCard}>
              <PermissionToggle label="View health records" icon="eye-outline" value={canView} onChange={setCanView} />
              <PermissionToggle label="Book appointments" icon="calendar-outline" value={canBook} onChange={setCanBook} />
              <PermissionToggle label="Receive reports" icon="document-text-outline" value={canReport} onChange={setCanReport} />
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="information-circle-outline" size={16} color="#92400e" />
              <Text style={styles.warningText}>
                The caregiver will be able to access your health data based on the permissions above.
                You can revoke access at any time.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.grantBtn, submitting && { opacity: 0.6 }]}
              onPress={grant}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.grantTxt}>Grant Access</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PermChip({ icon, label, active }: { icon: string; label: string; active: boolean }) {
  return (
    <View style={[styles.chip, { backgroundColor: active ? '#eff6ff' : '#f1f5f9' }]}>
      <Ionicons name={icon as any} size={12} color={active ? '#2563eb' : '#94a3b8'} />
      <Text style={[styles.chipTxt, { color: active ? '#2563eb' : '#94a3b8' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', margin: 16, marginBottom: 0,
    padding: 12, borderRadius: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  relationship: { fontSize: 12, color: '#64748b', marginTop: 2 },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  revokeTxt: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  permsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  chipTxt: { fontSize: 11, fontWeight: '600' },
  since: { fontSize: 11, color: '#94a3b8' },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: '#2563eb', borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    gap: 8, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1e293b',
  },
  permCard: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  permLabel: { flex: 1, fontSize: 14, color: '#1e293b' },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fffbeb', padding: 12, borderRadius: 10, marginTop: 16,
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },
  grantBtn: {
    backgroundColor: '#2563eb', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40,
  },
  grantTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
