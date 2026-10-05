import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { manaIntelligenceService } from '@/services/manaIntelligenceService';
import { CommunityProfile, ProfileVisibility } from '@/types/manaIntelligence';

export default function DiscoverScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedTower, setSelectedTower] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['discover-profiles', search, selectedTower, selectedSkill],
    queryFn: () => manaIntelligenceService.searchDiscoverProfiles(search || undefined, selectedTower || undefined, selectedSkill || undefined),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['discover-top-skills'],
    queryFn: manaIntelligenceService.getTopSkills,
  });

  const updateVisMutation = useMutation({
    mutationFn: (vis: ProfileVisibility) =>
      manaIntelligenceService.updateVisibility({
        visibility: vis,
        shareProfession: true,
        shareSkills: true,
        shareInterests: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-profiles'] });
      setShowModal(false);
    },
  });

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#64748B" />
          <TextInput
            placeholder="Search doctors, tutors, skills..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.privacyBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.privacyBtnText}>Privacy</Text>
        </TouchableOpacity>
      </View>

      {/* Popular Skills Strip */}
      {skills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillsStrip} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
          {skills.map((s: { skill: string; count: number }) => (
            <TouchableOpacity
              key={s.skill}
              onPress={() => setSelectedSkill(s.skill === selectedSkill ? '' : s.skill)}
              style={[styles.skillChip, selectedSkill === s.skill && styles.skillChipActive]}
            >
              <Text style={[styles.skillChipText, selectedSkill === s.skill && styles.skillChipTextActive]}>
                {s.skill} ({s.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Profiles List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[COLORS.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : profiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="shield-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Discoverable Profiles</Text>
            <Text style={styles.emptySub}>
              Zero-leakage privacy strictly hides Private profiles and out-of-tower Neighbors profiles.
            </Text>
          </View>
        ) : (
          profiles.map((p: CommunityProfile) => (
            <View key={p.userId} style={styles.profileCard}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.fullName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{p.fullName}</Text>
                  <Text style={styles.profileLoc}>
                    {p.tower} {p.flatNumber ? `• Flat ${p.flatNumber}` : ''}
                  </Text>
                </View>
                <View style={[styles.visBadge, p.visibility === 'PUBLIC' ? styles.visPublic : styles.visNeigh]}>
                  <Text style={styles.visText}>{p.visibility}</Text>
                </View>
              </View>

              {p.profession && (
                <View style={styles.profRow}>
                  <Ionicons name="briefcase-outline" size={13} color="#6366F1" />
                  <Text style={styles.profText}>{p.profession}</Text>
                </View>
              )}

              {p.bio && <Text style={styles.bioText}>{p.bio}</Text>}

              {p.skills && p.skills.length > 0 && (
                <View style={styles.tagsRow}>
                  {p.skills.map((sk: string, i: number) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.contactText}>
                  📞 {p.phone || 'Masked'}   ✉️ {p.email || 'Masked'}
                </Text>
                <TouchableOpacity style={styles.connectBtn}>
                  <Text style={styles.connectBtnText}>Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Privacy Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Discover Privacy Settings</Text>
            <Text style={styles.modalSub}>Server-enforced privacy filtering rules</Text>

            <TouchableOpacity style={styles.optionBtn} onPress={() => updateVisMutation.mutate('PUBLIC')}>
              <Ionicons name="globe-outline" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>PUBLIC (All Verified Residents)</Text>
                <Text style={styles.optionDesc}>Discoverable by all verified community residents.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={() => updateVisMutation.mutate('NEIGHBORS')}>
              <Ionicons name="home-outline" size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>NEIGHBORS (Tower Only)</Text>
                <Text style={styles.optionDesc}>Only residents in your tower can discover you.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={() => updateVisMutation.mutate('PRIVATE')}>
              <Ionicons name="lock-closed-outline" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>PRIVATE (Hidden)</Text>
                <Text style={styles.optionDesc}>Completely hidden from discovery and search.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    gap: 6,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
  },
  privacyBtnText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  skillsStrip: { backgroundColor: '#FFFFFF', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  skillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginRight: 6,
  },
  skillChipActive: { backgroundColor: COLORS.primary },
  skillChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  skillChipTextActive: { color: '#FFFFFF' },
  list: { flex: 1 },
  listContent: { padding: SPACING.md },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  profileName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  profileLoc: { fontSize: 11, color: '#64748B' },
  visBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  visPublic: { backgroundColor: '#ECFDF5' },
  visNeigh: { backgroundColor: '#EFF6FF' },
  visText: { fontSize: 9, fontWeight: '700', color: '#334155' },
  profRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  profText: { fontSize: 12, fontWeight: '600', color: '#4338CA' },
  bioText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  tagText: { fontSize: 10, color: '#475569' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactText: { fontSize: 10, color: '#94A3B8' },
  connectBtn: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xs },
  connectBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  emptyCard: { alignItems: 'center', marginTop: 60, padding: SPACING.lg },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 280 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  optionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  optionDesc: { fontSize: 11, color: '#64748B' },
  closeBtn: { padding: SPACING.md, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#64748B', fontWeight: '700' },
});
