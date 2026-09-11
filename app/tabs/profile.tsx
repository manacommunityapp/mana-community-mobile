import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';

interface MenuItemProps {
  emoji: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  admin?: boolean;
}

function MenuItem({ emoji, label, onPress, danger, admin }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, admin && styles.menuItemAdmin]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuLabel, danger && styles.dangerText, admin && styles.adminText]}>{label}</Text>
      {admin && <Text style={styles.adminBadge}>ADMIN</Text>}
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name[0]}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {(user.flatNumber || user.tower) && (
            <View style={styles.tagRow}>
              {user.flatNumber && <View style={styles.tag}><Text style={styles.tagText}>🏠 {user.flatNumber}</Text></View>}
              {user.tower    && <View style={styles.tag}><Text style={styles.tagText}>🏢 {user.tower}</Text></View>}
            </View>
          )}
          <View style={[styles.statusBadge, user.status === 'ACTIVE' && styles.statusActive]}>
            <Text style={styles.statusText}>{user.status}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <MenuItem emoji="✏️"  label="Edit Profile"       onPress={() => router.push('/profile/edit')} />
          <MenuItem emoji="🔔"  label="Notifications"      onPress={() => router.push('/notifications')} />
          <MenuItem emoji="🔒"  label="Change Password"    onPress={() => router.push('/settings/password')} />
          <MenuItem emoji="🏘️"  label="My Community"       onPress={() => router.push('/community')} />
          <MenuItem emoji="📋"  label="My Activity"        onPress={() => router.push('/activity')} />
          <MenuItem emoji="⚙️"  label="Settings"           onPress={() => router.push('/settings')} />
          {/* Admin panel — only visible to admins and moderators */}
          {['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role) && (
            <MenuItem emoji="🛡️"  label="Admin Panel"      onPress={() => router.push('/admin')} admin />
          )}
          <MenuItem emoji="🚪"  label="Sign Out"           onPress={handleLogout} danger />
        </View>

        <Text style={styles.version}>Mana Community v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:           { padding: 16, gap: 16 },
  profileCard:      { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText:       { color: '#fff', fontWeight: '800', fontSize: 32 },
  name:             { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email:            { fontSize: 14, color: COLORS.textMuted },
  tagRow:           { flexDirection: 'row', gap: 8 },
  tag:              { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:          { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  statusBadge:      { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusActive:     { backgroundColor: '#D1FAE5' },
  statusText:       { fontSize: 12, fontWeight: '600', color: COLORS.text },
  menuSection:      { backgroundColor: COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  menuItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  menuEmoji:        { fontSize: 20, width: 28 },
  menuLabel:        { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuChevron:      { fontSize: 20, color: COLORS.textMuted },
  dangerText:       { color: COLORS.error },
  menuItemAdmin:    { backgroundColor: '#EEF2FF' },
  adminText:        { color: COLORS.primary },
  adminBadge:       { fontSize: 10, fontWeight: '800', color: COLORS.primary, backgroundColor: '#C7D2FE', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  version:          { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, paddingBottom: 16 },
});
