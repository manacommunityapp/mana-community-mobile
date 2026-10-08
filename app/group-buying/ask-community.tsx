import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import DealCard from '@/components/group-buying/DealCard';
import DemandCard from '@/components/group-buying/DemandCard';
import type { CommunityAIQueryResponse } from '@/types/groupBuying';

const SAMPLE_PROMPTS = [
  '20L sunflower oil for festival',
  'Aashirvaad Atta 10 KG bulk',
  'Alphonso mangoes direct farm box',
  'Eco friendly cleaning liquid',
  'Diwali dry fruit gift box',
];

export default function AskCommunityScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CommunityAIQueryResponse | null>(null);

  const handleSearch = async (textToSearch?: string) => {
    const searchText = (textToSearch ?? query).trim();
    if (!searchText) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await groupBuyingService.askCommunityAI(searchText);
      setResult(res);
    } catch (e) {
      console.log('AI search error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Ask Your Community (AI)' }} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroBanner}>
          <View style={s.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#FEF3C7" />
            <Text style={s.heroBadgeText}>AI DEMAND MATCHING</Text>
          </View>
          <Text style={s.heroTitle}>Tell us what you want to buy</Text>
          <Text style={s.heroSub}>
            Type any grocery or household product. We'll search active group buys, check neighbor requests, or request verified wholesale quotes.
          </Text>

          {/* Search Box */}
          <View style={s.searchWrap}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="e.g. 5L Fortune sunflower oil..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={s.searchBtn}
              onPress={() => handleSearch()}
              disabled={loading || !query.trim()}
            >
              <Text style={s.searchBtnText}>Ask</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Suggestion Chips */}
        <View style={s.suggestionsCard}>
          <Text style={s.suggestionsTitle}>POPULAR REQUESTS IN YOUR SOCIETY</Text>
          <View style={s.chipsWrap}>
            {SAMPLE_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={s.chip}
                onPress={() => {
                  setQuery(prompt);
                  handleSearch(prompt);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="bulb-outline" size={13} color={COLORS.primary} />
                <Text style={s.chipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Results */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Analyzing community demand & wholesale rates...</Text>
          </View>
        ) : result ? (
          <View style={s.resultSection}>
            {/* AI Explanation Card */}
            <View style={s.explanationCard}>
              <View style={s.explanationHeader}>
                <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                <Text style={s.explanationTitle}>Community Intelligence</Text>
                <View style={s.confidencePill}>
                  <Text style={s.confidenceText}>{Math.round((result.confidenceScore ?? result.confidence ?? 90) * 100)}% Match</Text>
                </View>
              </View>
              <Text style={s.explanationText}>{result.explanation}</Text>

              {result.suggestedPrice && (
                <View style={s.suggestedRow}>
                  <Text style={s.suggestedLabel}>Estimated Community Rate:</Text>
                  <Text style={s.suggestedValue}>?{result.suggestedPrice}</Text>
                  {result.estimatedCommunitySavings ? (
                    <Text style={s.savingsTag}>Save ?{result.estimatedCommunitySavings}</Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* Matched Deals */}
            {(result.matchedDeals ?? result.dealMatches ?? []).length > 0 && (
              <View style={s.matchesWrap}>
                <Text style={s.matchesHeading}>Live Group Buys Matching "{result.query}"</Text>
                {(result.matchedDeals ?? result.dealMatches ?? []).map(deal => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </View>
            )}

            {/* Matched Demands */}
            {(result.matchedDemands ?? []).length > 0 && (
              <View style={s.matchesWrap}>
                <Text style={s.matchesHeading}>Active Community Demand Requests</Text>
                {(result.matchedDemands ?? []).map(dem => (
                  <DemandCard key={dem.id} item={dem} />
                ))}
              </View>
            )}

            {/* Create Demand CTA if no matches */}
            {(result.matchedDeals ?? result.dealMatches ?? []).length === 0 && (
              <View style={s.createDemandCard}>
                <Ionicons name="megaphone-outline" size={28} color={COLORS.primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.createDemandTitle}>Post to Society Demand Board</Text>
                  <Text style={s.createDemandDesc}>
                    Gather upvotes from neighbours to attract competing wholesale vendor bids.
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.postDemandBtn}
                  onPress={() => router.push('/group-buying/demand' as any)}
                >
                  <Text style={s.postDemandBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  heroBanner: { padding: 20, gap: 10 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 28 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 6,
    gap: 8,
    ...SHADOWS.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10 },
  clearBtn: { padding: 4 },
  searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  searchBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  suggestionsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  suggestionsTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  loadingBox: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.textMuted },
  resultSection: { marginHorizontal: 14, marginTop: 14, gap: 14 },
  explanationCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 8,
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  explanationTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary, flex: 1 },
  confidencePill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  confidenceText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  explanationText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
    flexWrap: 'wrap',
  },
  suggestedLabel: { fontSize: 12, color: COLORS.textMuted },
  suggestedValue: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  savingsTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: '#166534', fontSize: 11, fontWeight: '700' },
  matchesWrap: { gap: 10 },
  matchesHeading: { fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  createDemandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  createDemandTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  createDemandDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  postDemandBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md },
  postDemandBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
