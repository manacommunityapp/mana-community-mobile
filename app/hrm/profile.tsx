import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { getInitials, getAvatarColor } from '@/constants/config';

function InfoRow({ label, value, icon }: { label: string; value?: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.textMuted} />
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['hrm-profile'],
    queryFn: hrmService.getMyProfile,
  });

  const { data: documents } = useQuery({
    queryKey: ['hrm-my-documents'],
    queryFn: hrmService.getMyDocuments,
    enabled: !!profile,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Header title="My HR Profile" leftIcon="arrow-back" onLeftPress={() => router.back()} />
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <Header title="My HR Profile" leftIcon="arrow-back" onLeftPress={() => router.back()} />
        <View style={s.loadingBox}>
          <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
          <Text style={s.emptyText}>No employee profile found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const avatarColor = getAvatarColor(fullName);
  const initials = getInitials(fullName);

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: COLORS.successLight, text: COLORS.success },
    ON_NOTICE: { bg: COLORS.warningLight, text: COLORS.warning },
    SUSPENDED: { bg: COLORS.errorLight, text: COLORS.error },
    TERMINATED: { bg: COLORS.errorLight, text: COLORS.error },
    RESIGNED: { bg: '#F1F5F9', text: '#64748B' },
    RETIRED: { bg: '#F1F5F9', text: '#64748B' },
  };
  const statusStyle = statusColors[profile.employmentStatus] ?? statusColors.ACTIVE;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Header title="My HR Profile" leftIcon="arrow-back" onLeftPress={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Profile Header */}
        <View style={s.profileHeader}>
          <View style={[s.avatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[s.avatarText, { color: avatarColor.text }]}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{fullName}</Text>
          <Text style={s.profileCode}>{profile.employeeCode}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusText, { color: statusStyle.text }]}>
              {profile.employmentStatus.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Section title="Employment Details">
          <InfoRow icon="business-outline" label="Organization" value={profile.organizationName} />
          <InfoRow icon="git-branch-outline" label="Branch" value={profile.branchName} />
          <InfoRow icon="layers-outline" label="Department" value={profile.departmentName} />
          <InfoRow icon="ribbon-outline" label="Designation" value={profile.designationName} />
          <InfoRow icon="briefcase-outline" label="Type" value={profile.employmentType?.replace('_', ' ')} />
          <InfoRow icon="calendar-outline" label="Joining Date" value={profile.joiningDate} />
          {profile.confirmationDate && (
            <InfoRow icon="checkmark-circle-outline" label="Confirmation" value={profile.confirmationDate} />
          )}
          <InfoRow icon="people-outline" label="Reporting To" value={profile.reportingManagerName} />
        </Section>

        <Section title="Contact Information">
          <InfoRow icon="call-outline" label="Phone" value={profile.phone} />
          <InfoRow icon="mail-outline" label="Personal Email" value={profile.personalEmail} />
          <InfoRow icon="mail-outline" label="Work Email" value={profile.workEmail} />
        </Section>

        <Section title="Emergency Contact">
          <InfoRow icon="person-outline" label="Name" value={profile.emergencyContactName} />
          <InfoRow icon="call-outline" label="Phone" value={profile.emergencyContactPhone} />
        </Section>

        {documents && documents.length > 0 && (
          <Section title="Documents">
            {documents.map(doc => (
              <View key={doc.id} style={s.docRow}>
                <Ionicons name="document-outline" size={18} color={COLORS.textMuted} />
                <View style={s.docInfo}>
                  <Text style={s.docName}>{doc.documentName}</Text>
                  <Text style={s.docType}>{doc.documentType}</Text>
                </View>
                {doc.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                )}
              </View>
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textMuted },
  content: { paddingBottom: 40 },

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    fontWeight: '700',
  },
  profileCode: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 4,
    ...SHADOWS.card,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text, marginTop: 1 },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text },
  docType: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
});
