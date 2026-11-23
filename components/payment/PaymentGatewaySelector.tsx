import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/config';
import { CheckoutOptions } from '@/services/paymentConfigService';

interface Props {
  options: CheckoutOptions;
  selectedGateway: string;
  selectedManualMode?: string;
  onChange: (gateway: string, manualMode?: string) => void;
  loading?: false;
}

const GATEWAY_LABELS: Record<string, string> = {
  CASHFREE:   'Cashfree — UPI, Cards, Net Banking',
  RAZORPAY:   'Razorpay',
  MANA_PAY:   'ManaPay — Community Wallet',
  UPI_DIRECT: 'UPI Direct',
};

const GATEWAY_ICONS: Record<string, string> = {
  CASHFREE:   'card-outline',
  RAZORPAY:   'card-outline',
  MANA_PAY:   'wallet-outline',
  UPI_DIRECT: 'phone-portrait-outline',
};

const MANUAL_MODE_LABELS: Record<string, string> = {
  CASH:          'Cash',
  CHEQUE:        'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  UPI_MANUAL:    'UPI (Manual)',
  DEMAND_DRAFT:  'Demand Draft',
};

export interface GatewayLoadingProps {
  /** True while checkout options are being fetched. */
  loading: true;
  options?: undefined;
  selectedGateway?: undefined;
  selectedManualMode?: undefined;
  onChange?: undefined;
}

export type PaymentGatewaySelectorProps = Props | GatewayLoadingProps;

export default function PaymentGatewaySelector(props: PaymentGatewaySelectorProps) {
  if (props.loading) {
    return (
      <View style={s.loadingRow}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading payment options…</Text>
      </View>
    );
  }

  const { options, selectedGateway, selectedManualMode, onChange } = props;

  const onlineGateways = options.gatewayOptions.filter((g) => g !== 'MANUAL');

  return (
    <View>
      {onlineGateways.map((gateway) => {
        const isSelected = selectedGateway === gateway;
        return (
          <TouchableOpacity
            key={gateway}
            style={[s.card, isSelected && s.selected]}
            onPress={() => onChange(gateway)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={(GATEWAY_ICONS[gateway] ?? 'card-outline') as any}
              size={20}
              color={isSelected ? COLORS.primary : COLORS.textMuted}
              style={s.icon}
            />
            <Text style={[s.label, isSelected && s.labelSelected]}>
              {GATEWAY_LABELS[gateway] ?? gateway}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        );
      })}

      {options.manualPaymentEnabled && options.manualPaymentModes.length > 0 && (
        <View style={s.manualSection}>
          <Text style={s.sectionTitle}>Pay Offline</Text>
          {options.manualPaymentModes.map((mode) => {
            const isSelected = selectedGateway === 'MANUAL' && selectedManualMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[s.card, isSelected && s.selected]}
                onPress={() => onChange('MANUAL', mode)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={isSelected ? COLORS.primary : COLORS.textMuted}
                  style={s.icon}
                />
                <Text style={[s.label, isSelected && s.labelSelected]}>
                  {MANUAL_MODE_LABELS[mode] ?? mode}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {options.convenienceFeePercent > 0 && (
        <Text style={s.feeNote}>
          A {options.convenienceFeePercent}% convenience fee applies
        </Text>
      )}

      {options.paymentInstructions ? (
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#1d4ed8" />
          <Text style={s.infoText}>{options.paymentInstructions}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: RADIUS.md,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef2ff',
  },
  icon: {
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  labelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  manualSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  feeNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginTop: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#1d4ed8',
    flex: 1,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

export { PaymentGatewaySelector };
