import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  rechargeService,
  type MobileOperator,
  type RechargeType,
} from '@/services/rechargeService';

const CIRCLES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chennai', 'Delhi', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'J&K', 'Karnataka', 'Kerala',
  'Kolkata', 'Madhya Pradesh', 'Maharashtra', 'Mumbai', 'North East',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'UP East', 'UP West', 'West Bengal',
];

export default function RechargeScreen() {
  const router = useRouter();
  const operators = rechargeService.getOperators();

  const [rechargeType, setRechargeType] = useState<RechargeType>('PREPAID');
  const [mobile, setMobile] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<MobileOperator | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator | null>(null);
  const [selectedCircle, setSelectedCircle] = useState('Karnataka');
  const [showCirclePicker, setShowCirclePicker] = useState(false);

  // Animate operator detection chip
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mobile.length >= 2) {
      const op = rechargeService.detectOperator(mobile);
      setDetectedOperator(op);
      if (op && !selectedOperator) {
        setSelectedOperator(op);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    } else {
      setDetectedOperator(null);
      if (!selectedOperator) {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      }
    }
  }, [mobile]);

  const canProceed = mobile.replace(/\D/g, '').length === 10 && selectedOperator;

  const handleProceed = () => {
    if (!canProceed) return;
    router.push({
      pathname: '/recharge/plans',
      params: {
        mobile: mobile.replace(/\D/g, ''),
        operatorId: selectedOperator!.id,
        operatorName: selectedOperator!.name,
        operatorIcon: selectedOperator!.icon,
        operatorColor: selectedOperator!.logoColor,
        circle: selectedCircle,
        rechargeType,
      },
    });
  };

  return (
    <View style={s.container}>
      {/* Top Nav */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/finance')}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Mobile Recharge</Text>
          <Text style={s.topNavSubtitle}>Prepaid & Postpaid · All operators</Text>
        </View>
        <View style={s.topNavIconBox}>
          <Text style={{ fontSize: 22 }}>📱</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.progressRow}>
        <View style={[s.progressStep, s.progressStepActive]}>
          <Text style={[s.progressLabel, s.progressLabelActive]}>1. Number</Text>
        </View>
        <View style={s.progressLine} />
        <View style={s.progressStep}>
          <Text style={s.progressLabel}>2. Plan</Text>
        </View>
        <View style={s.progressLine} />
        <View style={s.progressStep}>
          <Text style={s.progressLabel}>3. Pay</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Prepaid / Postpaid toggle */}
        <View style={s.toggleRow}>
          {(['PREPAID', 'POSTPAID'] as RechargeType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.toggleBtn, rechargeType === t && s.toggleBtnActive]}
              onPress={() => setRechargeType(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleBtnText, rechargeType === t && s.toggleBtnTextActive]}>
                {t === 'PREPAID' ? 'Prepaid' : 'Postpaid'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mobile Number Input */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>Mobile Number</Text>
          <View style={s.inputRow}>
            <View style={s.dialCodeBox}>
              <Text style={s.dialCode}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={s.mobileInput}
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              placeholder="Enter 10-digit number"
              placeholderTextColor={THEME.textSecondary}
              maxLength={10}
              autoFocus
            />
            {mobile.length > 0 && (
              <TouchableOpacity onPress={() => { setMobile(''); setSelectedOperator(null); }} style={s.clearBtn}>
                <Ionicons name="close-circle" size={18} color={THEME.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Auto-detected operator chip */}
          {detectedOperator && (
            <Animated.View style={[s.detectedChip, { opacity: fadeAnim }]}>
              <Text style={s.detectedChipText}>
                {detectedOperator.icon} Detected: <Text style={{ fontWeight: '700' }}>{detectedOperator.name}</Text>
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Operator Grid */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>Select Operator</Text>
          <View style={s.operatorGrid}>
            {operators.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={[s.operatorChip, selectedOperator?.id === op.id && s.operatorChipSelected]}
                onPress={() => setSelectedOperator(op)}
                activeOpacity={0.75}
              >
                <Text style={s.operatorIcon}>{op.icon}</Text>
                <Text style={[s.operatorName, selectedOperator?.id === op.id && s.operatorNameSelected]}>
                  {op.shortName}
                </Text>
                {selectedOperator?.id === op.id && (
                  <View style={s.operatorCheckDot}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Circle Picker */}
        <TouchableOpacity
          style={s.card}
          onPress={() => setShowCirclePicker(v => !v)}
          activeOpacity={0.85}
        >
          <View style={s.circleRow}>
            <View>
              <Text style={s.fieldLabel}>Telecom Circle</Text>
              <Text style={s.circleValue}>{selectedCircle}</Text>
            </View>
            <Ionicons name={showCirclePicker ? "chevron-up" : "chevron-down"} size={18} color={THEME.textSecondary} />
          </View>
        </TouchableOpacity>

        {showCirclePicker && (
          <View style={s.circleList}>
            {CIRCLES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.circleItem, selectedCircle === c && s.circleItemActive]}
                onPress={() => { setSelectedCircle(c); setShowCirclePicker(false); }}
              >
                <Text style={[s.circleItemText, selectedCircle === c && s.circleItemTextActive]}>{c}</Text>
                {selectedCircle === c && <Ionicons name="checkmark" size={14} color={THEME.brandDark} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent numbers placeholder */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>Recent Recharges</Text>
          <View style={s.recentRow}>
            {['9876543210', '8765432109', '7654321098'].map((n) => (
              <TouchableOpacity
                key={n}
                style={s.recentChip}
                onPress={() => setMobile(n)}
              >
                <Ionicons name="time-outline" size={12} color={THEME.textSecondary} />
                <Text style={s.recentNumber}>
                  {n.slice(0, 5)}{'•'.repeat(5)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={s.stickyFooter}>
        <TouchableOpacity
          style={[s.proceedBtn, !canProceed && s.proceedBtnDisabled]}
          onPress={handleProceed}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={s.proceedBtnText}>
            {canProceed
              ? `Browse ${selectedOperator!.shortName} Plans →`
              : 'Enter number & select operator'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  topNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  topNavTitleBox: { flex: 1, marginLeft: 12 },
  topNavTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  topNavSubtitle: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  topNavIconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  progressStep: { alignItems: 'center' },
  progressStepActive: {},
  progressLabel: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.medium },
  progressLabelActive: { color: THEME.brandDark, fontWeight: '700', fontFamily: FONTS.bold },
  progressLine: { flex: 1, height: 1, backgroundColor: THEME.border, marginHorizontal: 8 },
  scroll: { padding: 16, gap: 12 },
  toggleRow: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: THEME.border, overflow: 'hidden',
  },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: THEME.brandDark },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  toggleBtnTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border,
    padding: 16, gap: 10, ...SHADOWS.card,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.medium },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: THEME.border, borderRadius: 10, overflow: 'hidden',
  },
  dialCodeBox: {
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: THEME.surfaceMuted,
    borderRightWidth: 1, borderRightColor: THEME.border,
  },
  dialCode: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  mobileInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontWeight: '600', color: THEME.textPrimary,
    fontFamily: FONTS.semiBold, letterSpacing: 1,
  },
  clearBtn: { paddingHorizontal: 10 },
  detectedChip: {
    flexDirection: 'row', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: THEME.brandLight, borderRadius: 8,
    borderWidth: 1, borderColor: THEME.brandBorder,
  },
  detectedChipText: { fontSize: 12, color: THEME.brandDark, fontFamily: FONTS.medium },
  operatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  operatorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: THEME.border,
    borderRadius: 10, backgroundColor: '#FAFBFC',
    position: 'relative',
  },
  operatorChipSelected: {
    borderColor: THEME.brand, backgroundColor: THEME.brandLight,
  },
  operatorIcon: { fontSize: 18 },
  operatorName: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  operatorNameSelected: { color: THEME.brandDark },
  operatorCheckDot: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: THEME.brand, alignItems: 'center', justifyContent: 'center',
  },
  circleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleValue: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginTop: 2 },
  circleList: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: THEME.border,
    maxHeight: 220, overflow: 'hidden',
  },
  circleItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  circleItemActive: { backgroundColor: THEME.brandLight },
  circleItemText: { fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular },
  circleItemTextActive: { color: THEME.brandDark, fontWeight: '700', fontFamily: FONTS.semiBold },
  recentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: THEME.surfaceMuted, borderRadius: 8,
    borderWidth: 1, borderColor: THEME.border,
  },
  recentNumber: { fontSize: 12, fontFamily: FONTS.mono ?? FONTS.medium, color: THEME.textPrimary },
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: THEME.border,
    ...SHADOWS.card,
  },
  proceedBtn: {
    backgroundColor: THEME.brand, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  proceedBtnDisabled: { backgroundColor: THEME.borderMedium },
  proceedBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
