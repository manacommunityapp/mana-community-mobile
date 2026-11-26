import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '@/context/ThemeContext';
import { StitchBackground } from '@/components/common/StitchBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { splitBillService } from '@/services/splitBillService';

// Stitch Design Tokens
const TOKENS = {
  bg: '#FAF8FF',
  surface: '#FAF8FF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F2F3FF',
  surfaceContainer: '#EAEDFF',
  surfaceHigh: '#E2E7FF',
  surfaceHighest: '#DAE2FD',
  primary: '#004AC6',
  primaryContainer: '#2563EB',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#EEEFFF',
  secondary: '#855300',
  secondaryContainer: '#FEA619',
  onSecondaryContainer: '#684000',
  tertiary: '#006247',
  tertiaryContainer: '#007D5C',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#BEFFE1',
  tertiaryFixedDim: '#2FE0AA',
  text: '#131B2E',
  textVariant: '#434655',
  textMuted: '#737686',
};

const GROUPS = [
  { id: '1', title: 'Flat 804 Groceries', icon: 'business-outline', active: true },
  { id: '2', title: 'Diwali Committee', icon: 'sparkles-outline', active: false },
  { id: '3', title: 'Badminton Weekend', icon: 'tennisball-outline', active: false },
];

const EXTRACTED_ITEMS = [
  { id: '1', name: 'Organic A2 Cow Milk 2L', price: '₹180.00', shareText: 'Shared by 3 flatmates (₹60/ea)', avatars: ['R', 'A', 'Ro'], colors: [TOKENS.primary, TOKENS.secondaryContainer, TOKENS.tertiaryFixedDim] },
  { id: '2', name: 'Fresh Avocados & Broccoli', price: '₹320.00', shareText: 'Shared by 2 (Aarav, Rahul)', avatars: ['R', 'A'], colors: [TOKENS.primary, TOKENS.secondaryContainer] },
  { id: '3', name: 'Artisanal Sourdough Bread', price: '₹160.00', shareText: 'Personal Item: Rahul only', avatars: ['R'], colors: [TOKENS.primary] },
  { id: '4', name: 'Greek Yogurt & Wild Berries', price: '₹180.00', shareText: 'Shared by Aarav & Rohan', avatars: ['A', 'Ro'], colors: [TOKENS.secondaryContainer, TOKENS.tertiaryFixedDim] },
];

export default function SplitBillScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { palette, isDark } = useAppTheme();

  const [activeGroup, setActiveGroup] = useState('1');
  const [expenseTitle, setExpenseTitle] = useState("Nature's Basket Organic Groceries");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(['1', '2', '3', '4']);
  const [splitMode, setSplitMode] = useState<'itemized' | 'equally' | 'exact' | 'shares'>('itemized');
  const [auditNote, setAuditNote] = useState('Flat breakfast replenishment & weekly dairy run');
  const [attachProof, setAttachProof] = useState(true);

  // Live split data from backend
  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['split-bills'],
    queryFn: splitBillService.getSplits,
    staleTime: 2 * 60 * 1000,
  });

  const settleMutation = useMutation({
    mutationFn: ({ splitId, memberId, amount, payeeName }: { splitId: string; memberId: string; amount: number; payeeName: string }) =>
      splitBillService.settle(splitId, memberId, amount, payeeName),
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ['split-bills'] });
      const launched = await Linking.canOpenURL(result.phone_pe_url)
        .then(ok => ok ? Linking.openURL(result.phone_pe_url) : Linking.openURL(result.upi_intent_url))
        .catch(() => false);
      if (!launched) Linking.openURL(result.upi_intent_url);
    },
    onError: () => Alert.alert('Error', 'Payment initiation failed. Try again.'),
  });

  return (
    <StitchBackground showGlow style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* ── Stitch Header Bar ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabs/pay'))}
          >
            <Ionicons name="close" size={22} color={TOKENS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Add Expense & Scan Bill
          </Text>
          <View style={styles.userBadge}>
            <Ionicons name="person" size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* ── Modal Drawer Status Atmosphere ── */}
        <View style={styles.atmosphereRow}>
          <View style={styles.dragPill} />
          <View style={styles.statusSubRow}>
            <View style={styles.autoDraftBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.autoDraftText}>Auto-Draft Saved</Text>
              <Text style={styles.autoDraftTime}>10:18 AM</Text>
            </View>
            <View style={styles.auditLogReady}>
              <Ionicons name="lock-closed-outline" size={12} color={TOKENS.tertiary} />
              <Text style={styles.auditLogText}>Audit Log Ready</Text>
            </View>
          </View>
        </View>

        {/* ── Group Pill Selector Rail ── */}
        <View style={styles.groupRailContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupRail}
          >
            {GROUPS.map((g) => {
              const isSelected = activeGroup === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupPill, isSelected ? styles.groupPillActive : styles.groupPillInactive]}
                  onPress={() => setActiveGroup(g.id)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={15}
                    color={isSelected ? '#FFFFFF' : TOKENS.textVariant}
                  />
                  <Text style={[styles.groupPillText, isSelected ? styles.groupPillTextActive : styles.groupPillTextInactive]}>
                    {g.title}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.newGroupBtn} onPress={() => Alert.alert('New Group', 'Create group feature')}>
              <Ionicons name="add" size={16} color={TOKENS.primary} />
              <Text style={styles.newGroupText}>New Group</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Main Scroll Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
        >
          {/* Card 1: OCR Bill Scanner Card (Simulated Receipt + Scanner Beam) */}
          <View style={styles.card}>
            {/* Header Badge */}
            <View style={styles.ocrHeaderRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={13} color={TOKENS.tertiary} />
                <Text style={styles.aiBadgeText}>MANA OCR AI ENGINE</Text>
              </View>
              <View style={styles.matchBadge}>
                <View style={styles.matchDot} />
                <Text style={styles.matchText}>99.4% Match</Text>
              </View>
            </View>

            {/* Simulated Receipt with Scanner Beam */}
            <View style={styles.receiptContainer}>
              <View style={styles.receiptInner}>
                {/* Laser scan line */}
                <View style={styles.scanLaser} />

                {/* Receipt Header */}
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptLogoBox}>
                    <Ionicons name="receipt-outline" size={18} color={TOKENS.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.storeName}>Nature's Basket</Text>
                    <Text style={styles.storeSub}>Koramangala 4th Block · Bill #NB-88291</Text>
                  </View>
                  <Text style={styles.billTime}>Dec 14, 10:12</Text>
                </View>

                {/* Parsed Items */}
                <View style={styles.parsedItemsBox}>
                  {EXTRACTED_ITEMS.map((item) => (
                    <View key={item.id} style={styles.parsedRow}>
                      <View style={styles.parsedItemLeft}>
                        <View style={styles.parsedDot} />
                        <Text style={styles.parsedItemName} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <Text style={styles.parsedItemPrice}>{item.price}</Text>
                    </View>
                  ))}
                </View>

                {/* Total Extracted */}
                <View style={styles.totalExtractedRow}>
                  <Text style={styles.totalExtractedLabel}>TOTAL EXTRACTED</Text>
                  <Text style={styles.totalExtractedValue}>₹840.00</Text>
                </View>
              </View>

              {/* Receipt Camera Thumb & Action Bar */}
              <View style={styles.receiptBottomRow}>
                <View style={styles.receiptThumbInfo}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1554415707-9e49016a3417?w=150&auto=format&fit=crop&q=80',
                    }}
                    style={styles.receiptThumb}
                  />
                  <View>
                    <View style={styles.recognizedTag}>
                      <Ionicons name="checkmark-circle" size={13} color={TOKENS.tertiary} />
                      <Text style={styles.recognizedText}>All 4 Items Recognized</Text>
                    </View>
                    <Text style={styles.originalSnapSaved}>Original paper snap saved</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.retakeBtn} onPress={() => Alert.alert('Camera', 'Open camera to retake receipt')}>
                  <Ionicons name="camera-outline" size={15} color={TOKENS.text} />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card 2: Extracted Bill Title, Total & Paid-by Card */}
          <View style={styles.card}>
            {/* Title edit box */}
            <View style={styles.titleEditBox}>
              <View style={styles.titleIconBox}>
                <Ionicons name="bag-handle-outline" size={16} color={TOKENS.primary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.fieldLabelMicro}>EXPENSE TITLE</Text>
                <Text style={styles.expenseTitleText} numberOfLines={1}>{expenseTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                if (typeof Alert.prompt === 'function') {
                  Alert.prompt('Edit Expense Title', 'Enter new title:', t => t && setExpenseTitle(t), 'plain-text', expenseTitle);
                } else {
                  Alert.alert('Expense Title', `Current title: ${expenseTitle}`);
                }
              }}>
                <Ionicons name="pencil" size={16} color={TOKENS.textVariant} />
              </TouchableOpacity>
            </View>

            {/* Total Hero Banner */}
            <View style={styles.heroTotalBox}>
              <View>
                <Text style={styles.heroTotalLabel}>Total Bill Amount</Text>
                <View style={styles.heroPriceRow}>
                  <Text style={styles.heroPriceValue}>₹840.00</Text>
                  <View style={styles.taxesBadge}>
                    <Text style={styles.taxesBadgeText}>Taxes incl.</Text>
                  </View>
                </View>
              </View>
              <View style={styles.paymentsIconBox}>
                <Ionicons name="card" size={22} color="#FFFFFF" />
              </View>
            </View>

            {/* Paid By & Date Grid */}
            <View style={styles.paidByGrid}>
              <View style={styles.paidByItem}>
                <Text style={styles.fieldLabelMicro}>PAID BY</Text>
                <View style={styles.paidByContent}>
                  <View style={styles.userMiniAvatar}>
                    <Text style={styles.userMiniText}>R</Text>
                  </View>
                  <Text style={styles.paidByName} numberOfLines={1}>You (Rahul)</Text>
                  <Ionicons name="chevron-down" size={14} color={TOKENS.textVariant} />
                </View>
              </View>

              <View style={styles.paidByItem}>
                <Text style={styles.fieldLabelMicro}>EXPENSE DATE</Text>
                <View style={styles.paidByContent}>
                  <Text style={styles.paidByName}>Today, 10:15 AM</Text>
                  <Ionicons name="calendar-outline" size={14} color={TOKENS.textVariant} />
                </View>
              </View>
            </View>
          </View>

          {/* Card 3: Split Mode Segmented Control */}
          <View style={styles.splitModeSection}>
            <View style={styles.splitModeHeader}>
              <Text style={styles.sectionTitle}>Split Logic</Text>
              <Text style={styles.itemsMapped}>4 Items Mapped</Text>
            </View>
            <View style={styles.segmentedContainer}>
              <TouchableOpacity
                style={[styles.segmentBtn, splitMode === 'itemized' && styles.segmentBtnActive]}
                onPress={() => setSplitMode('itemized')}
              >
                <Text style={[styles.segmentTitle, splitMode === 'itemized' && styles.segmentTitleActive]}>By Items</Text>
                <Text style={styles.segmentSub}>Itemized</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, splitMode === 'equally' && styles.segmentBtnActive]}
                onPress={() => setSplitMode('equally')}
              >
                <Text style={[styles.segmentTitle, splitMode === 'equally' && styles.segmentTitleActive]}>Equally</Text>
                <Text style={styles.segmentSub}>₹280 each</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, splitMode === 'exact' && styles.segmentBtnActive]}
                onPress={() => setSplitMode('exact')}
              >
                <Text style={[styles.segmentTitle, splitMode === 'exact' && styles.segmentTitleActive]}>Exact ₹</Text>
                <Text style={styles.segmentSub}>Custom</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, splitMode === 'shares' && styles.segmentBtnActive]}
                onPress={() => setSplitMode('shares')}
              >
                <Text style={[styles.segmentTitle, splitMode === 'shares' && styles.segmentTitleActive]}>Shares %</Text>
                <Text style={styles.segmentSub}>Ratio</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 4: Itemized Line-Items & Member Assignment List */}
          <View style={styles.card}>
            <View style={styles.itemizedCardHeader}>
              <Text style={styles.subtleTip}>Tap avatar bubbles to reassign items</Text>
              <TouchableOpacity onPress={() => {
                if (selectedItemIds.length === EXTRACTED_ITEMS.length) {
                  setSelectedItemIds([]);
                } else {
                  setSelectedItemIds(EXTRACTED_ITEMS.map(i => i.id));
                }
              }}>
                <Text style={styles.selectAllBtn}>{selectedItemIds.length === EXTRACTED_ITEMS.length ? 'Deselect All' : 'Select All'}</Text>
              </TouchableOpacity>
            </View>

            {EXTRACTED_ITEMS.map((item) => (
              <View key={item.id} style={styles.itemRowCard}>
                <View style={styles.checkIconBox}>
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.lineItemTitle}>{item.name}</Text>
                    <Text style={styles.lineItemPrice}>{item.price}</Text>
                  </View>
                  <View style={styles.itemBottomRow}>
                    <Text style={styles.itemShareText}>{item.shareText}</Text>
                    <View style={styles.avatarCluster}>
                      {item.avatars.map((av, idx) => (
                        <View key={idx} style={[styles.clusterAvatar, { backgroundColor: item.colors[idx] || TOKENS.primary }]}>
                          <Text style={styles.clusterAvatarText}>{av}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Card 5: Dynamic Member Split Breakdown Cards */}
          <View style={styles.card}>
            <View style={styles.breakdownHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pie-chart" size={18} color={TOKENS.primary} />
                <Text style={styles.breakdownTitle}>Member Split Summary</Text>
              </View>
              <View style={styles.verifiedMatch}>
                <Ionicons name="checkmark-circle" size={13} color={TOKENS.tertiary} />
                <Text style={styles.verifiedMatchText}>Matches ₹840.00</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 8 }}>
              {/* You (Rahul) */}
              <View style={styles.memberSummaryRow}>
                <View style={styles.memberLeft}>
                  <View style={[styles.memberAvatarCircle, { backgroundColor: TOKENS.primary }]}>
                    <Text style={styles.memberAvatarLetter}>R</Text>
                  </View>
                  <View>
                    <Text style={styles.memberNameText}>You (Rahul Sharma)</Text>
                    <Text style={styles.memberSubText}>Payer · Milk + Avo + Bread</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.memberAmountText}>₹300.00</Text>
                  <Text style={styles.memberShareStatus}>Your share</Text>
                </View>
              </View>

              {/* Aarav K. */}
              <View style={styles.memberSummaryRow}>
                <View style={styles.memberLeft}>
                  <View style={[styles.memberAvatarCircle, { backgroundColor: TOKENS.secondaryContainer }]}>
                    <Text style={[styles.memberAvatarLetter, { color: TOKENS.onSecondaryContainer }]}>A</Text>
                  </View>
                  <View>
                    <Text style={styles.memberNameText}>Aarav K.</Text>
                    <Text style={styles.memberSubText}>Milk + Avo + Yogurt</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.memberAmountText, { color: TOKENS.tertiary }]}>+ ₹310.00</Text>
                  <Text style={[styles.memberShareStatus, { color: TOKENS.tertiary }]}>Owes you</Text>
                </View>
              </View>

              {/* Rohan M. */}
              <View style={styles.memberSummaryRow}>
                <View style={styles.memberLeft}>
                  <View style={[styles.memberAvatarCircle, { backgroundColor: TOKENS.tertiaryFixedDim }]}>
                    <Text style={[styles.memberAvatarLetter, { color: TOKENS.tertiary }]}>Ro</Text>
                  </View>
                  <View>
                    <Text style={styles.memberNameText}>Rohan M.</Text>
                    <Text style={styles.memberSubText}>Milk + Yogurt</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.memberAmountText, { color: TOKENS.tertiary }]}>+ ₹230.00</Text>
                  <Text style={[styles.memberShareStatus, { color: TOKENS.tertiary }]}>Owes you</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 6: Notes & Community Audit Controls */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="document-text-outline" size={17} color={TOKENS.textVariant} />
              <Text style={styles.inputGroupLabel}>Group Audit Note</Text>
            </View>
            <TextInput
              style={styles.auditTextInput}
              value={auditNote}
              onChangeText={setAuditNote}
              placeholder="Add note for roommates..."
              placeholderTextColor={TOKENS.textMuted}
            />

            <View style={styles.toggleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="attach-outline" size={18} color={TOKENS.tertiary} />
                <View>
                  <Text style={styles.toggleTitle}>Attach verified bill proof</Text>
                  <Text style={styles.toggleSubtitle}>Visible in Flat 804 ledger</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.switchTrack, attachProof ? styles.switchTrackOn : styles.switchTrackOff]}
                onPress={() => setAttachProof(!attachProof)}
              >
                <View style={[styles.switchThumb, attachProof && styles.switchThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ── Sticky Footer Action Bar ── */}
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabs/pay'))}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => {
              Alert.alert('Expense Saved', 'Bill of ₹840 saved and split among 3 flatmates with OCR audit log attached.');
              router.back();
            }}
          >
            <Ionicons name="flash" size={17} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Save & Split Expense (₹840)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </StitchBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeTop: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    backgroundColor: 'rgba(250, 248, 255, 0.85)',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.surfaceLow,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.text,
  },
  userBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TOKENS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atmosphereRow: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  dragPill: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: TOKENS.surfaceHighest,
    marginBottom: 8,
  },
  statusSubRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoDraftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.tertiaryFixedDim,
  },
  autoDraftText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.tertiary,
  },
  autoDraftTime: {
    fontSize: 11,
    color: TOKENS.textVariant,
  },
  auditLogReady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  auditLogText: {
    fontSize: 11,
    color: TOKENS.textVariant,
    fontWeight: '500',
  },
  groupRailContainer: {
    paddingBottom: 10,
  },
  groupRail: {
    paddingHorizontal: 16,
    gap: 8,
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  groupPillActive: {
    backgroundColor: TOKENS.primary,
  },
  groupPillInactive: {
    backgroundColor: TOKENS.surfaceLow,
  },
  groupPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupPillTextActive: {
    color: '#FFFFFF',
  },
  groupPillTextInactive: {
    color: TOKENS.textVariant,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: TOKENS.surfaceContainer,
  },
  newGroupText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.primary,
  },
  scrollBody: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: TOKENS.surfaceLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: TOKENS.surfaceHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  ocrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 98, 71, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.tertiary,
    letterSpacing: 0.5,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.tertiary,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.tertiary,
  },
  receiptContainer: {
    backgroundColor: TOKENS.surfaceLow,
    borderRadius: 12,
    padding: 10,
  },
  receiptInner: {
    backgroundColor: TOKENS.surfaceLowest,
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLaser: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: TOKENS.tertiaryFixedDim,
    shadowColor: TOKENS.tertiaryFixedDim,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    zIndex: 10,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.surfaceHigh,
    paddingBottom: 8,
    marginBottom: 8,
  },
  receiptLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: TOKENS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.text,
  },
  storeSub: {
    fontSize: 10,
    color: TOKENS.textVariant,
    marginTop: 1,
  },
  billTime: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  parsedItemsBox: {
    gap: 6,
    paddingVertical: 4,
  },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 98, 71, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  parsedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  parsedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TOKENS.tertiary,
  },
  parsedItemName: {
    fontSize: 12,
    color: TOKENS.text,
    flex: 1,
  },
  parsedItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  totalExtractedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: TOKENS.surfaceHigh,
    paddingTop: 8,
    marginTop: 6,
  },
  totalExtractedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.text,
  },
  totalExtractedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.primary,
  },
  receiptBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
  },
  receiptThumbInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  recognizedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recognizedText: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.tertiary,
  },
  originalSnapSaved: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.text,
  },
  titleEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.surfaceLow,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  titleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelMicro: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.textVariant,
    letterSpacing: 0.5,
  },
  expenseTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.text,
    marginTop: 1,
  },
  heroTotalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.surfaceLow,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  heroTotalLabel: {
    fontSize: 12,
    color: TOKENS.textVariant,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroPriceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: TOKENS.primary,
  },
  taxesBadge: {
    backgroundColor: 'rgba(0, 125, 92, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taxesBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TOKENS.tertiary,
  },
  paymentsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TOKENS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidByGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  paidByItem: {
    flex: 1,
    backgroundColor: TOKENS.surfaceLow,
    padding: 10,
    borderRadius: 10,
  },
  paidByContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  userMiniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TOKENS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  userMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  paidByName: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.text,
    flex: 1,
  },
  splitModeSection: {
    gap: 8,
  },
  splitModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TOKENS.text,
  },
  itemsMapped: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.primary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.surfaceContainer,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: TOKENS.surfaceLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.textVariant,
  },
  segmentTitleActive: {
    color: TOKENS.primary,
    fontWeight: '700',
  },
  segmentSub: {
    fontSize: 9,
    color: TOKENS.textMuted,
    marginTop: 1,
  },
  itemizedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.surfaceContainer,
    paddingBottom: 8,
    marginBottom: 8,
  },
  subtleTip: {
    fontSize: 11,
    color: TOKENS.textVariant,
  },
  selectAllBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.primary,
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: TOKENS.surfaceLow,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  checkIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: TOKENS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.text,
    flex: 1,
  },
  lineItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.text,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemShareText: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  avatarCluster: {
    flexDirection: 'row',
  },
  clusterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  clusterAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.text,
  },
  verifiedMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 98, 71, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.tertiary,
  },
  memberSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.surfaceLow,
    padding: 10,
    borderRadius: 10,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLetter: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  memberNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.text,
  },
  memberSubText: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  memberAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.text,
  },
  memberShareStatus: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  inputGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.text,
  },
  auditTextInput: {
    backgroundColor: TOKENS.surfaceLow,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TOKENS.text,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.text,
  },
  toggleSubtitle: {
    fontSize: 10,
    color: TOKENS.textVariant,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: TOKENS.tertiary,
  },
  switchTrackOff: {
    backgroundColor: TOKENS.surfaceHigh,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: TOKENS.surfaceContainer,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: TOKENS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.text,
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: TOKENS.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: TOKENS.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
