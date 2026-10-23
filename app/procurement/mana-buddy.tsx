import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { BuddyRFQDraft, ProcurementCategory } from '@/types/procurement';

const SUGGESTIONS = [
  'We need 50 bags of cement and 20 kg of white paint for lobby renovation next month',
  'Monthly cleaning: 10 litres floor cleaner, 5 kg phenyl, 20 mops for the society',
  'Quarterly pest control service for all 120 flats and common areas',
  'Replace 30 corridor LED bulbs and fix 5 electrical sockets in Block B',
  'Annual security camera maintenance and battery replacement for all 16 cameras',
];

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍽️',
  MAINTENANCE: '🔨', PACKAGING: '📦', OTHER: '🏷️',
};

export default function ManaBuddy() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<BuddyRFQDraft | null>(null);

  const parseMutation = useMutation({
    mutationFn: () => procurementHubService.parseBuddyRFQ(text.trim()),
    onSuccess: (d) => {
      setDraft(d);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    },
    onError: () => Alert.alert('Error', 'Could not parse the request. Please try rephrasing.'),
  });

  function handleCreate() {
    if (!draft) return;
    const firstItem = draft.items[0];
    router.push({
      pathname: '/procurement/rfq/new' as any,
      params: {
        prefillTitle: draft.title,
        prefillItem: firstItem?.productName,
        prefillCategory: firstItem?.category,
        prefillUnit: firstItem?.unit,
        prefillQty: String(firstItem?.quantity ?? 1),
        prefillDelivery: draft.deliveryDeadline,
        prefillQuotation: draft.quotationDeadline,
        prefillLocation: draft.deliveryLocation,
        prefillBudget: draft.estimatedValue ? String(draft.estimatedValue) : '',
        prefillNotes: draft.notes ?? '',
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.root}>
        {/* Header */}
        <LinearGradient colors={['#312E81', '#4F46E5']} style={s.header}>
          <Text style={s.headerEmoji}>🤖</Text>
          <View>
            <Text style={s.headerTitle}>Mana Buddy</Text>
            <Text style={s.headerSub}>Describe what you need — I'll build the RFQ</Text>
          </View>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Suggestions */}
          {!draft && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Try saying…</Text>
              {SUGGESTIONS.map((sg, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.suggChip}
                  onPress={() => setText(sg)}
                >
                  <Text style={s.suggText} numberOfLines={2}>{sg}</Text>
                  <Ionicons name="arrow-up-outline" size={14} color="#6366F1" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* User message bubble */}
          {parseMutation.isPending || draft ? (
            <View style={s.msgRow}>
              <View style={s.userBubble}>
                <Text style={s.userBubbleText}>{text}</Text>
              </View>
            </View>
          ) : null}

          {/* Thinking indicator */}
          {parseMutation.isPending && (
            <View style={s.thinkingRow}>
              <View style={s.thinkingDot} />
              <View style={[s.thinkingDot, { opacity: 0.6 }]} />
              <View style={[s.thinkingDot, { opacity: 0.3 }]} />
              <Text style={s.thinkingText}>Structuring your RFQ…</Text>
            </View>
          )}

          {/* Draft result */}
          {draft && (
            <View style={s.draftCard}>
              <View style={s.draftHeader}>
                <Text style={s.draftEmoji}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.draftTitle}>{draft.title}</Text>
                  <Text style={s.draftSub}>{draft.items.length} item{draft.items.length !== 1 ? 's' : ''} · ready to create</Text>
                </View>
              </View>

              {/* Items */}
              <View style={s.itemsSection}>
                <Text style={s.itemsSectionTitle}>Items Detected</Text>
                {draft.items.map((it, i) => (
                  <View key={i} style={s.itemRow}>
                    <Text style={s.itemEmoji}>{CATEGORY_EMOJI[it.category] || '📋'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{it.productName}</Text>
                      <Text style={s.itemMeta}>
                        {it.quantity} {it.unit}
                        {it.targetPricePerUnit ? ` · ₹${it.targetPricePerUnit}/${it.unit}` : ''}
                        {it.specifications ? ` · ${it.specifications}` : ''}
                      </Text>
                    </View>
                    <View style={s.catBadge}>
                      <Text style={s.catBadgeText}>{it.category.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Logistics */}
              <View style={s.logisticsRow}>
                <LogItem icon="location-outline" val={draft.deliveryLocation} />
                <LogItem icon="calendar-outline"  val={`Quote by ${draft.quotationDeadline}`} />
                <LogItem icon="time-outline"       val={`Deliver by ${draft.deliveryDeadline}`} />
                {draft.estimatedValue ? (
                  <LogItem icon="cash-outline" val={`₹${draft.estimatedValue.toLocaleString('en-IN')}`} accent />
                ) : null}
              </View>

              {draft.notes ? (
                <Text style={s.draftNotes}>📝 {draft.notes}</Text>
              ) : null}

              <View style={s.draftActions}>
                <TouchableOpacity
                  style={s.retryBtn}
                  onPress={() => { setDraft(null); setText(''); }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#6366F1" />
                  <Text style={s.retryText}>Start Over</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={s.createBtnText}>Create RFQ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Input bar */}
        {!draft && (
          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              placeholder="What does your community need?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!text.trim() || parseMutation.isPending) && { opacity: 0.4 }]}
              onPress={() => parseMutation.mutate()}
              disabled={!text.trim() || parseMutation.isPending}
            >
              {parseMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function LogItem({ icon, val, accent }: { icon: string; val: string; accent?: boolean }) {
  return (
    <View style={s.logItem}>
      <Ionicons name={icon as any} size={12} color={accent ? '#6366F1' : '#94A3B8'} />
      <Text style={[s.logVal, accent && { color: '#6366F1', fontWeight: '800' }]}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { padding: 12, gap: 12 },
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: '#E8EAF6',
  },
  suggText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  msgRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: '#4F46E5', borderRadius: RADIUS.lg, padding: 12,
    maxWidth: '85%',
  },
  userBubbleText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  thinkingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 4, paddingVertical: 8,
  },
  thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
  thinkingText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },
  draftCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 12,
    borderWidth: 1.5, borderColor: '#A5B4FC', ...SHADOWS.sm,
  },
  draftHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  draftEmoji: { fontSize: 22 },
  draftTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  draftSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemsSection: { gap: 8 },
  itemsSectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 8,
  },
  itemEmoji: { fontSize: 16, width: 24 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  itemMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  catBadge: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeText: { fontSize: 9, fontWeight: '700', color: '#6D28D9' },
  logisticsRow: { gap: 6 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logVal: { fontSize: 12, color: '#64748B' },
  draftNotes: { fontSize: 12, color: '#475569', fontStyle: 'italic', lineHeight: 18 },
  draftActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#6366F1', borderRadius: RADIUS.md, height: 44,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  createBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4F46E5', borderRadius: RADIUS.md, height: 44,
  },
  createBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
    fontSize: 14, color: COLORS.text, backgroundColor: '#F8FAFC',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
  },
});
