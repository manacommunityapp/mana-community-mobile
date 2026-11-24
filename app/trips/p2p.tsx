import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { tripP2PService, P2PDebt, P2PDebtStatus } from '@/services/tripP2PService';

const STATUS_CONFIG: Record<P2PDebtStatus, { label: string; bg: string; text: string }> = {
  PENDING_VPA:       { label: 'Awaiting VPA',   bg: '#FEF3C7', text: '#B45309' },
  COLLECT_INITIATED: { label: 'Request Sent',    bg: '#DBEAFE', text: '#1D4ED8' },
  COLLECT_APPROVED:  { label: 'Approved',        bg: '#D1FAE5', text: '#065F46' },
  COLLECT_REJECTED:  { label: 'Rejected',        bg: '#FEE2E2', text: '#991B1B' },
  COLLECT_EXPIRED:   { label: 'Expired',         bg: '#F3F4F6', text: '#6B7280' },
  CANCELLED:         { label: 'Cancelled',       bg: '#F3F4F6', text: '#6B7280' },
};

function StatusBadge({ status }: { status: P2PDebtStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export default function TripP2PScreen() {
  const params = useLocalSearchParams<{ tripId: string; tripTitle?: string }>();
  const tripId = Number(params.tripId);
  const tripTitle = params.tripTitle || 'Community Trip';
  const { user } = useAuth();
  const currentUserId = (user as any)?.id ?? (user as any)?.userId;
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  // Add Debt modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [debtorUserId, setDebtorUserId] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDesc, setDebtDesc] = useState('');

  // VPA / Send Collect modal
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<P2PDebt | null>(null);
  const [vpaInput, setVpaInput] = useState('');

  const {
    data: debts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['trip-p2p-debts', tripId],
    queryFn: () => tripP2PService.listDebts(tripId),
    enabled: !!tripId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const createDebtMutation = useMutation({
    mutationFn: () =>
      tripP2PService.createDebt(tripId, Number(debtorUserId), parseFloat(debtAmount), debtDesc.trim()),
    onSuccess: () => {
      setAddModalVisible(false);
      setDebtorUserId('');
      setDebtAmount('');
      setDebtDesc('');
      queryClient.invalidateQueries({ queryKey: ['trip-p2p-debts', tripId] });
      Alert.alert('Debt Created', 'You can now send a UPI collect request to the participant.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not create debt record.');
    },
  });

  const initiateCollectMutation = useMutation({
    mutationFn: ({ debtId, vpa }: { debtId: number; vpa: string }) =>
      tripP2PService.initiateCollect(debtId, vpa),
    onSuccess: () => {
      setCollectModalVisible(false);
      setVpaInput('');
      setSelectedDebt(null);
      queryClient.invalidateQueries({ queryKey: ['trip-p2p-debts', tripId] });
      Alert.alert('Collect Request Sent', 'The participant will receive a UPI collect request on their phone.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not initiate UPI collect.');
    },
  });

  const cancelDebtMutation = useMutation({
    mutationFn: (debtId: number) => tripP2PService.cancelDebt(debtId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-p2p-debts', tripId] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not cancel debt.');
    },
  });

  const handleAddDebt = () => {
    const uid = Number(debtorUserId);
    const amt = parseFloat(debtAmount);
    if (!uid || isNaN(uid) || uid <= 0) {
      Alert.alert('Required', 'Please enter a valid participant user ID.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!debtDesc.trim()) {
      Alert.alert('Required', 'Please enter a description.');
      return;
    }
    createDebtMutation.mutate();
  };

  const handleSendCollect = () => {
    if (!selectedDebt) return;
    const vpa = vpaInput.trim();
    if (!vpa || !vpa.includes('@')) {
      Alert.alert('Invalid VPA', 'Please enter a valid UPI VPA (e.g. name@upi).');
      return;
    }
    initiateCollectMutation.mutate({ debtId: selectedDebt.id, vpa });
  };

  const myOutgoing = debts.filter((d) => String(d.creditorUserId) === String(currentUserId));
  const myIncoming = debts.filter((d) => String(d.debtorUserId) === String(currentUserId));

  const renderDebt = ({ item }: { item: P2PDebt }) => {
    const isCreditor = String(item.creditorUserId) === String(currentUserId);
    const canCollect = isCreditor && item.status === 'PENDING_VPA';
    const canCancel =
      isCreditor && (item.status === 'PENDING_VPA' || item.status === 'COLLECT_INITIATED');

    return (
      <View style={styles.debtCard}>
        <View style={styles.debtRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtDesc} numberOfLines={1}>
              {item.description || 'Trip expense reimbursement'}
            </Text>
            <Text style={styles.debtMeta}>
              {isCreditor
                ? `Owed by: ${item.debtorName || `User #${item.debtorUserId}`}`
                : `You owe: ${item.creditorName || `User #${item.creditorUserId}`}`}
            </Text>
            {item.upiVpa ? (
              <Text style={styles.vpaText}>UPI: {item.upiVpa}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={styles.debtAmount}>₹{item.amount.toLocaleString()}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>

        {(canCollect || canCancel) && (
          <View style={styles.debtActions}>
            {canCollect && (
              <TouchableOpacity
                style={styles.collectBtn}
                onPress={() => {
                  setSelectedDebt(item);
                  setVpaInput('');
                  setCollectModalVisible(true);
                }}
              >
                <Ionicons name="send" size={12} color="#FFFFFF" />
                <Text style={styles.collectBtnText}>Send Collect Request</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelDebtBtn}
                onPress={() => {
                  Alert.alert('Cancel Request', 'Cancel this UPI collect request?', [
                    { text: 'No', style: 'cancel' },
                    {
                      text: 'Yes',
                      style: 'destructive',
                      onPress: () => cancelDebtMutation.mutate(item.id),
                    },
                  ]);
                }}
              >
                <Text style={styles.cancelDebtBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
      }
    >
      {/* Hero */}
      <LinearGradient colors={GRADIENTS.hero} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroBadge}>
          <Ionicons name="phone-portrait-outline" size={13} color="#FFFFFF" />
          <Text style={styles.heroBadgeText}>P2P UPI Collect</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={1}>{tripTitle}</Text>
        <Text style={styles.heroSub}>
          Reclaim trip fees via UPI Collect — the participant approves from their UPI app.
        </Text>
      </LinearGradient>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
        <Text style={styles.infoText}>
          Use this when you paid the trip booking fee for someone else. Create a debt record, then send them
          a UPI collect request (pull payment) so they can approve repayment from any UPI app.
        </Text>
      </View>

      {/* Add Debt CTA */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setAddModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={18} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Create Collect Request</Text>
      </TouchableOpacity>

      {/* Outgoing debts (I am the creditor) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Requests You Sent ({myOutgoing.length})</Text>
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
        ) : myOutgoing.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No outgoing collect requests</Text>
          </View>
        ) : (
          <FlatList
            data={myOutgoing}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderDebt}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          />
        )}
      </View>

      {/* Incoming debts (I am the debtor) */}
      {myIncoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests You Received ({myIncoming.length})</Text>
          <FlatList
            data={myIncoming}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderDebt}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          />
        </View>
      )}

      {/* Modal: Create Debt */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create Collect Request</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Participant User ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1042"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={debtorUserId}
                onChangeText={setDebtorUserId}
              />

              <Text style={styles.fieldLabel}>Amount Owed (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={debtAmount}
                onChangeText={setDebtAmount}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Trip booking fee for Ooty trek"
                placeholderTextColor={COLORS.textMuted}
                value={debtDesc}
                onChangeText={setDebtDesc}
              />

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAddDebt}
                  disabled={createDebtMutation.isPending}
                >
                  {createDebtMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Send Collect (enter VPA) */}
      <Modal
        visible={collectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCollectModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Send UPI Collect Request</Text>
              <TouchableOpacity onPress={() => setCollectModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedDebt && (
              <View style={styles.debtSummary}>
                <Text style={styles.debtSummaryText}>
                  Collecting ₹{selectedDebt.amount.toLocaleString()} from{' '}
                  {selectedDebt.debtorName || `User #${selectedDebt.debtorUserId}`}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Their UPI VPA</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. name@paytm, 9876543210@ybl"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor={COLORS.textMuted}
              value={vpaInput}
              onChangeText={setVpaInput}
            />
            <Text style={styles.vpaHint}>
              The participant will receive a collect request in their UPI app and must approve it.
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCollectModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSendCollect}
                disabled={initiateCollectMutation.isPending}
              >
                {initiateCollectMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl * 2 },
  hero: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 16 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    margin: SPACING.md,
    backgroundColor: '#DBEAFE',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: '#1E3A8A', lineHeight: 18 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  section: { margin: SPACING.md, marginTop: SPACING.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  empty: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
  debtCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  debtDesc: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  debtMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  vpaText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  debtAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  debtActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  collectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  collectBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cancelDebtBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelDebtBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  debtSummary: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  debtSummaryText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  vpaHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
