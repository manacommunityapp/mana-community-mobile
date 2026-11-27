import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '@/constants/config';
import { statutoryAccountingService } from '@/services/statutoryAccountingService';
import type {
  AuditChainVerification,
  MaintenanceGstResult,
  VendorTdsResult,
} from '@/types/accounting';

const SOCIETY_ID = 1;

export default function StatutoryTaxScreen() {
  const [maintRupees, setMaintRupees] = useState('8500');
  const [elecRupees, setElecRupees] = useState('1800');
  const [gstReg, setGstReg] = useState(true);
  const [gstResult, setGstResult] = useState<MaintenanceGstResult | null>(null);

  const [vendorPan, setVendorPan] = useState('ABCPD1234F');
  const [tdsSection, setTdsSection] = useState('194C');
  const [billRupees, setBillRupees] = useState('45000');
  const [inoperativePan, setInoperativePan] = useState(false);
  const [tdsResult, setTdsResult] = useState<VendorTdsResult | null>(null);

  const [chain, setChain] = useState<AuditChainVerification | null>(null);

  const runGst = async () => {
    try {
      const res = await statutoryAccountingService.calculateMaintenanceGst(
        SOCIETY_ID,
        Math.round(Number(maintRupees || '0') * 100),
        Math.round(Number(elecRupees || '0') * 100),
        gstReg,
      );
      setGstResult(res);
    } catch (err) {
      Alert.alert('GST Error', err instanceof Error ? err.message : 'Unable to evaluate');
    }
  };

  const runTds = async () => {
    try {
      const res = await statutoryAccountingService.calculateVendorTds(
        SOCIETY_ID,
        vendorPan.trim().toUpperCase(),
        tdsSection,
        Math.round(Number(billRupees || '0') * 100),
        inoperativePan ? 'INOPERATIVE' : 'VALID',
      );
      setTdsResult(res);
    } catch (err) {
      Alert.alert('TDS Error', err instanceof Error ? err.message : 'Unable to evaluate');
    }
  };

  const runVerifyChain = async () => {
    try {
      const res = await statutoryAccountingService.verifyAuditChain(SOCIETY_ID);
      setChain(res);
    } catch (err) {
      Alert.alert('Audit Verify Error', err instanceof Error ? err.message : 'Unable to verify');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Statutory GST, TDS &amp; Audit</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/finance/tally-sync')}>
          <Text style={styles.linkText}>Open Bidirectional Tally Sync Monitor →</Text>
        </TouchableOpacity>

        {/* GST Calculator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Maintenance GST (₹7,500 Cliff)</Text>
          <TextInput
            style={styles.input}
            value={maintRupees}
            onChangeText={setMaintRupees}
            keyboardType="numeric"
            placeholder="Monthly Maintenance (₹)"
          />
          <TextInput
            style={styles.input}
            value={elecRupees}
            onChangeText={setElecRupees}
            keyboardType="numeric"
            placeholder="Pure-Agent Utility Pass-through (₹)"
          />
          <View style={styles.switchRow}>
            <Text style={styles.label}>Society GST Registered (&gt; ₹20L)</Text>
            <Switch value={gstReg} onValueChange={setGstReg} />
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => void runGst()}>
            <Text style={styles.btnText}>Evaluate GST</Text>
          </TouchableOpacity>
          {gstResult ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>{gstResult.reason}</Text>
              <Text style={styles.resultSub}>
                CGST: ₹{(gstResult.cgstPaise / 100).toFixed(2)} · SGST: ₹{(gstResult.sgstPaise / 100).toFixed(2)} · Total: ₹
                {(gstResult.grandTotalPaise / 100).toFixed(2)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* TDS Calculator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendor TDS &amp; PAN Check</Text>
          <TextInput
            style={styles.input}
            value={vendorPan}
            onChangeText={setVendorPan}
            autoCapitalize="characters"
            placeholder="Vendor PAN (e.g. ABCPD1234F)"
          />
          <TextInput
            style={styles.input}
            value={tdsSection}
            onChangeText={setTdsSection}
            placeholder="Section (194C, 194J_PROF, 194J_TECH)"
          />
          <TextInput
            style={styles.input}
            value={billRupees}
            onChangeText={setBillRupees}
            keyboardType="numeric"
            placeholder="Gross Bill (₹)"
          />
          <View style={styles.switchRow}>
            <Text style={styles.label}>PAN Inoperative (Sec 206AA 20%)</Text>
            <Switch value={inoperativePan} onValueChange={setInoperativePan} />
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => void runTds()}>
            <Text style={styles.btnText}>Evaluate TDS</Text>
          </TouchableOpacity>
          {tdsResult ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {tdsResult.reason} ({(tdsResult.appliedRateBps / 100).toFixed(1)}%)
              </Text>
              <Text style={styles.resultSub}>
                TDS: ₹{(tdsResult.tdsDeductedPaise / 100).toFixed(2)} · Net Payable: ₹
                {(tdsResult.netPayablePaise / 100).toFixed(2)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Hash Chain Verifier */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Immutable Audit Hash Chain</Text>
          <TouchableOpacity style={styles.btn} onPress={() => void runVerifyChain()}>
            <Text style={styles.btnText}>Verify SHA-256 Chain &amp; Merkle Root</Text>
          </TouchableOpacity>
          {chain ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {chain.chainValid ? 'VERIFIED' : 'TAMPER DETECTED'} ({chain.totalEntries} entries)
              </Text>
              <Text style={styles.resultSub} numberOfLines={2}>
                Merkle: {chain.merkleRoot}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 14 },
  header: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  linkBtn: { backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 10, alignItems: 'center' },
  linkText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    backgroundColor: '#FFFFFF',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: COLORS.textSecondary },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  resultBox: { backgroundColor: COLORS.backgroundAlt, padding: 10, borderRadius: 8 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  resultSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
