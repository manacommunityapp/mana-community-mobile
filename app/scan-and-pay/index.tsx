import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';

// UPI VPA regex: localpart@provider
const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

// Deep-link order: PhonePe → GPay → Paytm → BHIM → generic UPI
const SCANNER_DEEP_LINKS = [
  { name: 'PhonePe', url: 'phonepe://scan' },
  { name: 'Google Pay', url: 'tez://upi/scan' },
  { name: 'Paytm', url: 'paytmmp://upi/qrcode' },
  { name: 'BHIM', url: 'bhim://qrscan' },
];

function buildUpiIntent(pa: string, amount: string, note: string): string {
  const tr = `MANA-PAY-${Date.now()}`;
  const base = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent('Mana Community Pay')}&am=${amount}&cu=INR&tr=${tr}`;
  return note ? `${base}&tn=${encodeURIComponent(note)}` : base;
}

export default function ScanAndPayScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<'scan' | 'manual'>('scan');
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [isOpeningScanner, setIsOpeningScanner] = useState(false);

  const isValidUpi = UPI_VPA_REGEX.test(upiId.trim());
  const isValidAmount = parseFloat(amount) > 0;
  const canPay = isValidUpi && isValidAmount;

  const handleOpenScanner = async () => {
    setIsOpeningScanner(true);
    try {
      for (const app of SCANNER_DEEP_LINKS) {
        const can = await Linking.canOpenURL(app.url);
        if (can) {
          await Linking.openURL(app.url);
          return;
        }
      }
      // No UPI app found — fall back to manual tab
      Alert.alert(
        'No UPI App Found',
        'Install PhonePe, Google Pay, or Paytm to use QR scanning.',
        [{ text: 'Enter UPI ID Instead', onPress: () => setTab('manual') }]
      );
    } finally {
      setIsOpeningScanner(false);
    }
  };

  const handlePay = async () => {
    if (!canPay) return;
    setIsPaying(true);
    try {
      const upiUrl = buildUpiIntent(upiId.trim(), amount, note.trim());
      const phonePeUrl = `phonepe://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${encodeURIComponent('Mana Community Pay')}&am=${amount}&cu=INR&tr=MANA-PAY-${Date.now()}`;

      const canPhonePe = await Linking.canOpenURL(phonePeUrl);
      if (canPhonePe) {
        await Linking.openURL(phonePeUrl);
        return;
      }
      const canUpi = await Linking.canOpenURL(upiUrl);
      if (canUpi) {
        await Linking.openURL(upiUrl);
        return;
      }
      Alert.alert(
        'Payment Initiated',
        `UPI: ${upiId}\nAmount: ₹${amount}${note ? `\nNote: ${note}` : ''}\n\nOpen your UPI app to complete this payment.`,
        [{ text: 'Done' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not initiate payment. Please try again.');
    } finally {
      setIsPaying(false);
    }
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
          <Text style={s.topNavTitle}>Scan & Pay</Text>
          <Text style={s.topNavSubtitle}>UPI QR · Scan or enter UPI ID</Text>
        </View>
        <View style={s.topNavIconBox}>
          <Text style={{ fontSize: 22 }}>📷</Text>
        </View>
      </View>

      {/* Tab toggle */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, tab === 'scan' && s.tabActive]}
          onPress={() => setTab('scan')}
          activeOpacity={0.8}
        >
          <Ionicons name="scan-outline" size={15} color={tab === 'scan' ? THEME.brandDark : THEME.textSecondary} />
          <Text style={[s.tabText, tab === 'scan' && s.tabTextActive]}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'manual' && s.tabActive]}
          onPress={() => setTab('manual')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color={tab === 'manual' ? THEME.brandDark : THEME.textSecondary} />
          <Text style={[s.tabText, tab === 'manual' && s.tabTextActive]}>Enter UPI ID</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {tab === 'scan' ? (
          /* ── Scan QR Tab ─────────────────────────────────────────────── */
          <View style={s.scanSection}>
            {/* Hero QR illustration */}
            <View style={s.qrHeroBox}>
              <Text style={s.qrHeroEmoji}>📷</Text>
              <Text style={s.qrHeroTitle}>Scan any UPI QR Code</Text>
              <Text style={s.qrHeroSub}>
                Works with any shop, vendor, community event, or person's QR code
              </Text>
            </View>

            {/* Open scanner CTA */}
            <TouchableOpacity
              style={s.scanBtn}
              onPress={handleOpenScanner}
              disabled={isOpeningScanner}
              activeOpacity={0.85}
            >
              {isOpeningScanner ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="scan" size={20} color="#FFFFFF" />
                  <Text style={s.scanBtnText}>Open QR Scanner</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.orDivider}>— opens PhonePe · GPay · Paytm · BHIM —</Text>

            {/* App pills */}
            <View style={s.appPillRow}>
              {[
                { label: 'PhonePe', color: '#5F259F' },
                { label: 'GPay',    color: '#1A73E8' },
                { label: 'Paytm',   color: '#00BAF2' },
                { label: 'BHIM',    color: '#1B6CA8' },
              ].map((a) => (
                <View key={a.label} style={[s.appPill, { borderColor: a.color }]}>
                  <Text style={[s.appPillText, { color: a.color }]}>{a.label}</Text>
                </View>
              ))}
            </View>

            {/* Switch to manual */}
            <TouchableOpacity style={s.switchLink} onPress={() => setTab('manual')}>
              <Text style={s.switchLinkText}>Don't have a QR? Enter UPI ID →</Text>
            </TouchableOpacity>

            {/* How it works */}
            <View style={s.howCard}>
              <Text style={s.howTitle}>How it works</Text>
              {[
                { icon: '1️⃣', text: 'Tap "Open QR Scanner" — your preferred UPI app opens' },
                { icon: '2️⃣', text: 'Point camera at any UPI QR code' },
                { icon: '3️⃣', text: 'Review & confirm the payment inside the UPI app' },
              ].map((step, i) => (
                <View key={i} style={s.howRow}>
                  <Text style={s.howEmoji}>{step.icon}</Text>
                  <Text style={s.howText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* ── Manual UPI ID Tab ───────────────────────────────────────── */
          <View style={s.manualSection}>
            {/* UPI ID */}
            <View style={s.fieldCard}>
              <Text style={s.fieldLabel}>UPI ID / VPA</Text>
              <View style={[s.inputRow, isValidUpi && upiId.length > 0 && s.inputRowValid]}>
                <Ionicons name="at" size={16} color={THEME.textSecondary} style={{ marginLeft: 12 }} />
                <TextInput
                  style={s.textInput}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="e.g. name@upi or 9876543210@ybl"
                  placeholderTextColor={THEME.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {isValidUpi && upiId.length > 0 && (
                  <Ionicons name="checkmark-circle" size={18} color={THEME.brandDark} style={{ marginRight: 12 }} />
                )}
              </View>
              <Text style={s.fieldHint}>
                Format: mobilenumber@upi · name@okaxis · merchant@ybl
              </Text>
            </View>

            {/* Amount */}
            <View style={s.fieldCard}>
              <Text style={s.fieldLabel}>Amount</Text>
              <View style={s.inputRow}>
                <Text style={s.rupeeSymbol}>₹</Text>
                <TextInput
                  style={s.amountInput}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Quick amount chips */}
              <View style={s.quickAmountRow}>
                {['100', '200', '500', '1000'].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[s.quickChip, amount === a && s.quickChipActive]}
                    onPress={() => setAmount(a)}
                  >
                    <Text style={[s.quickChipText, amount === a && s.quickChipTextActive]}>₹{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note */}
            <View style={s.fieldCard}>
              <Text style={s.fieldLabel}>Remark (Optional)</Text>
              <View style={s.inputRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={THEME.textSecondary} style={{ marginLeft: 12 }} />
                <TextInput
                  style={s.textInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Society event donation"
                  placeholderTextColor={THEME.textMuted}
                  maxLength={50}
                />
              </View>
            </View>

            {/* UPI trust badges */}
            <View style={s.trustRow}>
              <View style={s.trustBadge}>
                <Ionicons name="shield-checkmark-outline" size={13} color={THEME.brandDark} />
                <Text style={s.trustText}>NPCI Secured</Text>
              </View>
              <View style={s.trustBadge}>
                <Ionicons name="lock-closed-outline" size={13} color={THEME.brandDark} />
                <Text style={s.trustText}>256-bit Encrypted</Text>
              </View>
              <View style={s.trustBadge}>
                <Text style={{ fontSize: 11 }}>🇮🇳</Text>
                <Text style={s.trustText}>UPI Powered</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </View>
        )}

      </ScrollView>

      {/* Sticky Pay Footer — only on manual tab */}
      {tab === 'manual' && (
        <View style={s.stickyFooter}>
          {canPay && (
            <View style={s.payPreview}>
              <Text style={s.payPreviewLabel}>Pay to</Text>
              <Text style={s.payPreviewUpi} numberOfLines={1}>{upiId}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.payBtn, (!canPay || isPaying) && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || isPaying}
            activeOpacity={0.85}
          >
            {isPaying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flash" size={16} color="#FFFFFF" />
                <Text style={s.payBtnText}>
                  {canPay ? `Pay ₹${amount}` : 'Enter UPI ID & Amount'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  tabRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: THEME.brandDark },
  tabText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  tabTextActive: { color: THEME.brandDark },
  scroll: { padding: 16, gap: 14 },
  // ── Scan tab ──
  scanSection: { gap: 16 },
  qrHeroBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: THEME.border,
    padding: 28, alignItems: 'center', gap: 8, ...SHADOWS.card,
  },
  qrHeroEmoji: { fontSize: 52 },
  qrHeroTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold, textAlign: 'center' },
  qrHeroSub: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 18 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: THEME.brandDark, borderRadius: 14, paddingVertical: 16,
  },
  scanBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  orDivider: { fontSize: 11, color: THEME.textMuted, textAlign: 'center', fontFamily: FONTS.regular },
  appPillRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  appPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  appPillText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.semiBold },
  switchLink: { alignItems: 'center', paddingVertical: 8 },
  switchLinkText: { fontSize: 13, fontWeight: '600', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  howCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border,
    padding: 16, gap: 10,
  },
  howTitle: { fontSize: 13, fontWeight: '700', color: THEME.textSecondary, fontFamily: FONTS.semiBold, marginBottom: 2 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howEmoji: { fontSize: 15 },
  howText: { flex: 1, fontSize: 12.5, color: THEME.textSecondary, fontFamily: FONTS.regular, lineHeight: 17 },
  // ── Manual tab ──
  manualSection: { gap: 14 },
  fieldCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, gap: 8, ...SHADOWS.card,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.medium },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: THEME.border, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#FAFBFC',
  },
  inputRowValid: { borderColor: THEME.brand },
  textInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 12,
    fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.medium,
  },
  rupeeSymbol: {
    fontSize: 20, fontWeight: '700', color: THEME.textPrimary,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: FONTS.displayBold,
  },
  amountInput: {
    flex: 1, paddingVertical: 10, paddingRight: 14,
    fontSize: 22, fontWeight: '800', color: THEME.textPrimary,
    fontFamily: FONTS.displayBold, fontVariant: ['tabular-nums'],
  },
  fieldHint: { fontSize: 10.5, color: THEME.textMuted, fontFamily: FONTS.regular },
  quickAmountRow: { flexDirection: 'row', gap: 8 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: THEME.border,
    backgroundColor: '#FAFBFC',
  },
  quickChipActive: { backgroundColor: THEME.brandDark, borderColor: THEME.brandDark },
  quickChipText: { fontSize: 12.5, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  quickChipTextActive: { color: '#FFFFFF' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: THEME.brandLight, borderRadius: 8,
    borderWidth: 1, borderColor: THEME.brandBorder,
  },
  trustText: { fontSize: 10.5, fontWeight: '600', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  // ── Footer ──
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: THEME.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...SHADOWS.card,
  },
  payPreview: { flex: 1 },
  payPreviewLabel: { fontSize: 10, color: THEME.textSecondary, fontFamily: FONTS.regular },
  payPreviewUpi: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: THEME.brand, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 13,
    minWidth: 140,
  },
  payBtnDisabled: { backgroundColor: THEME.borderMedium },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
