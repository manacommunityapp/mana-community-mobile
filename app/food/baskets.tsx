import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator,
  Switch, SafeAreaView,
} from 'react-native';
import { foodOpsService, RecurringBasketDto, BasketFrequency } from '@/services/foodOpsService';

const FREQ_LABELS: Record<BasketFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
};

const FREQ_COLOR: Record<BasketFrequency, string> = {
  DAILY: '#2563EB',
  WEEKLY: '#059669',
  FORTNIGHTLY: '#7C3AED',
  MONTHLY: '#D97706',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#059669',
  PAUSED: '#D97706',
  CANCELLED: '#6B7280',
};

export default function RecurringBasketsScreen() {
  const [baskets, setBaskets] = useState<RecurringBasketDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RecurringBasketDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFreq, setNewFreq] = useState<BasketFrequency>('WEEKLY');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    foodOpsService.getBaskets().then(setBaskets).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, []);

  const handleAction = (basket: RecurringBasketDto, action: 'pause' | 'resume' | 'cancel') => {
    Alert.alert(
      action === 'cancel' ? 'Cancel basket?' : `${action === 'pause' ? 'Pause' : 'Resume'} basket?`,
      action === 'cancel' ? 'This cannot be undone.' : undefined,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: action === 'cancel' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (action === 'pause') await foodOpsService.pauseBasket(basket.id);
              else if (action === 'resume') await foodOpsService.resumeBasket(basket.id);
              else await foodOpsService.deleteBasket(basket.id);
              load();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'Action failed.');
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Required', 'Please enter a basket name.'); return; }
    setCreating(true);
    try {
      await foodOpsService.createBasket({ name: newName.trim(), frequency: newFreq, firstDeliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], items: [] });
      setShowCreate(false);
      setNewName('');
      setNewFreq('WEEKLY');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create basket.');
    } finally {
      setCreating(false);
    }
  };

  const renderBasket = ({ item }: { item: RecurringBasketDto }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} onLongPress={() => {
      const options = item.status === 'ACTIVE'
        ? [{ text: 'Pause', onPress: () => handleAction(item, 'pause') }]
        : item.status === 'PAUSED'
          ? [{ text: 'Resume', onPress: () => handleAction(item, 'resume') }]
          : [];
      Alert.alert(item.name, 'Choose action', [
        ...options,
        { text: 'Cancel basket', style: 'destructive', onPress: () => handleAction(item, 'cancel') },
        { text: 'Close', style: 'cancel' },
      ]);
    }}>
      <View style={styles.cardHeader}>
        <Text style={styles.basketName}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={[styles.freqChip, { backgroundColor: FREQ_COLOR[item.frequency] + '22' }]}>
          <Text style={[styles.freqText, { color: FREQ_COLOR[item.frequency] }]}>{FREQ_LABELS[item.frequency]}</Text>
        </View>
        <Text style={styles.metaText}>Next: {item.nextOrderDate}</Text>
        <Text style={styles.metaText}>{item.items.length} items</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Recurring Baskets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" /> : (
        <FlatList
          data={baskets}
          keyExtractor={b => String(b.id)}
          renderItem={renderBasket}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No recurring baskets yet. Tap + New to create one.</Text>}
        />
      )}

      {/* Basket detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {selected?.items.length === 0 && <Text style={styles.empty}>No items in this basket.</Text>}
              {selected?.items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemMeta}>Qty: {item.quantity} · ₹{item.unitPrice}/unit</Text>
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Substitute OK</Text>
                    <Switch value={item.acceptSubstitutes} disabled />
                  </View>
                </View>
              ))}
            </ScrollView>
            {selected?.status === 'ACTIVE' && (
              <TouchableOpacity style={styles.pauseBtn} onPress={() => { handleAction(selected, 'pause'); setSelected(null); }}>
                <Text style={styles.pauseBtnText}>Pause Basket</Text>
              </TouchableOpacity>
            )}
            {selected?.status === 'PAUSED' && (
              <TouchableOpacity style={[styles.pauseBtn, { backgroundColor: '#059669' }]} onPress={() => { handleAction(selected, 'resume'); setSelected(null); }}>
                <Text style={styles.pauseBtnText}>Resume Basket</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Create basket modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Recurring Basket</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={styles.label}>Basket name *</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g. Daily vegetables" placeholderTextColor="#9CA3AF" />
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.freqRow}>
                {(Object.keys(FREQ_LABELS) as BasketFrequency[]).map(f => (
                  <TouchableOpacity key={f} style={[styles.freqOption, newFreq === f && styles.freqOptionActive]} onPress={() => setNewFreq(f)}>
                    <Text style={[styles.freqOptionText, newFreq === f && styles.freqOptionTextActive]}>{FREQ_LABELS[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.addBtn, { marginTop: 20 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Create Basket</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  basketName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  freqChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  freqText: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 12, color: '#6B7280' },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 14, marginTop: 40, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#374151' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  switchRow: { alignItems: 'center' },
  switchLabel: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
  pauseBtn: { margin: 16, backgroundColor: '#D97706', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  pauseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqOption: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  freqOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  freqOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  freqOptionTextActive: { color: '#fff' },
});
