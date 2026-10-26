import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { insuranceService } from '@/services/insuranceService';
import { CATEGORIES, renewalBucket, maskPolicyNumber, categoryLabel } from '@/constants/insurance';
import { FONTS, COLORS, SHADOWS } from '@/constants/config';
import type { PolicyView, InsuranceCategory, PolicyCreateInput } from '@/types/insurance';

const CATEGORY_COLORS: Record<string, { bg: string; color: string; badge?: string }> = {
  HEALTH:            { bg: '#EFF6FF', color: '#1D4ED8', badge: '10% Group Off' },
  FAMILY_FLOATER:    { bg: '#FDF4FF', color: '#A21CAF', badge: 'Popular' },
  PARENTS:           { bg: '#FEF2F2', color: '#DC2626', badge: 'Senior Care' },
  LIFE_TERM:         { bg: '#EEF2FF', color: '#4F46E5', badge: '1 Cr Cover' },
  MOTOR_CAR:         { bg: '#FFFBEB', color: '#B45309', badge: 'Zero Dep' },
  MOTOR_TWO_WHEELER: { bg: '#F0FDF4', color: '#15803D', badge: 'Instant' },
  HOME:              { bg: '#ECFDF5', color: '#047857', badge: 'Bylaw Recommended' },
  TRAVEL:            { bg: '#F0FDFA', color: '#0F766E', badge: 'Global' },
  PERSONAL_ACCIDENT: { bg: '#F8FAFC', color: '#475569', badge: 'Staff Cover' },
};

type BucketKey = 'OVERDUE' | 'DUE_30' | 'DUE_60' | 'LATER' | 'UNKNOWN';
const BUCKET_STYLE: Record<BucketKey, { bg: string; text: string; label: string }> = {
  OVERDUE: { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' },
  DUE_30:  { bg: '#FEF3C7', text: '#D97706', label: 'Due in 30d' },
  DUE_60:  { bg: '#FEF9C3', text: '#CA8A04', label: 'Due in 60d' },
  LATER:   { bg: '#DCFCE7', text: '#059669', label: 'Active' },
  UNKNOWN: { bg: '#F1F5F9', text: '#64748B', label: 'Unknown' },
};

interface CashlessHospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  tpaPhone: string;
  emergencyPhone: string;
  rating: string;
  insurers: string[];
}

const NEARBY_HOSPITALS: CashlessHospital[] = [
  {
    id: 'h1',
    name: 'Manipal Hospital',
    address: 'HAL Old Airport Rd, Kodihalli',
    distance: '2.4 km (8 mins)',
    tpaPhone: '080-2502-4444',
    emergencyPhone: '080-2502-3333',
    rating: '4.8 ★',
    insurers: ['HDFC ERGO', 'Star Health', 'ICICI Lombard', 'Care'],
  },
  {
    id: 'h2',
    name: 'Apollo Hospital & Cradle',
    address: 'Sarjapur Main Road, Bellandur',
    distance: '3.6 km (11 mins)',
    tpaPhone: '080-2630-4050',
    emergencyPhone: '1066',
    rating: '4.7 ★',
    insurers: ['HDFC ERGO', 'Tata AIG', 'Star Health'],
  },
  {
    id: 'h3',
    name: 'Sakra World Hospital',
    address: 'Marathahalli - Sarjapur Outer Ring Rd',
    distance: '4.2 km (14 mins)',
    tpaPhone: '080-4969-4969',
    emergencyPhone: '080-4969-4000',
    rating: '4.9 ★',
    insurers: ['HDFC ERGO', 'ICICI Lombard', 'Star Health', 'Max Bupa'],
  },
];

export default function InsuranceIndexScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'explore' | 'vault'>('explore');
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyView | null>(null);
  const [showHealthCardModal, setShowHealthCardModal] = useState(false);
  const [showHospitalsModal, setShowHospitalsModal] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState<string>('ALL');

  // Add Policy Form State
  const [newInsurerName, setNewInsurerName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newCategory, setNewCategory] = useState<InsuranceCategory>('HEALTH');
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [newSumInsured, setNewSumInsured] = useState('');
  const [newNominee, setNewNominee] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('2026-12-31');
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const policiesQ = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: insuranceService.policies,
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => insuranceService.deletePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-policies'] });
      setSelectedPolicy(null);
      Alert.alert('Policy Removed', 'The policy record has been removed from your Mana Vault.');
    },
  });

  const addMut = useMutation({
    mutationFn: (input: PolicyCreateInput) => insuranceService.createPolicy(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurance-policies'] });
      setShowAddPolicyModal(false);
      setNewInsurerName('');
      setNewProductName('');
      setNewPolicyNumber('');
      setNewSumInsured('');
      setNewNominee('');
      setFormErr({});
      Alert.alert('Policy Added', 'Your policy has been tracked in the Mana Vault.');
    },
  });

  const policies = policiesQ.data || [];
  const totalCoverSum = policies.reduce((acc, p) => acc + (p.sumInsured || 0), 0);

  // Filtered policies for the vault
  const filteredVaultPolicies = useMemo(() => {
    if (vaultCategoryFilter === 'ALL') return policies;
    return policies.filter(p => p.category === vaultCategoryFilter);
  }, [policies, vaultCategoryFilter]);

  function handleCreatePolicy() {
    const errs: Record<string, string> = {};
    if (!newInsurerName.trim()) errs.insurerName = 'Insurer name required';
    if (!newProductName.trim()) errs.productName = 'Product name required';
    setFormErr(errs);
    if (Object.keys(errs).length) return;

    addMut.mutate({
      insurerName: newInsurerName.trim(),
      productName: newProductName.trim(),
      category: newCategory,
      policyNumber: newPolicyNumber.trim() || undefined,
      sumInsured: newSumInsured ? Number(newSumInsured) : undefined,
      nomineeName: newNominee.trim() || undefined,
      expiryDate: newExpiryDate,
    });
  }

  function confirmDelete(id: number) {
    Alert.alert(
      'Remove from Vault?',
      'This removes the policy record from your Mana Vault. Your actual insurance policy with the insurer remains untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMut.mutate(id) },
      ]
    );
  }

  return (
    <View style={s.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/services')}
          style={s.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Insurance Hub</Text>
          <Text style={s.topNavSubtitle}>Society Group Shield · Personal Vault</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowEmergencyModal(true)}
          style={s.emergencyHelpBtn}
          accessibilityLabel="Emergency Cashless Help"
        >
          <Ionicons name="medical" size={16} color="#DC2626" />
          <Text style={s.emergencyHelpText}>Emergency</Text>
        </TouchableOpacity>
      </View>

      {/* ── Segmented Top Switcher ────────────────────────────── */}
      <View style={s.tabSwitcherContainer}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'explore' && s.tabBtnActive]}
          onPress={() => setActiveTab('explore')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="shield-half"
            size={16}
            color={activeTab === 'explore' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabBtnText, activeTab === 'explore' && s.tabBtnTextActive]}>
            Explore & Group Deals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'vault' && s.tabBtnActive]}
          onPress={() => setActiveTab('vault')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="file-tray-full"
            size={16}
            color={activeTab === 'vault' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabBtnText, activeTab === 'vault' && s.tabBtnTextActive]}>
            My Policies Vault ({policies.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 1: EXPLORE & GROUP DEALS                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'explore' && (
          <>
            {/* ── Society Group Shield Hero Banner ──────────────────── */}
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroCard}
            >
              <View style={s.heroLeft}>
                <View style={s.heroBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#FEF08A" />
                  <Text style={s.heroBadgeText}>MANA RESIDENTS COLLECTIVE BARGAINING</Text>
                </View>
                <Text style={s.heroHeading}>Save up to 35% with Society Group Deals</Text>
                <Text style={s.heroSub}>
                  Pre-negotiated group health, vehicle & flat content protection with HDFC ERGO, Tata AIG & Star Health.
                </Text>

                <TouchableOpacity
                  style={s.heroCtaBtn}
                  onPress={() => router.push('/insurance/catalogue/HEALTH' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={s.heroCtaText}>Browse Group Plans</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={s.heroIconCircle}>
                <MaterialCommunityIcons name="shield-sun" size={38} color="#FFFFFF" />
              </View>
            </LinearGradient>

            {/* ── Flat Protection & Coverage Scorecard ───────────────── */}
            <View style={s.auditCard}>
              <View style={s.auditTop}>
                <View>
                  <Text style={s.auditTitle}>Flat B-402 Protection Audit</Text>
                  <Text style={s.auditSubtitle}>Comprehensive Family & Asset Readiness</Text>
                </View>
                <View style={s.scoreCircle}>
                  <Text style={s.scoreNumber}>75%</Text>
                  <Text style={s.scoreLabel}>COVERED</Text>
                </View>
              </View>

              <View style={s.auditPillsGrid}>
                <View style={[s.auditPill, s.auditPillActive]}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={s.auditPillText}>Health: ₹10L Cover</Text>
                </View>
                <View style={[s.auditPill, s.auditPillActive]}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={s.auditPillText}>Motor: Active Car</Text>
                </View>
                <View style={[s.auditPill, s.auditPillWarning]}>
                  <Ionicons name="alert-circle" size={14} color="#D97706" />
                  <Text style={s.auditPillText}>Home Fire: Self-Declared</Text>
                </View>
                <View style={[s.auditPill, s.auditPillMissing]}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={s.auditPillText}>Term Life: Missing</Text>
                </View>
              </View>
            </View>

            {/* ── Emergency Hospital & Cashless Finder Row ───────────── */}
            <View style={s.quickEmergencyRow}>
              <TouchableOpacity
                style={s.emergencyBannerHalf}
                onPress={() => setShowEmergencyModal(true)}
                activeOpacity={0.88}
              >
                <View style={s.emergencyIconBox}>
                  <Ionicons name="heart-dislike-outline" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.emergencyTitle}>Cashless Admission</Text>
                  <Text style={s.emergencySubCompact}>24x7 Protocol</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.hospitalsBannerHalf}
                onPress={() => setShowHospitalsModal(true)}
                activeOpacity={0.88}
              >
                <View style={s.hospitalIconBox}>
                  <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.hospitalTitle}>Nearby Hospitals</Text>
                  <Text style={s.hospitalSubCompact}>3 within 5km</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── My Tracked Policies Preview in Hub ────────────────── */}
            <View style={s.sectionHeaderRow}>
              <View>
                <Text style={s.sectionTitle}>My Policies Snapshot</Text>
                <Text style={s.sectionSubtitle}>Tap any card to view full policy details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab('vault')}
                style={s.viewVaultPill}
              >
                <Text style={s.viewVaultText}>Open Vault ({policies.length}) →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {policies.slice(0, 3).map((policy) => {
                const bucket = renewalBucket(policy) as BucketKey;
                const bs = BUCKET_STYLE[bucket];
                return (
                  <TouchableOpacity
                    key={policy.id}
                    style={s.policyCard}
                    onPress={() => setSelectedPolicy(policy)}
                    activeOpacity={0.8}
                  >
                    <View style={s.policyTopRow}>
                      <View style={s.policyLogoBox}>
                        <Ionicons
                          name={
                            policy.category.includes('MOTOR') ? 'car' :
                            policy.category === 'HOME' ? 'home' : 'medkit'
                          }
                          size={18}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.policyName} numberOfLines={1}>{policy.productName}</Text>
                        <Text style={s.policyInsurer}>{policy.insurerName}</Text>
                      </View>
                      <View style={[s.bucketChip, { backgroundColor: bs.bg }]}>
                        <Text style={[s.bucketText, { color: bs.text }]}>{bs.label}</Text>
                      </View>
                    </View>

                    <View style={s.policyDetailsDivider} />

                    <View style={s.policyBottomRow}>
                      <View>
                        <Text style={s.metaLabel}>Policy Number</Text>
                        <Text style={s.metaValue}>{maskPolicyNumber(policy.maskedPolicyNumber)}</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={s.metaLabel}>Tap to Inspect</Text>
                        <Text style={s.inspectLinkText}>Full Details ➔</Text>
                      </View>
                      {policy.sumInsured && (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.metaLabel}>Sum Insured</Text>
                          <Text style={[s.metaValue, { color: COLORS.primary }]}>
                            ₹{(policy.sumInsured / 100000).toFixed(0)} Lakhs
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Browse Categories Grid ─────────────────────────────── */}
            <View style={s.sectionHeaderRow}>
              <View>
                <Text style={s.sectionTitle}>Browse Group & Individual Plans</Text>
                <Text style={s.sectionSubtitle}>Verified IRDAI products with Mana discounts</Text>
              </View>
            </View>

            <View style={s.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_COLORS[cat.key] || { bg: '#F8FAFC', color: COLORS.text, badge: undefined };
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[s.categoryCard, { backgroundColor: cfg.bg }]}
                    onPress={() => router.push(`/insurance/catalogue/${cat.key}` as any)}
                    activeOpacity={0.8}
                  >
                    {cfg.badge && (
                      <View style={s.categoryBadge}>
                        <Text style={s.categoryBadgeText}>{cfg.badge}</Text>
                      </View>
                    )}
                    <View style={s.categoryIconBox}>
                      <Ionicons name={cat.icon as any} size={24} color={cfg.color} />
                    </View>
                    <Text style={[s.categoryLabel, { color: cfg.color }]} numberOfLines={2}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Society RWA Master Policies Strip ──────────────────── */}
            <View style={s.societyMasterCard}>
              <View style={s.societyMasterHeader}>
                <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                <Text style={s.societyMasterTitle}>Society RWA Master Policies (B-Block)</Text>
              </View>
              <Text style={s.societyMasterDesc}>
                Mana Community Association holds communal coverage protecting shared infrastructure and staff:
              </Text>

              <View style={s.societyPillarList}>
                <View style={s.societyPillarRow}>
                  <Ionicons name="shield-checkmark" size={15} color="#059669" />
                  <Text style={s.societyPillarText}>
                    <Text style={{ fontFamily: FONTS.bold }}>Building Structure & Fire:</Text> ₹45 Cr insured with ICICI Lombard
                  </Text>
                </View>
                <View style={s.societyPillarRow}>
                  <Ionicons name="shield-checkmark" size={15} color="#059669" />
                  <Text style={s.societyPillarText}>
                    <Text style={{ fontFamily: FONTS.bold }}>Lifts & Transformers:</Text> Third-party liability cleared till 2027
                  </Text>
                </View>
                <View style={s.societyPillarRow}>
                  <Ionicons name="shield-checkmark" size={15} color="#059669" />
                  <Text style={s.societyPillarText}>
                    <Text style={{ fontFamily: FONTS.bold }}>Guards & Housekeeping:</Text> Group accidental cover for 48 staff
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Support & Tools Strip ───────────────────────────────── */}
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Claims & Management Tools</Text>
            </View>

            <View style={s.toolsRow}>
              {[
                { icon: 'document-text-outline', label: 'Claims\nAssistance', route: '/insurance/claims', color: '#059669', bg: '#ECFDF5' },
                { icon: 'git-compare-outline', label: 'Compare\nProducts', route: '/insurance/compare', color: '#4F46E5', bg: '#EEF2FF' },
                { icon: 'people-outline', label: 'Society Group\nEnquiry', route: '/insurance/group-enquiry', color: '#D97706', bg: '#FEF3C7' },
                { icon: 'lock-closed-outline', label: 'Privacy &\nConsents', route: '/insurance/consents', color: '#7C3AED', bg: '#F5F3FF' },
              ].map((tool) => (
                <TouchableOpacity
                  key={tool.route}
                  style={s.toolCard}
                  onPress={() => router.push(tool.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[s.toolIconBox, { backgroundColor: tool.bg }]}>
                    <Ionicons name={tool.icon as any} size={20} color={tool.color} />
                  </View>
                  <Text style={s.toolLabel}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 2: MY POLICIES VAULT (WITH CATEGORY FILTERS & CARDS) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'vault' && (
          <View style={{ gap: 14 }}>
            {/* Vault Overview Card */}
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.vaultOverviewCard}
            >
              <View style={s.vaultOverviewTop}>
                <View>
                  <Text style={s.vaultOverviewLabel}>TOTAL ACTIVE COVER</Text>
                  <Text style={s.vaultOverviewAmount}>
                    ₹{(totalCoverSum / 100000).toFixed(0)} Lakhs
                  </Text>
                </View>
                <View style={s.vaultShieldBox}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#38BDF8" />
                </View>
              </View>

              <View style={s.vaultStatsRow}>
                <View style={s.vaultStatItem}>
                  <Text style={s.vaultStatNum}>{policies.length}</Text>
                  <Text style={s.vaultStatLabel}>Policies Tracked</Text>
                </View>
                <View style={s.vaultStatDivider} />
                <View style={s.vaultStatItem}>
                  <Text style={s.vaultStatNum}>
                    {policies.filter(p => renewalBucket(p) === 'LATER').length}
                  </Text>
                  <Text style={s.vaultStatLabel}>Active & Valid</Text>
                </View>
                <View style={s.vaultStatDivider} />
                <View style={s.vaultStatItem}>
                  <Text style={[s.vaultStatNum, { color: '#FCD34D' }]}>
                    {policies.filter(p => renewalBucket(p) === 'DUE_30' || renewalBucket(p) === 'OVERDUE').length}
                  </Text>
                  <Text style={s.vaultStatLabel}>Due for Renewal</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Category Filter Carousel in Vault */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.vaultCategoryScroll}>
              {[
                { key: 'ALL', label: `All (${policies.length})` },
                { key: 'HEALTH', label: '🏥 Health' },
                { key: 'MOTOR_CAR', label: '🚗 Car' },
                { key: 'HOME', label: '🏠 Home' },
                { key: 'LIFE_TERM', label: '🛡️ Term Life' },
              ].map(f => {
                const isActive = vaultCategoryFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.vaultFilterChip, isActive && s.vaultFilterChipActive]}
                    onPress={() => setVaultCategoryFilter(f.key)}
                  >
                    <Text style={[s.vaultFilterChipText, isActive && s.vaultFilterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Action Bar */}
            <View style={s.vaultActionRow}>
              <View>
                <Text style={s.sectionTitle}>Policies in Vault ({filteredVaultPolicies.length})</Text>
                <Text style={s.sectionSubtitle}>Tap any card to inspect or view Digital Health Card</Text>
              </View>
              <TouchableOpacity
                style={s.addPolicyHeaderBtn}
                onPress={() => setShowAddPolicyModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={s.addPolicyHeaderBtnText}>Track Policy</Text>
              </TouchableOpacity>
            </View>

            {/* Detailed Policies List */}
            {filteredVaultPolicies.map((p) => {
              const bucket = renewalBucket(p) as BucketKey;
              const bs = BUCKET_STYLE[bucket];
              const isDueSoon = bucket === 'DUE_30' || bucket === 'OVERDUE';

              return (
                <View key={p.id} style={s.vaultDetailedCard}>
                  <View style={s.vaultCardHeader}>
                    <View style={s.vaultIconCircle}>
                      <Ionicons
                        name={
                          p.category.includes('MOTOR') ? 'car' :
                          p.category === 'HOME' ? 'home' : 'medkit'
                        }
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.vaultProductName}>{p.productName}</Text>
                      <Text style={s.vaultInsurerName}>{p.insurerName} · {categoryLabel(p.category)}</Text>
                    </View>
                    <View style={[s.bucketChip, { backgroundColor: bs.bg }]}>
                      <Text style={[s.bucketText, { color: bs.text }]}>{bs.label}</Text>
                    </View>
                  </View>

                  <View style={s.vaultSpecsBox}>
                    <View style={s.vaultSpecItem}>
                      <Text style={s.vaultSpecLabel}>Sum Insured</Text>
                      <Text style={s.vaultSpecValue}>
                        {p.sumInsured ? `₹${(p.sumInsured / 100000).toFixed(0)} Lakhs` : '—'}
                      </Text>
                    </View>
                    <View style={s.vaultSpecDivider} />
                    <View style={s.vaultSpecItem}>
                      <Text style={s.vaultSpecLabel}>Annual Premium</Text>
                      <Text style={s.vaultSpecValue}>
                        {p.premiumAmount ? `₹${p.premiumAmount.toLocaleString('en-IN')}` : '—'}
                      </Text>
                    </View>
                    <View style={s.vaultSpecDivider} />
                    <View style={s.vaultSpecItem}>
                      <Text style={s.vaultSpecLabel}>Nominee</Text>
                      <Text style={s.vaultSpecValue} numberOfLines={1}>{p.nomineeName || 'Self'}</Text>
                    </View>
                  </View>

                  {/* Actions Bar */}
                  <View style={s.vaultCardActionsRow}>
                    <TouchableOpacity
                      style={s.inspectDetailsBtn}
                      onPress={() => setSelectedPolicy(p)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
                      <Text style={s.inspectDetailsBtnText}>Inspect Details</Text>
                    </TouchableOpacity>

                    {p.category === 'HEALTH' && (
                      <TouchableOpacity
                        style={s.eCardActionBtn}
                        onPress={() => {
                          setSelectedPolicy(p);
                          setShowHealthCardModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="card-account-details-outline" size={15} color="#4F46E5" />
                        <Text style={s.eCardActionBtnText}>E-Card</Text>
                      </TouchableOpacity>
                    )}

                    {isDueSoon ? (
                      <TouchableOpacity
                        style={s.renewActionBtn}
                        onPress={() => Alert.alert('Renewal Portal', `Connecting to ${p.insurerName} instant renewal portal.`)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh" size={14} color="#FFFFFF" />
                        <Text style={s.renewActionBtnText}>Renew Now</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={s.claimAssistanceBtn}
                        onPress={() => router.push('/insurance/claims' as any)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={15} color="#059669" />
                        <Text style={s.claimAssistanceBtnText}>Claim</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Regulatory IRDAI Disclosure Footer ─────────────────── */}
        <View style={s.disclosureCard}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.disclosureText}>
            Mana Community is a digital platform helping residents discover and track insurance. Insurance policies are underwritten, issued, and serviced solely by IRDAI-registered insurance companies. Premiums and claim decisions are determined exclusively by the respective insurer.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Interactive Policy Details Bottom Sheet ───────────── */}
      <Modal
        visible={selectedPolicy !== null && !showHealthCardModal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPolicy(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.policyDetailsSheet}>
            <View style={s.sheetHandle} />

            {selectedPolicy && (
              <>
                <View style={s.sheetHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetProductTitle}>{selectedPolicy.productName}</Text>
                    <Text style={s.sheetInsurerSub}>{selectedPolicy.insurerName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedPolicy(null)}
                    style={s.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Status Notice */}
                <View style={[
                  s.statusBannerPill,
                  selectedPolicy.coverageConfirmedByInsurer ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FEF3C7' }
                ]}>
                  <Ionicons
                    name={selectedPolicy.coverageConfirmedByInsurer ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={selectedPolicy.coverageConfirmedByInsurer ? '#059669' : '#D97706'}
                  />
                  <Text style={[
                    s.statusBannerText,
                    selectedPolicy.coverageConfirmedByInsurer ? { color: '#065F46' } : { color: '#92400E' }
                  ]}>
                    {selectedPolicy.coverageConfirmedByInsurer
                      ? 'Partner-Verified & Active Coverage'
                      : 'Self-Declared Policy (Stored in Vault)'}
                  </Text>
                </View>

                {/* Key Policy Metrics Box */}
                <View style={s.detailsMetricsCard}>
                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Policy Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.detailsValueBold}>
                        {maskPolicyNumber(selectedPolicy.maskedPolicyNumber)}
                      </Text>
                      <TouchableOpacity onPress={() => Alert.alert('Copied', 'Policy number copied')}>
                        <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Category</Text>
                    <Text style={s.detailsValue}>{categoryLabel(selectedPolicy.category)}</Text>
                  </View>

                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Sum Insured</Text>
                    <Text style={[s.detailsValueBold, { color: COLORS.primary, fontSize: 15 }]}>
                      {selectedPolicy.sumInsured ? `₹${selectedPolicy.sumInsured.toLocaleString('en-IN')}` : '—'}
                    </Text>
                  </View>

                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Annual Premium</Text>
                    <Text style={s.detailsValue}>
                      {selectedPolicy.premiumAmount ? `₹${selectedPolicy.premiumAmount.toLocaleString('en-IN')} (${selectedPolicy.premiumFrequency || 'Annual'})` : '—'}
                    </Text>
                  </View>

                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Nominee</Text>
                    <Text style={s.detailsValue}>{selectedPolicy.nomineeName || 'Not Specified'}</Text>
                  </View>

                  <View style={s.detailsRow}>
                    <Text style={s.detailsLabel}>Expiry Date</Text>
                    <Text style={[s.detailsValue, { color: '#D97706', fontFamily: FONTS.bold }]}>
                      {selectedPolicy.expiryDate || 'Active'}
                    </Text>
                  </View>

                  {selectedPolicy.insurerContact && (
                    <View style={s.detailsRow}>
                      <Text style={s.detailsLabel}>24x7 Insurer Helpline</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${selectedPolicy.insurerContact}`)}
                      >
                        <Text style={[s.detailsValue, { color: COLORS.primary, fontFamily: FONTS.bold, textDecorationLine: 'underline' }]}>
                          {selectedPolicy.insurerContact}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={s.sheetActionButtons}>
                  {selectedPolicy.category === 'HEALTH' && (
                    <TouchableOpacity
                      style={s.sheetHealthCardBtn}
                      onPress={() => setShowHealthCardModal(true)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="card-account-details-star" size={17} color="#FFFFFF" />
                      <Text style={s.sheetHealthCardBtnText}>View Digital TPA Health Card</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={s.sheetCallTpaBtn}
                    onPress={() => Linking.openURL(`tel:${selectedPolicy.insurerContact || '18002666400'}`)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={s.sheetCallTpaText}>Call Insurer TPA Desk</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={s.sheetClaimBtn}
                      onPress={() => {
                        setSelectedPolicy(null);
                        router.push('/insurance/claims' as any);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                      <Text style={s.sheetClaimText}>Intimate Claim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.sheetDeleteBtn}
                      onPress={() => confirmDelete(selectedPolicy.id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={s.sheetDeleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Digital TPA Health Card Modal (Option A) ───────────── */}
      <Modal
        visible={showHealthCardModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHealthCardModal(false)}
      >
        <View style={s.eCardModalOverlay}>
          <View style={s.eCardModalBox}>
            <View style={s.eCardModalTop}>
              <Text style={s.eCardModalTitle}>Digital TPA Health Card</Text>
              <TouchableOpacity onPress={() => setShowHealthCardModal(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Credit-card style E-Card */}
            <LinearGradient
              colors={['#1E1B4B', '#312E81', '#4338CA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.digitalCard}
            >
              <View style={s.cardTopRow}>
                <View>
                  <Text style={s.cardOrgTag}>MANA RESIDENTS HEALTH SHIELD</Text>
                  <Text style={s.cardInsurerName}>{selectedPolicy?.insurerName || 'HDFC ERGO Health'}</Text>
                </View>
                <View style={s.cardChipIcon}>
                  <MaterialCommunityIcons name="integrated-circuit-chip" size={28} color="#FEF08A" />
                </View>
              </View>

              <View style={s.cardNumberRow}>
                <Text style={s.cardNumberText}>
                  {maskPolicyNumber(selectedPolicy?.maskedPolicyNumber || '2801489201')}
                </Text>
              </View>

              <View style={s.cardBottomRow}>
                <View>
                  <Text style={s.cardMetaLabel}>PRIMARY INSURED</Text>
                  <Text style={s.cardMetaValue}>ROHAN SHARMA (FLAT B-402)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.cardMetaLabel}>SUM INSURED</Text>
                  <Text style={s.cardMetaValueGold}>
                    ₹{((selectedPolicy?.sumInsured || 1000000) / 100000).toFixed(0)} LAKHS
                  </Text>
                </View>
              </View>

              <View style={s.cardTpaFooter}>
                <Text style={s.cardTpaFooterText}>
                  TPA Desk: 1800-2666-400 · Show at hospital reception
                </Text>
              </View>
            </LinearGradient>

            <View style={s.eCardInstructionBox}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={s.eCardInstructionText}>
                Empaneled cashless hospitals scan this digital card for immediate pre-authorization.
              </Text>
            </View>

            <TouchableOpacity
              style={s.shareCardBtn}
              onPress={() => Alert.alert('Saved', 'Digital Health Card saved to device offline storage.')}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={17} color="#FFFFFF" />
              <Text style={s.shareCardBtnText}>Save Card Offline / Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Nearby Cashless Network Hospitals Modal (Option B) ─── */}
      <Modal
        visible={showHospitalsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHospitalsModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.hospitalsSheet}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeaderRow}>
              <View>
                <Text style={s.sheetProductTitle}>Nearby Cashless Hospitals</Text>
                <Text style={s.sheetInsurerSub}>Within 5km radius of Mana Community</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHospitalsModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {NEARBY_HOSPITALS.map((hosp) => (
                <View key={hosp.id} style={s.hospitalListItem}>
                  <View style={s.hospTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.hospName}>{hosp.name}</Text>
                      <Text style={s.hospAddress}>{hosp.address} · {hosp.distance}</Text>
                    </View>
                    <View style={s.hospRatingTag}>
                      <Text style={s.hospRatingText}>{hosp.rating}</Text>
                    </View>
                  </View>

                  <View style={s.hospInsurersRow}>
                    <Text style={s.hospInsurersLabel}>Cashless with:</Text>
                    {hosp.insurers.map((ins) => (
                      <View key={ins} style={s.hospInsurerPill}>
                        <Text style={s.hospInsurerText}>{ins}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.hospActionsRow}>
                    <TouchableOpacity
                      style={s.hospCallBtn}
                      onPress={() => Linking.openURL(`tel:${hosp.tpaPhone}`)}
                    >
                      <Ionicons name="call" size={13} color={COLORS.primary} />
                      <Text style={s.hospCallText}>Call TPA Desk ({hosp.tpaPhone})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.hospDirectionsBtn}
                      onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(hosp.name + ' Bangalore')}`)}
                    >
                      <Ionicons name="navigate" size={13} color="#059669" />
                      <Text style={s.hospDirectionsText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Policy Bottom Sheet Modal ──────────────────────── */}
      <Modal
        visible={showAddPolicyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddPolicyModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.addModalContainer}>
            <View style={s.sheetHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Track a Policy in Vault</Text>
                <Text style={s.modalSubtitle}>Receive renewal reminders & instant claim routing</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddPolicyModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.addModalForm} showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Insurer Name *</Text>
              <TextInput
                style={s.formInput}
                value={newInsurerName}
                onChangeText={setNewInsurerName}
                placeholder="e.g. HDFC ERGO, Star Health, ICICI Lombard"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.fieldLabel}>Plan / Product Name *</Text>
              <TextInput
                style={s.formInput}
                value={newProductName}
                onChangeText={setNewProductName}
                placeholder="e.g. Optima Secure, Zero Dep Comprehensive"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.fieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 4 }}>
                {CATEGORIES.map((c) => {
                  const isSelected = newCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[s.catChip, isSelected && s.catChipActive]}
                      onPress={() => setNewCategory(c.key)}
                    >
                      <Text style={[s.catChipText, isSelected && s.catChipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={s.fieldLabel}>Policy Number (Optional)</Text>
              <TextInput
                style={s.formInput}
                value={newPolicyNumber}
                onChangeText={setNewPolicyNumber}
                placeholder="e.g. 2801489201"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.fieldLabel}>Sum Insured (₹)</Text>
              <TextInput
                style={s.formInput}
                value={newSumInsured}
                onChangeText={setNewSumInsured}
                placeholder="e.g. 1000000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={s.fieldLabel}>Nominee Name</Text>
              <TextInput
                style={s.formInput}
                value={newNominee}
                onChangeText={setNewNominee}
                placeholder="e.g. Priya Sharma (Spouse)"
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity
                style={[s.submitBtn, addMut.isPending && { opacity: 0.7 }]}
                onPress={handleCreatePolicy}
                disabled={addMut.isPending}
                activeOpacity={0.88}
              >
                {addMut.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>Save Policy to Vault</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Emergency Cashless Hospitalization Modal ────────────── */}
      <Modal
        visible={showEmergencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.emergencyModalContent}>
            <View style={s.sheetHandle} />

            <View style={s.emergencyModalHeader}>
              <View style={s.emergencyHeaderIcon}>
                <Ionicons name="medical" size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.emergencyModalTitle}>Emergency Cashless Desk</Text>
                <Text style={s.emergencyModalSubtitle}>24x7 Hospitalization Pre-Auth Support</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEmergencyModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={s.emergencySteps}>
              <Text style={s.stepsHeading}>3 Steps for Cashless Admission:</Text>

              <View style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>1</Text></View>
                <Text style={s.stepDesc}>
                  Show your Health Card & Govt ID (Aadhaar/PAN) at the hospital TPA insurance desk.
                </Text>
              </View>
              <View style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
                <Text style={s.stepDesc}>
                  Hospital sends Pre-Authorization form to your TPA insurer within 4-6 hours.
                </Text>
              </View>
              <View style={s.stepRow}>
                <View style={s.stepNum}><Text style={s.stepNumText}>3</Text></View>
                <Text style={s.stepDesc}>
                  TPA grants Initial Cashless Approval. You only pay for non-medical consumables upon discharge.
                </Text>
              </View>
            </View>

            <View style={s.nearbyNotice}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={s.nearbyText}>
                3 Network Cashless Hospitals within 5km of your society (Manipal, Apollo, Sakra).
              </Text>
            </View>

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={s.dialHelplineBtn}
                onPress={() => Linking.openURL('tel:18002666400')}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={s.dialHelplineText}>Call 24x7 TPA Helpline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.intimateClaimBtn}
                onPress={() => {
                  setShowEmergencyModal(false);
                  router.push('/insurance/claims' as any);
                }}
                activeOpacity={0.85}
              >
                <Text style={s.intimateClaimText}>Open Claims Case</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  topNavTitleBox: {
    flex: 1,
  },
  topNavTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  topNavSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  emergencyHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyHelpText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#DC2626',
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundAlt,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroHeading: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 16,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  heroCtaText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 12,
  },
  auditTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  auditTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  auditSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  scoreCircle: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  scoreNumber: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#059669',
  },
  scoreLabel: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#059669',
  },
  auditPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  auditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  auditPillActive: {
    backgroundColor: '#ECFDF5',
  },
  auditPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  auditPillMissing: {
    backgroundColor: '#FEE2E2',
  },
  auditPillText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  quickEmergencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emergencyBannerHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  hospitalsBannerHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
  },
  emergencyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: '#991B1B',
  },
  emergencySubCompact: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#B91C1C',
    marginTop: 1,
  },
  hospitalTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: COLORS.primary,
  },
  hospitalSubCompact: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.primaryDark,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  viewVaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  viewVaultText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 10,
  },
  policyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  policyLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  policyInsurer: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  bucketChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bucketText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  policyDetailsDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  policyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 1,
  },
  inspectLinkText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginTop: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '31%',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    position: 'relative',
  },
  categoryBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  categoryIconBox: {
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    lineHeight: 14,
  },
  societyMasterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 10,
  },
  societyMasterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  societyMasterTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  societyMasterDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  societyPillarList: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  societyPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  societyPillarText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 6,
  },
  toolIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  vaultOverviewCard: {
    borderRadius: 18,
    padding: 18,
    gap: 16,
    ...SHADOWS.card,
  },
  vaultOverviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaultOverviewLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  vaultOverviewAmount: {
    fontSize: 26,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  vaultShieldBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  vaultStatItem: {
    alignItems: 'center',
  },
  vaultStatNum: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
  },
  vaultStatLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  vaultStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  vaultCategoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  vaultFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  vaultFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  vaultFilterChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  vaultFilterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  vaultActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addPolicyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  addPolicyHeaderBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  vaultDetailedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 12,
  },
  vaultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vaultIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultProductName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  vaultInsurerName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  vaultSpecsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 10,
    paddingVertical: 8,
  },
  vaultSpecItem: {
    alignItems: 'center',
  },
  vaultSpecLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  vaultSpecValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 2,
  },
  vaultSpecDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.borderLight,
  },
  vaultCardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inspectDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inspectDetailsBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  eCardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  eCardActionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#4F46E5',
  },
  renewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renewActionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  claimAssistanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimAssistanceBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#059669',
  },
  disclosureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  disclosureText: {
    flex: 1,
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  policyDetailsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sheetProductTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  sheetInsurerSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBannerText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  detailsMetricsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailsLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  detailsValue: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  detailsValueBold: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  sheetActionButtons: {
    gap: 8,
    marginTop: 4,
  },
  sheetHealthCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 13,
  },
  sheetHealthCardBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  sheetCallTpaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  sheetCallTpaText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  sheetClaimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 11,
  },
  sheetClaimText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  sheetDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sheetDeleteText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#DC2626',
  },
  eCardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  eCardModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    gap: 14,
    ...SHADOWS.card,
  },
  eCardModalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eCardModalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  digitalCard: {
    borderRadius: 16,
    padding: 18,
    gap: 14,
    ...SHADOWS.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardOrgTag: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  cardInsurerName: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberRow: {
    marginVertical: 4,
  },
  cardNumberText: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    letterSpacing: 2.5,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardMetaLabel: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  cardMetaValue: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardMetaValueGold: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: '#FDE047',
    marginTop: 2,
  },
  cardTpaFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 8,
  },
  cardTpaFooterText: {
    fontSize: 9,
    fontFamily: FONTS.regular,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  eCardInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
  },
  eCardInstructionText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#065F46',
    lineHeight: 15,
  },
  shareCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  shareCardBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  hospitalsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    gap: 12,
  },
  hospitalListItem: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 10,
    gap: 8,
  },
  hospTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  hospName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  hospAddress: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  hospRatingTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hospRatingText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#B45309',
  },
  hospInsurersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  hospInsurersLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  hospInsurerPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hospInsurerText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  hospActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  hospCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hospCallText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  hospDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hospDirectionsText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#059669',
  },
  addModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addModalForm: {
    paddingTop: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  catChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  catChipTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  emergencyModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    gap: 14,
  },
  emergencyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emergencyHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyModalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#991B1B',
  },
  emergencyModalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  emergencySteps: {
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEF08A',
    gap: 10,
  },
  stepsHeading: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#854D0E',
  },
  stepDesc: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  nearbyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 10,
  },
  nearbyText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  modalButtons: {
    gap: 8,
    marginTop: 4,
  },
  dialHelplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
  },
  dialHelplineText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  intimateClaimBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundAlt,
  },
  intimateClaimText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
});