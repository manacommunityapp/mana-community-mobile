import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { ActivityItem } from '@/services/activityService';

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {};
function getStatusStyle(status: string) {
  const s = status?.toUpperCase() ?? '';
  if (['PAID', 'CONFIRMED', 'APPROVED', 'DELIVERED', 'COMPLETED', 'RESOLVED', 'ACTIVE', 'REGISTERED'].includes(s))
    return { text: '#059669', bg: '#D1FAE5' };
  if (['PENDING', 'OPEN', 'PLACED', 'WAITLISTED', 'PREPARING', 'UPCOMING', 'EXPECTED'].includes(s))
    return { text: '#D97706', bg: '#FEF3C7' };
  if (['CANCELLED', 'CLOSED', 'REJECTED', 'FAILED'].includes(s))
    return { text: '#DC2626', bg: '#FEE2E2' };
  if (['IN_PROGRESS', 'OUT_FOR_DELIVERY', 'ASSIGNED'].includes(s))
    return { text: '#2563EB', bg: '#DBEAFE' };
  return { text: '#64748B', bg: '#F1F5F9' };
}

interface Props {
  item: ActivityItem;
  onPress?: (item: ActivityItem) => void;
}

export function ActivityCard({ item, onPress }: Props) {
  const ss = getStatusStyle(item.status);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon as any} size={20} color={item.color} />
      </View>
      <View style={styles.info}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.amount != null && <Text style={styles.amount}>{item.amount}</Text>}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
        <View style={styles.rowBottom}>
          <Text style={styles.time}>
            {new Date(item.timestamp).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
          <View style={[styles.pill, { backgroundColor: ss.bg }]}>
            <Text style={[styles.pillText, { color: ss.text }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  info: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  amount: { fontSize: 13, fontWeight: '800', color: '#059669' },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  time: { fontSize: 11, color: COLORS.textMuted },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
});
