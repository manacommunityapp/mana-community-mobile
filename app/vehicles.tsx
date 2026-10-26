import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { parkingService, type ResidentVehicleDto, type ResidentVehicleRequest } from '@/services/parkingService';

const emptyForm: ResidentVehicleRequest = { vehicleType: 'CAR', numberPlate: '', make: '', model: '', color: '', stickerNumber: '', primary: false };

export default function MyVehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<ResidentVehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ResidentVehicleDto | null>(null);
  const [form, setForm] = useState<ResidentVehicleRequest>(emptyForm);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVehicles(await parkingService.getMyVehicles()); }
    catch (e: any) { Alert.alert('Could not load vehicles', e?.response?.data?.message || 'Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openForm = (vehicle?: ResidentVehicleDto) => {
    setEditing(vehicle || null);
    setForm(vehicle ? { vehicleType: (vehicle.vehicleType as any) || 'CAR', numberPlate: vehicle.numberPlate, make: vehicle.make || '', model: vehicle.model || '', color: vehicle.color || '', stickerNumber: vehicle.stickerNumber || '', primary: vehicle.primary } : { ...emptyForm });
    setModal(true);
  };
  const save = async () => {
    if (!form.numberPlate.trim()) return Alert.alert('License plate required');
    setSaving(true);
    try {
      const payload = { ...form, numberPlate: form.numberPlate.trim().toUpperCase() };
      if (editing) await parkingService.updateVehicle(editing.id, payload); else await parkingService.registerVehicle(payload);
      setModal(false); await load();
    } catch (e: any) { Alert.alert('Could not save vehicle', e?.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };
  const remove = (vehicle: ResidentVehicleDto) => Alert.alert('Remove vehicle?', vehicle.numberPlate, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { try { await parkingService.deleteVehicle(vehicle.id); await load(); } catch (e: any) { Alert.alert('Could not remove vehicle', e?.response?.data?.message || 'Please try again.'); } } },
  ]);

  return <SafeAreaView style={s.container} edges={['top', 'bottom']}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity><Text style={s.title}>My Vehicles</Text><TouchableOpacity onPress={() => openForm()}><Ionicons name="add-circle" size={28} color={COLORS.primary} /></TouchableOpacity></View>
    <Text style={s.subtitle}>Register plates for resident access and ANPR gate entry.</Text>
    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : <FlatList data={vehicles} keyExtractor={(v) => String(v.id)} contentContainerStyle={s.list} refreshing={loading} onRefresh={load} ListEmptyComponent={<View style={s.empty}><Ionicons name="car-outline" size={42} color={COLORS.textMuted} /><Text style={s.emptyTitle}>No vehicles registered</Text><Text style={s.emptyText}>Add your car, bike or EV to enable resident gate access.</Text><TouchableOpacity style={s.primaryBtn} onPress={() => openForm()}><Text style={s.primaryText}>Add vehicle</Text></TouchableOpacity></View>} renderItem={({ item }) => <View style={s.card}><View style={s.vehicleIcon}><Ionicons name={item.vehicleType === 'BIKE' ? 'bicycle' : 'car-sport'} size={25} color={COLORS.primary} /></View><View style={{ flex: 1 }}><View style={s.row}><Text style={s.plate}>{item.numberPlate}</Text>{item.primary && <Text style={s.badge}>PRIMARY</Text>}</View><Text style={s.meta}>{[item.make, item.model, item.color].filter(Boolean).join(' • ') || item.vehicleType}</Text><Text style={s.meta}>{item.parkingSlotNumber ? `Slot ${item.parkingSlotNumber}` : 'No parking slot assigned'}{item.stickerNumber ? `  ·  Sticker ${item.stickerNumber}` : ''}</Text></View><View style={s.actions}><TouchableOpacity onPress={() => openForm(item)}><Ionicons name="create-outline" size={21} color={COLORS.textSecondary} /></TouchableOpacity><TouchableOpacity onPress={() => remove(item)}><Ionicons name="trash-outline" size={21} color={COLORS.error} /></TouchableOpacity></View></View>} />}
    <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}><View style={s.overlay}><View style={s.sheet}><View style={s.sheetHead}><Text style={s.sheetTitle}>{editing ? 'Edit vehicle' : 'Add vehicle'}</Text><TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity></View><Text style={s.label}>Vehicle type</Text><View style={s.types}>{(['CAR', 'BIKE', 'EV'] as const).map(type => <Pressable key={type} style={[s.typeBtn, form.vehicleType === type && s.typeSelected]} onPress={() => setForm(f => ({ ...f, vehicleType: type }))}><Text style={[s.typeText, form.vehicleType === type && s.typeTextSelected]}>{type}</Text></Pressable>)}</View>{[['numberPlate','License plate *'],['make','Make'],['model','Model'],['color','Color'],['stickerNumber','Sticker number']].map(([key, label]) => <TextInput key={key} style={s.input} placeholder={label} autoCapitalize="characters" value={(form as any)[key] || ''} onChangeText={v => setForm(f => ({ ...f, [key]: v }))} />)}<Pressable style={s.checkRow} onPress={() => setForm(f => ({ ...f, primary: !f.primary }))}><Ionicons name={form.primary ? 'checkbox' : 'square-outline'} size={22} color={form.primary ? COLORS.primary : COLORS.textMuted} /><Text style={s.checkText}>Make this my primary vehicle</Text></Pressable><TouchableOpacity style={s.primaryBtn} disabled={saving} onPress={save}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{editing ? 'Save changes' : 'Register vehicle'}</Text>}</TouchableOpacity></View></View></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, backgroundColor: COLORS.surface }, title: { fontSize: 20, fontWeight: '800', color: COLORS.text }, subtitle: { padding: SPACING.lg, paddingTop: 0, color: COLORS.textSecondary }, list: { padding: SPACING.lg, gap: 12 }, card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.sm }, vehicleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, plate: { fontSize: 17, fontWeight: '800', color: COLORS.text }, badge: { fontSize: 9, fontWeight: '800', color: COLORS.successDark, backgroundColor: COLORS.successLight, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 }, meta: { color: COLORS.textMuted, marginTop: 3, fontSize: 12 }, actions: { gap: 16 }, empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 }, emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '800', color: COLORS.text }, emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 6 }, primaryBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 18 }, primaryText: { color: '#fff', fontWeight: '800' }, overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' }, sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 30 }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text }, label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 }, types: { flexDirection: 'row', gap: 8, marginBottom: 12 }, typeBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md, padding: 11, alignItems: 'center' }, typeSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight }, typeText: { fontWeight: '700', color: COLORS.textMuted }, typeTextSelected: { color: COLORS.primary }, input: { borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10, color: COLORS.text }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }, checkText: { color: COLORS.textSecondary }, }
);
