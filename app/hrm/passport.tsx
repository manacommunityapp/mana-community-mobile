import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import { hrmService } from '@/services/hrmService';
import type { MwSkillPassport, MwPassportSkill, MwPassportCertification, MwPassportWorkHistory } from '@/types/hrm';

const AVAILABILITY_OPTIONS: MwSkillPassport['availability'][] = ['FULL_TIME', 'PART_TIME', 'GIG', 'UNAVAILABLE'];
const PROFICIENCY_OPTIONS: MwPassportSkill['proficiency'][] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

const PROFICIENCY_COLORS: Record<MwPassportSkill['proficiency'], string> = {
  BEGINNER: '#6B7280',
  INTERMEDIATE: '#F59E0B',
  EXPERT: '#10B981',
};

function isCertExpired(expiryDate?: string) {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function isCertExpiringSoon(expiryDate?: string) {
  if (!expiryDate) return false;
  const d = new Date(expiryDate);
  const diff = (d.getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 30;
}

// ── Profile Tab ──
function ProfileTab({ passport, onSave }: { passport: MwSkillPassport | null; onSave: (data: Partial<MwSkillPassport>) => void }) {
  const [bio, setBio] = useState(passport?.bio ?? '');
  const [location, setLocation] = useState(passport?.location ?? '');
  const [preferredRoles, setPreferredRoles] = useState(passport?.preferredRoles ?? '');
  const [availability, setAvailability] = useState<MwSkillPassport['availability']>(passport?.availability ?? 'UNAVAILABLE');
  const [isPublic, setIsPublic] = useState(passport?.isPublic ?? false);

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="A short professional summary..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="City, Country"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.fieldLabel}>Preferred Roles</Text>
        <TextInput
          style={styles.input}
          value={preferredRoles}
          onChangeText={setPreferredRoles}
          placeholder="e.g. Product Manager, Tech Lead"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.fieldLabel}>Availability</Text>
        <View style={styles.pillRow}>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, availability === opt && styles.pillActive]}
              onPress={() => setAvailability(opt)}
            >
              <Text style={[styles.pillText, availability === opt && styles.pillTextActive]}>
                {opt.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.fieldLabel}>Public Profile</Text>
            <Text style={styles.hint}>Visible to other Mana organizations</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.surface}
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => onSave({ bio, location, preferredRoles, availability, isPublic })}
        >
          <Text style={styles.saveBtnText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Skills & Certs Tab ──
function SkillsCertsTab({ passport, onAddSkill, onRemoveSkill, onAddCert, onRemoveCert }: {
  passport: MwSkillPassport | null;
  onAddSkill: (data: { skillName: string; category?: string; proficiency: string; yearsExp?: number }) => void;
  onRemoveSkill: (id: number) => void;
  onAddCert: (data: { name: string; issuingBody?: string; issueDate?: string; expiryDate?: string }) => void;
  onRemoveCert: (id: number) => void;
}) {
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [skillProf, setSkillProf] = useState<MwPassportSkill['proficiency']>('INTERMEDIATE');
  const [skillYears, setSkillYears] = useState('');

  const [showCertForm, setShowCertForm] = useState(false);
  const [certName, setCertName] = useState('');
  const [certBody, setCertBody] = useState('');
  const [certIssue, setCertIssue] = useState('');
  const [certExpiry, setCertExpiry] = useState('');

  const submitSkill = () => {
    if (!skillName.trim()) return;
    onAddSkill({ skillName: skillName.trim(), category: skillCategory || undefined, proficiency: skillProf, yearsExp: skillYears ? Number(skillYears) : undefined });
    setSkillName(''); setSkillCategory(''); setSkillProf('INTERMEDIATE'); setSkillYears('');
    setShowSkillForm(false);
  };

  const submitCert = () => {
    if (!certName.trim()) return;
    onAddCert({ name: certName.trim(), issuingBody: certBody || undefined, issueDate: certIssue || undefined, expiryDate: certExpiry || undefined });
    setCertName(''); setCertBody(''); setCertIssue(''); setCertExpiry('');
    setShowCertForm(false);
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Skills */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <TouchableOpacity onPress={() => setShowSkillForm(!showSkillForm)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>{showSkillForm ? '✕ Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {showSkillForm && (
          <View style={styles.card}>
            <TextInput style={styles.input} value={skillName} onChangeText={setSkillName} placeholder="Skill name *" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={skillCategory} onChangeText={setSkillCategory} placeholder="Category (e.g. Engineering)" placeholderTextColor={COLORS.textSecondary} />
            <Text style={styles.fieldLabel}>Proficiency</Text>
            <View style={styles.pillRow}>
              {PROFICIENCY_OPTIONS.map((p) => (
                <TouchableOpacity key={p} style={[styles.pill, skillProf === p && styles.pillActive]} onPress={() => setSkillProf(p)}>
                  <Text style={[styles.pillText, skillProf === p && styles.pillTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} value={skillYears} onChangeText={setSkillYears} placeholder="Years of experience" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" />
            <TouchableOpacity style={styles.saveBtn} onPress={submitSkill}>
              <Text style={styles.saveBtnText}>Add Skill</Text>
            </TouchableOpacity>
          </View>
        )}

        {(passport?.skills ?? []).map((skill) => (
          <View key={skill.id} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <View style={[styles.profBadge, { backgroundColor: PROFICIENCY_COLORS[skill.proficiency] + '20' }]}>
                <Text style={[styles.profBadgeText, { color: PROFICIENCY_COLORS[skill.proficiency] }]}>{skill.proficiency}</Text>
              </View>
              <View>
                <Text style={styles.listItemTitle}>{skill.skillName}</Text>
                {skill.category && <Text style={styles.listItemSub}>{skill.category}{skill.yearsExp ? ` · ${skill.yearsExp}y` : ''}</Text>}
              </View>
            </View>
            <View style={styles.listItemRight}>
              {skill.isVerified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
              <TouchableOpacity onPress={() => onRemoveSkill(skill.id)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {(passport?.skills ?? []).length === 0 && !showSkillForm && (
          <Text style={styles.emptyText}>No skills added yet.</Text>
        )}
      </View>

      {/* Certifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          <TouchableOpacity onPress={() => setShowCertForm(!showCertForm)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>{showCertForm ? '✕ Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {showCertForm && (
          <View style={styles.card}>
            <TextInput style={styles.input} value={certName} onChangeText={setCertName} placeholder="Certification name *" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={certBody} onChangeText={setCertBody} placeholder="Issuing organization" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={certIssue} onChangeText={setCertIssue} placeholder="Issue date (YYYY-MM-DD)" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={certExpiry} onChangeText={setCertExpiry} placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor={COLORS.textSecondary} />
            <TouchableOpacity style={styles.saveBtn} onPress={submitCert}>
              <Text style={styles.saveBtnText}>Add Certification</Text>
            </TouchableOpacity>
          </View>
        )}

        {(passport?.certifications ?? []).map((cert) => {
          const expired = isCertExpired(cert.expiryDate);
          const expiringSoon = !expired && isCertExpiringSoon(cert.expiryDate);
          return (
            <View key={cert.id} style={[styles.listItem, expired && styles.listItemExpired]}>
              <View style={styles.listItemLeft}>
                <View>
                  <Text style={styles.listItemTitle}>{cert.name}</Text>
                  {cert.issuingBody && <Text style={styles.listItemSub}>{cert.issuingBody}</Text>}
                  {cert.expiryDate && (
                    <Text style={[styles.listItemSub, expired && styles.textError, expiringSoon && styles.textWarning]}>
                      {expired ? 'Expired' : expiringSoon ? 'Expiring soon' : 'Expires'}: {cert.expiryDate}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.listItemRight}>
                {cert.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
                <TouchableOpacity onPress={() => onRemoveCert(cert.id)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {(passport?.certifications ?? []).length === 0 && !showCertForm && (
          <Text style={styles.emptyText}>No certifications added yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ── Work History Tab ──
function WorkHistoryTab({ passport, onAdd, onRemove }: {
  passport: MwSkillPassport | null;
  onAdd: (data: { employerName: string; role?: string; startDate?: string; endDate?: string; isCurrent?: boolean }) => void;
  onRemove: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [employer, setEmployer] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);

  const submit = () => {
    if (!employer.trim()) return;
    onAdd({ employerName: employer.trim(), role: role || undefined, startDate: startDate || undefined, endDate: isCurrent ? undefined : (endDate || undefined), isCurrent });
    setEmployer(''); setRole(''); setStartDate(''); setEndDate(''); setIsCurrent(false);
    setShowForm(false);
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Work History</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>{showForm ? '✕ Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.card}>
            <TextInput style={styles.input} value={employer} onChangeText={setEmployer} placeholder="Employer / Organization *" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="Role / Title" placeholderTextColor={COLORS.textSecondary} />
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" placeholderTextColor={COLORS.textSecondary} />
            {!isCurrent && (
              <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="End date (YYYY-MM-DD)" placeholderTextColor={COLORS.textSecondary} />
            )}
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Currently working here</Text>
              <Switch value={isCurrent} onValueChange={setIsCurrent} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.surface} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={submit}>
              <Text style={styles.saveBtnText}>Add Position</Text>
            </TouchableOpacity>
          </View>
        )}

        {(passport?.workHistory ?? []).map((wh, idx) => (
          <View key={wh.id} style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            {idx < (passport?.workHistory ?? []).length - 1 && <View style={styles.timelineLine} />}
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <View>
                  <Text style={styles.listItemTitle}>{wh.employerName}</Text>
                  {wh.role && <Text style={styles.listItemSub}>{wh.role}</Text>}
                  <Text style={styles.listItemSub}>
                    {wh.startDate ?? '?'} – {wh.isCurrent ? 'Present' : (wh.endDate ?? '?')}
                  </Text>
                </View>
                <View style={styles.listItemRight}>
                  {wh.isManaVerified && <Text style={styles.verifiedBadge}>Mana ✓</Text>}
                  <TouchableOpacity onPress={() => onRemove(wh.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
        {(passport?.workHistory ?? []).length === 0 && !showForm && (
          <Text style={styles.emptyText}>No work history added yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ── Main Screen ──
const TABS = ['Profile', 'Skills & Certs', 'Work History'] as const;
type Tab = typeof TABS[number];

export default function SkillPassportScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const qc = useQueryClient();

  const { data: passport, isLoading } = useQuery<MwSkillPassport>({
    queryKey: ['mw-passport'],
    queryFn: () => hrmService.getMyPassport(),
    retry: false,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<MwSkillPassport>) => hrmService.updatePassport(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mw-passport'] }); Alert.alert('Saved', 'Profile updated.'); },
    onError: () => Alert.alert('Error', 'Could not save profile.'),
  });

  const addSkillMut = useMutation({
    mutationFn: (data: Parameters<typeof hrmService.addSkill>[0]) => hrmService.addSkill(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
    onError: () => Alert.alert('Error', 'Could not add skill.'),
  });

  const removeSkillMut = useMutation({
    mutationFn: (id: number) => hrmService.removeSkill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
  });

  const addCertMut = useMutation({
    mutationFn: (data: Parameters<typeof hrmService.addCertification>[0]) => hrmService.addCertification(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
    onError: () => Alert.alert('Error', 'Could not add certification.'),
  });

  const removeCertMut = useMutation({
    mutationFn: (id: number) => hrmService.removeCertification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
  });

  const addWhMut = useMutation({
    mutationFn: (data: Parameters<typeof hrmService.addWorkHistory>[0]) => hrmService.addWorkHistory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
    onError: () => Alert.alert('Error', 'Could not add work history.'),
  });

  const removeWhMut = useMutation({
    mutationFn: (id: number) => hrmService.removeWorkHistory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-passport'] }),
  });

  const displayPassport = passport ?? null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Skill Passport', headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skill Passport</Text>
        <Text style={styles.headerSub}>Your professional identity across Mana</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : activeTab === 'Profile' ? (
        <ProfileTab passport={displayPassport} onSave={(d) => updateMut.mutate(d)} />
      ) : activeTab === 'Skills & Certs' ? (
        <SkillsCertsTab
          passport={displayPassport}
          onAddSkill={(d) => addSkillMut.mutate(d)}
          onRemoveSkill={(id) => removeSkillMut.mutate(id)}
          onAddCert={(d) => addCertMut.mutate(d)}
          onRemoveCert={(id) => removeCertMut.mutate(id)}
        />
      ) : (
        <WorkHistoryTab
          passport={displayPassport}
          onAdd={(d) => addWhMut.mutate(d)}
          onRemove={(id) => removeWhMut.mutate(id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.primary },
  headerTitle: { ...FONTS.heading, color: '#fff', fontSize: 22 },
  headerSub: { ...FONTS.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { ...FONTS.body, color: COLORS.textSecondary, fontSize: 13 },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  tabContent: { flex: 1 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, margin: 16, ...SHADOWS.sm },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { ...FONTS.heading, fontSize: 16, color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.sm },
  addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  fieldLabel: { ...FONTS.body, fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  hint: { ...FONTS.body, fontSize: 11, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, color: COLORS.text, ...FONTS.body, marginBottom: 4 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { ...FONTS.body, fontSize: 12, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: 12, marginBottom: 8, ...SHADOWS.sm },
  listItemExpired: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemTitle: { ...FONTS.body, fontWeight: '600', color: COLORS.text, fontSize: 14 },
  listItemSub: { ...FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  profBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  profBadgeText: { fontSize: 10, fontWeight: '700' },
  verifiedBadge: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  removeBtn: { fontSize: 16, color: COLORS.textSecondary, padding: 4 },
  textError: { color: COLORS.error },
  textWarning: { color: '#F59E0B' },
  emptyText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 6, marginRight: 12 },
  timelineLine: { position: 'absolute', left: 4, top: 16, bottom: -4, width: 2, backgroundColor: COLORS.border },
  timelineContent: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: 12, marginBottom: 8, ...SHADOWS.sm },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
});
