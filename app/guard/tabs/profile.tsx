import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, GRADIENTS, getAvatarColor } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
}

function MenuItem({ icon, label, onPress, danger, iconColor, iconBg }: MenuItemProps) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[s.menuIconWrap, { backgroundColor: iconBg || COLORS.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : (iconColor || GUARD_COLORS.accent)} />
      </View>
      <Text style={[s.menuLabel, danger && s.dangerText]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
}

export default function GuardProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const avatarColor = getAvatarColor(user?.name || 'Guard');

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroDot1} />
          <View style={s.heroDot2} />
          <LinearGradient
            colors={GRADIENTS.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroAvatar}
          >
            <Text style={[s.heroAvatarText, { color: '#FFFFFF' }]}>
              {(user?.name || 'G')[0].toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={s.heroName}>{user?.name || 'Guard'}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>
          <View style={s.heroTagRow}>
            <View style={s.heroTag}>
              <Ionicons name="shield" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>Security Guard</Text>
            </View>
            <View style={s.heroTag}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>Gate A</Text>
            </View>
            <View style={s.heroStatusBadge}>
              <View style={s.statusDot} />
              <Text style={s.heroStatusText}>ON DUTY</Text>
            </View>
          </View>
        </View>

        {/* Shift Info */}
        <Text style={s.sectionHeader}>Shift Details</Text>
        <View style={s.menuSection}>
          <MenuItem icon="time-outline" label="Current Shift: 6 AM – 2 PM" onPress={() => {}} iconColor={GUARD_COLORS.accent} iconBg={GUARD_COLORS.accentLight} />
          <MenuItem icon="calendar-outline" label="Shift Schedule" onPress={() => {}} iconColor="#4F46E5" iconBg="#EEF2FF" />
          <MenuItem icon="document-text-outline" label="Patrol History" onPress={() => {}} iconColor="#7C3AED" iconBg="#EDE9FE" />
          <MenuItem icon="stats-chart-outline" label="My Reports" onPress={() => {}} iconColor="#059669" iconBg="#D1FAE5" />
        </View>

        {/* Account */}
        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.menuSection}>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
          <MenuItem icon="settings-outline" label="Settings" onPress={() => {}} />
        </View>

        {/* Sign Out */}
        <View style={[s.menuSection, { marginTop: 8 }]}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger iconBg={COLORS.errorLight} />
        </View>

        <Text style={s.version}>Mana Community v1.0.0 · Guard</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  hero: {
    backgroundColor: GUARD_COLORS.heroBg,
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
  heroAvatarText: { fontFamily: 'DMSans-Bold', fontWeight: '800', fontSize: 34 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, textAlign: 'center' },
  heroTagRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  heroStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.25)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  heroStatusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  sectionHeader: {
    fontSize: 12, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 22, marginBottom: 8, marginLeft: 20,
  },
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
  dangerText: { color: COLORS.error },
  version: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 12, paddingTop: 24, paddingBottom: 8,
  },
});
