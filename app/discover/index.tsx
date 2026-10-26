import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS, getAvatarColor, getInitials } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { communityGraphService, GraphNodeDto } from '@/services/communityGraphService';
import { manaIntelligenceService } from '@/services/manaIntelligenceService';
import { CommunityProfile, ProfileVisibility } from '@/types/manaIntelligence';

interface Recommendation {
  id: string;
  type: string;
  name: string;
  flat: string;
  tower: string;
  profession: string;
  description: string;
  matchScore: number;
  tags: string[];
  availability: string;
  isVerified: boolean;
  avatarColor: string;
}

const SAMPLE_DISCOVER: Recommendation[] = [
  {
    id: 'rec-1',
    type: 'Healthcare & Medical',
    name: 'Dr. Anita Nair',
    flat: 'A-304',
    tower: 'Tower A',
    profession: 'Senior Consultant Pediatrician',
    description: '15+ yrs experience. Available for weekend emergency consultations and pediatric child guidance for society families.',
    matchScore: 97,
    tags: ['Pediatrics', 'Child Health', 'Weekend Guidance'],
    availability: 'Sat-Sun (10 AM - 1 PM)',
    isVerified: true,
    avatarColor: '#4F46E5',
  },
  {
    id: 'rec-2',
    type: 'Sports & Fitness Partner',
    name: 'Rohan Deshpande',
    flat: 'B-601',
    tower: 'Tower B',
    profession: 'Badminton & Marathon Enthusiast',
    description: 'Looking for doubles partner for weekend morning sessions at society court and 10k morning runners.',
    matchScore: 93,
    tags: ['Badminton', 'Running 10K', 'Morning 6:30 AM'],
    availability: 'Daily Mornings',
    isVerified: true,
    avatarColor: '#059669',
  },
  {
    id: 'rec-3',
    type: 'Home Chef & Bakery',
    name: 'Rashmi South Kitchen',
    flat: 'C-202',
    tower: 'Tower C',
    profession: 'Artisanal Home Cook',
    description: 'Authentic Mangalore Ghee Roast, soft Tatte Idlis, and weekend sourdough bakes made with pure ingredients.',
    matchScore: 89,
    tags: ['South Indian', 'Fresh Idlis', 'Pre-order'],
    availability: 'Fri-Sun (Pre-order)',
    isVerified: true,
    avatarColor: '#EA580C',
  },
  {
    id: 'rec-4',
    type: 'Finance & Tax Advisory',
    name: 'Rajesh Mehta (CA & SEBI RIA)',
    flat: 'D-802',
    tower: 'Tower D',
    profession: 'Chartered Accountant & Wealth Advisor',
    description: 'Helping neighbours optimize income tax, retirement corpus, and estate planning with complimentary 30m reviews.',
    matchScore: 86,
    tags: ['Tax Filing', 'Retirement', 'Mutual Funds'],
    availability: 'Weekday Evenings',
    isVerified: true,
    avatarColor: '#7C3AED',
  },
  {
    id: 'rec-5',
    type: 'Tutoring & Mentorship',
    name: 'Priyanka Sen',
    flat: 'A-1102',
    tower: 'Tower A',
    profession: 'Ex-Google Tech Lead & Math Coach',
    description: 'Mentoring high school and college students in algorithmic problem solving, Python coding, and career prep.',
    matchScore: 91,
    tags: ['Python', 'Data Structures', 'IIT-JEE Prep'],
    availability: 'Weekend Afternoons',
    isVerified: true,
    avatarColor: '#0284C7',
  },
  {
    id: 'rec-6',
    type: 'Carpool & Daily Commute',
    name: 'Karthik Varma',
    flat: 'B-403',
    tower: 'Tower B',
    profession: 'Product Manager @ Tech Park',
    description: 'Daily commute to Whitefield / ITPL. Offering 3 seats in EV SUV with silent ride and wifi.',
    matchScore: 94,
    tags: ['EV Carpool', 'Tech Park', '08:30 AM Departure'],
    availability: 'Mon - Fri',
    isVerified: true,
    avatarColor: '#10B981',
  },
];

export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active Main Tab: matches Web parity (for-you, directory, privacy)
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'DIRECTORY' | 'PRIVACY'>('FOR_YOU');

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedTower, setSelectedTower] = useState('ALL');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [chatModalTarget, setChatModalTarget] = useState<any | null>(null);
  const [introMessage, setIntroMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Privacy Matrix state
  const [privacySettings, setPrivacySettings] = useState({
    skills: 'PUBLIC',
    profession: 'PUBLIC',
    sports: 'PUBLIC',
    interests: 'NEIGHBORS',
    flatNumber: 'NEIGHBORS',
  });
  const [privacySaved, setPrivacySaved] = useState(false);

  // ── 1. Fetch Live Discover Graph Recommendations ───────────────────────────
  const {
    data: graphFeed,
    isLoading: isFeedLoading,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ['community-graph', 'discover'],
    queryFn: () => communityGraphService.getDiscoverFeed(),
    staleTime: 30_000,
  });

  // ── 2. Fetch Directory Profiles (Zero-leakage API) ──────────────────────────
  const {
    data: directoryProfiles = [],
    isLoading: isProfilesLoading,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ['discover-profiles', search, selectedTower, selectedSkill],
    queryFn: () => manaIntelligenceService.searchDiscoverProfiles(
      search || undefined,
      selectedTower === 'ALL' ? undefined : selectedTower,
      selectedSkill || undefined
    ),
    staleTime: 30_000,
  });

  // ── 3. Fetch Top Skills Cloud ──────────────────────────────────────────────
  const { data: topSkills = [] } = useQuery({
    queryKey: ['discover-top-skills'],
    queryFn: () => communityGraphService.getTopSkills(),
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFeed(), refetchProfiles()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFeed, refetchProfiles]);

  // ── 4. Connect Mutation ───────────────────────────────────────────────────
  const connectMutation = useMutation({
    mutationFn: ({ targetUserId, message }: { targetUserId: string; message?: string }) =>
      communityGraphService.connectWithNeighbor(targetUserId, message),
    onSuccess: (_, { targetUserId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-graph'] });
      setConnectedIds((prev) => [...prev, targetUserId]);
      const targetName = chatModalTarget?.name || chatModalTarget?.fullName || 'Neighbor';
      setChatModalTarget(null);
      Alert.alert(
        '🤝 Connection Request Sent',
        `Your intro message has been sent to ${targetName}. They will receive a notification in their chat inbox.`,
      );
    },
    onError: (err: any) => {
      Alert.alert('Connection Failed', err?.message || 'Unable to send connection request. Please try again.');
    },
  });

  // ── 5. Privacy Visibility Mutation ────────────────────────────────────────
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
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2500);
    },
  });

  // Combine live API recommendations with rich fallback
  const allItems: Recommendation[] = useMemo(() => {
    if (graphFeed?.recommendedNeighbors && graphFeed.recommendedNeighbors.length > 0) {
      return graphFeed.recommendedNeighbors.map((node, i) => ({
        id: node.id || `node-${i}`,
        type: node.type === 'PERSON' ? 'Resident Member' : (node.type || 'Community Neighbor'),
        name: node.name,
        flat: node.subtitle || 'Unit',
        tower: 'Community',
        profession: node.subtitle || 'Community Member',
        description: node.commonInterests?.length
          ? `Shares common interests: ${node.commonInterests.join(', ')}`
          : 'Active resident in the community looking to network with neighbors.',
        matchScore: Math.min(99, 85 + ((node.mutualConnections || 1) * 3)),
        tags: node.commonInterests || ['Community', 'Neighbor'],
        availability: 'Active this week',
        isVerified: true,
        avatarColor: getAvatarColor(node.name).bg,
      }));
    }
    return SAMPLE_DISCOVER;
  }, [graphFeed]);

  const filters = [
    { key: 'ALL', label: 'All Matches' },
    { key: 'Medical', label: '🩺 Doctors' },
    { key: 'Sports', label: '🏸 Sports Buddies' },
    { key: 'Home Chef', label: '🍲 Home Food' },
    { key: 'Finance', label: '📈 Wealth & Tax' },
    { key: 'Tutoring', label: '📚 Mentorship' },
    { key: 'Carpool', label: '🚗 Carpool' },
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesFilter = selectedFilter === 'ALL' ||
      item.type.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(selectedFilter.toLowerCase()));

    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      item.profession.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const towers = ['ALL', 'Tower A', 'Tower B', 'Tower C', 'Tower D'];

  const handleOpenConnect = (target: any) => {
    setChatModalTarget(target);
    const targetName = target.name || target.fullName || 'Neighbor';
    setIntroMessage(`Hi ${targetName.split(' ')[0]}, I saw your profile on Mana Discover and would love to connect!`);
  };

  const handleSendIntro = () => {
    if (!chatModalTarget) return;
    const targetId = chatModalTarget.id || chatModalTarget.userId;
    connectMutation.mutate({ targetUserId: String(targetId), message: introMessage.trim() });
  };

  return (
    <View style={styles.container}>
      {/* ── Search Bar ── */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors, sports partners, chefs, mentors..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3-Tab Segment Selector (Matches Web Parity) ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'FOR_YOU' && styles.tabBtnActive]}
          onPress={() => setActiveTab('FOR_YOU')}
        >
          <Ionicons
            name="sparkles"
            size={14}
            color={activeTab === 'FOR_YOU' ? '#7C3AED' : COLORS.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'FOR_YOU' && styles.tabBtnTextActive]}>
            For You ({filteredItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DIRECTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DIRECTORY')}
        >
          <Ionicons
            name="people"
            size={14}
            color={activeTab === 'DIRECTORY' ? '#2563EB' : COLORS.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'DIRECTORY' && styles.tabBtnTextActive]}>
            Directory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'PRIVACY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('PRIVACY')}
        >
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={activeTab === 'PRIVACY' ? '#059669' : COLORS.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'PRIVACY' && styles.tabBtnTextActive]}>
            Privacy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── TAB 1: FOR YOU (Affinity Feed) ── */}
        {activeTab === 'FOR_YOU' && (
          <>
            {/* Hero Banner */}
            <LinearGradient colors={GRADIENTS.hero} style={styles.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Neighbourhood Graph AI</Text>
              </View>
              <Text style={styles.heroTitle}>Discover Your Community Talent</Text>
              <Text style={styles.heroSub}>
                Connect with verified doctors, badminton partners, home chefs, and career mentors living right next door.
              </Text>
            </LinearGradient>

            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
              {filters.map((f) => {
                const isActive = selectedFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setSelectedFilter(f.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>High Affinity Community Matches</Text>
              <Text style={styles.sectionSub}>
                {isFeedLoading ? 'Finding matches...' : `${filteredItems.length} recommendations`}
              </Text>
            </View>

            {/* Loading Spinner */}
            {isFeedLoading && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}

            {/* Discover Cards */}
            <View style={{ gap: SPACING.md }}>
              {filteredItems.map((item) => {
                const isConnected = connectedIds.includes(item.id);
                const initials = getInitials(item.name);

                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>

                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.nameText}>{item.name}</Text>
                          {item.isVerified && (
                            <View style={styles.verifiedTag}>
                              <Ionicons name="shield-checkmark" size={12} color="#059669" />
                              <Text style={styles.verifiedText}>Resident</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.professionText}>{item.profession}</Text>
                        <Text style={styles.unitText}>🏠 {item.tower}, Flat {item.flat}</Text>
                      </View>

                      <View style={styles.matchBadge}>
                        <Text style={styles.matchScore}>{item.matchScore}%</Text>
                        <Text style={styles.matchLabel}>AFFINITY</Text>
                      </View>
                    </View>

                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <View style={styles.tagRow}>
                      {item.tags.map((tag, idx) => (
                        <View key={idx} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.availRow}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.availText}>Active: {item.availability}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.connectBtn, isConnected && styles.connectedBtn]}
                      onPress={() => handleOpenConnect(item)}
                      disabled={isConnected}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={isConnected ? 'checkmark-circle' : 'chatbubbles-outline'}
                        size={16}
                        color={isConnected ? '#059669' : '#FFFFFF'}
                      />
                      <Text style={[styles.connectBtnText, isConnected && styles.connectedBtnText]}>
                        {isConnected ? 'Connection Requested' : 'Connect & Say Hello'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── TAB 2: DIRECTORY (Resident Search with Tower & Skills Cloud) ── */}
        {activeTab === 'DIRECTORY' && (
          <View style={{ gap: SPACING.md }}>
            {/* Tower Filter Strip */}
            <View>
              <Text style={styles.filterTitle}>Filter by Tower:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
                {towers.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, selectedTower === t && styles.chipActive]}
                    onPress={() => setSelectedTower(t)}
                  >
                    <Text style={[styles.chipText, selectedTower === t && styles.chipTextActive]}>
                      {t === 'ALL' ? '🏢 All Towers' : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Popular Skills Cloud */}
            {topSkills.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.filterTitle}>Top Resident Skills:</Text>
                  {selectedSkill ? (
                    <TouchableOpacity onPress={() => setSelectedSkill('')}>
                      <Text style={{ fontSize: 11, color: COLORS.error, fontWeight: '700' }}>Clear Filter ✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
                  {topSkills.map((s: any) => {
                    const skillName = typeof s === 'string' ? s : (s.skill || s.name);
                    const count = s.count || s.userCount || 0;
                    const isActive = selectedSkill.toLowerCase() === skillName.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={skillName}
                        style={[styles.skillChip, isActive && styles.skillChipActive]}
                        onPress={() => setSelectedSkill(isActive ? '' : skillName)}
                      >
                        <Text style={[styles.skillChipText, isActive && styles.skillChipTextActive]}>
                          #{skillName} {count > 0 ? `(${count})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Directory Profiles List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verified Resident Profiles</Text>
              <Text style={styles.sectionSub}>
                {isProfilesLoading ? 'Searching...' : `${directoryProfiles.length} found`}
              </Text>
            </View>

            {isProfilesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : directoryProfiles.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Ionicons name="shield-checkmark-outline" size={42} color={COLORS.textMuted} />
                <Text style={styles.emptyStateTitle}>No Discoverable Profiles Found</Text>
                <Text style={styles.emptyStateSub}>
                  Zero-leakage privacy strictly enforces visibility rules. Private profiles are excluded.
                </Text>
              </View>
            ) : (
              directoryProfiles.map((p: any) => {
                const pId = String(p.userId || p.id);
                const isConnected = connectedIds.includes(pId);
                const pName = p.fullName || p.name || 'Resident';

                return (
                  <View key={pId} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(pName).bg }]}>
                        <Text style={styles.avatarText}>{getInitials(pName)}</Text>
                      </View>

                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.nameText}>{pName}</Text>
                          <View style={[styles.visBadge, p.visibility === 'PUBLIC' ? styles.visPublic : styles.visNeigh]}>
                            <Text style={styles.visText}>{p.visibility || 'PUBLIC'}</Text>
                          </View>
                        </View>
                        <Text style={styles.professionText}>{p.profession || 'Community Member'}</Text>
                        <Text style={styles.unitText}>🏢 {p.tower || 'Society'} {p.flatNumber ? `• Flat ${p.flatNumber}` : ''}</Text>
                      </View>
                    </View>

                    {p.bio ? <Text style={styles.descriptionText}>{p.bio}</Text> : null}

                    {p.skills && p.skills.length > 0 && (
                      <View style={styles.tagRow}>
                        {p.skills.map((sk: string, i: number) => (
                          <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>#{sk}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.directoryFooter}>
                      <Text style={styles.contactMask}>
                        📞 {p.phone || 'Masked'} • ✉️ {p.email || 'Masked'}
                      </Text>

                      <TouchableOpacity
                        style={[styles.connectMiniBtn, isConnected && styles.connectedBtn]}
                        onPress={() => handleOpenConnect(p)}
                        disabled={isConnected}
                      >
                        <Ionicons
                          name={isConnected ? 'checkmark-circle' : 'chatbubble-ellipses-outline'}
                          size={14}
                          color={isConnected ? '#059669' : '#FFFFFF'}
                        />
                        <Text style={[styles.connectMiniBtnText, isConnected && styles.connectedBtnText]}>
                          {isConnected ? 'Sent' : 'Connect'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── TAB 3: PRIVACY MATRIX (Zero-leakage Controls) ── */}
        {activeTab === 'PRIVACY' && (
          <View style={{ gap: SPACING.md }}>
            <View style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyCardTitle}>Community Graph Privacy Matrix</Text>
                  <Text style={styles.privacyCardSub}>
                    Server-enforced privacy policies ensure zero client-side leakage of contact data.
                  </Text>
                </View>
              </View>

              {privacySaved && (
                <View style={styles.privacySavedAlert}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.privacySavedText}>Privacy preferences updated successfully!</Text>
                </View>
              )}

              <Text style={styles.privacySectionTitle}>Select Your Discovery Level:</Text>

              <TouchableOpacity
                style={[styles.privacyOption, privacySettings.skills === 'PUBLIC' && styles.privacyOptionActive]}
                onPress={() => {
                  setPrivacySettings((prev) => ({ ...prev, skills: 'PUBLIC' }));
                  updateVisMutation.mutate('PUBLIC');
                }}
              >
                <Ionicons name="globe-outline" size={22} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>PUBLIC (All Verified Residents)</Text>
                  <Text style={styles.privacyOptionDesc}>Discoverable by verified residents across all towers in Mana.</Text>
                </View>
                {privacySettings.skills === 'PUBLIC' && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.privacyOption, privacySettings.skills === 'NEIGHBORS' && styles.privacyOptionActive]}
                onPress={() => {
                  setPrivacySettings((prev) => ({ ...prev, skills: 'NEIGHBORS' }));
                  updateVisMutation.mutate('NEIGHBORS');
                }}
              >
                <Ionicons name="home-outline" size={22} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>NEIGHBORS (Tower Only)</Text>
                  <Text style={styles.privacyOptionDesc}>Only residents in your tower can discover your skills and profile.</Text>
                </View>
                {privacySettings.skills === 'NEIGHBORS' && (
                  <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.privacyOption, privacySettings.skills === 'PRIVATE' && styles.privacyOptionActive]}
                onPress={() => {
                  setPrivacySettings((prev) => ({ ...prev, skills: 'PRIVATE' }));
                  updateVisMutation.mutate('PRIVATE');
                }}
              >
                <Ionicons name="lock-closed-outline" size={22} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>PRIVATE (Hidden)</Text>
                  <Text style={styles.privacyOptionDesc}>Completely excluded from graph search and talent directory.</Text>
                </View>
                {privacySettings.skills === 'PRIVATE' && (
                  <Ionicons name="checkmark-circle" size={18} color="#EF4444" />
                )}
              </TouchableOpacity>

              <View style={styles.privacyMatrixWrap}>
                <Text style={styles.privacyMatrixHeading}>Field-Level Data Masking Policy</Text>

                {[
                  { field: 'Phone Number', rule: 'Strictly Masked until mutual connection accepted' },
                  { field: 'Email Address', rule: 'Strictly Masked until mutual connection accepted' },
                  { field: 'Unit Number', rule: 'Tower visible; Unit hidden for Private tier' },
                  { field: 'Profession & Skills', rule: 'Filtered strictly by server discovery engine' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.matrixRow}>
                    <Text style={styles.matrixField}>{item.field}</Text>
                    <Text style={styles.matrixRule}>{item.rule}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Intro Message Dialog ── */}
      <Modal visible={!!chatModalTarget} transparent animationType="slide" onRequestClose={() => setChatModalTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Connect with {chatModalTarget?.name}</Text>
                <Text style={styles.modalSub}>{chatModalTarget?.profession}</Text>
              </View>
              <TouchableOpacity onPress={() => setChatModalTarget(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputPrompt}>Write a brief friendly greeting:</Text>
            <TextInput
              style={styles.introInput}
              value={introMessage}
              onChangeText={setIntroMessage}
              multiline
              numberOfLines={4}
              placeholder="Hi, I'd like to connect regarding..."
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setChatModalTarget(null)}
                disabled={connectMutation.isPending}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendModalBtn}
                onPress={handleSendIntro}
                disabled={connectMutation.isPending || !introMessage.trim()}
              >
                {connectMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                    <Text style={styles.sendModalText}>Send Connection</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    padding: 0,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 48,
  },
  heroBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18,
    marginTop: 4,
  },
  chipScroll: {
    marginBottom: SPACING.md,
  },
  chipScrollContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  professionText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  matchScore: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.primary,
  },
  matchLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  availText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
    marginTop: 2,
  },
  connectBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectedBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  connectedBtnText: {
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputPrompt: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  introInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: 'top',
    height: 100,
    backgroundColor: '#F9FAFB',
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sendModalBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  sendModalText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#EDE9FE',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabBtnTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  skillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginRight: 6,
  },
  skillChipActive: {
    backgroundColor: '#7C3AED',
  },
  skillChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  skillChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  directoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactMask: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  connectMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  connectMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  visBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  visPublic: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  visNeigh: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  visText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyStateBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyStateSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  privacyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  privacyHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  privacyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  privacyCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  privacySavedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  privacySavedText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
  },
  privacySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  privacyOptionActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  privacyOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  privacyOptionDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  privacyMatrixWrap: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 8,
  },
  privacyMatrixHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  matrixField: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  matrixRule: {
    fontSize: 10,
    color: COLORS.textMuted,
    maxWidth: '60%',
    textAlign: 'right',
  },
});
