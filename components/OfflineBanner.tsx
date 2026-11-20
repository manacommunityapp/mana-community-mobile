import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  staleAgeMinutes?: number | null;
}

export function OfflineBanner({ visible, staleAgeMinutes }: Props) {
  const translateY = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -48,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [visible, translateY]);

  const ageLabel =
    staleAgeMinutes !== null && staleAgeMinutes !== undefined
      ? staleAgeMinutes < 60
        ? `${staleAgeMinutes}m ago`
        : `${Math.floor(staleAgeMinutes / 60)}h ago`
      : null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>
        You're offline — showing cached data{ageLabel ? ` from ${ageLabel}` : ''}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    zIndex: 100,
  },
  icon: { fontSize: 14 },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});
