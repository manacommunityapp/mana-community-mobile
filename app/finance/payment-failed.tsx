import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/config';

export default function PaymentFailedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    order_id?: string;
    orderId?: string;
    error?: string;
    message?: string;
    amount?: string;
  }>();

  const orderId = params.order_id || params.orderId || 'N/A';
  const errorMessage =
    params.message ||
    params.error ||
    "We couldn't complete your transaction. No funds were deducted from your account.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="close-sharp" size={48} color="#EF4444" />
          </View>
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>{errorMessage}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.value} numberOfLines={1}>{orderId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>FAILED</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Timestamp</Text>
            <Text style={styles.value}>{new Date().toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.helpBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748B" style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={styles.helpText}>
            If money was debited from your bank account or card, it will be refunded automatically by your bank within 3 to 5 business days.
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Retry Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/finance/invoices')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Return to Invoices</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FECACA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  helpBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: RADIUS.md,
    width: '100%',
    marginBottom: SPACING.xl,
    alignItems: 'flex-start',
  },
  helpText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
