import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, WatchlistCheckResult } from '@/services/communityOpsService';

const SEVERITY_META: Record<NonNullable<WatchlistCheckResult['severity']>, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LOW:      { label: 'Low Risk',      color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle-outline' },
  MEDIUM:   { label: 'Medium Risk',   color: '#EA580C', bg: '#FFEDD5', icon: 'warning-outline' },
  HIGH:     { label: 'High Risk',     color: '#DC2626', bg: '#FEE2E2', icon: 'alert-outline' },
  CRITICAL: { label: 'Critical Risk', color: '#7F1D1D', bg: '#FEE2E2', icon: 'skull-outline' },
};

export default function WatchlistCheckScreen() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WatchlistCheckResult | null>(null);
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    if (!identifier.trim()) return;
    setLoading(true);
    setResult(null);
    setChecked(false);
    try {
      const res = await communityOpsService.checkWatchlist(identifier.trim());
      setResult(res);
      setChecked(true);
    } catch (e: any) {
      setResult(null);
    } finally { setLoading(false); }
  };

  const handleClear = () => {
    setIdentifier('');
    setResult(null);
    setChecked(false);
  };

  const isMatch = result?.match === true;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Watchlist Check</Text>
            <Text style={styles.subtitle}>Enter vehicle number or person ID to check</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={v => { setIdentifier(v); setChecked(false); setResult(null); }}
              placeholder="e.g. MH12AB1234 or Aadhaar/ID"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleCheck}
            />
            {identifier.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.checkBtn, (!identifier.trim() || loading) && { opacity: 0.5 }]}
            onPress={handleCheck}
            disabled={!identifier.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.checkBtnText}>Check Now</Text>
                </>
            }
          </TouchableOpacity>

          {/* Result */}
          {checked && result && (
            <View style={[styles.resultCard, { backgroundColor: isMatch ? '#FEF2F2' : '#F0FDF4', borderColor: isMatch ? '#FECACA' : '#BBF7D0' }]}>
              <View style={styles.resultHeader}>
                <Ionicons
                  name={isMatch ? 'close-circle' : 'checkmark-circle'}
                  size={40}
                  color={isMatch ? '#DC2626' : '#059669'}
                />
                <View>
                  <Text style={[styles.resultLabel, { color: isMatch ? '#DC2626' : '#059669' }]}>
                    {isMatch ? 'MATCH FOUND' : 'ALL CLEAR'}
                  </Text>
                  <Text style={styles.resultSub}>
                    {isMatch ? 'Entry requires supervisor approval' : 'No watchlist entry found'}
                  </Text>
                </View>
              </View>

              {isMatch && result.severity && (
                <View style={[styles.severityRow, { backgroundColor: SEVERITY_META[result.severity].bg }]}>
                  <Ionicons name={SEVERITY_META[result.severity].icon} size={18} color={SEVERITY_META[result.severity].color} />
                  <Text style={[styles.severityText, { color: SEVERITY_META[result.severity].color }]}>
                    {SEVERITY_META[result.severity].label}
                  </Text>
                </View>
              )}

              {isMatch && result.reason && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason on file:</Text>
                  <Text style={styles.reasonText}>{result.reason}</Text>
                </View>
              )}

              {isMatch && result.addedAt && (
                <Text style={styles.addedAt}>Added: {new Date(result.addedAt).toLocaleDateString()}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  input: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  clearBtn: { position: 'absolute', right: 12 },
  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1E3A8A', borderRadius: 14, paddingVertical: 16, marginBottom: 24,
  },
  checkBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  resultCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 14 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultLabel: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  resultSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  severityText: { fontSize: 14, fontWeight: '700' },
  reasonBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  reasonText: { fontSize: 14, color: '#111827' },
  addedAt: { fontSize: 11, color: '#9CA3AF' },
});
