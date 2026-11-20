import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DocumentStatus } from '@/services/documentService';

interface Props {
  status: DocumentStatus;
  expiryWarning?: boolean;
  size?: 'sm' | 'md';
  style?: object;
}

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
}

function getConfig(status: DocumentStatus, expiryWarning: boolean): BadgeConfig {
  if (status === 'ACTIVE' && expiryWarning) {
    return { bg: '#FEF3C7', text: '#B45309', label: 'Expiring Soon' };
  }
  switch (status) {
    case 'PENDING_SCAN': return { bg: '#F3F4F6', text: '#6B7280', label: 'Scanning...' };
    case 'ACTIVE':       return { bg: '#DCFCE7', text: '#16A34A', label: 'Active' };
    case 'EXPIRED':      return { bg: '#FEE2E2', text: '#DC2626', label: 'Expired' };
    case 'ARCHIVED':     return { bg: '#FFEDD5', text: '#C2410C', label: 'Archived' };
    case 'DELETED':      return { bg: '#FEE2E2', text: '#DC2626', label: 'Deleted' };
    default:             return { bg: '#F3F4F6', text: '#6B7280', label: status };
  }
}

export function DocumentStatusBadge({ status, expiryWarning = false, size = 'sm', style }: Props) {
  const cfg = getConfig(status, expiryWarning);
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: cfg.text, fontSize: isSmall ? 10 : 12 }]}>
        {cfg.label}
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

export default DocumentStatusBadge;
