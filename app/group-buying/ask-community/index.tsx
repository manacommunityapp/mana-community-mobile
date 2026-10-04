import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { CommunityAIQueryResponse } from '@/types/groupBuying';

export default function AskCommunityAIScreen() {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState('');
  const [result, setResult] = useState<CommunityAIQueryResponse | null>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) => groupBuyingService.askCommunityAI(q),
    onSuccess: (data) => setResult(data),
  });

  const handleSearch = () => {
    if (!queryInput.trim()) return;
    askMutation.mutate(queryInput.trim());
  };

  const SAMPLE_QUESTIONS = [
    '20L cold pressed sunflower oil',
    'Ratnagiri alphonso mango boxes',
    'Aashirvaad whole wheat atta 10kg',
    'Diwali corporate sweet gift boxes',
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Ask Your Community AI', headerBackTitle: 'Back' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.heroBanner}>
          <View style={s.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#7C3AED" />
            <Text style={s.aiBadgeText}>AI DEMAND ASSISTANT</Text>
          </View>
          <Text style={s.heroTitle}>What does your home need?</Text>
          <Text style={s.heroSub}>
            Ask anything. Our AI checks active community deals, existing neighbor requests, or auto-calculates bulk price thresholds for your society.
          </Text>
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="e.g. 5KG Basmati rice or washing liquid..."
            placeholderTextColor={COLORS.textMuted}
            value={queryInput}
            onChangeText={setQueryInput}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={askMutation.isPending} activeOpacity={0.8}>
            {askMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>

        {!result && (
          <View style={s.suggestionsWrap}>
            <Text style={s.suggLabel}>Frequently Requested by Neighbours:</Text>
            {SAMPLE_QUESTIONS.map(q => (
              <TouchableOpacity
                key={q}
                style={s.suggPill}
                onPress={() => {
                  setQueryInput(q);
                  askMutation.mutate(q);
                }}
              >
                <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
                <Text style={s.suggText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {result && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Ionicons name="sparkles" size={18} color="#7C3AED" />
              <Text style={s.resultTitle}>Community Intelligence Result</Text>
            </View>

            <Text style={s.explanation}>{result.explanation}</Text>

            {result.matchedDeals && result.matchedDeals.length > 0 ? (
              <View style={s.matchesSection}>
                <Text style={s.matchesTitle}>Active Group Deals Found:</Text>
                {result.matchedDeals.map(deal => (
                  <TouchableOpacity
                    key={deal.id}
                    style={s.matchCard}
                    onPress={() => router.push(`/group-buying/deal/${deal.id}` as any)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.dealTitle}>{deal.title}</Text>
                      <Text style={s.dealMeta}>₹{deal.currentTierPrice} · {deal.committedQty}/{deal.targetQty} units committed</Text>
                    </View>
                    <View style={s.actionBtn}><Text style={s.actionBtnText}>Join Deal</Text></View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {result.matchedDemands && result.matchedDemands.length > 0 ? (
              <View style={s.matchesSection}>
                <Text style={s.matchesTitle}>Community Demands Found:</Text>
                {result.matchedDemands.map(dem => (
                  <TouchableOpacity
                    key={dem.id}
                    style={s.matchCard}
                    onPress={() => router.push(`/group-buying/demand/${dem.id}` as any)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.dealTitle}>{dem.title}</Text>
                      <Text style={s.dealMeta}>{dem.upvotes} votes · {dem.interestedResidents} residents interested</Text>
                    </View>
                    <View style={[s.actionBtn, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[s.actionBtnText, { color: COLORS.primary }]}>View Bids</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {result.suggestedAction === 'CREATE_DEMAND' ? (
              <TouchableOpacity
                style={s.createDemandBtn}
                onPress={() => router.push('/group-buying/demand' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={s.createDemandBtnText}>Create Community Demand for "{queryInput}"</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  heroBanner: { backgroundColor: '#FAF5FF', borderRadius: RADIUS.xl, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E9D5FF' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#581C87' },
  heroSub: { fontSize: 13, color: '#7E22CE', textAlign: 'center', lineHeight: 18 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#DDD6FE', ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  searchBtn: { backgroundColor: '#7C3AED', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  suggestionsWrap: { gap: 8, marginTop: 4 },
  suggLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  suggPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  suggText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  resultCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 12, borderWidth: 1, borderColor: '#DDD6FE', ...SHADOWS.md },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  resultTitle: { fontSize: 15, fontWeight: '800', color: '#6B21A8' },
  explanation: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  matchesSection: { gap: 8, marginTop: 4 },
  matchesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  matchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12 },
  dealTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dealMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  createDemandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: RADIUS.md, paddingVertical: 14, marginTop: 6 },
  createDemandBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
