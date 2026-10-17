import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SHADOWS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { billerService, FetchedBillDto } from '@/services/billerService';

type Step = 'ENTER_ID' | 'BILL_PREVIEW' | 'PAYING';

export default function FetchBillScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    billerId: string;
    billerName: string;
    billerShortName: string;
    billerState: string;
    consumerIdLabel: string;
    consumerIdHint: string;
    consumerIdLength: string;
  }>();

  const [step, setStep] = useState<Step>('ENTER_ID');
  const [consumerId, setConsumerId] = useState('');
  const [fetching, setFetching] = useState(false);
  const [paying, setPaying] = useState(false);
  const [bill, setBill] = useState<FetchedBillDto | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'WALLET'>('UPI');

  const maxLen = params.consumerIdLength ? parseInt(params.consumerIdLength) : undefined;

  const handleFetchBill = async () => {
    if (!consumerId.trim()) return;
    setFetching(true);
    try {
      const result = await billerService.fetchBill(params.billerId, consumerId.trim());
      setBill(result);
      setStep('BILL_PREVIEW');
    } catch (err: any) {
      Alert.alert('Fetch Failed', err?.message || 'Could not fetch bill. Please check the consumer ID.');
    } finally {
      setFetching(false);
    }
  };

  const handlePayBill = async () => {
    if (!bill) return;
    setPaying(true);
    setStep('PAYING');
    try {
      const res = await billerService.payBill(bill.billNumber, bill.billerId, bill.amount, selectedMethod);

      const canOpenPhonePe = await Linking.canOpenURL(res.phonePeUrl);
      if (canOpenPhonePe) {
        await Linking.openURL(res.phonePeUrl);
      } else {
        const canOpenUPI = await Linking.canOpenURL(res.upiIntentUrl);
        if (canOpenUPI) {
          await Linking.openURL(res.upiIntentUrl);
        } else {
          Alert.alert(
            'No UPI App Found',
            'PhonePe, Google Pay or any UPI app is needed to complete payment. Please install one and try again.',
            [{ text: 'OK', onPress: () => setStep('BILL_PREVIEW') }]
          );
          setPaying(false);
          return;
        }
      }

      Alert.alert(
        'Payment Initiated',
        `Transaction Ref: ${res.transactionRef}\nAmount: ₹${res.amount.toLocaleString('en-IN')}\n\nComplete the payment in the UPI app and check your registered mobile for confirmation.`,
        [
          {
            text: 'Done',
            onPress: () => router.canGoBack() ? router.back() : router.replace('/finance'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Could not initiate payment.');
      setStep('BILL_PREVIEW');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => {
            if (step === 'PAYING') {
              setStep('BILL_PREVIEW');
            } else if (step === 'BILL_PREVIEW') {
              setStep('ENTER_ID');
              setBill(null);
            } else {
              router.canGoBack() ? router.back() : router.replace('/bbps');
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTitleBox}>
          <Text style={s.headerTitle}>{params.billerShortName}</Text>
          <Text style={s.headerSub}>{params.billerState} · BBPS</Text>
        </View>
        {step === 'BILL_PREVIEW' && (
          <View style={s.stepPill}>
            <Text style={s.stepPillText}>Step 2/3</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: step === 'ENTER_ID' ? '33%' : step === 'BILL_PREVIEW' ? '66%' : '100%' }]} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Step 1: Consumer ID Entry ── */}
        {step === 'ENTER_ID' && (
          <>
            <View style={s.stepCard}>
              <View style={s.stepHeader}>
                <View style={s.stepNumBadge}>
                  <Text style={s.stepNumText}>1</Text>
                </View>
                <View>
                  <Text style={s.stepTitle}>Enter Consumer Details</Text>
                  <Text style={s.stepSub}>{params.billerName}</Text>
                </View>
              </View>

              <View style={s.fieldBox}>
                <Text style={s.fieldLabel}>{params.consumerIdLabel}</Text>
                <TextInput
                  style={s.textInput}
                  placeholder={params.consumerIdHint}
                  placeholderTextColor={THEME.textMuted}
                  value={consumerId}
                  onChangeText={setConsumerId}
                  keyboardType="number-pad"
                  maxLength={maxLen}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleFetchBill}
                />
                {maxLen && (
                  <Text style={s.fieldHint}>{consumerId.length} / {maxLen} digits</Text>
                )}
              </View>

              <View style={s.whereToFindBox}>
                <Ionicons name="information-circle-outline" size={14} color={THEME.indigo} />
                <Text style={s.whereToFindText}>
                  Find this number on your electricity bill — top section near "Consumer No." or "Account No."
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, (!consumerId.trim() || fetching) && s.primaryBtnDisabled]}
              onPress={handleFetchBill}
              disabled={!consumerId.trim() || fetching}
              activeOpacity={0.85}
            >
              {fetching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                  <Text style={s.primaryBtnText}>Fetch Live Bill</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.secureNote}>
              🔒  Your consumer ID is sent securely to BBPS. We do not store it.
            </Text>
          </>
        )}

        {/* ── Step 2: Bill Preview ── */}
        {(step === 'BILL_PREVIEW' || step === 'PAYING') && bill && (
          <>
            {/* Bill Summary Card */}
            <View style={s.billCard}>
              <View style={s.billCardHeader}>
                <View style={s.billerIconBox}>
                  <Text style={{ fontSize: 22 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.billCardBillerName}>{bill.billerName}</Text>
                  <Text style={s.billCardConsumer}>Consumer: {bill.consumerId}</Text>
                </View>
                <View style={[s.statusPill, bill.status === 'OVERDUE' ? s.statusOverdue : s.statusDue]}>
                  <Text style={[s.statusPillText, bill.status === 'OVERDUE' ? s.statusOverdueText : s.statusDueText]}>
                    {bill.status}
                  </Text>
                </View>
              </View>

              <View style={s.divider} />

              <Text style={s.customerName}>{bill.customerName}</Text>

              <View style={s.detailsGrid}>
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Bill Number</Text>
                  <Text style={s.detailValue}>{bill.billNumber}</Text>
                </View>
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Bill Date</Text>
                  <Text style={s.detailValue}>{bill.billDate}</Text>
                </View>
                {bill.periodFrom && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Billing Period</Text>
                    <Text style={s.detailValue}>{bill.periodFrom} → {bill.periodTo}</Text>
                  </View>
                )}
                {bill.units !== undefined && (
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Units Consumed</Text>
                    <Text style={s.detailValue}>{bill.units} kWh</Text>
                  </View>
                )}
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>Due Date</Text>
                  <Text style={[s.detailValue, bill.status === 'OVERDUE' && { color: THEME.lossDark }]}>
                    {bill.dueDate}
                  </Text>
                </View>
              </View>

              <View style={s.amountRow}>
                <Text style={s.amountLabel}>Amount Payable</Text>
                <Text style={s.amountValue}>₹{bill.amount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={s.sectionLabel}>Pay via</Text>
            <View style={s.methodList}>
              <TouchableOpacity
                style={[s.methodCard, selectedMethod === 'UPI' && s.methodCardActive]}
                onPress={() => setSelectedMethod('UPI')}
                activeOpacity={0.75}
              >
                <View style={s.methodIconBox}>
                  <Ionicons name="qr-code-outline" size={20} color={THEME.brandDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.methodName}>UPI · PhonePe / GPay / Paytm</Text>
                  <Text style={s.methodSub}>Opens your UPI app directly</Text>
                </View>
                <Ionicons
                  name={selectedMethod === 'UPI' ? 'radio-button-on' : 'radio-button-off'}
                  size={19}
                  color={selectedMethod === 'UPI' ? THEME.brand : THEME.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, paying && s.primaryBtnDisabled]}
              onPress={handlePayBill}
              disabled={paying}
              activeOpacity={0.85}
            >
              {paying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={s.primaryBtnText}>Pay ₹{bill.amount.toLocaleString('en-IN')} via UPI</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => { setStep('ENTER_ID'); setBill(null); }}
            >
              <Text style={s.secondaryBtnText}>← Change Consumer ID</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitleBox: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  stepPill: {
    backgroundColor: THEME.brandLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepPillText: { fontSize: 11, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  progressBar: {
    height: 3,
    backgroundColor: THEME.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: THEME.brand,
  },
  scrollContent: { padding: 16, gap: 14 },
  stepCard: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    gap: 16,
    ...SHADOWS.card,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: THEME.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  stepTitle: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  stepSub: { fontSize: 11.5, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  fieldBox: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  textInput: {
    backgroundColor: THEME.surfaceMuted,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    letterSpacing: 1,
  },
  fieldHint: { fontSize: 11, color: THEME.textSecondary, textAlign: 'right' },
  whereToFindBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: THEME.indigoLight,
    borderRadius: 8,
    padding: 10,
  },
  whereToFindText: { flex: 1, fontSize: 12, color: THEME.indigo, fontFamily: FONTS.regular, lineHeight: 17 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.brand,
    paddingVertical: 14,
    borderRadius: 12,
    ...SHADOWS.card,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  secureNote: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  billCard: {
    backgroundColor: THEME.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    gap: 12,
    ...SHADOWS.card,
  },
  billCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billerIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  billCardBillerName: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  billCardConsumer: { fontSize: 11.5, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusDue: { backgroundColor: '#FFFBEB' },
  statusDueText: { color: '#D97706' },
  statusOverdue: { backgroundColor: THEME.lossLight },
  statusOverdueText: { color: THEME.lossDark },
  statusPillText: { fontSize: 10.5, fontWeight: '700', fontFamily: FONTS.semiBold },
  divider: { height: 1, backgroundColor: THEME.border },
  customerName: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  detailsGrid: { gap: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular },
  detailValue: { fontSize: 12.5, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
  },
  amountLabel: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.bold },
  amountValue: {
    fontSize: 22, fontWeight: '800', color: THEME.textPrimary,
    fontFamily: FONTS.displayBold, fontVariant: ['tabular-nums'],
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  methodList: { gap: 10 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  methodCardActive: { borderColor: THEME.brand, backgroundColor: THEME.brandLight },
  methodIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: THEME.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  methodName: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  methodSub: { fontSize: 11, color: THEME.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: THEME.indigo, fontFamily: FONTS.semiBold },
});
