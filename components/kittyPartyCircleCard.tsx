import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { KittyPartyCircleSummary } from '@/types/kittyPartyTypes';

interface Props {
  circle: KittyPartyCircleSummary;
  onPress: () => void;
}

export const KittyPartyCircleCard: React.FC<Props> = ({ circle, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{circle.categoryCode}</Text>
        </View>
        <Text style={styles.privacyText}>{circle.privacyType.replace('_', ' ')}</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {circle.circleName}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {circle.description || 'Active social and kitty circle in your community.'}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.membersCount}>
          👥 {circle.currentMembersCount} / {circle.maxMembers || '∞'} members
        </Text>
        <Text style={styles.actionText}>View Circle →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DB2777',
    textTransform: 'uppercase',
  },
  privacyText: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  membersCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DB2777',
  },
});
