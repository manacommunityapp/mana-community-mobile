import { View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { backgroundSync, ConflictRecord } from '@/services/backgroundSync';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

export default function ConflictsScreen() {
  const router = useRouter();
  const { conflicts } = useBackgroundSync();

  function handleDismiss(id: string) {
    Alert.alert(
      'Dismiss conflict',
      'The queued change will be discarded. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            backgroundSync.clearConflict(id);
          },
        },
      ]
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<ConflictRecord>) => {
    const timeAgo = (() => {
      try {
        return formatDistanceToNow(new Date(item.detectedAt), { addSuffix: true });
      } catch {
        return 'recently';
      }
    })();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>{item.method}</Text>
          </View>
          <Text style={styles.url} numberOfLines={2}>{item.url}</Text>
        </View>
        <Text style={styles.time}>Conflict detected {timeAgo}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => handleDismiss(item.requestId)}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissBtnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sync Conflicts</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Text style={styles.retryAll}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          The server rejected these queued changes because their data conflicts. Review each item and discard it if you no longer need it.
        </Text>
      </View>

      <FlatList
        data={conflicts}
        keyExtractor={(c) => c.requestId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No conflicts</Text>
          <Text style={styles.emptyText}>There are no conflicts waiting for review.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  retryAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  banner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  url: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontFamily: FONTS.medium,
    lineHeight: 17,
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  dismissBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    fontFamily: FONTS.bold,
  },
  empty: { alignItems: 'center', paddingTop: 56, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
