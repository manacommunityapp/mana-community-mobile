import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { emergencyService } from '@/services/emergencyService';
import type { EmergencyAlertDto, EmergencyContact } from '@/services/emergencyService';
import { showSafeError } from '@/security';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface EmergencyTrigger {
  id: string;
  label: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}

const EMERGENCY_CATEGORIES: EmergencyTrigger[] = [
  { id: 'MEDICAL', label: 'Medical Emergency', icon: 'medkit-outline', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'FIRE', label: 'Fire Hazard', icon: 'flame-outline', color: '#EA580C', bg: '#FFEDD5' },
  { id: 'LIFT', label: 'Lift Stuck', icon: 'git-compare-outline', color: '#D97706', bg: '#FEF3C7' },
  { id: 'SECURITY', label: 'Security Threat', icon: 'shield-outline', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'GAS_LEAK', label: 'Gas Leakage', icon: 'warning-outline', color: '#059669', bg: '#D1FAE5' },
  { id: 'FLOOD', label: 'Water Seepage/Flood', icon: 'water-outline', color: '#0891B2', bg: '#CFFAFE' },
];

export default function EmergencyScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<EmergencyTrigger | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlertDto | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
    loadActiveAlerts();
  }, []);

  async function loadContacts() {
    try {
      const data = await emergencyService.getContacts();
      setContacts(data);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }

  async function loadActiveAlerts() {
    try {
      const alerts = await emergencyService.getActiveAlerts();
      const active = alerts.find(a => a.status !== 'RESOLVED');
      if (active) setActiveAlert(active);
    } catch {
      // No active alerts or API unavailable
    }
  }

  const handleTriggerSOS = (cat: EmergencyTrigger) => {
    setSelectedCategory(cat);
  };

  const handleConfirmSOS = async () => {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      const alert = await emergencyService.triggerSOS({
        category: selectedCategory.id,
        description: description || undefined,
        tower: user?.tower,
        flatNumber: user?.flatNumber,
      });
      setActiveAlert(alert);
      setSelectedCategory(null);
      setDescription('');
      Alert.alert(
        'Emergency Dispatched',
        `Security marshals and on-duty responders have been notified for Tower ${user?.tower || 'A'}, Flat ${user?.flatNumber || '101'}.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      showSafeError(err, 'Failed to send emergency alert. Please call security directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!activeAlert) return;
    Alert.alert('Resolve Incident', 'Mark emergency as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            await emergencyService.resolveAlert(activeAlert.id);
            setActiveAlert(null);
          } catch (err) {
            showSafeError(err, 'Failed to resolve alert.');
          }
        },
      },
    ]);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeAlert && (
        <View style={styles.activeAlertCard}>
          <View style={styles.activeAlertHeader}>
            <Ionicons name="radio-outline" size={22} color="#DC2626" />
            <Text style={styles.activeAlertTitle}>ACTIVE SOS: {activeAlert.category}</Text>
          </View>
          <Text style={styles.activeAlertSubtitle}>
            Status: <Text style={styles.dispatchedText}>{activeAlert.status}</Text>
          </Text>
          <TouchableOpacity style={styles.cancelAlertBtn} onPress={handleResolve}>
            <Text style={styles.cancelAlertText}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.warningBanner}>
        <Ionicons name="information-circle" size={20} color="#DC2626" />
        <Text style={styles.warningText}>
          Tap any button below to broadcast an instant emergency distress signal to security and tower marshals.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Quick SOS Distress Triggers</Text>
      <View style={styles.grid}>
        {EMERGENCY_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.triggerCard, { backgroundColor: cat.bg, borderColor: cat.color }]}
            onPress={() => handleTriggerSOS(cat)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
              <Ionicons name={cat.icon} size={26} color="#FFFFFF" />
            </View>
            <Text style={[styles.triggerLabel, { color: cat.color }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>24x7 Society Helplines</Text>
      <View style={styles.contactsCard}>
        {contactsLoading ? (
          <ActivityIndicator style={{ padding: SPACING.lg }} color={COLORS.primary} />
        ) : contacts.length === 0 ? (
          <Text style={{ padding: SPACING.md, color: COLORS.textMuted, fontSize: 13 }}>
            Emergency contacts unavailable. Please contact society management.
          </Text>
        ) : (
          contacts.map((c, i) => (
            <View key={c.id || i} style={[styles.contactRow, i > 0 && styles.contactBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactRole}>{c.role}</Text>
                <Text style={styles.contactAvailable}>{c.available}</Text>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(c.phone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Modal visible={!!selectedCategory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Confirm Emergency SOS</Text>
            </View>

            <Text style={styles.modalDescription}>
              Triggering <Text style={{ fontFamily: 'DMSans-Bold', fontWeight: 'bold' }}>{selectedCategory?.label}</Text> for:
            </Text>

            <View style={styles.locationBox}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.locationText}>
                Tower {user?.tower || 'Tower A'}, Flat {user?.flatNumber || '101'}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Additional details (e.g. 5th floor elevator, trapped 2 people)..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedCategory(null)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmSOS}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Broadcast SOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  warningText: { fontSize: 12, color: '#991B1B', flex: 1, fontFamily: 'DMSans-Medium', fontWeight: '500', lineHeight: 17 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  triggerCard: {
    width: '47%',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...SHADOWS.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  triggerLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  contactsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  contactBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  contactRole: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contactAvailable: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  callButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  activeAlertCard: {
    backgroundColor: '#FFF1F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  activeAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  activeAlertTitle: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
  activeAlertSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  dispatchedText: { color: '#059669', fontWeight: '800' },
  cancelAlertBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  cancelAlertText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeader: { alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#DC2626', marginTop: SPACING.xs },
  modalDescription: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: SPACING.lg,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
