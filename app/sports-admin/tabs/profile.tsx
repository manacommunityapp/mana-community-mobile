import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, getAvatarColor, getInitials } from '@/constants/config';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';
import { useAuth } from '@/hooks/useAuth';
import { sportsAdminService, type SportsAdminDashboardStats } from '@/services/sportsAdminService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
  trailing?: string;
}

function MenuItem({ icon, label, onPress, danger, iconColor, iconBg, trailing }: MenuItemProps) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[s.menuIconWrap, { backgroundColor: iconBg || COLORS.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : (iconColor || SPORTS_ADMIN_COLORS.accent)} />
      </View>
      <Text style={[s.menuLabel, danger && s.dangerText]}>{label}</Text>
      {trailing && <Text style={s.menuTrailing}>{trailing}</Text>}
      <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
}

export default function SportsAdminProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const displayName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Sports Admin');
  const avatarColor = getAvatarColor(displayName);
  const [stats, setStats] = useState<SportsAdminDashboardStats | null>(null);

  useEffect(() => {
    sportsAdminService.getDashboardStats().then(setStats);
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <View style={s.heroDot1} />
          <View style={s.heroDot2} />
          <View style={[s.heroAvatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[s.heroAvatarText, { color: avatarColor.text }]}>
              {getInitials(displayName)}
            </Text>
          </View>
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>
          <View style={s.heroTagRow}>
            <View style={s.heroTag}>
              <Ionicons name="trophy" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>SPORTS ADMIN</Text>
            </View>
            <View style={s.heroTag}>
              <Ionicons name="business" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>{user?.communityName || 'Community'}</Text>
            </View>
          </View>
        </View>

        {stats && (
          <>
            <Text style={s.sectionHeader}>Quick Stats</Text>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Text style={s.metricValue}>{stats.totalTournaments}</Text>
                <Text style={s.metricLabel}>Tournaments</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricValue}>{stats.activeTournaments}</Text>
                <Text style={s.metricLabel}>Active</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricValue}>{stats.totalPlayers}</Text>
                <Text style={s.metricLabel}>Players</Text>
              </View>
            </View>
          </>
        )}

        <Text style={s.sectionHeader}>Management</Text>
        <View style={s.menuSection}>
          <MenuItem icon="trophy-outline" label="Tournament Management" onPress={() => {}} iconColor={SPORTS_ADMIN_COLORS.accent} iconBg={SPORTS_ADMIN_COLORS.accentLight} />
          <MenuItem icon="people-outline" label="Team Management" onPress={() => {}} iconColor="#4F46E5" iconBg="#EEF2FF" />
          <MenuItem icon="location-outline" label="Venue Management" onPress={() => {}} iconColor="#D97706" iconBg="#FEF3C7" />
          <MenuItem icon="stats-chart-outline" label="Reports & Analytics" onPress={() => {}} iconColor="#7C3AED" iconBg="#EDE9FE" />
        </View>

        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.menuSection}>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
        </View>

        <View style={[s.menuSection, { marginTop: 8 }]}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger iconBg={COLORS.errorLight} />
        </View>

        <Text style={s.version}>Mana Community v1.0.0 · Sports Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  hero: {
    backgroundColor: SPORTS_ADMIN_COLORS.heroBg,
    alignItems: 'center', paddingTop: 28, paddingBottom: 30, paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroDot1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -60,
  },
  heroDot2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -40,
  },
  heroAvatar: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14, ...SHADOWS.md,
  },
  heroAvatarText: { fontWeight: '800', fontSize: 34 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, textAlign: 'center' },
  heroTagRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 22, marginBottom: 8, marginLeft: 20,
  },
  metricsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16 },
  metricCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  metricValue: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  menuSection: {
    backgroundColor: COLORS.surface, marginHorizontal: 16,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuTrailing: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  dangerText: { color: COLORS.error },
  version: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 12, paddingTop: 24, paddingBottom: 8,
  },
});
