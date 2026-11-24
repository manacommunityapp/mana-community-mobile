import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductSubstituteDto } from '@/services/foodOpsService';

export interface SubstituteDecision {
  originalProductId: number;
  originalProductName: string;
  accepted: boolean;
  substituteProductId?: number;
  substituteProductName?: string;
  priceDifference?: number;
}

interface SubstitutesScreenProps {
  substitutes?: ProductSubstituteDto[];
  onConfirm?: (decisions: SubstituteDecision[]) => void;
}

export default function SubstitutesScreen({ substitutes = [], onConfirm }: SubstitutesScreenProps) {
  const [decisions, setDecisions] = useState<Record<number, 'accepted' | 'removed' | null>>({});

  const decide = (productId: number, choice: 'accepted' | 'removed') => {
    setDecisions(prev => ({ ...prev, [productId]: choice }));
  };

  const accepted = substitutes.filter(s => decisions[s.originalProductId] === 'accepted');
  const removed = substitutes.filter(s => decisions[s.originalProductId] === 'removed');
  const pending = substitutes.filter(s => !decisions[s.originalProductId]);
  const priceDelta = accepted.reduce((sum, s) => sum + s.priceDifference, 0);

  const handleConfirm = () => {
    if (pending.length > 0) {
      Alert.alert(
        'Pending decisions',
        `You haven't decided on ${pending.length} item(s). They will be removed if unresolved.`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Continue anyway', onPress: () => submit() },
        ]
      );
      return;
    }
    submit();
  };

  const submit = () => {
    if (onConfirm) {
      onConfirm(substitutes.map(s => ({
        originalProductId: s.originalProductId,
        originalProductName: s.originalProductName,
        accepted: decisions[s.originalProductId] === 'accepted',
        substituteProductId: decisions[s.originalProductId] === 'accepted' ? s.substituteProductId : undefined,
        substituteProductName: decisions[s.originalProductId] === 'accepted' ? s.substituteProductName : undefined,
        priceDifference: decisions[s.originalProductId] === 'accepted' ? s.priceDifference : undefined,
      })));
    }
  };

  if (substitutes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.heading}>Out-of-stock items</Text>
        <View style={styles.emptyWrap}><Text style={styles.empty}>No substitutions needed.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Out-of-stock items</Text>
      <Text style={styles.sub}>{substitutes.length} items unavailable — accept a substitute or remove from order</Text>

      <FlatList
        data={substitutes}
        keyExtractor={s => String(s.originalProductId)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const dec = decisions[item.originalProductId];
          return (
            <View style={styles.card}>
              <View style={styles.originalRow}>
                <Text style={styles.outLabel}>Out of stock</Text>
                <Text style={styles.originalName}>{item.originalProductName}</Text>
              </View>
              <View style={styles.subRow}>
                <Text style={styles.arrow}>→</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName}>{item.substituteProductName}</Text>
                  <Text style={[styles.priceDiff, { color: item.priceDifference > 0 ? '#DC2626' : item.priceDifference < 0 ? '#059669' : '#6B7280' }]}>
                    {item.priceDifference > 0 ? `+₹${item.priceDifference}` : item.priceDifference < 0 ? `-₹${Math.abs(item.priceDifference)}` : 'Same price'}
                  </Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn, dec === 'accepted' && styles.actionBtnActive]}
                  onPress={() => decide(item.originalProductId, 'accepted')}
                >
                  <Text style={[styles.actionBtnText, dec === 'accepted' && styles.actionBtnTextActive]}>✓ Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeBtn, dec === 'removed' && styles.removeBtnActive]}
                  onPress={() => decide(item.originalProductId, 'removed')}
                >
                  <Text style={[styles.actionBtnText, dec === 'removed' && { color: '#fff' }]}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Accepted substitutes:</Text>
          <Text style={styles.summaryValue}>{accepted.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items removed:</Text>
          <Text style={styles.summaryValue}>{removed.length}</Text>
        </View>
        {priceDelta !== 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price impact:</Text>
            <Text style={[styles.summaryValue, { color: priceDelta > 0 ? '#DC2626' : '#059669' }]}>
              {priceDelta > 0 ? `+₹${priceDelta}` : `-₹${Math.abs(priceDelta)}`}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>Confirm substitutions ({substitutes.length - pending.length}/{substitutes.length} resolved)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 16 },
  sub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  originalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  outLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  originalName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  subRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  arrow: { fontSize: 18, color: '#9CA3AF', marginTop: 2 },
  subName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  priceDiff: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  acceptBtn: { borderColor: '#059669', backgroundColor: '#fff' },
  removeBtn: { borderColor: '#DC2626', backgroundColor: '#fff' },
  actionBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  removeBtnActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  actionBtnTextActive: { color: '#fff' },
  summary: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  confirmBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
