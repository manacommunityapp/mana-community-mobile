import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StatusBar, Platform, Dimensions, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import {
  experiencesService, Experience, ExperienceCategory, CATEGORY_META,
} from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS, RADIUS } from '@/constants/config';

const { width: SCREEN_W } = Dimensions.get('window');
const FEATURED_CARD_W = SCREEN_W * 0.75;

type CategoryKey = ExperienceCategory | 'ALL';
const CATEGORIES: CategoryKey[] = ['ALL', 'MOVIES', 'LIVE_EVENTS', 'SPORTS', 'KIDS_FAMILY', 'WORKSHOPS', 'OUTINGS', 'ONLINE'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    const diff = differenceInDays(d, new Date());
    if (diff < 7) return format(d, 'EEEE');
    return format(d, 'd MMM');
  } catch { return dateStr; }
}

function spotsLeft(exp: Experience): string {
  const left = exp.capacity - exp.registered_count;
  if (left <= 0) return 'Full';
  if (left <= 5) return `${left} spots left!`;
  if (left <= 15) return `${left} spots left`;
  return `${exp.registered_count} registered`;
}

function spotsColor(exp: Experience): string {
  const left = exp.capacity - exp.registered_count;
  if (left <= 0) return '#DC2626';
  if (left <= 5) return '#D97706';
  return '#059669';
}

function priceLabel(exp: Experience): string {
  if (exp.is_free) return 'FREE';
  if (exp.price_individual) return `₹${exp.price_individual}`;
  return 'Paid';
}

// ── Group Booking Pill ───────────────────────────────────────────────────────

function GroupBookingPill({ exp }: { exp: Experience }) {
  if (!exp.group_min_size) return null;
  const needed = exp.group_min_size - (exp.group_current_size ?? 0);
  if (needed <= 0) return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 }}>
      <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: '#059669' }}>Group confirmed ✓</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 }}>
      <Text style={{ fontSize: 10 }}>👥</Text>
      <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: '#92400E' }}>
        {needed} more for group rate (₹{exp.price_group}/pp)
      </Text>
    </View>
  );
}

// ── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({ exp, onPress }: { exp: Experience; onPress: () => void }) {
  const meta = CATEGORY_META[exp.category];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: FEATURED_CARD_W, borderRadius: 20, overflow: 'hidden',
        marginRight: 14, ...SHADOWS.floating,
      }}
    >
      <LinearGradient colors={[exp.backdrop_color, '#0F172A']} style={{ padding: 20, minHeight: 180 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{
            backgroundColor: meta.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
            flexDirection: 'row', alignItems: 'center', gap: 5,
          }}>
            <Text style={{ fontSize: 12 }}>{meta.emoji}</Text>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: meta.color }}>{meta.label}</Text>
          </View>
          {exp.visibility === 'MEMBERS_ONLY' && (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#fff' }}>🔒 Members</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 44, marginBottom: 8 }}>{exp.emoji}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff', lineHeight: 22 }} numberOfLines={2}>
            {exp.title}
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 5 }}>
            {fmtDate(exp.start_date)} · {exp.start_time}
          </Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }} numberOfLines={1}>
            📍 {exp.venue_area}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <View style={{
            backgroundColor: exp.is_free ? '#059669' : '#4F46E5',
            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
          }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>
              {priceLabel(exp)}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: spotsColor(exp) }}>
            {spotsLeft(exp)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Experience Row Card ──────────────────────────────────────────────────────

function ExperienceRowCard({ exp, onPress }: { exp: Experience; onPress: () => void }) {
  const meta = CATEGORY_META[exp.category];
  const isFull = exp.registered_count >= exp.capacity;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: '#fff', borderRadius: 16, padding: 14,
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        marginHorizontal: 16, marginBottom: 10, ...SHADOWS.card,
      }}
    >
      {/* Emoji Block */}
      <LinearGradient
        colors={[exp.backdrop_color, exp.backdrop_color + 'AA']}
        style={{ width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <Text style={{ fontSize: 30 }}>{exp.emoji}</Text>
      </LinearGradient>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            fontFamily: FONTS.semiBold, fontSize: 11, color: meta.color,
            backgroundColor: meta.bg, paddingHorizontal: 7, paddingVertical: 2,
            borderRadius: 6,
          }}>{meta.label}</Text>
          {exp.visibility === 'MEMBERS_ONLY' && (
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#4F46E5' }}>🔒</Text>
          )}
          {exp.is_featured && (
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: '#D97706' }}>⭐</Text>
          )}
        </View>

        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text, lineHeight: 19 }} numberOfLines={2}>
          {exp.title}
        </Text>

        <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>
          {fmtDate(exp.start_date)} · {exp.start_time} · {exp.venue_area}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{
            fontFamily: FONTS.bold, fontSize: 13,
            color: exp.is_free ? '#059669' : '#4F46E5',
          }}>
            {priceLabel(exp)}
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: isFull ? '#DC2626' : spotsColor(exp) }}>
            {spotsLeft(exp)}
          </Text>
        </View>

        <GroupBookingPill exp={exp} />
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function ExperiencesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryKey>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: featured = [], isLoading: featuredLoading, refetch: refetchFeatured } = useQuery({
    queryKey: ['experiences-featured'],
    queryFn: () => experiencesService.getExperiences({ featured: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allExps = [], isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['experiences', category, search],
    queryFn: () => experiencesService.getExperiences({
      category: category === 'ALL' ? undefined : category,
      query: search || undefined,
    }),
    staleTime: 3 * 60 * 1000,
  });

  const thisWeekend = useMemo(() =>
    allExps.filter(e => {
      try {
        const diff = differenceInDays(parseISO(e.start_date), new Date());
        return diff >= 0 && diff <= 7;
      } catch { return false; }
    }),
    [allExps]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchAll()]);
    setRefreshing(false);
  }, [refetchFeatured, refetchAll]);

  const navigateTo = useCallback((exp: Experience) => {
    router.push(`/experiences/${exp.id}`);
  }, [router]);

  const isLoading = featuredLoading && allLoading;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#312E81', '#4338CA', '#4F46E5']}
        style={{
          paddingTop: Platform.OS === 'ios' ? 54 : 22,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>✨ Mana Experiences</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
              Discover · Connect · Experience
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/experiences/my-bookings')}>
              <Ionicons name="ticket-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/experiences/partners')}>
              <Ionicons name="storefront-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/experiences/buddy')}>
              <Ionicons name="sparkles-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/experiences/organizer')}>
              <Ionicons name="bar-chart-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/experiences/create')}>
              <Ionicons name="add-circle-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 12,
          paddingHorizontal: 12, height: 40,
        }}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search experiences, workshops, events…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{ flex: 1, color: '#fff', fontFamily: FONTS.regular, fontSize: 14 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Category Chips */}
      <View style={{ backgroundColor: '#312E81' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, gap: 8 }}
        >
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.12)',
                  borderWidth: 1.5,
                  borderColor: active ? '#fff' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13 }}>{meta.emoji}</Text>
                <Text style={{
                  fontFamily: FONTS.semiBold, fontSize: 12,
                  color: active ? meta.color : 'rgba(255,255,255,0.8)',
                }}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: THEME.muted, marginTop: 12 }}>
            Loading experiences…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Featured Carousel */}
          {featured.length > 0 && category === 'ALL' && !search && (
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>
                  ⭐ Featured This Week
                </Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary }}>
                  {featured.length} events
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
              >
                {featured.map(exp => (
                  <FeaturedCard key={exp.id} exp={exp} onPress={() => navigateTo(exp)} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* This Weekend */}
          {thisWeekend.length > 0 && !search && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>
                  📅 Happening This Week
                </Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.muted }}>
                  {thisWeekend.length} events
                </Text>
              </View>
              {thisWeekend.map(exp => (
                <ExperienceRowCard key={exp.id} exp={exp} onPress={() => navigateTo(exp)} />
              ))}
            </View>
          )}

          {/* All / Filtered */}
          {(search || category !== 'ALL') && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>
                  {search ? `Results for "${search}"` : CATEGORY_META[category].label}
                </Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.muted, marginLeft: 8 }}>
                  ({allExps.length})
                </Text>
              </View>
              {allExps.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
                  <Text style={{ fontSize: 48 }}>🔭</Text>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginTop: 12, textAlign: 'center' }}>
                    No experiences found
                  </Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, marginTop: 6, textAlign: 'center' }}>
                    Try a different category or search term
                  </Text>
                </View>
              ) : (
                allExps.map(exp => (
                  <ExperienceRowCard key={exp.id} exp={exp} onPress={() => navigateTo(exp)} />
                ))
              )}
            </View>
          )}

          {/* Upcoming Beyond This Week */}
          {!search && category === 'ALL' && (() => {
            const upcoming = allExps.filter(e => {
              try {
                const diff = differenceInDays(parseISO(e.start_date), new Date());
                return diff > 7;
              } catch { return false; }
            });
            if (upcoming.length === 0) return null;
            return (
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, paddingHorizontal: 16, marginBottom: 12 }}>
                  🗓️ Coming Up
                </Text>
                {upcoming.map(exp => (
                  <ExperienceRowCard key={exp.id} exp={exp} onPress={() => navigateTo(exp)} />
                ))}
              </View>
            );
          })()}

          {/* Mana Buddy AI CTA */}
          <TouchableOpacity
            onPress={() => router.push('/experiences/buddy')}
            style={{ marginHorizontal: 16, marginTop: 24, borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#0F172A', '#4338CA']} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Mana Buddy AI</Text>
                  <View style={{ backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: '#fff' }}>NEW</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  AI itinerary planner · Find your tribe · Chat
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Partners CTA */}
          <TouchableOpacity
            onPress={() => router.push('/experiences/partners')}
            style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#1E3A5F', '#2D5986']} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🤝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
                  Local Partners & Coaching
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Exclusive deals · Venues · Certified coaches
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Organizer CTA */}
          <TouchableOpacity
            onPress={() => router.push('/experiences/create')}
            style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#312E81', '#4F46E5']} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>🎪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
                  Host an Experience
                </Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Create events, classes and outings for your community
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
