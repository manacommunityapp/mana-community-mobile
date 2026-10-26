import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS } from '@/constants/config';

interface FinanceProduct {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  limit: string;
  tenure: string;
  rate: string;
  badge?: string;
  badgeColor?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  ctaLabel: string;
}

const FINANCE_PRODUCTS: FinanceProduct[] = [
  {
    id: 'invoice-finance',
    title: 'Invoice Financing',
    subtitle: 'Finance your Purchase Orders',
    description: 'Get working capital against your confirmed purchase orders. Pay suppliers on time and extend your credit period.',
    features: [
      'Up to 90% of PO value upfront',
      'Same-day disbursal on verified POs',
      'No collateral required',
      'Repay after goods delivery',
    ],
    limit: '₹5L – ₹50L',
    tenure: '30 – 90 days',
    rate: '1.5% / month',
    badge: 'Popular',
    badgeColor: '#2563EB',
    icon: 'receipt-outline',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    ctaLabel: 'Apply Now',
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain Finance',
    subtitle: 'Dynamic discounting for early payment',
    description: 'Pay your suppliers early and earn dynamic discounts, or extend your payment cycle with supply chain credit.',
    features: [
      'Pay suppliers early at a discount',
      'Extend payment to 60–90 days',
      'Improve supplier relationships',
      'Better credit terms from vendors',
    ],
    limit: '₹10L – ₹2Cr',
    tenure: '60 – 180 days',
    rate: '14–18% p.a.',
    icon: 'git-network-outline',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    ctaLabel: 'Explore',
  },
  {
    id: 'working-capital',
    title: 'Working Capital Loan',
    subtitle: 'Short-term credit for procurement cycles',
    description: 'Revolving credit line for recurring procurement needs. Draw down when needed, repay when cash flows in.',
    features: [
      'Revolving credit line — use & repay',
      'Ideal for monthly procurement cycles',
      'No prepayment penalty',
      'Based on your community financials',
    ],
    limit: '₹2L – ₹25L',
    tenure: '12 months',
    rate: '15–20% p.a.',
    icon: 'wallet-outline',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    ctaLabel: 'Check Eligibility',
  },
  {
    id: 'gst-loan',
    title: 'GST-Backed Instant Credit',
    subtitle: 'Use your GST history for instant credit',
    description: 'Your association\'s GST payment records unlock instant pre-approved credit limits — no lengthy documentation.',
    features: [
      'Pre-approved based on GST returns',
      'Instant approval in minutes',
      'Minimal documentation',
      'Perfect for verified associations',
    ],
    limit: '₹1L – ₹20L',
    tenure: '3 – 12 months',
    rate: '16–22% p.a.',
    badge: 'Instant',
    badgeColor: '#059669',
    icon: 'document-text-outline',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    ctaLabel: 'Apply Instantly',
  },
];

const PARTNERS = [
  { name: 'KredX',        tag: 'Invoice Finance',  color: '#1E40AF', bg: '#DBEAFE' },
  { name: 'Indifi',       tag: 'Working Capital',  color: '#065F46', bg: '#D1FAE5' },
  { name: 'M1xchange',    tag: 'TReDS Platform',   color: '#581C87', bg: '#EDE9FE' },
  { name: 'Vayana SCF',   tag: 'Supply Chain',     color: '#7C2D12', bg: '#FEF3C7' },
];

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n}`;
}

function handleApply(product: FinanceProduct) {
  Alert.alert(
    product.title,
    `We'll connect you with our lending partners for ${product.title}.\n\nA Mana representative will call you within 1 business day to guide you through the application.`,
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Request Callback', style: 'default' },
    ],
  );
}

export default function ProcurementFinance() {
  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#1E3A5F', '#2563EB', '#0EA5E9']} style={s.header}>
        <View style={s.headerIcon}>
          <Ionicons name="business" size={28} color="#fff" />
        </View>
        <Text style={s.headerTitle}>MSME Finance Connect</Text>
        <Text style={s.headerSub}>Unlock working capital for your procurement needs</Text>
      </LinearGradient>

      {/* Why it matters */}
      <View style={s.whyCard}>
        <Text style={s.whyTitle}>💡 Bridge your procurement cash gap</Text>
        <Text style={s.whyText}>
          Association procurement often strains monthly budgets. Finance solutions let you
          procure at the right time, pay suppliers on time, and manage cash flow smoothly —
          without dipping into maintenance fund reserves.
        </Text>
      </View>

      {/* Finance products */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Finance Products</Text>
        {FINANCE_PRODUCTS.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>

      {/* Lending partners */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Our Lending Partners</Text>
        <Text style={s.sectionSub}>Trusted financial institutions with MSME-focused products</Text>
        <View style={s.partnersGrid}>
          {PARTNERS.map(partner => (
            <View key={partner.name} style={[s.partnerChip, { backgroundColor: partner.bg }]}>
              <Text style={[s.partnerName, { color: partner.color }]}>{partner.name}</Text>
              <Text style={[s.partnerTag, { color: partner.color + '99' }]}>{partner.tag}</Text>
            </View>
          ))}
        </View>
        <Text style={s.partnerDisclosure}>
          * Mana is a referral platform. Loan approval, interest rates and terms are at the
          discretion of lending partners. Interest rates shown are indicative.
        </Text>
      </View>

      {/* How it works */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>How It Works</Text>
        <View style={s.howCard}>
          {[
            { step: '1', title: 'Request Callback', desc: 'Tap "Apply" on any product and we schedule a call' },
            { step: '2', title: 'Document Verification', desc: 'Share your association registration and GST details' },
            { step: '3', title: 'Instant Approval', desc: 'Get a credit decision within 24–48 hours' },
            { step: '4', title: 'Funds Disbursed', desc: 'Amount credited to your association account' },
          ].map((h, i) => (
            <View key={i} style={[s.howRow, i > 0 && s.howRowBorder]}>
              <View style={s.howStep}>
                <Text style={s.howStepText}>{h.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howTitle}>{h.title}</Text>
                <Text style={s.howDesc}>{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Eligibility */}
      <View style={s.eligCard}>
        <Text style={s.eligTitle}>✅ Eligibility Checklist</Text>
        {[
          'Registered Housing Society or Association',
          'Active GST Number',
          'At least 6 months of procurement history',
          '50+ units / active residents',
          'No major defaults on existing loans',
        ].map((item, i) => (
          <View key={i} style={s.eligRow}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={s.eligText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ProductCard({ product }: { product: FinanceProduct }) {
  return (
    <View style={s.productCard}>
      {product.badge && (
        <View style={[s.productBadge, { backgroundColor: product.badgeColor + '18' }]}>
          <Text style={[s.productBadgeText, { color: product.badgeColor }]}>{product.badge}</Text>
        </View>
      )}
      <View style={s.productHeader}>
        <View style={[s.productIcon, { backgroundColor: product.iconBg }]}>
          <Ionicons name={product.icon as any} size={22} color={product.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.productTitle}>{product.title}</Text>
          <Text style={s.productSubtitle}>{product.subtitle}</Text>
        </View>
      </View>

      <Text style={s.productDesc}>{product.description}</Text>

      <View style={s.productMeta}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Limit</Text>
          <Text style={s.metaValue}>{product.limit}</Text>
        </View>
        <View style={s.metaDivider} />
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Tenure</Text>
          <Text style={s.metaValue}>{product.tenure}</Text>
        </View>
        <View style={s.metaDivider} />
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>Rate</Text>
          <Text style={s.metaValue}>{product.rate}</Text>
        </View>
      </View>

      <View style={s.featureList}>
        {product.features.map((f, i) => (
          <View key={i} style={s.featureRow}>
            <Text style={s.featureDot}>✓</Text>
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.ctaBtn} onPress={() => handleApply(product)}>
        <Text style={s.ctaBtnText}>{product.ctaLabel}</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 24, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center' },
  headerIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  headerSub: { fontSize: 13, color: '#BAE6FD', textAlign: 'center', marginTop: 4 },
  whyCard: {
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14,
    margin: 16, borderWidth: 1, borderColor: '#BFDBFE',
  },
  whyTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginBottom: 6 },
  whyText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  productCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, ...SHADOWS.md ?? SHADOWS.sm,
    position: 'relative', overflow: 'hidden',
  },
  productBadge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  productBadgeText: { fontSize: 11, fontWeight: '700' },
  productHeader: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'center' },
  productIcon: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  productTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  productSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  productDesc: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 12 },
  productMeta: {
    flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10,
    marginBottom: 10,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  metaDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  featureList: { gap: 4, marginBottom: 12 },
  featureRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  featureDot: { fontSize: 12, color: '#059669', fontWeight: '700', marginTop: 1 },
  featureText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2563EB', borderRadius: 10, padding: 12,
  },
  ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  partnersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  partnerChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: '45%' },
  partnerName: { fontSize: 14, fontWeight: '700' },
  partnerTag: { fontSize: 11, marginTop: 2 },
  partnerDisclosure: { fontSize: 10, color: '#9CA3AF', lineHeight: 15, marginTop: 4 },
  howCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, ...SHADOWS.sm },
  howRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  howRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  howStep: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
  },
  howStepText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  howTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  howDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  eligCard: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#BBF7D0',
  },
  eligTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 10 },
  eligRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  eligText: { fontSize: 13, color: '#166534' },
});
