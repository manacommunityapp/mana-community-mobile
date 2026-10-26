import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, FONTS } from '@/constants/config';
import type { DomesticStaffDto } from '@/services/homeServicesService';

interface WorkerGatePassModalProps {
  visible: boolean;
  staff: DomesticStaffDto | null;
  onClose: () => void;
}

export function WorkerGatePassModal({ visible, staff, onClose }: WorkerGatePassModalProps) {
  if (!staff) return null;

  const qrToken = `MANA-PASS-${staff.id.toUpperCase()}-2026`;

  const handleSharePass = async () => {
    try {
      await Share.share({
        message: `🛡️ Digital Security Gate Pass - Mana Residency\nStaff: ${staff.name} (${staff.role})\nPass Token: ${qrToken}\nPermitted Towers: ${staff.workingTowers || 'All Towers'}\nValid Until: 31-DEC-2026`,
      });
    } catch (err: any) {
      Alert.alert('Sharing Failed', err?.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalAccent} />
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shieldCircle}>
                <Text style={styles.shieldEmoji}>🛡️</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Digital Gate Pass</Text>
                <Text style={styles.headerSub}>Community Verified Access</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.passCard}>
              <View style={styles.passTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{staff.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>👤 {staff.name}</Text>
                  <Text style={styles.staffRole}>{staff.role} • Regular Domestic Helper</Text>
                  <View style={styles.verifiedRow}>
                    <Text style={styles.verifiedText}>✅ Aadhaar & Police Verified</Text>
                  </View>
                </View>
              </View>

              <View style={styles.qrContainer}>
                <View style={styles.qrFrame}>
                  <Ionicons name="qr-code-outline" size={120} color="#1E1B4B" />
                </View>
                <View style={styles.qrTokenChip}>
                  <Text style={styles.qrTokenText}>{qrToken}</Text>
                </View>
                <Text style={styles.qrHint}>📍 Present to scanner at Main Gates 1 & 2</Text>
              </View>

              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>🏠 Permitted Towers</Text>
                  <Text style={styles.metaValue}>{staff.workingTowers || 'Towers A, B, C'}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>🕐 Shift Hours</Text>
                  <Text style={styles.metaValue}>{staff.shiftTime || '07:00 AM - 07:00 PM'}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📞 Emergency Contact</Text>
                  <Text style={styles.metaValue}>{staff.phone}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📅 Pass Validity</Text>
                  <Text style={[styles.metaValue, { color: '#059669' }]}>Active until 31 Dec 2026</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleSharePass}>
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shareBtnGrad}
              >
                <Text style={styles.shareBtnText}>📤 Share Pass with Staff / Gate</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#059669',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmoji: { fontSize: 18 },
  headerTitle: { fontSize: 16, fontFamily: FONTS.displayEB, color: '#0F172A' },
  headerSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#64748B', marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { padding: 20 },

  passCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    padding: 18,
    ...SHADOWS.sm,
  },
  passTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontFamily: FONTS.displayEB },
  staffName: { fontSize: 16, fontFamily: FONTS.displayEB, color: '#0F172A' },
  staffRole: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  verifiedRow: { marginTop: 4 },
  verifiedText: { fontSize: 10, fontFamily: FONTS.bold, color: '#059669' },

  qrContainer: { alignItems: 'center', paddingVertical: 18 },
  qrFrame: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E8E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  qrTokenChip: {
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  qrTokenText: {
    fontSize: 12,
    fontFamily: FONTS.displayEB,
    color: '#4338CA',
    letterSpacing: 1.5,
  },
  qrHint: { fontSize: 10, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: 6, textAlign: 'center' },

  metaBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: { fontSize: 11, fontFamily: FONTS.medium, color: '#64748B' },
  metaValue: { fontSize: 11, fontFamily: FONTS.bold, color: '#0F172A' },
  metaDivider: { height: 1, backgroundColor: '#F1F5F9' },

  shareBtn: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  shareBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },
});
