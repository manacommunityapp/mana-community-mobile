import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Animated,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, FONTS, COLORS } from '@/constants/config';
import {
  rechargeService,
  type MobileOperator,
  type RechargeType,
} from '@/services/rechargeService';

const CIRCLES = [
  'All India', 'Andhra Pradesh', 'Assam', 'Bihar & Jharkhand', 'Chennai', 'Delhi NCR',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Karnataka', 'Kerala',
  'Kolkata', 'Madhya Pradesh & CG', 'Maharashtra & Goa', 'Mumbai', 'North East',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'UP East', 'UP West',
  'West Bengal',
];

export interface SavedContact {
  id: string;
  name: string;
  relation: string;
  number: string;
  operatorId: string;
  circle: string;
  expiryDays: number; // e.g. 3 (days left), -1 (expired), 14 (safe)
  currentPlan: string;
  category: 'household' | 'staff' | 'community';
}

// Contacts and active plans must come from an authenticated API/native contacts
// provider. Keep this empty until that integration exists; never show demo
// household/staff numbers as if they belonged to the resident.
const COMMUNITY_CONTACTS: SavedContact[] = [];
/*
  {
    id: '1',
    name: 'Self',
    relation: 'Flat B-402 (My SIM)',
    number: '9845012345',
    operatorId: 'AIRTEL',
    circle: 'Karnataka',
    expiryDays: 3,
    currentPlan: '1.5 GB/day · Unlimited Local/STD',
    category: 'household',
  },
  {
    id: '2',
    name: 'Priya (Spouse)',
    relation: 'Flat B-402',
    number: '9820054321',
    operatorId: 'JIO',
    circle: 'Mumbai',
    expiryDays: 14,
    currentPlan: '2 GB/day · 5G Unlimited',
    category: 'household',
  },
  {
    id: '3',
    name: 'Mom',
    relation: 'Family',
    number: '9845098765',
    operatorId: 'AIRTEL',
    circle: 'Karnataka',
    expiryDays: 1,
    currentPlan: '1.5 GB/day · 28 Days',
    category: 'household',
  },
  {
    id: '4',
    name: 'Home Wi-Fi Dongle',
    relation: 'Study Room',
    number: '6360098765',
    operatorId: 'JIO',
    circle: 'Karnataka',
    expiryDays: -1,
    currentPlan: '30 GB Data Booster',
    category: 'household',
  },
  {
    id: '5',
    name: 'Shanti Devi',
    relation: 'House Maid (Insta-Help #104)',
    number: '9123456780',
    operatorId: 'VI',
    circle: 'Karnataka',
    expiryDays: 2,
    currentPlan: '1.5 GB/day · Unlimited Calls',
    category: 'staff',
  },
  {
    id: '6',
    name: 'Ramesh Kumar',
    relation: 'Family Driver',
    number: '9876543210',
    operatorId: 'AIRTEL',
    circle: 'Karnataka',
    expiryDays: 24,
    currentPlan: '2 GB/day · 84 Days',
    category: 'staff',
  },
  {
    id: '7',
    name: 'Lakshmi Bai',
    relation: 'Morning Cook',
    number: '9448012345',
    operatorId: 'BSNL',
    circle: 'Karnataka',
    expiryDays: 0,
    currentPlan: 'Unlimited Calling · 30 Days',
    category: 'staff',
  },
  {
    id: '8',
    name: 'Tower B Intercom Hub',
    relation: 'Society Gate Facility',
    number: '9800011122',
    operatorId: 'AIRTEL',
    circle: 'Karnataka',
    expiryDays: 45,
    currentPlan: 'IoT Device Pack',
    category: 'community',
  },
];
*/

const OPERATOR_META: Record<string, { tag: string; tagColor: string; bgTint: string }> = {
  JIO: { tag: 'True 5G', tagColor: '#0066CC', bgTint: '#EFF6FF' },
  AIRTEL: { tag: '5G Plus', tagColor: '#E40000', bgTint: '#FEF2F2' },
  VI: { tag: 'Night Data', tagColor: '#C026D3', bgTint: '#FDF4FF' },
  BSNL: { tag: 'Best Value', tagColor: '#0D9488', bgTint: '#F0FDFA' },
  MTNL: { tag: 'Metro Pack', tagColor: '#475569', bgTint: '#F8FAFC' },
};

export default function RechargeScreen() {
  const router = useRouter();
  const operators = rechargeService.getOperators();

  const [activeService, setActiveService] = useState<'mobile' | 'dth' | 'fastag' | 'bills'>('mobile');
  const [rechargeType, setRechargeType] = useState<RechargeType>('PREPAID');
  const [mobile, setMobile] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<MobileOperator | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator | null>(null);
  const [selectedCircle, setSelectedCircle] = useState('Karnataka');
  
  // Modals
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [circleSearchQuery, setCircleSearchQuery] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState<'all' | 'household' | 'staff' | 'community'>('all');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Animated operator detection fade
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Active matched contact
  const matchedContact = useMemo(() => {
    return COMMUNITY_CONTACTS.find(c => c.number === mobile.replace(/\D/g, '')) || null;
  }, [mobile]);

  // Initial detection
  useEffect(() => {
    if (mobile.length >= 2) {
      const op = rechargeService.detectOperator(mobile);
      setDetectedOperator(op);
      if (op && !selectedOperator) {
        setSelectedOperator(op);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      }
    } else {
      setDetectedOperator(null);
      if (!selectedOperator) {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      }
    }
  }, [mobile]);

  const filteredCircles = useMemo(() => {
    if (!circleSearchQuery.trim()) return CIRCLES;
    return CIRCLES.filter(c => c.toLowerCase().includes(circleSearchQuery.toLowerCase()));
  }, [circleSearchQuery]);

  const filteredContacts = useMemo(() => {
    let list = COMMUNITY_CONTACTS;
    if (contactCategoryFilter !== 'all') {
      list = list.filter(c => c.category === contactCategoryFilter);
    }
    if (contactSearchQuery.trim()) {
      const q = contactSearchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.number.includes(q) ||
        c.relation.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contactCategoryFilter, contactSearchQuery]);

  const canProceed = mobile.replace(/\D/g, '').length === 10 && selectedOperator !== null;

  const handleProceed = () => {
    if (!canProceed || !selectedOperator) return;
    router.push({
      pathname: '/recharge/plans',
      params: {
        mobile: mobile.replace(/\D/g, ''),
        operatorId: selectedOperator.id,
        operatorName: selectedOperator.name,
        operatorIcon: selectedOperator.icon,
        operatorColor: selectedOperator.logoColor,
        circle: selectedCircle,
        rechargeType,
      },
    });
  };

  const handleSelectContact = (item: SavedContact) => {
    setMobile(item.number);
    setSelectedCircle(item.circle);
    const op = operators.find(o => o.id === item.operatorId);
    if (op) {
      setSelectedOperator(op);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
    setShowContactPicker(false);
  };

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
          <Text style={s.topNavTitle}>Mobile Recharge</Text>
          <Text style={s.topNavSubtitle}>Live prepaid recharge plans · payment handoff</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowHelpModal(true)}
          style={s.helpBtn}
          accessibilityLabel="Recharge Help"
        >
          <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Visual Stepper ────────────────────────────────────── */}
      <View style={s.stepperRow}>
        <View style={s.stepItem}>
          <View style={[s.stepDot, s.stepDotActive]}>
            <Text style={s.stepDotNumberActive}>1</Text>
          </View>
          <Text style={[s.stepText, s.stepTextActive]}>Number</Text>
        </View>
        <View style={s.stepLine} />
        <View style={s.stepItem}>
          <View style={s.stepDot}>
            <Text style={s.stepDotNumber}>2</Text>
          </View>
          <Text style={s.stepText}>Select Plan</Text>
        </View>
        <View style={s.stepLine} />
        <View style={s.stepItem}>
          <View style={s.stepDot}>
            <Text style={s.stepDotNumber}>3</Text>
          </View>
          <Text style={s.stepText}>1-Tap Pay</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Active Plan Expiry Countdown Card ─────────────────── */}
        {matchedContact && (
          <View style={s.activeExpiryCard}>
            <View style={s.activeExpiryTop}>
              <View style={s.activeExpiryInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.activeExpiryName}>{matchedContact.name}</Text>
                  <View style={[
                    s.expiryBadge,
                    matchedContact.expiryDays < 0 ? s.expiryBadgeExpired :
                    matchedContact.expiryDays <= 3 ? s.expiryBadgeSoon : s.expiryBadgeSafe
                  ]}>
                    <Ionicons
                      name={matchedContact.expiryDays < 0 ? 'alert-circle' : 'time-outline'}
                      size={11}
                      color={
                        matchedContact.expiryDays < 0 ? '#DC2626' :
                        matchedContact.expiryDays <= 3 ? '#D97706' : '#059669'
                      }
                    />
                    <Text style={[
                      s.expiryBadgeText,
                      matchedContact.expiryDays < 0 ? { color: '#DC2626' } :
                      matchedContact.expiryDays <= 3 ? { color: '#D97706' } : { color: '#059669' }
                    ]}>
                      {matchedContact.expiryDays < 0
                        ? 'Plan Expired'
                        : matchedContact.expiryDays === 0
                        ? 'Expires Today'
                        : `Expires in ${matchedContact.expiryDays} Days`}
                    </Text>
                  </View>
                </View>
                <Text style={s.activeExpiryPlan}>{matchedContact.currentPlan}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowContactPicker(true)}
                style={s.switchContactBtn}
              >
                <Text style={s.switchContactText}>Switch</Text>
                <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Overlap Queuing Protection Guarantee */}
            <View style={s.queuingBanner}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={s.queuingBannerText}>
                <Text style={{ fontFamily: FONTS.bold }}>Queueing Protection:</Text> Recharge now without losing remaining validity days. Your new pack queues seamlessly.
              </Text>
            </View>
          </View>
        )}

        {/* ── Hero Promotion Banner ─────────────────────────────── */}
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroBanner}
        >
          <View style={s.heroContent}>
            <View style={s.heroBadge}>
              <Ionicons name="flash" size={11} color="#FEF08A" />
              <Text style={s.heroBadgeText}>MANA PAY RECHARGE</Text>
            </View>
            <Text style={s.heroHeading}>Recharge with a secure payment handoff</Text>
            <Text style={s.heroSubheading}>
              Payment and operator confirmation will be shown once the live recharge provider is connected.
            </Text>
          </View>
          <View style={s.heroIconCircle}>
            <Text style={{ fontSize: 26 }}>🎁</Text>
          </View>
        </LinearGradient>

        {/* ── Multi-Utility Tabs ─────────────────────────────────── */}
        <View style={s.servicesBar}>
          {[
            { key: 'mobile', label: 'Mobile', icon: 'phone-portrait-outline' },
            { key: 'dth', label: 'DTH / TV', icon: 'tv-outline' },
            { key: 'fastag', label: 'FASTag', icon: 'car-outline' },
            { key: 'bills', label: 'Electricity', icon: 'flash-outline' },
          ].map((tab) => {
            const isActive = activeService === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.serviceChip, isActive && s.serviceChipActive]}
              onPress={() => {
                if (tab.key !== 'mobile') {
                  Alert.alert('Coming soon', `${tab.label} recharge is not connected to a live biller yet.`);
                  return;
                }
                setActiveService('mobile');
              }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text style={[s.serviceChipText, isActive && s.serviceChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Prepaid / Postpaid Toggle ─────────────────────────── */}
        <View style={s.toggleContainer}>
          {(['PREPAID', 'POSTPAID'] as RechargeType[]).map((type) => {
            const isSelected = rechargeType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[s.toggleTab, isSelected && s.toggleTabActive]}
                onPress={() => {
                  if (type === 'POSTPAID') {
                    Alert.alert('Postpaid unavailable', 'Live postpaid bill fetching is not connected yet.');
                    return;
                  }
                  setRechargeType(type);
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={type === 'PREPAID' ? 'card-outline' : 'receipt-outline'}
                  size={15}
                  color={isSelected ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[s.toggleTabText, isSelected && s.toggleTabTextActive]}>
                  {type === 'PREPAID' ? 'Prepaid Recharge' : 'Postpaid Bill'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Mobile Number Input Card ──────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Mobile Number</Text>
            <TouchableOpacity
              style={s.openContactBookBtn}
              onPress={() => setShowContactPicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={14} color={COLORS.primary} />
              <Text style={s.openContactBookText}>Community & Staff Contacts</Text>
            </TouchableOpacity>
          </View>

          <View style={s.inputContainer}>
            <View style={s.countryPrefix}>
              <Text style={s.countryFlag}>🇮🇳</Text>
              <Text style={s.countryCode}>+91</Text>
            </View>

            <TextInput
              style={s.mobileTextInput}
              value={mobile}
              onChangeText={(txt) => setMobile(txt.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              placeholder="Enter 10-digit mobile"
              placeholderTextColor={COLORS.textMuted}
              maxLength={10}
            />

            {mobile.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setMobile('');
                  setSelectedOperator(null);
                }}
                style={s.inputActionBtn}
              >
                <Ionicons name="close-circle" size={19} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowContactPicker(true)}
              style={s.contactIconBtn}
              accessibilityLabel="Pick from contacts"
            >
              <Ionicons name="book-outline" size={19} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Auto-detected operator chip */}
          {detectedOperator && (
            <Animated.View style={[s.detectedRow, { opacity: fadeAnim }]}>
              <View style={s.detectedPill}>
                <Text style={{ fontSize: 13 }}>{detectedOperator.icon}</Text>
                <Text style={s.detectedPillText}>
                  Suggested: <Text style={{ fontFamily: FONTS.bold, color: COLORS.text }}>{detectedOperator.name}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedOperator(null)}
                style={s.detectedChangeBtn}
              >
                <Text style={s.detectedChangeText}>Change below if ported</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* ── Frequent & Family Recharges Carousel with Expiry ──── */}
        {COMMUNITY_CONTACTS.length > 0 && <>
          <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Household & Staff Telecom</Text>
          <TouchableOpacity onPress={() => setShowContactPicker(true)}>
            <Text style={s.viewAllContactsText}>View All ({COMMUNITY_CONTACTS.length}) →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.savedScroll}
        >
          {COMMUNITY_CONTACTS.slice(0, 5).map((item) => {
            const isSelected = mobile === item.number;
            const op = operators.find(o => o.id === item.operatorId);
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.savedCard, isSelected && s.savedCardActive]}
                onPress={() => handleSelectContact(item)}
                activeOpacity={0.8}
              >
                <View style={s.savedAvatarRow}>
                  <View style={[s.savedAvatar, isSelected && { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons
                      name={
                        item.relation.includes('Dongle') ? 'wifi' :
                        item.category === 'staff' ? 'briefcase' : 'person'
                      }
                      size={15}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={s.savedOperatorBadge}>
                    <Text style={{ fontSize: 11 }}>{op?.icon || '📱'}</Text>
                  </View>
                </View>

                <Text style={s.savedName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.savedRelation} numberOfLines={1}>{item.relation}</Text>

                {/* Expiry Pill */}
                <View style={[
                  s.miniExpiryTag,
                  item.expiryDays < 0 ? { backgroundColor: '#FEE2E2' } :
                  item.expiryDays <= 3 ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#ECFDF5' }
                ]}>
                  <Text style={[
                    s.miniExpiryTagText,
                    item.expiryDays < 0 ? { color: '#DC2626' } :
                    item.expiryDays <= 3 ? { color: '#D97706' } : { color: '#059669' }
                  ]}>
                    {item.expiryDays < 0 ? 'Expired ⚠️' : item.expiryDays === 0 ? 'Today' : `${item.expiryDays}d left`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </>}

        {/* ── Select Operator Grid ───────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Telecom Operator</Text>
            {selectedOperator && (
              <Text style={s.activeOpNotice}>
                {selectedOperator.shortName} Selected
              </Text>
            )}
          </View>

          <View style={s.operatorGrid}>
            {operators.map((op) => {
              const isSelected = selectedOperator?.id === op.id;
              const meta = OPERATOR_META[op.id] || { tag: 'Network', tagColor: COLORS.primary, bgTint: '#F8FAFC' };

              return (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    s.operatorCard,
                    isSelected && { borderColor: op.logoColor, backgroundColor: meta.bgTint },
                  ]}
                  onPress={() => setSelectedOperator(op)}
                  activeOpacity={0.75}
                >
                  <View style={s.operatorTopRow}>
                    <View style={[s.operatorIconBg, { borderColor: isSelected ? op.logoColor : COLORS.borderLight }]}>
                      <Text style={{ fontSize: 20 }}>{op.icon}</Text>
                    </View>
                    {isSelected ? (
                      <View style={[s.checkBadge, { backgroundColor: op.logoColor }]}>
                        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={s.uncheckBadge} />
                    )}
                  </View>

                  <Text style={[s.operatorTitle, isSelected && { color: COLORS.text, fontFamily: FONTS.bold }]}>
                    {op.shortName}
                  </Text>

                  <View style={[s.metaChip, { backgroundColor: meta.tagColor + '18' }]}>
                    <Text style={[s.metaChipText, { color: meta.tagColor }]}>
                      {meta.tag}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Telecom Circle Selector ────────────────────────────── */}
        <TouchableOpacity
          style={s.card}
          onPress={() => {
            setCircleSearchQuery('');
            setShowCircleModal(true);
          }}
          activeOpacity={0.85}
        >
          <View style={s.circleSelectorRow}>
            <View style={s.circleIconBox}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.circleLabel}>Telecom Circle / State</Text>
              <Text style={s.circleSelectedValue}>{selectedCircle}</Text>
            </View>

            <View style={s.circleChangeBtn}>
              <Text style={s.circleChangeText}>Change</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Trust & BBPS Guarantee ─────────────────────────────── */}
        <View style={s.trustCard}>
          <View style={s.trustIconBox}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
          <Text style={s.trustHeading}>Recharge provider integration pending</Text>
            <Text style={s.trustSubtext}>
              Plans are currently informational. Payment confirmation, telecom status and refunds will be enabled after aggregator integration.
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ────────────────────────────── */}
      <View style={s.stickyFooter}>
        <View style={s.footerInfoRow}>
          <View style={s.footerInfoCol}>
            <Text style={s.footerMetaLabel}>Recharge Destination</Text>
            <Text style={s.footerMetaValue}>
              {mobile.length === 10
                ? `+91 ${mobile} (${selectedOperator?.shortName || 'Select Op'})`
                : 'Enter your 10-digit number'}
            </Text>
          </View>
          <View style={s.zeroFeeBadge}>
            <Text style={s.zeroFeeText}>Provider fee shown at checkout</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.proceedBtn, !canProceed && s.proceedBtnDisabled]}
          onPress={handleProceed}
          disabled={!canProceed}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={canProceed ? ['#4F46E5', '#6366F1'] : ['#CBD5E1', '#94A3B8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.proceedGradient}
          >
            <Text style={s.proceedBtnText}>
              {canProceed
                ? `Browse ${selectedOperator?.shortName} Plans →`
                : 'Enter Mobile Number to Continue'}
            </Text>
            {canProceed && <Ionicons name="flash" size={16} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Option B: Community & Staff Contacts Bottom Sheet ─── */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.contactModalContainer}>
            <View style={s.sheetHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Choose Resident or Staff</Text>
                <Text style={s.modalSubtitle}>1-Tap recharge for flat members & domestic help</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowContactPicker(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={s.contactSearchBox}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={s.contactSearchInput}
                placeholder="Search name, staff, or number..."
                placeholderTextColor={COLORS.textMuted}
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
                autoCorrect={false}
              />
              {contactSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <View style={s.contactTabRow}>
              {[
                { key: 'all', label: 'All Contacts' },
                { key: 'household', label: '🏡 Household' },
                { key: 'staff', label: '🧹 Home Staff' },
                { key: 'community', label: '🏢 Society' },
              ].map((tab) => {
                const isActive = contactCategoryFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.contactFilterPill, isActive && s.contactFilterPillActive]}
                    onPress={() => setContactCategoryFilter(tab.key as any)}
                  >
                    <Text style={[s.contactFilterPillText, isActive && s.contactFilterPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Contact List */}
            <ScrollView style={s.contactListScroll} showsVerticalScrollIndicator={false}>
              {filteredContacts.map((contact) => {
                const isSelected = mobile === contact.number;
                const op = operators.find(o => o.id === contact.operatorId);

                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={[s.contactItem, isSelected && s.contactItemActive]}
                    onPress={() => handleSelectContact(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={s.contactAvatarBox}>
                      <Text style={{ fontSize: 18 }}>{op?.icon || '📱'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.contactItemName}>{contact.name}</Text>
                        <View style={[
                          s.expiryTagMini,
                          contact.expiryDays < 0 ? { backgroundColor: '#FEE2E2' } :
                          contact.expiryDays <= 3 ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#ECFDF5' }
                        ]}>
                          <Text style={[
                            s.expiryTagMiniText,
                            contact.expiryDays < 0 ? { color: '#DC2626' } :
                            contact.expiryDays <= 3 ? { color: '#D97706' } : { color: '#059669' }
                          ]}>
                            {contact.expiryDays < 0
                              ? 'Expired'
                              : contact.expiryDays === 0
                              ? 'Expires Today'
                              : `${contact.expiryDays}d left`}
                          </Text>
                        </View>
                      </View>

                      <Text style={s.contactItemSubtext}>
                        {contact.relation} · +91 {contact.number}
                      </Text>
                      <Text style={s.contactItemPlan}>{contact.currentPlan}</Text>
                    </View>

                    <View style={[s.contactSelectRadio, isSelected && s.contactSelectRadioActive]}>
                      {isSelected && <View style={s.contactRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredContacts.length === 0 && (
                <View style={s.emptyFilterBox}>
                  <Text style={s.emptyFilterText}>No contacts matching "{contactSearchQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Circle Selection Modal ─────────────────────────────── */}
      <Modal
        visible={showCircleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCircleModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Select Telecom Circle</Text>
                <Text style={s.modalSubtitle}>Select your SIM's registered region</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCircleModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={s.modalSearchBox}>
              <Ionicons name="search" size={17} color={COLORS.textMuted} />
              <TextInput
                style={s.modalSearchInput}
                placeholder="Search state or circle (e.g. Karnataka)..."
                placeholderTextColor={COLORS.textMuted}
                value={circleSearchQuery}
                onChangeText={setCircleSearchQuery}
                autoCorrect={false}
              />
              {circleSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCircleSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={s.modalList} showsVerticalScrollIndicator={false}>
              {filteredCircles.map((circle) => {
                const isCurrent = selectedCircle === circle;
                return (
                  <TouchableOpacity
                    key={circle}
                    style={[s.circleListItem, isCurrent && s.circleListItemActive]}
                    onPress={() => {
                      setSelectedCircle(circle);
                      setShowCircleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={s.circleListLeft}>
                      <Ionicons
                        name="location-sharp"
                        size={16}
                        color={isCurrent ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text style={[s.circleListText, isCurrent && s.circleListTextActive]}>
                        {circle}
                      </Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
              {filteredCircles.length === 0 && (
                <View style={s.emptyFilterBox}>
                  <Text style={s.emptyFilterText}>No circles matching "{circleSearchQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Help & FAQ Modal ────────────────────────────────────── */}
      <Modal
        visible={showHelpModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={s.helpOverlay}>
          <View style={s.helpContainer}>
            <View style={s.helpHeader}>
              <View style={s.helpIconBubble}>
                <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              </View>
              <Text style={s.helpTitle}>Recharge Assistance & FAQs</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <View style={s.faqItem}>
                <Text style={s.faqQ}>What if my recharge fails?</Text>
                <Text style={s.faqA}>
                  Recharge confirmation and automated refunds are not connected yet. Keep the payment reference and contact support if a payment is debited before provider status integration is enabled.
                </Text>
              </View>

              <View style={s.faqItem}>
                <Text style={s.faqQ}>Does recharging early waste remaining days?</Text>
                <Text style={s.faqA}>
                  Activation timing depends on the telecom provider. Automatic queueing will be supported after the live provider integration is completed.
                </Text>
              </View>

              <View style={s.faqItem}>
                <Text style={s.faqQ}>How does Society Cashback work?</Text>
                <Text style={s.faqA}>
                  Society cashback is not active yet. The rewards ledger will only be shown after a backend rewards integration is available.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={s.helpCloseBtn}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={s.helpCloseBtnText}>Got it, Back to Recharge</Text>
            </TouchableOpacity>
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
    marginLeft: 12,
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
  helpBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotNumber: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  stepDotNumberActive: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  stepTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  activeExpiryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    backgroundColor: '#FFFDF5',
    ...SHADOWS.card,
    gap: 10,
  },
  activeExpiryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeExpiryInfo: {
    flex: 1,
  },
  activeExpiryName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  expiryBadgeSoon: {
    backgroundColor: '#FEF3C7',
  },
  expiryBadgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  expiryBadgeSafe: {
    backgroundColor: '#ECFDF5',
  },
  expiryBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  activeExpiryPlan: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  switchContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  switchContactText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  queuingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  queuingBannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#065F46',
    lineHeight: 15,
  },
  heroBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  heroContent: {
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
  },
  heroSubheading: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesBar: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  serviceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  serviceChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  toggleTabText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  toggleTabTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  openContactBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  openContactBookText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  countryPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    backgroundColor: '#FFFFFF',
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  mobileTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 1.2,
  },
  inputActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  contactIconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderLight,
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  detectedPillText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  detectedChangeBtn: {
    paddingHorizontal: 6,
  },
  detectedChangeText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  viewAllContactsText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  savedScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  savedCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  savedCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '25',
  },
  savedAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedOperatorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  savedRelation: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  miniExpiryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  miniExpiryTagText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  activeOpNotice: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  operatorCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  operatorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  operatorIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  operatorTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  metaChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  metaChipText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  circleSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  circleSelectedValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 1,
  },
  circleChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  circleChangeText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustHeading: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#065F46',
  },
  trustSubtext: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  footerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerInfoCol: {
    flex: 1,
  },
  footerMetaLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  footerMetaValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  zeroFeeBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zeroFeeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.successDark,
  },
  proceedBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  proceedBtnDisabled: {
    opacity: 0.75,
  },
  proceedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  proceedBtnText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  contactModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderSlate,
    alignSelf: 'center',
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  contactTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  contactFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
  },
  contactFilterPillActive: {
    backgroundColor: COLORS.primary,
  },
  contactFilterPillText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  contactFilterPillTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  contactListScroll: {
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  contactItemActive: {
    backgroundColor: COLORS.primaryLight + '30',
  },
  contactAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactItemName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  expiryTagMini: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  expiryTagMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  contactItemSubtext: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  contactItemPlan: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactSelectRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactSelectRadioActive: {
    borderColor: COLORS.primary,
  },
  contactRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  circleListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  circleListItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  circleListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleListText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  circleListTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  emptyFilterBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  helpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  helpContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.card,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  helpIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  faqItem: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  faqQ: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 3,
  },
  faqA: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  helpCloseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  helpCloseBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
