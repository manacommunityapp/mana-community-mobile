import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  secondsRemaining: number;
  totalSeconds: number;
  type?: string;
}

export function RateLimitBanner({ secondsRemaining, totalSeconds, type }: Props) {
  const widthAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: secondsRemaining / totalSeconds,
      duration: 950,
      useNativeDriver: false,
    }).start();
  }, [secondsRemaining]);

  if (secondsRemaining <= 0) return null;

  const label = type === 'LOGIN' ? 'Too many login attempts' :
    type === 'OTP' ? 'Too many OTP requests' :
    'Too many attempts';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {label}. Try again in <Text style={styles.bold}>{secondsRemaining}s</Text>.
      </Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  text: { color: '#92400E', fontSize: 13, marginBottom: 6 },
  bold: { fontWeight: '700' },
  barTrack: { height: 4, backgroundColor: '#FDE68A', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 2 },
});
