import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, FONTS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function CommunityInfoScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const communityName = user?.communityName || 'Mana Residency Community';
  const tower = user?.tower || 'Tower A';
  const flatNumber = user?.flatNumber || '304';

  const handleCall = (phone: string, label: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone Dial Error', `Could not dial ${label} (${phone})`);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Groww Clean Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Info</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Society Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#0F766E', '#0D9488']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.societyIconBadge}>
              <Text style={{ fontSize: 28 }}>🏛️</Text>
            </View>
            <Text style={styles.societyTitle}>{communityName}</Text>
            <Text style={styles.societyUnit}>Unit: {tower} - {flatNumber}</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Registered Resident</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Office & Timing */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>🏢 Society Estate Office</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#0D9488" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>Office Hours</Text>
              <Text style={styles.infoSub}>Mon - Sat: 9:00 AM - 6:30 PM (Closed Sun)</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#0D9488" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>Office Location</Text>
              <Text style={styles.infoSub}>Clubhouse Ground Floor, Behind Reception Desk</Text>
            </View>
          </View>
        </View>

        {/* Essential Intercom & Emergency Numbers */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📞 Important Society Desks</Text>
          {[
            { title: 'Main Gate Security Bay', phone: '+91 80 2345 6701', intercom: 'Ext: 101', icon: 'shield-outline', color: '#0284C7', bg: '#E0F2FE' },
            { title: 'Estate Office Manager', phone: '+91 80 2345 6702', intercom: 'Ext: 102', icon: 'business-outline', color: '#7C3AED', bg: '#EDE9FE' },
            { title: '24x7 Maintenance Helpdesk', phone: '+91 80 2345 6703', intercom: 'Ext: 103', icon: 'construct-outline', color: '#D97706', bg: '#FEF3C7' },
            { title: 'Clubhouse Concierge', phone: '+91 80 2345 6704', intercom: 'Ext: 104', icon: 'fitness-outline', color: '#059669', bg: '#DCFCE7' },
          ].map((desk, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.deskRow}
              onPress={() => handleCall(desk.phone, desk.title)}
              activeOpacity={0.7}
            >
              <View style={[styles.deskIconWrap, { backgroundColor: desk.bg }]}>
                <Ionicons name={desk.icon as any} size={18} color={desk.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deskTitle}>{desk.title}</Text>
                <Text style={styles.deskIntercom}>{desk.intercom} · {desk.phone}</Text>
              </View>
              <Ionicons name="call" size={18} color="#059669" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>📑 Guidelines & Resolutions</Text>
          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => router.push('/notices')}
            activeOpacity={0.7}
          >
            <Ionicons name="newspaper-outline" size={20} color="#4F46E5" />
            <Text style={styles.quickLinkText}>View Official RWA Circulars</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => router.push('/governance')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color="#7C3AED" />
            <Text style={styles.quickLinkText}>Committee Meetings & AGMs</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => router.push('/safety')}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-half-outline" size={20} color="#0D9488" />
            <Text style={styles.quickLinkText}>Community Safety Guidelines</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  heroGradient: {
    padding: 20,
    alignItems: 'center',
  },
  societyIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  societyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: FONTS.displayBold,
  },
  societyUnit: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.sm,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  infoSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  deskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deskIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  deskIntercom: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickLinkText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
});
