import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';

interface CheckInOutButtonProps {
  isCheckedIn: boolean;
  lastEventTime?: string;
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
  disabled?: boolean;
}

export function CheckInOutButton({
  isCheckedIn,
  lastEventTime,
  onCheckIn,
  onCheckOut,
  disabled,
}: CheckInOutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      if (isCheckedIn) {
        await onCheckOut();
      } else {
        await onCheckIn();
      }
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isCheckedIn ? COLORS.error : COLORS.success;
  const label = isCheckedIn ? 'Check Out' : 'Check In';
  const icon = isCheckedIn ? 'log-out-outline' : 'log-in-outline';

  return (
    <View style={s.wrapper}>
      <TouchableOpacity
        style={[s.button, { backgroundColor: bgColor }, disabled && s.disabled]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={loading || disabled}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name={icon} size={28} color="#FFFFFF" />
            <Text style={s.label}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
      {lastEventTime && (
        <Text style={s.timeText}>
          {isCheckedIn ? 'Checked in at' : 'Last check-out at'} {lastEventTime}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 8 },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...SHADOWS.primary,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
});
