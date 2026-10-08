import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { GroupOrderDto } from '@/types/groupBuying';

export default function PickupScannerScreen() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<GroupOrderDto | null>(null);

  const handleVerify = async () => {
    if (!tokenInput.trim()) {
      Alert.alert('Required', 'Please enter or scan a pass token.');
      return;
    }
    setLoading(true);
    try {
      const res = await groupBuyingService.verifyPickupPass(tokenInput.trim());
      if (res.success && res.order) {
        setVerifiedOrder(res.order);
      } else {
        Alert.alert('Invalid Pass', res.message || 'Pass could not be verified.');
      }
    } catch {
      Alert.alert('Error', 'Verification failed. Please check token.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHandover = () => {
    Alert.alert('Handover Completed', 'Items marked as collected and resident notified.', [
      { text: 'OK', onPress: () => { setVerifiedOrder(null); setTokenInput(''); } }
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Scan Pickup Pass', headerBackTitle: 'Back' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.cameraMock}>
          <Ionicons name="scan-circle-outline" size={72} color={COLORS.primary} />
          <Text style={s.cameraTitle}>QR Scanner Active</Text>
          <Text style={s.cameraSub}>Align resident QR pass within frame or enter passcode below</Text>
        </View>

        <View style={s.manualWrap}>
          <Text style={s.inputLabel}>Enter Passcode / Token Manually</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="e.g. TKN-D1-17280..."
              placeholderTextColor={COLORS.textMuted}
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={s.verifyBtn} onPress={handleVerify} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyBtnText}>Verify</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {verifiedOrder && (
          <View style={s.resultCard}>
            <View style={s.successHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <Text style={s.successTitle}>Pass Verified ✓</Text>
            </View>

            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Order ID:</Text>
              <Text style={s.detailValue}>{verifiedOrder.id}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Product:</Text>
              <Text style={s.detailValue}>{verifiedOrder.title}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Quantity:</Text>
              <Text style={s.detailValueBold}>{verifiedOrder.qty} units</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Total Paid:</Text>
              <Text style={s.detailValue}>₹{(verifiedOrder.total ?? verifiedOrder.totalPrice ?? 0).toLocaleString()}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Pickup Desk:</Text>
              <Text style={s.detailValue}>{verifiedOrder.pickupPoint ?? 'Clubhouse'}</Text>
            </View>

            <TouchableOpacity style={s.handoverBtn} onPress={handleConfirmHandover} activeOpacity={0.85}>
              <Ionicons name="cube-outline" size={18} color="#fff" />
              <Text style={s.handoverBtnText}>Confirm Item Handover</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.lg },
  cameraMock: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 36, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primaryLight, borderStyle: 'dashed', ...SHADOWS.sm },
  cameraTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cameraSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  manualWrap: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  verifyBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 12, borderWidth: 1, borderColor: '#86EFAC', ...SHADOWS.md },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  successTitle: { fontSize: 17, fontWeight: '800', color: '#166534' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: COLORS.textMuted },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  detailValueBold: { fontSize: 15, color: COLORS.primary, fontWeight: '800' },
  handoverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: RADIUS.md, paddingVertical: 14, marginTop: 6 },
  handoverBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
