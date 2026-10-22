import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, Linking, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  experiencesService, Partner, PartnerCategory,
  PARTNER_CATEGORY_META, CoachingSession,
} from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS } from '@/constants/config';

// ── Helpers ──────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? '#F59E0B' : '#E5E7EB' }}>★</Text>
      ))}
    </View>
  );
}

const CATEGORY_FILTERS: { key: PartnerCategory | 'ALL'; label: string; emoji: string }[] = [
  { key: 'ALL',             label: 'All',         emoji: '✨' },
  { key: 'SPORTS_VENUE',   label: 'Sports',      emoji: '🏟️' },
  { key: 'COACHING',       label: 'Coaching',    emoji: '🏅' },
  { key: 'RESTAURANT',     label: 'Eat & Drink', emoji: '🍽️' },
  { key: 'WELLNESS',       label: 'Wellness',    emoji: '🧘' },
  { key: 'ENTERTAINMENT',  label: 'Fun',         emoji: '🎪' },
  { key: 'RETAIL',         label: 'Retail',      emoji: '🛍️' },
];

// ── Partner Card ──────────────────────────────────────────────────────────────

function PartnerCard({ partner, onPress }: { partner: Partner; onPress: () => void }) {
  const meta = PARTNER_CATEGORY_META[partner.category];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', ...SHADOWS.card }}
    >
      <LinearGradient
        colors={[partner.backdrop_color, partner.backdrop_color + 'BB']}
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View style={{
          width: 52, height: 52, borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 28 }}>{partner.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }} numberOfLines={1}>
              {partner.name}
            </Text>
            {partner.is_verified && (
              <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
            )}
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }} numberOfLines={1}>
            {partner.tagline}
          </Text>
        </View>
        {partner.is_featured && (
          <View style={{ backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#fff' }}>⭐ FEATURED</Text>
          </View>
        )}
      </LinearGradient>

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <StarRow rating={partner.rating} size={13} />
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{partner.rating}</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>({partner.review_count})</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: meta.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: meta.color }}>{meta.emoji} {meta.label}</Text>
            </View>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }}>{partner.price_range}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={13} color={THEME.muted} />
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>{partner.area}</Text>
          {partner.open_hours && (
            <>
              <Text style={{ color: '#E5E7EB' }}>·</Text>
              <Ionicons name="time-outline" size={13} color={THEME.muted} />
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>{partner.open_hours}</Text>
            </>
          )}
        </View>

        {partner.discount_for_members && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 8 }}>
            <Text style={{ fontSize: 13 }}>🏷️</Text>
            <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#065F46', flex: 1 }}>
              {partner.discount_for_members}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {partner.amenities.slice(0, 4).map(a => (
            <View key={a} style={{ backgroundColor: '#F1F4F7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: THEME.muted }}>{a}</Text>
            </View>
          ))}
          {partner.amenities.length > 4 && (
            <View style={{ backgroundColor: '#F1F4F7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: THEME.muted }}>+{partner.amenities.length - 4} more</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {partner.contact_phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${partner.contact_phone}`)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, padding: 10 }}
            >
              <Ionicons name="call-outline" size={15} color={THEME.text} />
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>Call</Text>
            </TouchableOpacity>
          )}
          {partner.booking_url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(partner.booking_url!)}
              style={{ flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>Book Online</Text>
            </TouchableOpacity>
          )}
          {!partner.booking_url && !partner.contact_phone && (
            <View style={{ flex: 1, backgroundColor: '#F1F4F7', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.muted }}>Walk in</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Coaching Card ─────────────────────────────────────────────────────────────

function CoachingCard({ session }: { session: CoachingSession }) {
  const levelColors: Record<string, string> = { BEGINNER: '#059669', INTERMEDIATE: '#D97706', ADVANCED: '#DC2626', ALL: '#7C3AED' };
  const nextSlot = session.available_slots[0];
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOWS.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24 }}>{session.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>{session.sport} Coaching</Text>
            <View style={{ backgroundColor: levelColors[session.level] + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 10, color: levelColors[session.level] }}>{session.level}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: THEME.text }}>Coach {session.coach_name}</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }} numberOfLines={2}>{session.coach_bio}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary }}>₹{session.price_per_session}</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>per session</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>{session.duration_mins}m</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>duration</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>{session.group_size_max}</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 10, color: THEME.muted }}>max group</Text>
        </View>
      </View>

      {nextSlot && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10 }}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: COLORS.primary }}>
            Next: {nextSlot.date} at {nextSlot.time} · {nextSlot.spots_left} spots left
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location-outline" size={12} color={THEME.muted} />
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted }} numberOfLines={1}>{session.area}</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#047857', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Book Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type Tab = 'PARTNERS' | 'COACHING';

export default function PartnersScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('PARTNERS');
  const [activeCategory, setActiveCategory] = useState<PartnerCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data: partners = [], isLoading: partnersLoading } = useQuery({
    queryKey: ['partners', activeCategory],
    queryFn: () => experiencesService.getPartners(activeCategory === 'ALL' ? undefined : activeCategory),
    staleTime: 5 * 60 * 1000,
  });

  const { data: coaching = [], isLoading: coachingLoading } = useQuery({
    queryKey: ['coaching-sessions'],
    queryFn: () => experiencesService.getCoachingSessions(),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'COACHING',
  });

  const filteredPartners = search
    ? partners.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.area.toLowerCase().includes(search.toLowerCase()) ||
        p.tagline.toLowerCase().includes(search.toLowerCase())
      )
    : partners;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#1E3A5F', '#2D5986']}
        style={{ paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 16, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#fff' }}>🤝 Local Partners</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
              Exclusive deals · Venues · Coaching
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['PARTNERS', 'COACHING'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
                backgroundColor: tab === t ? '#fff' : 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: tab === t ? '#1E3A5F' : 'rgba(255,255,255,0.8)' }}>
                {t === 'PARTNERS' ? '🏪 Partners' : '🏅 Coaching'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {tab === 'PARTNERS' ? (
        <>
          {/* Search + category filter */}
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEFF2' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F4F7', borderRadius: 12, paddingHorizontal: 12, height: 38, marginBottom: 10 }}>
              <Ionicons name="search-outline" size={16} color={THEME.muted} style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search partners…"
                placeholderTextColor={THEME.muted}
                style={{ flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: THEME.text }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORY_FILTERS.map(f => {
                  const active = activeCategory === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setActiveCategory(f.key)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                        borderColor: active ? '#1E3A5F' : '#E8E9F0',
                        backgroundColor: active ? '#1E3A5F' : '#fff',
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: active ? '#fff' : THEME.muted }}>
                        {f.emoji} {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {partnersLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {filteredPartners.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 60, gap: 10 }}>
                  <Text style={{ fontSize: 44 }}>🔍</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: THEME.muted }}>No partners found</Text>
                </View>
              ) : (
                <>
                  {filteredPartners.some(p => p.is_featured) && (
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text, marginBottom: 10 }}>
                      ⭐ Featured Partners
                    </Text>
                  )}
                  {filteredPartners.filter(p => p.is_featured).map(p => (
                    <PartnerCard key={p.id} partner={p} onPress={() => {}} />
                  ))}
                  {filteredPartners.some(p => !p.is_featured) && (
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text, marginBottom: 10, marginTop: 4 }}>
                      All Partners ({filteredPartners.filter(p => !p.is_featured).length})
                    </Text>
                  )}
                  {filteredPartners.filter(p => !p.is_featured).map(p => (
                    <PartnerCard key={p.id} partner={p} onPress={() => {}} />
                  ))}
                </>
              )}

              {/* Become a partner CTA */}
              <LinearGradient
                colors={['#1E3A5F', '#2D5986']}
                style={{ borderRadius: 16, padding: 18, marginTop: 8, gap: 6 }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>🤝 List Your Business</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 }}>
                  Reach thousands of Mana residents. Offer exclusive deals and grow your business with community-backed visibility.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 6 }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#1E3A5F' }}>Apply to Partner →</Text>
                </TouchableOpacity>
              </LinearGradient>
            </ScrollView>
          )}
        </>
      ) : (
        /* Coaching tab */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {coachingLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
          ) : (
            <>
              <View style={{ backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>🏅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary }}>Book a coaching session</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    Community-priced 1-on-1 and group coaching with certified coaches
                  </Text>
                </View>
              </View>
              {coaching.map(session => (
                <CoachingCard key={session.session_id} session={session} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
