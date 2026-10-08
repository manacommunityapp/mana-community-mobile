import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

interface BiometricLockModalProps {
  visible: boolean;
  onUnlock: () => void;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({ visible, onUnlock }) => {
  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print" size={54} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Mana Community Locked</Text>
        <Text style={styles.sub}>Authenticate with Biometrics to access your community dashboard</Text>

        <TouchableOpacity style={styles.unlockBtn} onPress={onUnlock} activeOpacity={0.8}>
          <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
          <Text style={styles.unlockBtnText}>Unlock with FaceID / TouchID</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    maxWidth: 280,
    lineHeight: 20,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    elevation: 4,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
