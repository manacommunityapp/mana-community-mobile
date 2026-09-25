import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';

interface Recommendation {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  matchScore: number;
  tags: string[];
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-1',
    type: 'Doctor / Pediatrician',
    title: 'Dr. Anita Nair',
    subtitle: 'Tower A, Flat 304',
    description: 'Senior Consultant Pediatrician. Open for weekend society emergency guidance.',
    matchScore: 96,
    tags: ['Medical', 'Child Care', 'Weekends'],
  },
  {
    id: 'rec-2',
    type: 'Sports Partner',
    title: 'Badminton Doubles Match',
    subtitle: 'Court A &bull; Saturday 7:00 AM',
    description: 'Looking for 2 intermediate players for 21-point weekend doubles set.',
    matchScore: 92,
    tags: ['Badminton', 'Intermediate', 'Morning'],
  },
  {
    id: 'rec-3',
    type: 'Home Chef',
    title: 'Rashmi South Kitchen',
    subtitle: 'Tower B, Flat 202',
    description: 'Authentic Mangalore style Ghee Roast & soft Idlis made fresh to order.',
    matchScore: 88,
    tags: ['Breakfast', 'Home Food', 'Pre-order'],
  },
  {
    id: 'rec-4',
    type: 'Finance Advisor',
    title: 'Raj Mehta (SEBI Reg)',
    subtitle: 'Tower C, Flat 102',
    description: 'Retirement & tax optimization consults for community residents.',
    matchScore: 84,
    tags: ['Tax', 'Wealth', 'Free 30m'],
  },
];

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'for-you' | 'directory'>('for-you');
  const [connected, setConnected] = useState<string[]>([]);

  const handleConnect = (id: string, name: string) => {
    if (connected.includes(id)) return;
    setConnected([...connected, id]);
    Alert.alert('🤝 Connection Sent', `You connected with ${name}!`);
  };

  const filteredRecs = RECOMMENDATIONS.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q));
  });

  return (
    <View style={styles.container}>
      {/* ── Search Bar ── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills, sports buddies, mentors..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Intro Card ── */}
        <View style={styles.introCard}>
          <Ionicons name="sparkles" size={24} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Community Discovery Graph</Text>
            <Text style={styles.introText}>
              Discover neighbours based on shared hobbies, professions, sports teams, and carpool routes.
            </Text>
          </View>
        </View>

        {/* ── Matches ── */}
        <Text style={styles.sectionTitle}>High Affinity Matches For You</Text>
        <View style={{ gap: SPACING.md }}>
          {filteredRecs.map((rec) => {
            const isConn = connected.includes(rec.id);
            return (
              <View key={rec.id} style={styles.recCard}>
                <View style={styles.recHeader}>
                  <Text style={styles.recType}>{rec.type}</Text>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{rec.matchScore}% MATCH</Text>
                  </View>
                </View>

                <Text style={styles.recTitle}>{rec.title}</Text>
                <Text style={styles.recSubtitle}>{rec.subtitle}</Text>
                <Text style={styles.recDesc}>{rec.description}</Text>

                <View style={styles.tagRow}>
                  {rec.tags.map((t, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.connectBtn, isConn && styles.connectedBtn]}
                  onPress={() => handleConnect(rec.id, rec.title)}
                  disabled={isConn}
                >
                  <Ionicons
                    name={isConn ? 'checkmark-circle' : 'person-add-outline'}
                    size={16}
                    color={isConn ? '#059669' : '#FFFFFF'}
                  />
                  <Text style={[styles.connectBtnText, isConn && styles.connectedBtnText]}>
                    {isConn ? 'Connected' : 'Connect & Chat'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  introTitle: { fontSize: 14, fontWeight: '800', color: '#6D28D9' },
  introText: { fontSize: 12, color: '#5B21B6', marginTop: 2, lineHeight: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  recCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recType: { fontSize: 11, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase' },
  scoreBadge: { backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  scoreText: { fontSize: 10, fontWeight: '800', color: '#6D28D9' },
  recTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  recSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  recDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: SPACING.md },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  tagText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  connectBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  connectedBtn: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#10B981' },
  connectedBtnText: { color: '#059669', fontSize: 13, fontWeight: '700' },
});
