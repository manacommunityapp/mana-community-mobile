import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/config';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unitLabel?: string;
}

export default function QuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
  step = 1,
  unitLabel,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (quantity - step >= min) {
      onQuantityChange(quantity - step);
    }
  };

  const handleIncrement = () => {
    if (quantity + step <= max) {
      onQuantityChange(quantity + step);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={[s.button, quantity <= min && s.buttonDisabled]}
        onPress={handleDecrement}
        disabled={quantity <= min}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={18} color={quantity <= min ? COLORS.textMuted : COLORS.primary} />
      </TouchableOpacity>

      <View style={s.valueWrap}>
        <Text style={s.value}>{quantity}</Text>
        {unitLabel ? <Text style={s.unitText}>{unitLabel}</Text> : null}
      </View>

      <TouchableOpacity
        style={[s.button, quantity >= max && s.buttonDisabled]}
        onPress={handleIncrement}
        disabled={quantity >= max}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={quantity >= max ? COLORS.textMuted : COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  valueWrap: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  unitText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
