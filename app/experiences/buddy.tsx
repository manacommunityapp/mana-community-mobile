import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  FlatList, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  experiencesService,
  InterestTag, INTEREST_META,
  BuddyMessage, BuddyRecommendation, ItineraryItem, InterestMatch,
} from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, RADIUS } from '@/constants/config';

const INTEREST_CATEGORIES = ['Sports', 'Wellness', 'Entertainment', 'Hobbies', 'Adventure', 'Family'] as const;

// ── Interest Chip ─────────────────────────────────────────────────────────────

function InterestChip({
  tag, selected, onPress,
}: { tag: InterestTag; selected: boolean; onPress: () => void }) {
  const meta = INTEREST_META[tag];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, marginRight: 8, marginBottom: 8,
        backgroundColor: selected ? THEME.primary : '#fff',
        borderWidth: 1.5, borderColor: selected ? THEME.primary : '#E5E7EB',
        ...SHADOWS.sm,
      }}
    >
      <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
      <Text style={{
        fontFamily: FONTS.medium, fontSize: 12,
        color: selected ? '#fff' : '#374151',
      }}>{meta.label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.9)" />}
    </TouchableOpacity>
  );
}

// ── Recommendation Card ───────────────────────────────────────────────────────

function RecoCard({ item, onPress }: { item: BuddyRecommendation; onPress: () => void }) {
  const exp = item.experience;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 200, marginRight: 12, borderRadius: 16, overflow: 'hidden',
        backgroundColor: '#fff', ...SHADOWS.md,
      }}
    >
      <LinearGradient
        colors={[exp.backdrop_color + 'CC', exp.backdrop_color]}
        style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 36 }}>{exp.emoji}</Text>
        <View style={{
          position: 'absolute', top: 8, right: 8,
          backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#fff' }}>
            {item.match_score}% match
          </Text>
        </View>
      </LinearGradient>
      <View style={{ padding: 10 }}>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#111827' }} numberOfLines={2}>
          {exp.title}
        </Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
          {item.reason}
        </Text>
        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: THEME.primary, marginTop: 6 }}>
          {exp.is_free ? 'FREE' : `₹${exp.price_individual}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Itinerary Card ────────────────────────────────────────────────────────────

function ItineraryCard({ item, index }: { item: ItineraryItem; index: number }) {
  const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DB2777'];
  const lineColor = colors[index % colors.length];
  const dayLabel = (() => {
    const d = new Date(item.date);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  })();
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
      <View style={{ alignItems: 'center', width: 36 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: lineColor + '20', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
        </View>
        <View style={{ width: 2, flex: 1, backgroundColor: lineColor + '30', marginTop: 4 }} />
      </View>
      <View style={{
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
        marginBottom: 10, ...SHADOWS.sm, borderLeftWidth: 3, borderLeftColor: lineColor,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#111827', flex: 1, marginRight: 8 }}>
            {item.experience_title}
          </Text>
          <View style={{
            backgroundColor: item.is_free ? '#D1FAE5' : '#EEF2FF',
            borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
          }}>
            <Text style={{
              fontFamily: FONTS.bold, fontSize: 10,
              color: item.is_free ? '#065F46' : THEME.primary,
            }}>
              {item.is_free ? 'FREE' : `₹${item.price}`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF' }}>{dayLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="time-outline" size={11} color="#9CA3AF" />
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF' }}>{item.start_time}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF' }} numberOfLines={1}>
              {item.venue_area}
            </Text>
          </View>
        </View>
        {item.notes && (
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            💡 {item.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Buddy Match Card ──────────────────────────────────────────────────────────

function MatchCard({ match }: { match: InterestMatch }) {
  const sharedCount = match.shared_interests.length;
  return (
    <View style={{
      width: 180, marginRight: 12, backgroundColor: '#fff', borderRadius: 16,
      padding: 14, ...SHADOWS.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: THEME.primary + '20', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.primary }}>
            {match.resident_initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#111827' }} numberOfLines={1}>
            {match.resident_name}
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#9CA3AF' }}>{match.flat}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {match.shared_interests.slice(0, 3).map(tag => (
          <View key={tag} style={{
            backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: '#374151' }}>
              {INTEREST_META[tag].emoji} {INTEREST_META[tag].label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: THEME.primary }}>
          {match.match_score}% match
        </Text>
        {match.open_to_group && (
          <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: '#065F46' }}>Open</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: BuddyMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={{
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 8, marginBottom: 12,
    }}>
      {!isUser && (
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
        </View>
      )}
      <View style={{
        maxWidth: '75%', backgroundColor: isUser ? THEME.primary : '#fff',
        borderRadius: 16, borderBottomRightRadius: isUser ? 4 : 16,
        borderBottomLeftRadius: isUser ? 16 : 4,
        padding: 12, ...SHADOWS.sm,
      }}>
        <Text style={{
          fontFamily: FONTS.regular, fontSize: 14,
          color: isUser ? '#fff' : '#1F2937', lineHeight: 20,
        }}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BuddyScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  const [selectedInterests, setSelectedInterests] = useState<InterestTag[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'itinerary' | 'chat'>('home');
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [itineraryWeekend, setItineraryWeekend] = useState<'THIS' | 'NEXT'>('THIS');
  const [messages, setMessages] = useState<BuddyMessage[]>([
    {
      id: 'welcome',
      role: 'buddy',
      text: "Hi! 👋 I'm Mana Buddy, your personal community experiences guide. I can suggest activities based on your interests, plan your weekend, or help you find residents to team up with. What would you like to do?",
      created_at: new Date().toISOString(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const { data: savedInterests = [] } = useQuery({
    queryKey: ['user-interests'],
    queryFn: experiencesService.getUserInterests,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (savedInterests.length > 0) {
      setSelectedInterests(savedInterests);
      setOnboardingDone(true);
    }
  }, [savedInterests]);

  const { data: recommendations = [], isLoading: recoLoading } = useQuery({
    queryKey: ['buddy-recommendations', selectedInterests],
    queryFn: () => experiencesService.getBuddyRecommendations(selectedInterests),
    enabled: onboardingDone && selectedInterests.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['interest-matches'],
    queryFn: experiencesService.getInterestMatches,
    enabled: onboardingDone,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (interests: InterestTag[]) => experiencesService.saveUserInterests(interests),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-interests'] });
      qc.invalidateQueries({ queryKey: ['buddy-recommendations'] });
    },
  });

  const buildMutation = useMutation({
    mutationFn: ({ interests, weekend }: { interests: InterestTag[]; weekend: 'THIS' | 'NEXT' }) =>
      experiencesService.buildItinerary(interests, weekend),
    onSuccess: (data) => {
      setItinerary(data);
      setActiveTab('itinerary');
    },
  });

  const chatMutation = useMutation({
    mutationFn: (text: string) => experiencesService.sendBuddyMessage(text),
    onSuccess: (reply) => {
      setMessages(prev => [...prev, reply]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const toggleInterest = (tag: InterestTag) => {
    setSelectedInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveInterests = () => {
    if (selectedInterests.length < 3) return;
    saveMutation.mutate(selectedInterests);
    setOnboardingDone(true);
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg: BuddyMessage = {
      id: `msg-${Date.now()}`, role: 'user', text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    chatMutation.mutate(text);
  };

  // ── Onboarding ──────────────────────────────────────────────────────────────
  if (!onboardingDone) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background }}>
        <LinearGradient colors={['#312E81', '#4F46E5', '#6366F1']} style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>🤖</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 26, color: '#fff', marginTop: 8 }}>
              Meet Mana Buddy
            </Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' }}>
              Pick your interests and I'll personalise your community experience
            </Text>
          </View>
        </LinearGradient>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
            Select at least 3 interests
          </Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#111827', marginBottom: 16 }}>
            What do you enjoy? ({selectedInterests.length} selected)
          </Text>
          {INTEREST_CATEGORIES.map(cat => {
            const tags = (Object.keys(INTEREST_META) as InterestTag[]).filter(t => INTEREST_META[t].category === cat);
            return (
              <View key={cat} style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                  {cat}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <InterestChip
                      key={tag} tag={tag}
                      selected={selectedInterests.includes(tag)}
                      onPress={() => toggleInterest(tag)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            onPress={handleSaveInterests}
            disabled={selectedInterests.length < 3}
            style={{
              backgroundColor: selectedInterests.length >= 3 ? THEME.primary : '#D1D5DB',
              borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8,
            }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>
              {selectedInterests.length < 3
                ? `Pick ${3 - selectedInterests.length} more`
                : `Let's Go! 🚀`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Main App ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: THEME.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#312E81', '#4F46E5']} style={{ paddingTop: 52, paddingBottom: 0, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 20 }}>🤖</Text>
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>Mana Buddy</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                AI-powered experiences guide
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setOnboardingDone(false)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
              paddingHorizontal: 10, paddingVertical: 6,
            }}
          >
            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: '#fff' }}>Edit Interests</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 4, paddingBottom: 0 }}>
          {(['home', 'itinerary', 'chat'] as const).map(tab => {
            const labels = { home: '✨ For You', itinerary: '🗓️ Itinerary', chat: '💬 Chat' };
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderBottomWidth: 2.5,
                  borderBottomColor: active ? '#fff' : 'transparent',
                }}
              >
                <Text style={{
                  fontFamily: active ? FONTS.semiBold : FONTS.regular,
                  fontSize: 13, color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                }}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ── For You Tab ── */}
      {activeTab === 'home' && (
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Your Interests chips */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: '#374151', marginBottom: 10 }}>
              Your Interests
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedInterests.map(tag => (
                <View key={tag} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: THEME.primary + '15',
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
                }}>
                  <Text style={{ fontSize: 14 }}>{INTEREST_META[tag].emoji}</Text>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.primary }}>
                    {INTEREST_META[tag].label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Recommended Experiences */}
          <View style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#111827' }}>
                Picked for You
              </Text>
              <TouchableOpacity onPress={() => router.push('/experiences')}>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: THEME.primary }}>See all</Text>
              </TouchableOpacity>
            </View>
            {recoLoading ? (
              <ActivityIndicator color={THEME.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {recommendations.map(r => (
                  <RecoCard
                    key={r.experience.id} item={r}
                    onPress={() => router.push(`/experiences/${r.experience.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Plan My Weekend Banner */}
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
            <LinearGradient
              colors={['#0F172A', '#1E3A5F']}
              style={{ borderRadius: 18, padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <Text style={{ fontSize: 36 }}>🗓️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>
                    Plan My Weekend
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    AI-curated itinerary based on your interests
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['THIS', 'NEXT'] as const).map(w => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => {
                      setItineraryWeekend(w);
                      buildMutation.mutate({ interests: selectedInterests, weekend: w });
                    }}
                    disabled={buildMutation.isPending}
                    style={{
                      flex: 1, backgroundColor: w === 'THIS' ? '#4F46E5' : 'rgba(255,255,255,0.12)',
                      borderRadius: 12, paddingVertical: 12, alignItems: 'center',
                      borderWidth: w === 'NEXT' ? 1 : 0, borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {buildMutation.isPending && itineraryWeekend === w ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#fff' }}>
                        {w === 'THIS' ? 'This Weekend' : 'Next Weekend'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* Find Your Tribe */}
          <View style={{ marginTop: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
              <View>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#111827' }}>
                  Find Your Tribe
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                  Residents who share your interests
                </Text>
              </View>
            </View>
            {matchesLoading ? (
              <ActivityIndicator color={THEME.primary} style={{ marginVertical: 16 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {matches.map(m => (
                  <MatchCard key={m.resident_name} match={m} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Quick prompts */}
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#111827', marginBottom: 10 }}>
              Ask Mana Buddy
            </Text>
            {[
              { text: "Free events this weekend?", icon: "🎁" },
              { text: "Find a fitness partner", icon: "💪" },
              { text: "Family-friendly activities?", icon: "👨‍👩‍👧" },
              { text: "Best budget experiences?", icon: "💰" },
            ].map(q => (
              <TouchableOpacity
                key={q.text}
                onPress={() => {
                  setActiveTab('chat');
                  setTimeout(() => {
                    const msg: BuddyMessage = {
                      id: `msg-${Date.now()}`, role: 'user', text: q.text,
                      created_at: new Date().toISOString(),
                    };
                    setMessages(prev => [...prev, msg]);
                    chatMutation.mutate(q.text);
                  }, 300);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: '#fff', borderRadius: 14, padding: 14,
                  marginBottom: 8, ...SHADOWS.sm,
                }}
              >
                <Text style={{ fontSize: 20 }}>{q.icon}</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: '#374151', flex: 1 }}>
                  {q.text}
                </Text>
                <Ionicons name="arrow-forward-circle" size={20} color={THEME.primary + '80'} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Itinerary Tab ── */}
      {activeTab === 'itinerary' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {itinerary.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 56 }}>🗓️</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#111827', marginTop: 12 }}>
                No itinerary yet
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' }}>
                Go to the For You tab and tap "Plan My Weekend" to generate your personalised schedule.
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('home')}
                style={{
                  backgroundColor: THEME.primary, borderRadius: 14,
                  paddingHorizontal: 24, paddingVertical: 14, marginTop: 20,
                }}
              >
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: '#fff' }}>
                  Plan My Weekend
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{
                backgroundColor: THEME.primary + '10', borderRadius: 14,
                padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
              }}>
                <Text style={{ fontSize: 24 }}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.primary }}>
                    Your Weekend Plan is Ready
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {itinerary.length} experiences · Curated for your interests
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => buildMutation.mutate({ interests: selectedInterests, weekend: itineraryWeekend })}
                  style={{ backgroundColor: THEME.primary + '20', borderRadius: 10, padding: 8 }}
                >
                  <Ionicons name="refresh" size={16} color={THEME.primary} />
                </TouchableOpacity>
              </View>
              {itinerary.map((item, i) => (
                <ItineraryCard key={item.experience_id + i} item={item} index={i} />
              ))}
              <TouchableOpacity
                onPress={() => router.push('/experiences')}
                style={{
                  backgroundColor: THEME.primary, borderRadius: 14,
                  paddingVertical: 15, alignItems: 'center', marginTop: 8,
                }}
              >
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: '#fff' }}>
                  Book All Experiences
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === 'chat' && (
        <>
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map(m => <ChatBubble key={m.id} message={m} />)}
            {chatMutation.isPending && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                </View>
                <View style={{
                  backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4,
                  padding: 14, ...SHADOWS.sm,
                }}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                </View>
              </View>
            )}
          </ScrollView>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
          }}>
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask Mana Buddy anything…"
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1, backgroundColor: '#F9FAFB', borderRadius: 22,
                paddingHorizontal: 16, paddingVertical: 11,
                fontFamily: FONTS.regular, fontSize: 14, color: '#111827',
                borderWidth: 1, borderColor: '#E5E7EB',
              }}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!chatInput.trim() || chatMutation.isPending}
              style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: chatInput.trim() ? THEME.primary : '#E5E7EB',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
