import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { foodOpsService, OrderRefund, RefundStatus } from '@/services/foodOpsService';

const statusStyle: Record<RefundStatus, { bg: string; text: string }> = {
  INITIATED: { bg: '#EFF6FF', text: '#1D4ED8' },
  APPROVED: { bg: '#D1FAE5', text: '#065F46' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  PROCESSED: { bg: '#F3F4F6', text: '#374151' },
};

export default function RefundsScreen() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<OrderRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setRefunds(await foodOpsService.getRefunds(showAll ? undefined : 'INITIATED'));
    } catch {
      Alert.alert('Error', 'Failed to load refunds');
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [showAll]);

  useEffect(() => { load(); }, [load]);

  const review = (refund: OrderRefund, approve: boolean) => {
    Alert.alert(approve ? 'Approve Refund' : 'Reject Refund', `₹${refund.amount} refund for order #${refund.orderId}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: approve ? 'Approve' : 'Reject',
        style: approve ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await foodOpsService.reviewRefund(refund.id, approve, notes || undefined);
            setReviewing(null);
            setNotes('');
            load();
          } catch {
            Alert.alert('Error', 'Review failed');
          }
        }
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#F59E0B" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Refunds</Text>
          <TouchableOpacity onPress={() => setShowAll(v => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>{showAll ? 'Pending Only' : 'Show All'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {refunds.length === 0 ? (
          <Text style={styles.empty}>No refunds found</Text>
        ) : (
          refunds.map(refund => {
            const ss = statusStyle[refund.status];
            return (
              <View key={refund.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amount}>₹{refund.amount}</Text>
                      {refund.autoApproved && (
                        <View style={styles.autoBadge}><Text style={styles.autoText}>AUTO</Text></View>
                      )}
                    </View>
                    <Text style={styles.sub}>Order #{refund.orderId} · {refund.triggerType.replace(/_/g, ' ')}</Text>
                    <Text style={styles.sub}>{new Date(refund.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.badgeText, { color: ss.text }]}>{refund.status}</Text>
                  </View>
                </View>

                {refund.itemDetails ? <Text style={styles.detail}>{refund.itemDetails}</Text> : null}

                {reviewing === refund.id && (
                  <View style={styles.reviewBox}>
                    <TextInput
                      placeholder="Notes (optional)"
                      value={notes}
                      onChangeText={setNotes}
                      style={styles.notesInput}
                      multiline
                      numberOfLines={2}
                    />
                    <View style={styles.reviewBtns}>
                      <TouchableOpacity onPress={() => review(refund, true)} style={styles.approveBtn}>
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => review(refund, false)} style={styles.rejectBtn}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setReviewing(null); setNotes(''); }} style={styles.cancelReview}>
                        <Text style={styles.cancelReviewText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {refund.status === 'INITIATED' && !refund.autoApproved && reviewing !== refund.id && (
                  <TouchableOpacity onPress={() => setReviewing(refund.id)} style={styles.reviewBtn}>
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 8 },
  toggleText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  scroll: { padding: 16 },
  empty: { textAlign: 'center', marginTop: 60, color: '#9CA3AF', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  autoBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  autoText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  sub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detail: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },
  reviewBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  notesInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  reviewBtns: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, padding: 10, backgroundColor: '#10B981', borderRadius: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  rejectBtn: { flex: 1, padding: 10, backgroundColor: '#EF4444', borderRadius: 10, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelReview: { padding: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10 },
  cancelReviewText: { fontSize: 13, color: '#6B7280' },
  reviewBtn: { marginTop: 10, padding: 10, backgroundColor: '#3B82F6', borderRadius: 10, alignItems: 'center' },
  reviewBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
