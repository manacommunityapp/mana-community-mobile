import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status: string;
  workflowId?: string;
  size?: 'sm' | 'md';
  style?: object;
}

interface BadgeConfig {
  bg: string;
  text: string;
}

const GREEN_STATUSES = new Set([
  'COMPLETED', 'DELIVERED', 'RESOLVED', 'CLOSED', 'PAID', 'REFUNDED',
]);
const BLUE_STATUSES = new Set([
  'IN_PROGRESS', 'PROCESSING', 'OUT_FOR_DELIVERY', 'ACCEPTED',
]);
const YELLOW_STATUSES = new Set([
  'PENDING', 'DRAFT', 'CREATED', 'OPEN', 'PENDING_REVIEW', 'READY',
]);
const RED_STATUSES = new Set([
  'CANCELLED', 'DISPUTED', 'REOPENED', 'FAILED', 'REJECTED',
]);

function getBadgeConfig(status: string): BadgeConfig {
  if (GREEN_STATUSES.has(status)) return { bg: '#DCFCE7', text: '#16A34A' };
  if (BLUE_STATUSES.has(status)) return { bg: '#DBEAFE', text: '#2563EB' };
  if (YELLOW_STATUSES.has(status)) return { bg: '#FEF3C7', text: '#B45309' };
  if (RED_STATUSES.has(status)) return { bg: '#FEE2E2', text: '#DC2626' };
  return { bg: '#F3F4F6', text: '#6B7280' };
}

function toTitleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WorkflowStatusBadge({ status, size = 'sm', style }: Props) {
  const cfg = getBadgeConfig(status);
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg, paddingHorizontal: isSmall ? 8 : 10, paddingVertical: isSmall ? 2 : 4 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: cfg.text, fontSize: isSmall ? 11 : 13 }]}>
        {toTitleCase(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});

export default WorkflowStatusBadge;
