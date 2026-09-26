import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  BackHandler, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { NoticeDto } from '@/services/noticeService';

const SAMPLE_NOTICES: NoticeDto[] = [
  {
    id: 'n-1',
    title: 'Water Supply Maintenance Shutdown Notice',
    content: 'Routine overhead tank cleaning and chlorination scheduled on Sunday 10:00 AM - 2:00 PM. Please store adequate water beforehand.',
    category: 'MAINTENANCE',
    publishedAt: '2026-09-25T08:30:00Z',
    publisherName: 'Estate Management Office',
    isPinned: true,
  },
  {
    id: 'n-2',
    title: 'Annual General Meeting (AGM) 2026 Announcement',
    content: 'The Annual General Body Meeting will be convened in the Main Clubhouse Banquet Hall on October 12, 2026 at 5:00 PM.',
    category: 'GENERAL',
    publishedAt: '2026-09-24T14:00:00Z',
    publisherName: 'RWA Secretary',
    isPinned: true,
  },
  {
    id: 'n-3',
    title: 'Updated Visitor Security & Gate Pass Protocols',
    content: 'All delivery partners and domestic staff must use the digital QR badge for entry past 8:00 PM.',
    category: 'SECURITY',
    publishedAt: '2026-09-22T10:15:00Z',
    publisherName: 'Chief Security Marshal',
    isPinned: false,
  },
];

export default function NoticesScreen() {
  const router = useRouter();
  const [notices] = useState<NoticeDto[]>(SAMPLE_NOTICES);
  const [filter, setFilter] = useState<string>('ALL');

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
      return () => sub.remove();
    }, [goBack])
  );

  const filtered = filter === 'ALL' ? notices : notices.filter((n) => n.category === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notice Board</Text>
          <Text style={styles.headerSub}>{"Official circulars & announcements"}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, item.isPinned && styles.pinnedCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: item.category === 'MAINTENANCE' ? '#FEF3C7' : '#EDE9FE' }]}>
                <Text style={[styles.categoryText, { color: item.category === 'MAINTENANCE' ? '#D97706' : '#7C3AED' }]}>
                  {item.category}
                </Text>
              </View>
              {item.isPinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={12} color="#DC2626" />
                  <Text style={styles.pinnedText}>PINNED</Text>
                </View>
              )}
            </View>

            <Text style={styles.noticeTitle}>{item.title}</Text>
            <Text style={styles.noticeContent}>{item.content}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.publisherText}>By {item.publisherName}</Text>
              <Text style={styles.dateText}>
                {new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  list: { padding: SPACING.md, gap: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 8,
  },
  pinnedCard: {
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  categoryText: { fontSize: 10, fontWeight: '800' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pinnedText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  noticeContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  publisherText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  dateText: { fontSize: 11, color: COLORS.textMuted },
});
