import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cpnService } from '@/services/cpnService';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import type { ProfessionalProfileDto } from '@/types/cpn';

export default function CPNProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PRIVACY'>('PROFILE');

  // Form states
  const [headline, setHeadline] = useState('');
  const [company, setCompany] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Privacy toggles
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [isAvailableForMentorship, setIsAvailableForMentorship] = useState(true);
  const [isHiringOrReferring, setIsHiringOrReferring] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(true);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myCPNProfile'],
    queryFn: () => cpnService.getMyProfile(),
  });

  useEffect(() => {
    if (profile) {
      setHeadline(profile.headline || '');
      setCompany(profile.company || '');
      setExperienceYears(String(profile.experienceYears || '5'));
      setSkills(profile.skills || []);
      setIsDiscoverable(profile.isDiscoverable ?? true);
      setIsAvailableForMentorship(profile.isAvailableForMentorship ?? true);
      setIsHiringOrReferring(profile.isHiringOrReferring ?? true);
      setShowPhone(profile.showPhone ?? false);
      setShowEmail(profile.showEmail ?? true);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (updated: Partial<ProfessionalProfileDto>) =>
      cpnService.updateProfile(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCPNProfile'] });
      queryClient.invalidateQueries({ queryKey: ['cpnDirectory'] });
      Alert.alert('Profile Saved ✅', 'Your professional identity and privacy controls have been updated.');
    },
    onError: () => Alert.alert('Save Failed', 'Unable to update your profile. Please try again.'),
  });

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSave = () => {
    saveMutation.mutate({
      headline,
      company,
      experienceYears: Number(experienceYears) || 0,
      skills,
      isDiscoverable,
      isAvailableForMentorship,
      isHiringOrReferring,
      showPhone,
      showEmail,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Professional Profile & Privacy</Text>
          <Text style={s.headerSub}>Control how neighbors discover and contact you</Text>
        </View>
        <TouchableOpacity
          style={s.saveBtn}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabItem, activeTab === 'PROFILE' && s.tabItemActive]}
          onPress={() => setActiveTab('PROFILE')}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={activeTab === 'PROFILE' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabText, activeTab === 'PROFILE' && s.tabTextActive]}>
            Identity & Skills
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'PRIVACY' && s.tabItemActive]}
          onPress={() => setActiveTab('PRIVACY')}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={activeTab === 'PRIVACY' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabText, activeTab === 'PRIVACY' && s.tabTextActive]}>
            Privacy Matrix
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading your profile…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* TAB 1: Profile & Skills */}
          {activeTab === 'PROFILE' && (
            <View style={s.card}>
              <Text style={s.sectionHead}>Professional Identity</Text>

              <Text style={s.label}>Professional Headline *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Senior Software Engineer · Cloud & Distributed Systems"
                placeholderTextColor={COLORS.textMuted}
                value={headline}
                onChangeText={setHeadline}
              />

              <Text style={s.label}>Current Company / Firm *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Google Cloud / Self-Employed"
                placeholderTextColor={COLORS.textMuted}
                value={company}
                onChangeText={setCompany}
              />

              <Text style={s.label}>Years of Experience</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                placeholder="e.g. 6"
                placeholderTextColor={COLORS.textMuted}
                value={experienceYears}
                onChangeText={setExperienceYears}
              />

              <Text style={s.label}>Key Skills & Domains</Text>
              <View style={s.skillInputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Add skill (e.g. React Native, Java, GST)"
                  placeholderTextColor={COLORS.textMuted}
                  value={skillInput}
                  onChangeText={setSkillInput}
                />
                <TouchableOpacity style={s.addSkillBtn} onPress={handleAddSkill}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Skills Chips */}
              <View style={s.skillsWrap}>
                {skills.map((skill) => (
                  <View key={skill} style={s.skillChip}>
                    <Text style={s.skillText}>{skill}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                      <Ionicons name="close-circle" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: Privacy Matrix */}
          {activeTab === 'PRIVACY' && (
            <View style={s.card}>
              <Text style={s.sectionHead}>Community Privacy Matrix</Text>
              <Text style={s.sectionSub}>
                Customize what your verified neighbors can see when browsing the directory.
              </Text>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Discoverable in Directory</Text>
                  <Text style={s.switchSub}>Allow neighbors to find your profile by profession or skill</Text>
                </View>
                <Switch
                  value={isDiscoverable}
                  onValueChange={setIsDiscoverable}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Available for Mentorship</Text>
                  <Text style={s.switchSub}>Show "Open to Mentor" badge and allow booking 30-min coffee chats</Text>
                </View>
                <Switch
                  value={isAvailableForMentorship}
                  onValueChange={setIsAvailableForMentorship}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Referring Candidates</Text>
                  <Text style={s.switchSub}>Allow neighbors to request job referrals for your employer</Text>
                </View>
                <Switch
                  value={isHiringOrReferring}
                  onValueChange={setIsHiringOrReferring}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Display Email Address</Text>
                  <Text style={s.switchSub}>Show direct email on your profile card</Text>
                </View>
                <Switch
                  value={showEmail}
                  onValueChange={setShowEmail}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                />
              </View>

              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchLabel}>Display Phone Number</Text>
                  <Text style={s.switchSub}>Keep disabled to mask your phone and require in-app chat</Text>
                </View>
                <Switch
                  value={showPhone}
                  onValueChange={setShowPhone}
                  trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                />
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 10,
    ...SHADOWS.sm,
  },
  sectionHead: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  skillInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addSkillBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  skillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  switchSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    lineHeight: 15,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
