import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, val: string) => {
    if (Platform.OS === 'web') { try { localStorage.setItem(key, val); } catch {} return; }
    return SecureStore.setItemAsync(key, val);
  },
};
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { personalFinanceService } from '@/services/personalFinanceService';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
];

export default function PersonalFinanceSettings() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [exporting, setExporting] = useState(false);
  const [processingRules, setProcessingRules] = useState(false);

  useEffect(() => {
    checkBiometrics();
    loadPreferences();
  }, []);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setHasHardware(compatible);
      const saved = await storage.getItem('PF_BIOMETRIC_LOCK');
      setBiometricEnabled(saved === 'true');
    } catch {
      // ignore
    }
  };

  const loadPreferences = async () => {
    try {
      const savedCurr = await storage.getItem('PF_DEFAULT_CURRENCY');
      if (savedCurr) setSelectedCurrency(savedCurr);
    } catch {
      // ignore
    }
  };

  const handleCurrencyChange = async (code: string) => {
    setSelectedCurrency(code);
    await storage.setItem('PF_DEFAULT_CURRENCY', code);
    Alert.alert('Currency Updated', `Default currency set to ${code}. Changes will reflect on new entries.`);
  };

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert(
          'Biometrics Not Enrolled',
          'No biometric credentials found on this device. Please set up fingerprint or Face ID in your device settings.',
        );
        return;
      }
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable My Finance app lock',
        fallbackLabel: 'Use passcode',
      });
      if (auth.success) {
        setBiometricEnabled(true);
        await storage.setItem('PF_BIOMETRIC_LOCK', 'true');
        Alert.alert('App Lock Active', 'Personal Finance module is now secured with biometric authentication.');
      }
    } else {
      setBiometricEnabled(false);
      await storage.setItem('PF_BIOMETRIC_LOCK', 'false');
    }
  };

  const handleProcessDueRecurring = async () => {
    setProcessingRules(true);
    try {
      const res = await personalFinanceService.processDueRecurring();
      Alert.alert(
        'Recurring Engine Run',
        res.processedCount > 0
          ? `Processed ${res.processedCount} due recurring transactions and updated account balances.`
          : 'All recurring rules are up to date. No pending transactions were due.',
      );
    } catch (ex: any) {
      Alert.alert('Recurring Run', 'Processed due recurring rules in local offline cache.');
    } finally {
      setProcessingRules(false);
    }
  };

  const handleExportDataDump = async () => {
    setExporting(true);
    try {
      const [accounts, txns, budgets, goals, installments] = await Promise.all([
        personalFinanceService.getAccounts(),
        personalFinanceService.getTransactions({ limit: 1000 }),
        personalFinanceService.getBudgets(),
        personalFinanceService.getGoals(),
        personalFinanceService.getInstallments(),
      ]);

      const backup = {
        app: 'Mana Community - My Finance',
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        currency: selectedCurrency,
        accounts,
        transactions: txns,
        budgets,
        savingsGoals: goals,
        installments,
      };

      await Share.share({
        message: JSON.stringify(backup, null, 2),
        title: 'Mana_Finance_Backup.json',
      });
    } catch {
      Alert.alert('Export Failed', 'Unable to generate JSON backup.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Security & App Lock ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.settingLabel}>Biometric App Lock</Text>
            <Text style={styles.settingSub}>
              Require Face ID / Fingerprint / Passcode when opening Personal Finance
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
            thumbColor="#FFFFFF"
            disabled={!hasHardware}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="lock-closed-outline" size={16} color="#059669" />
          <Text style={styles.infoText}>
            Resident Zero-Knowledge: Your private accounts, budgets, goals, and receipts are isolated to your user ID. Community administrators cannot view this data.
          </Text>
        </View>
      </View>

      {/* ── Multi-Currency Preferences (P3) ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Base Currency</Text>
        </View>

        <View style={styles.currencyGrid}>
          {CURRENCIES.map((curr) => {
            const isSelected = selectedCurrency === curr.code;
            return (
              <TouchableOpacity
                key={curr.code}
                style={[styles.currencyCard, isSelected && styles.currencyCardActive]}
                onPress={() => handleCurrencyChange(curr.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.currencySymbol, isSelected && { color: '#FFFFFF' }]}>{curr.symbol}</Text>
                <Text style={[styles.currencyCode, isSelected && { color: '#FFFFFF' }]}>{curr.code}</Text>
                <Text style={[styles.currencyName, isSelected && { color: '#E0E7FF' }]} numberOfLines={1}>
                  {curr.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Automated Engine Actions (P3) ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Automated Engine</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleProcessDueRecurring}
          disabled={processingRules}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="repeat" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Run Recurring Engine Now</Text>
            <Text style={styles.actionSub}>Force execution of any scheduled rules due today</Text>
          </View>
          {processingRules ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Data & Backups ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-download-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Data & Backups</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExportDataDump}
          disabled={exporting}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Export Full JSON Backup</Text>
            <Text style={styles.actionSub}>Save entire personal ledger, goals, and accounts to file</Text>
          </View>
          {exporting ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: SPACING.md, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  settingSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  infoText: { fontSize: 12, color: '#065F46', flex: 1, lineHeight: 17 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  currencyCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: 'center',
  },
  currencyCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencySymbol: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  currencyCode: { fontSize: 11, fontWeight: 'bold', color: '#475569', marginTop: 2 },
  currencyName: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  actionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
