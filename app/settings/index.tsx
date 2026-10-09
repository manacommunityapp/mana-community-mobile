import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/config';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  route: string;
  iconColor: string;
  iconBg: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  sub,
  route,
  iconColor,
  iconBg,
}) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() => router.push(route as any)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
};

export default function SettingsHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionHeader}>SECURITY & ACCESS</Text>
        <View style={styles.card}>
          <SettingItem
            icon="finger-print-outline"
            title="App Lock & Biometrics"
            sub="Fingerprint, Face ID, 4-digit PIN & pattern lock"
            route="/settings/security"
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy & GDPR"
            sub="Directory visibility, data export & erasure"
            route="/settings/privacy"
            iconColor="#059669"
            iconBg="#ECFDF5"
          />
        </View>

        <Text style={styles.sectionHeader}>PREFERENCES & DATA</Text>
        <View style={styles.card}>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            sub="Alert channels, quiet hours & push preferences"
            route="/settings/notifications"
            iconColor="#D97706"
            iconBg="#FEF3C7"
          />
          <View style={styles.divider} />
          <SettingItem
            icon="cloud-offline-outline"
            title="Offline Mode & Sync"
            sub="Cache management and offline background sync"
            route="/settings/offline-sync"
            iconColor="#0284C7"
            iconBg="#E0F2FE"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.appInfoRow}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
            </View>
            <View>
              <Text style={styles.appName}>Mana Community</Text>
              <Text style={styles.appVersion}>Version 2.4.0 (Build 202610)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: -8,
    fontFamily: FONTS.bold,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  itemSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  appVersion: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
