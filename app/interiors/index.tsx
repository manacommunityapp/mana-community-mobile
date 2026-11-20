import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { interiorsMarketplaceService as service } from '@/services/interiorsMarketplaceService';
import type { InteriorDesigner, InteriorProject, SavedInspiration } from '@/types/interiors';

type TabKey = 'projects' | 'designers' | 'ideas' | 'new_brief';

const PROPERTY_TYPES = ['APARTMENT', 'VILLA', 'INDEPENDENT_HOUSE', 'PENTHOUSE'] as const;
const HOME_SIZES = ['1BHK', '2BHK', '3BHK', '4BHK+', 'VILLA'] as const;
const STYLES = ['CONTEMPORARY', 'MINIMALIST', 'MODERN', 'TRADITIONAL', 'SCANDINAVIAN'] as const;
const FOCUS_AREAS = ['Modular Kitchen', 'Living Room', 'Master Bedroom', 'Kids Room', 'Bathrooms', 'False Ceiling', 'Lighting & Electrical'] as const;

export default function InteriorsHome() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('projects');
  const [busy, setBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [projects, setProjects] = useState<InteriorProject[]>([]);
  const [designers, setDesigners] = useState<InteriorDesigner[]>([]);
  const [ideas, setIdeas] = useState<SavedInspiration[]>([]);

  // Brief Form State
  const [briefTitle, setBriefTitle] = useState('');
  const [locality, setLocality] = useState('');
  const [propType, setPropType] = useState<(typeof PROPERTY_TYPES)[number]>('APARTMENT');
  const [homeSize, setHomeSize] = useState<(typeof HOME_SIZES)[number]>('3BHK');
  const [stylePref, setStylePref] = useState<(typeof STYLES)[number]>('CONTEMPORARY');
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['Modular Kitchen', 'Living Room']);
  const [scope, setScope] = useState('');
  const [budgetMin, setBudgetMin] = useState('300000');
  const [budgetMax, setBudgetMax] = useState('800000');
  const [submittingBrief, setSubmittingBrief] = useState(false);

  // Inspiration URL input
  const [ideaUrl, setIdeaUrl] = useState('');
  const [ideaNotes, setIdeaNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, d, i] = await Promise.all([
        service.projects(),
        service.designers(),
        service.inspirations(),
      ]);
      setProjects(p);
      setDesigners(d);
      setIdeas(i);
    } catch (e: any) {
      Alert.alert('Interiors', e?.response?.data?.message || 'Could not load interiors data.');
    } finally {
      setBusy(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toggleFocusArea = (area: string) => {
    setSelectedFocus((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleCreateBrief = async () => {
    if (!briefTitle.trim() || !locality.trim() || !scope.trim()) {
      Alert.alert('Incomplete Brief', 'Please enter a project title, locality, and description of scope.');
      return;
    }
    setSubmittingBrief(true);
    try {
      const p = await service.createProject({
        title: briefTitle.trim(),
        propertyType: propType,
        homeSize,
        locality: locality.trim(),
        stylePreference: stylePref,
        focusAreas: selectedFocus,
        budgetMin: Number(budgetMin) || undefined,
        budgetMax: Number(budgetMax) || undefined,
        projectScope: scope.trim(),
      });
      setBriefTitle('');
      setScope('');
      Alert.alert('Project Brief Created', 'Your brief has been published to verified designers.');
      await load();
      router.push(`/interiors/${p.id}` as any);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not create project brief.');
    } finally {
      setSubmittingBrief(false);
    }
  };

  const handleSaveIdea = async () => {
    if (!ideaUrl.trim()) return;
    try {
      await service.saveInspiration({
        sourceUrl: ideaUrl.trim(),
        notes: ideaNotes.trim() || undefined,
      });
      setIdeaUrl('');
      setIdeaNotes('');
      Alert.alert('Saved', 'Inspiration link added to your mood board.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save inspiration.');
    }
  };

  const handleSaveDesigner = async (id: number) => {
    try {
      await service.saveDesigner(id);
      Alert.alert('Saved', 'Designer added to your shortlisted list.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save designer.');
    }
  };

  if (busy) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading Interiors & Renovation...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Banner ── */}
      <View style={s.heroCard}>
        <View style={s.heroBadge}>
          <Ionicons name="color-palette-outline" size={14} color="#FFFFFF" />
          <Text style={s.heroBadgeText}>Home Living OS</Text>
        </View>
        <Text style={s.heroTitle}>Interiors & Renovation</Text>
        <Text style={s.heroSub}>Verified community designers, escrow milestone payments & BOQ tracking</Text>
        <TouchableOpacity
          style={s.providerBtn}
          onPress={() => router.push('/interiors/credentials' as any)}
        >
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          <Text style={s.providerBtnText}>Are you an Interior Designer? Register Here</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabItem, activeTab === 'projects' && s.tabItemActive]}
          onPress={() => setActiveTab('projects')}
        >
          <Text style={[s.tabText, activeTab === 'projects' && s.tabTextActive]}>
            Projects ({projects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'designers' && s.tabItemActive]}
          onPress={() => setActiveTab('designers')}
        >
          <Text style={[s.tabText, activeTab === 'designers' && s.tabTextActive]}>
            Designers ({designers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'ideas' && s.tabItemActive]}
          onPress={() => setActiveTab('ideas')}
        >
          <Text style={[s.tabText, activeTab === 'ideas' && s.tabTextActive]}>
            Mood Board ({ideas.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'new_brief' && s.tabItemActive]}
          onPress={() => setActiveTab('new_brief')}
        >
          <Text style={[s.tabText, activeTab === 'new_brief' && s.tabTextActive]}>+ New Brief</Text>
        </TouchableOpacity>
      </View>

      {/* ════════ TAB 1: YOUR PROJECTS ════════ */}
      {activeTab === 'projects' && (
        <View style={s.section}>
          {projects.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="home-outline" size={44} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Active Projects</Text>
              <Text style={s.emptySubtitle}>Start a project brief to receive competitive BOQ quotes from verified designers.</Text>
              <TouchableOpacity style={s.ctaBtn} onPress={() => setActiveTab('new_brief')}>
                <Text style={s.ctaBtnText}>Post a Brief</Text>
              </TouchableOpacity>
            </View>
          ) : (
            projects.map((p) => {
              const quotesCount = p.quotes?.length || 0;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={s.projectCard}
                  onPress={() => router.push(`/interiors/${p.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={s.projectCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.projectTitle}>{p.title}</Text>
                      <Text style={s.projectMeta}>
                        {p.locality} • {p.propertyType} • {p.homeSize}
                      </Text>
                    </View>
                    <View style={[s.statusPill, p.status === 'COMPLETED' ? s.pillGreen : s.pillIndigo]}>
                      <Text style={[s.statusPillText, p.status === 'COMPLETED' ? { color: '#059669' } : { color: '#4F46E5' }]}>
                        {p.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.projectScopePreview} numberOfLines={2}>
                    {p.projectScope}
                  </Text>

                  <View style={s.projectFooter}>
                    <View style={s.rowAlign}>
                      <Ionicons name="document-text-outline" size={14} color="#4F46E5" />
                      <Text style={s.projectFooterText}>{quotesCount} {quotesCount === 1 ? 'Quote Received' : 'Quotes Received'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* ════════ TAB 2: VERIFIED DESIGNERS ════════ */}
      {activeTab === 'designers' && (
        <View style={s.section}>
          {designers.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="people-outline" size={44} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Designers Found</Text>
              <Text style={s.emptySubtitle}>Verified community interior studios and freelance designers will appear here.</Text>
            </View>
          ) : (
            designers.map((d) => (
              <View key={d.id} style={s.designerCard}>
                <View style={s.designerHeader}>
                  <View style={s.avatarBox}>
                    <Text style={s.avatarInitial}>{(d.businessName || d.userName || 'D')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={s.rowAlign}>
                      <Text style={s.designerName}>{d.businessName || d.userName || 'Studio Designer'}</Text>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    </View>
                    <Text style={s.designerMeta}>
                      {d.verifiedCredentialLevel ? `${d.verifiedCredentialLevel} Level • ` : ''}
                      {d.avgRating ? `★ ${d.avgRating.toFixed(1)} / 5.0` : 'Verified Studio'}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.saveBtn} onPress={() => handleSaveDesigner(d.id)}>
                    <Ionicons name="heart-outline" size={18} color="#4F46E5" />
                  </TouchableOpacity>
                </View>

                {d.bio && <Text style={s.designerBio} numberOfLines={2}>{d.bio}</Text>}

                {d.serviceAreas && (
                  <View style={s.areasRow}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                    <Text style={s.areasText} numberOfLines={1}>{d.serviceAreas}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={s.inviteBtn}
                  onPress={() => {
                    setActiveTab('new_brief');
                    Alert.alert('Invite Designer', `${d.businessName || 'Designer'} selected. Complete the brief to send an invitation.`);
                  }}
                >
                  <Text style={s.inviteBtnText}>Invite to Quote</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ════════ TAB 3: MOOD BOARD / INSPIRATION ════════ */}
      {activeTab === 'ideas' && (
        <View style={s.section}>
          <View style={s.inputCard}>
            <Text style={s.inputCardTitle}>Add to Mood Board</Text>
            <TextInput
              style={s.input}
              placeholder="Pinterest, Instagram, or Behance link"
              placeholderTextColor={COLORS.textMuted}
              value={ideaUrl}
              onChangeText={setIdeaUrl}
              autoCapitalize="none"
            />
            <TextInput
              style={s.input}
              placeholder="Design notes (e.g. Oak kitchen cabinet finish)"
              placeholderTextColor={COLORS.textMuted}
              value={ideaNotes}
              onChangeText={setIdeaNotes}
            />
            <TouchableOpacity style={s.ctaBtn} onPress={handleSaveIdea}>
              <Ionicons name="bookmark-outline" size={15} color="#FFFFFF" />
              <Text style={s.ctaBtnText}>Save Inspiration</Text>
            </TouchableOpacity>
          </View>

          {ideas.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="images-outline" size={44} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>Your Mood Board is Empty</Text>
              <Text style={s.emptySubtitle}>Paste links to your favorite decor and layout styles to share with your chosen designer.</Text>
            </View>
          ) : (
            ideas.map((item) => (
              <View key={item.id} style={s.ideaCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ideaUrl} numberOfLines={1}>{item.title || item.sourceUrl}</Text>
                  {item.notes && <Text style={s.ideaNotes}>{item.notes}</Text>}
                </View>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={async () => {
                    await service.removeInspiration(item.id);
                    await load();
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ════════ TAB 4: NEW PROJECT BRIEF ════════ */}
      {activeTab === 'new_brief' && (
        <View style={s.section}>
          <View style={s.inputCard}>
            <Text style={s.formHeader}>Post a Project Brief</Text>
            <Text style={s.formSub}>Get transparent quotes with itemized BOQ breakdowns.</Text>

            <Text style={s.label}>Project Name / Flat</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Tower B-1402 Full Renovation"
              placeholderTextColor={COLORS.textMuted}
              value={briefTitle}
              onChangeText={setBriefTitle}
            />

            <Text style={s.label}>Locality / Apartment Complex</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Mana Capitol, Sarjapur Road"
              placeholderTextColor={COLORS.textMuted}
              value={locality}
              onChangeText={setLocality}
            />

            <Text style={s.label}>Property Type</Text>
            <View style={s.chipsRow}>
              {PROPERTY_TYPES.map((pt) => (
                <TouchableOpacity
                  key={pt}
                  style={[s.chip, propType === pt && s.chipActive]}
                  onPress={() => setPropType(pt)}
                >
                  <Text style={[s.chipText, propType === pt && s.chipTextActive]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Home Configuration</Text>
            <View style={s.chipsRow}>
              {HOME_SIZES.map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[s.chip, homeSize === sz && s.chipActive]}
                  onPress={() => setHomeSize(sz)}
                >
                  <Text style={[s.chipText, homeSize === sz && s.chipTextActive]}>{sz}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Style Preference</Text>
            <View style={s.chipsRow}>
              {STYLES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.chip, stylePref === st && s.chipActive]}
                  onPress={() => setStylePref(st)}
                >
                  <Text style={[s.chipText, stylePref === st && s.chipTextActive]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Rooms / Focus Areas</Text>
            <View style={s.chipsRow}>
              {FOCUS_AREAS.map((fa) => {
                const active = selectedFocus.includes(fa);
                return (
                  <TouchableOpacity
                    key={fa}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => toggleFocusArea(fa)}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{fa}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Budget Range (₹)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Min (₹)"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={budgetMin}
                onChangeText={setBudgetMin}
              />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Max (₹)"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={budgetMax}
                onChangeText={setBudgetMax}
              />
            </View>

            <Text style={s.label}>Describe Scope &amp; Special Requirements</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="e.g. Need acrylic kitchen shutters, false ceiling with recessed LED strips, and walk-in closet in master bed."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={scope}
              onChangeText={setScope}
            />

            <TouchableOpacity
              style={[s.ctaBtn, { marginTop: SPACING.md }]}
              onPress={handleCreateBrief}
              disabled={submittingBrief}
            >
              {submittingBrief ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.ctaBtnText}>Publish Brief to Designers</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl * 2 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },

  heroCard: {
    backgroundColor: '#1E1B4B',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79,70,229,0.5)',
    borderWidth: 1,
    borderColor: '#818CF8',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  providerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 4,
    ...SHADOWS.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabItemActive: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: '#FFFFFF' },

  section: { padding: SPACING.md, gap: SPACING.md },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },

  projectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  projectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  projectTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  projectMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillIndigo: { backgroundColor: '#EEF2FF' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  projectScopePreview: { fontSize: 12, color: '#475569', lineHeight: 18 },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  projectFooterText: { fontSize: 11, fontWeight: '700', color: '#4F46E5', marginLeft: 4 },

  designerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  designerHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  designerName: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginRight: 4 },
  designerMeta: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 },
  saveBtn: { padding: 6 },
  designerBio: { fontSize: 12, color: '#475569', lineHeight: 17 },
  areasRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  areasText: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  inviteBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  inviteBtnText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },

  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.sm,
  },
  inputCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  formHeader: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  formSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  ideaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  ideaUrl: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  ideaNotes: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },

  rowAlign: { flexDirection: 'row', alignItems: 'center' },
});
