import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DocumentCategory } from '@/services/documentService';

interface Props {
  category: DocumentCategory;
  size?: 'sm' | 'md';
  style?: object;
}

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; text: string }> = {
  RENTAL_AGREEMENT:          { bg: '#F3E8FF', text: '#7C3AED' },
  DOCTOR_DOCUMENT:           { bg: '#CCFBF1', text: '#0F766E' },
  VENDOR_KYC:                { bg: '#FFEDD5', text: '#C2410C' },
  SPORTS_WAIVER:             { bg: '#DBEAFE', text: '#1D4ED8' },
  INSURANCE_DOCUMENT:        { bg: '#E0E7FF', text: '#4338CA' },
  INVOICE:                   { bg: '#DCFCE7', text: '#15803D' },
  EVENT_SPONSORSHIP_CONTRACT:{ bg: '#FCE7F3', text: '#BE185D' },
  GOVERNANCE_RECORD:         { bg: '#F1F5F9', text: '#475569' },
  OTHER:                     { bg: '#F3F4F6', text: '#6B7280' },
};

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  RENTAL_AGREEMENT:           'Rental Agreement',
  DOCTOR_DOCUMENT:            'Doctor Document',
  VENDOR_KYC:                 'Vendor KYC',
  SPORTS_WAIVER:              'Sports Waiver',
  INSURANCE_DOCUMENT:         'Insurance',
  INVOICE:                    'Invoice',
  EVENT_SPONSORSHIP_CONTRACT: 'Sponsorship Contract',
  GOVERNANCE_RECORD:          'Governance Record',
  OTHER:                      'Other',
};

export function DocumentCategoryBadge({ category, size = 'sm', style }: Props) {
  const cfg = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
  const label = CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
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
        {label}
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

export default DocumentCategoryBadge;
