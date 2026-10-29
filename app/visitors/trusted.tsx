import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/config';
import { securityOperationsService, type SecurityRecord } from '@/services/securityOperationsService';

export default function TrustedVisitorsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SecurityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timeWindow, setTimeWindow] = useState('Daily · 06:00–22:00');
  const [formErr, setFormErr] = useState('');
  const [confirmItem, setConfirmItem] = useState<SecurityRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      setItems(await securityOperationsService.getTrustedVisitors());
    } catch (e: any) {
      setLoadErr(e?.response?.data?.message || 'Could not load trusted visitors. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) { setFormErr('Name required'); return; }
    setFormErr('');
    try {
      await securityOperationsService.createTrustedVisitor({
        name: name.trim(),
        phone: phone.trim(),
        timeWindow,
        purpose: 'Recurring resident-approved entry',
      });
      setName('');
      setPhone('');
      setModal(false);
      load();
    } catch (e: any) {
      setFormErr(e?.response?.data?.message || 'Could not save visitor. Try again.');
    }
  };

  const remove = async (item: SecurityRecord) => {
    setConfirmItem(null);
    await securityOperationsService.deleteTrustedVisitor(item.id);
    load();
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.title}>Trusted visitors</Text>
        <TouchableOpacity onPress={() => setModal(true)}>
          <Ionicons name="add-circle" size={27} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={s.sub}>Maid, driver and family passes are auto-approved during their time window.</Text>

      {!!loadErr && (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>{loadErr}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="shield-checkmark-outline" size={42} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No trusted visitors</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.icon}>
                <Ionicons name="person" size={21} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta}>{item.phone || 'No phone'} · {item.timeWindow || 'Always'}</Text>
                {confirmItem?.id === item.id && (
                  <View style={s.confirmRow}>
                    <Text style={s.confirmText}>Remove this visitor?</Text>
                    <TouchableOpacity style={s.confirmYes} onPress={() => remove(item)}>
                      <Text style={s.confirmYesText}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.confirmNo} onPress={() => setConfirmItem(null)}>
                      <Text style={s.confirmNoText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {confirmItem?.id !== item.id && (
                <TouchableOpacity onPress={() => setConfirmItem(item)}>
                  <Ionicons name="trash-outline" size={21} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => { setModal(false); setFormErr(''); }}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Add trusted visitor</Text>
              <TouchableOpacity onPress={() => { setModal(false); setFormErr(''); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {!!formErr && (
              <View style={s.formError}>
                <Text style={s.formErrorText}>{formErr}</Text>
              </View>
            )}
            <TextInput
              style={s.input}
              placeholder="Name *"
              value={name}
              onChangeText={v => { setName(v); setFormErr(''); }}
            />
            <TextInput
              style={s.input}
              placeholder="Phone"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={s.input}
              placeholder="Time window"
              value={timeWindow}
              onChangeText={setTimeWindow}
            />
            <TouchableOpacity style={s.primary} onPress={add}>
              <Text style={s.primaryText}>Save trusted visitor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, backgroundColor: COLORS.surface },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, color: COLORS.textSecondary },
  list: { padding: SPACING.lg, gap: 10 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', color: COLORS.text },
  meta: { color: COLORS.textMuted, marginTop: 3, fontSize: 12 },
  empty: { alignItems: 'center', padding: 45 },
  emptyTitle: { color: COLORS.textMuted, marginTop: 10 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md, padding: 12, marginBottom: 10 },
  primary: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginTop: 5 },
  primaryText: { color: '#fff', fontWeight: '800' },
  errorBanner: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: 12 },
  errorBannerText: { color: '#991B1B', fontWeight: '600', fontSize: 13 },
  formError: { backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  formErrorText: { color: '#991B1B', fontSize: 13, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  confirmText: { fontSize: 12, color: COLORS.textSecondary },
  confirmYes: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confirmYesText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  confirmNo: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confirmNoText: { color: COLORS.textMuted, fontSize: 12 },
});
