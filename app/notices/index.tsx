import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  BackHandler, RefreshControl, TextInput, Modal, ScrollView,
  ActivityIndicator, Share, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, SPACING, FONTS } from '@/constants/config';
import { noticeService, NoticeDto, NoticeCategory } from '@/services/noticeService';

interface CategoryConfig {
  key: NoticeCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'ALL',         label: 'All Circulars', icon: 'newspaper-outline',          color: '#4F46E5', bg: '#EEF2FF' },
  { key: 'MAINTENANCE', label: 'Maintenance',   icon: 'construct-outline',          color: '#D97706', bg: '#FEF3C7' },
  { key: 'GENERAL',     label: 'General',       icon: 'information-circle-outline', color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'SECURITY',    label: 'Security',      icon: 'shield-checkmark-outline',   color: '#059669', bg: '#D1FAE5' },
  { key: 'EVENT',       label: 'Events',        icon: 'calendar-outline',           color: '#2563EB', bg: '#DBEAFE' },
  { key: 'URGENT',      label: 'Urgent',        icon: 'alert-circle-outline',       color: '#DC2626', bg: '#FEE2E2' },
];

export default function NoticesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDto | null>(null);

  const {
    data: notices = [],
    isLoading,
    refetch,
  } = useQuery<NoticeDto[]>({
    queryKey: ['notices', filter],
    queryFn: () => noticeService.getNotices(filter),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const filteredNotices = useMemo(() => {
    let list = notices;
    if (filter !== 'ALL') {
      list = list.filter((n) => n.category.toUpperCase() === filter.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.publisherName.toLowerCase().includes(q)
      );
    }
    // Sort pinned notices on top
    return [...list].sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1;
    });
  }, [notices, filter, searchQuery]);

  const handleShareNotice = async (notice: NoticeDto) => {
    try {
      await Share.share({
        title: notice.title,
        message: `📢 *${notice.title}*\n\n${notice.content}\n\n— Published by ${notice.publisherName} (Mana Community)`,
      });
    } catch {
      // Ignored
    }
  };

  const getCategoryTheme = (category: string) => {
    const found = CATEGORIES.find((c) => c.key.toUpperCase() === category.toUpperCase());
    return found || { color: '#4F46E5', bg: '#EEF2FF', icon: 'information-circle-outline' as const };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notice Board</Text>
          <Text style={styles.headerSub}>Official circulars & announcements</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search circulars, announcements..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Chips Filter Carousel ── */}
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((c) => {
            const active = filter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.categoryChip,
                  active && { backgroundColor: c.color, borderColor: c.color },
                ]}
                onPress={() => setFilter(c.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={c.icon}
                  size={14}
                  color={active ? '#fff' : c.color}
                />
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Notices FlatList ── */}
      <FlatList
        data={filteredNotices}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item }) => {
          const theme = getCategoryTheme(item.category);
          return (
            <TouchableOpacity
              style={[styles.card, item.isPinned && styles.pinnedCard]}
              activeOpacity={0.88}
              onPress={() => setSelectedNotice(item)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: theme.bg }]}>
                  <Ionicons name={theme.icon} size={11} color={theme.color} style={{ marginRight: 3 }} />
                  <Text style={[styles.categoryText, { color: theme.color }]}>
                    {item.category}
                  </Text>
                </View>

                <View style={styles.badgesRight}>
                  {item.priority === 'URGENT' && (
                    <View style={styles.urgentBadge}>
                      <Ionicons name="warning" size={11} color="#DC2626" />
                      <Text style={styles.urgentText}>URGENT</Text>
                    </View>
                  )}
                  {item.isPinned && (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={11} color="#DC2626" />
                      <Text style={styles.pinnedText}>PINNED</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.noticeTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.noticeContent} numberOfLines={3}>
                {item.content}
              </Text>

              <View style={styles.footerRow}>
                <View style={styles.publisherWrap}>
                  <Ionicons name="person-circle-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.publisherText} numberOfLines={1}>
                    {item.publisherName}
                  </Text>
                </View>

                <View style={styles.footerRight}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                  <Text style={styles.dateText}>
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={COLORS.textMuted} style={{ marginLeft: 2 }} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.emptyTitle}>Loading circulars...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notices found</Text>
              <Text style={styles.emptySub}>
                {searchQuery.trim()
                  ? 'No circulars match your search keywords.'
                  : 'There are no announcements in this category right now.'}
              </Text>
            </View>
          )
        }
      />

      {/* ── Notice Detail Modal ── */}
      <Modal visible={!!selectedNotice} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCategoryRow}>
                {selectedNotice && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryTheme(selectedNotice.category).bg },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryTheme(selectedNotice.category).icon}
                      size={12}
                      color={getCategoryTheme(selectedNotice.category).color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: getCategoryTheme(selectedNotice.category).color },
                      ]}
                    >
                      {selectedNotice.category}
                    </Text>
                  </View>
                )}
                {selectedNotice?.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={11} color="#DC2626" />
                    <Text style={styles.pinnedText}>PINNED NOTICE</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setSelectedNotice(null)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {selectedNotice?.priority === 'URGENT' && (
                <View style={styles.urgentBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.urgentBannerText}>
                    High Priority Action Required: Please review details carefully.
                  </Text>
                </View>
              )}

              <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>

              <View style={styles.modalMetaCard}>
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>PUBLISHED BY</Text>
                  <Text style={styles.modalMetaVal}>{selectedNotice?.publisherName}</Text>
                </View>
                <View style={styles.modalMetaDivider} />
                <View style={styles.modalMetaItem}>
                  <Text style={styles.modalMetaLabel}>DATE</Text>
                  <Text style={styles.modalMetaVal}>
                    {selectedNotice &&
                      new Date(selectedNotice.publishedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalBodyContent}>{selectedNotice?.content}</Text>

              {selectedNotice?.attachmentUrl && (
                <TouchableOpacity
                  style={styles.attachmentBtn}
                  onPress={() => Linking.openURL(selectedNotice.attachmentUrl!)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-attach-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.attachmentText}>View Official PDF Attachment</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => selectedNotice && handleShareNotice(selectedNotice)}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                <Text style={styles.shareBtnText}>Share Notice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => setSelectedNotice(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.dismissBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ── Search Bar ──
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F9FAFB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // ── Category Chips Filter ──
  categorySection: {
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── Notice Cards ──
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 8,
  },
  pinnedCard: {
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFDFD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  urgentText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pinnedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  noticeTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 21,
  },
  noticeContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    paddingTop: 8,
    marginTop: 2,
  },
  publisherWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  publisherText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Notice Detail Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgentBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 24,
  },
  modalMetaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalMetaItem: {
    flex: 1,
  },
  modalMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  modalMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  modalMetaDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  modalBodyContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  attachmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    backgroundColor: COLORS.primaryLight,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dismissBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
