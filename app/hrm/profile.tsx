import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    personalEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['hrm-profile', orgId],
    queryFn: () => hrmService.getMyProfile(orgId!),
    enabled: !!orgId,
  });

  const { data: documents } = useQuery({
    queryKey: ['hrm-my-documents'],
    queryFn: hrmService.getMyDocuments,
    enabled: !!profile,
  });

  function startEditing() {
    if (!profile) return;
    setEditForm({
      phone: profile.phone ?? '',
      personalEmail: profile.personalEmail ?? '',
      emergencyContactName: profile.emergencyContactName ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
    });
    setEditing(true);
  }

  async function saveProfile() {
    if (!orgId) return;
    setSaving(true);
    try {
      await hrmService.updateMyProfile(orgId, {
        phone: editForm.phone || undefined,
        personalEmail: editForm.personalEmail || undefined,
        emergencyContactName: editForm.emergencyContactName || undefined,
        emergencyContactPhone: editForm.emergencyContactPhone || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['hrm-profile', orgId] });
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
      <Header
        title="My HR Profile"
        leftIcon="arrow-back"
        onLeftPress={() => editing ? setEditing(false) : router.back()}
        rightIcon={editing ? undefined : 'create-outline'}
        onRightPress={editing ? undefined : startEditing}
      />

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
          {editing ? (
            <>
              <View style={s.editRow}>
                <Text style={s.editLabel}>Phone</Text>
                <TextInput
                  style={s.editInput}
                  value={editForm.phone}
                  onChangeText={v => setEditForm(f => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                />
              </View>
              <View style={s.editRow}>
                <Text style={s.editLabel}>Personal Email</Text>
                <TextInput
                  style={s.editInput}
                  value={editForm.personalEmail}
                  onChangeText={v => setEditForm(f => ({ ...f, personalEmail: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter personal email"
                />
              </View>
              <InfoRow icon="mail-outline" label="Work Email (read-only)" value={profile.workEmail} />
            </>
          ) : (
            <>
              <InfoRow icon="call-outline" label="Phone" value={profile.phone} />
              <InfoRow icon="mail-outline" label="Personal Email" value={profile.personalEmail} />
              <InfoRow icon="mail-outline" label="Work Email" value={profile.workEmail} />
            </>
          )}
        </Section>

        <Section title="Emergency Contact">
          {editing ? (
            <>
              <View style={s.editRow}>
                <Text style={s.editLabel}>Contact Name</Text>
                <TextInput
                  style={s.editInput}
                  value={editForm.emergencyContactName}
                  onChangeText={v => setEditForm(f => ({ ...f, emergencyContactName: v }))}
                  placeholder="Emergency contact name"
                />
              </View>
              <View style={s.editRow}>
                <Text style={s.editLabel}>Contact Phone</Text>
                <TextInput
                  style={s.editInput}
                  value={editForm.emergencyContactPhone}
                  onChangeText={v => setEditForm(f => ({ ...f, emergencyContactPhone: v }))}
                  keyboardType="phone-pad"
                  placeholder="Emergency contact phone"
                />
              </View>
            </>
          ) : (
            <>
              <InfoRow icon="person-outline" label="Name" value={profile.emergencyContactName} />
              <InfoRow icon="call-outline" label="Phone" value={profile.emergencyContactPhone} />
            </>
          )}
        </Section>

        {editing && (
          <View style={s.editActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        )}

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

  editRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  editLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginBottom: 4 },
  editInput: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontFamily: FONTS.bold, color: '#fff', fontWeight: '700' },
});
