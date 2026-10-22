import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { healthGuardService } from '@/services/healthGuardService';
import type { EmergencyContactDto, ContactRelationship } from '@/types/healthguard';

const RELATIONSHIPS: ContactRelationship[] = [
  'SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'FRIEND', 'NEIGHBOR', 'DOCTOR', 'CAREGIVER', 'OTHER',
];
const REL_LABEL: Record<ContactRelationship, string> = {
  SPOUSE: 'Spouse', PARENT: 'Parent', CHILD: 'Child', SIBLING: 'Sibling',
  FRIEND: 'Friend', NEIGHBOR: 'Neighbor', DOCTOR: 'Doctor', CAREGIVER: 'Caregiver', OTHER: 'Other',
};

const EMPTY: EmergencyContactDto = {
  name: '', phone: '', email: '', relationship: 'OTHER',
  priority: 1, notifyOnSos: true, notifyOnAlert: true, consentGiven: false, isActive: true,
};

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<EmergencyContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<EmergencyContactDto>(EMPTY);
  const [isNew, setIsNew] = useState(true);

  const load = useCallback(() => {
    healthGuardService.getContacts().then(c => { setContacts(c); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditContact({ ...EMPTY }); setIsNew(true); setShowModal(true); };
  const openEdit = (c: EmergencyContactDto) => { setEditContact({ ...c }); setIsNew(false); setShowModal(true); };

  const set = (key: keyof EmergencyContactDto, value: any) =>
    setEditContact(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!editContact.name || !editContact.phone) {
      Alert.alert('Required', 'Name and phone are required.'); return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await healthGuardService.addContact(editContact);
      } else {
        await healthGuardService.updateContact(editContact.id!, editContact);
      }
      setShowModal(false);
      load();
    } catch {
      Alert.alert('Error', 'Could not save contact.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c: EmergencyContactDto) => {
    Alert.alert('Remove Contact', `Remove ${c.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await healthGuardService.deleteContact(c.id!);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Emergency Contacts</Text>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          These contacts are notified when you trigger an SOS or emergency alert.
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} size="large" color={COLORS.primary} />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No emergency contacts</Text>
            <Text style={styles.emptySub}>Add someone who can be reached in an emergency</Text>
            <TouchableOpacity style={styles.emptyAdd} onPress={openAdd}>
              <Text style={styles.emptyAddText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contacts.map((c, idx) => (
            <View key={c.id ?? idx} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{c.name}</Text>
                    {c.priority === 1 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.phone}>{c.phone}</Text>
                  {c.relationship && (
                    <Text style={styles.rel}>{REL_LABEL[c.relationship as ContactRelationship] ?? c.relationship}</Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(c)} style={styles.iconBtn}>
                    <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(c)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.flags}>
                <View style={styles.flag}>
                  <Ionicons name={c.notifyOnSos ? 'notifications' : 'notifications-off-outline'} size={14} color={c.notifyOnSos ? '#ef4444' : COLORS.textSecondary} />
                  <Text style={[styles.flagText, !c.notifyOnSos && styles.flagOff]}>SOS alerts</Text>
                </View>
                <View style={styles.flag}>
                  <Ionicons name={c.notifyOnAlert ? 'alert-circle' : 'alert-circle-outline'} size={14} color={c.notifyOnAlert ? '#f59e0b' : COLORS.textSecondary} />
                  <Text style={[styles.flagText, !c.notifyOnAlert && styles.flagOff]}>Health alerts</Text>
                </View>
                {c.consentGiven && (
                  <View style={styles.flag}>
                    <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
                    <Text style={styles.flagText}>Consent given</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isNew ? 'Add Contact' : 'Edit Contact'}</Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.input} value={editContact.name} onChangeText={v => set('name', v)} placeholder="Full name" placeholderTextColor={COLORS.textSecondary} />

          <Text style={styles.fieldLabel}>Phone *</Text>
          <TextInput style={styles.input} value={editContact.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+91-XXXXXXXXXX" placeholderTextColor={COLORS.textSecondary} />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput style={styles.input} value={editContact.email ?? ''} onChangeText={v => set('email', v)} keyboardType="email-address" placeholder="email@example.com" placeholderTextColor={COLORS.textSecondary} autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Relationship</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {RELATIONSHIPS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.relChip, editContact.relationship === r && styles.relChipSelected]}
                  onPress={() => set('relationship', r)}
                >
                  <Text style={[styles.relChipText, editContact.relationship === r && styles.relChipTextSelected]}>
                    {REL_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>Priority (1 = highest)</Text>
          <TextInput style={styles.input} value={editContact.priority?.toString() ?? '1'} onChangeText={v => set('priority', parseInt(v) || 1)} keyboardType="numeric" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Notify on SOS</Text>
            <Switch value={editContact.notifyOnSos ?? true} onValueChange={v => set('notifyOnSos', v)} trackColor={{ true: '#ef4444' }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Notify on health alerts</Text>
            <Switch value={editContact.notifyOnAlert ?? true} onValueChange={v => set('notifyOnAlert', v)} trackColor={{ true: COLORS.primary }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Consent given</Text>
            <Switch value={editContact.consentGiven ?? false} onValueChange={v => set('consentGiven', v)} trackColor={{ true: '#22c55e' }} />
          </View>

          <TouchableOpacity style={styles.saveBar} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBarText}>Save Contact</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 8 },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  emptyAdd: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: RADIUS.md },
  emptyAddText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.xs },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  primaryBadge: { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#d97706' },
  phone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rel: { fontSize: 12, color: COLORS.textSecondary },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingTop: SPACING.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flagText: { fontSize: 12, color: COLORS.textSecondary },
  flagOff: { color: COLORS.border },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalContent: { padding: SPACING.md, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  fieldLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, marginTop: SPACING.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, marginBottom: 4,
  },
  relChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border },
  relChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  relChipText: { fontSize: 13, color: COLORS.textSecondary },
  relChipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  switchLabel: { fontSize: 14, color: COLORS.text },
  saveBar: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.lg, ...SHADOWS.md },
  saveBarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
