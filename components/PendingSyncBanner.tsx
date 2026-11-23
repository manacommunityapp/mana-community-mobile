import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useRequestQueue } from '@/hooks/useRequestQueue';

export function PendingSyncBanner() {
  const { pendingCount } = useRequestQueue();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: pendingCount > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pendingCount, opacity]);

  if (pendingCount === 0) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <Text style={styles.text}>
        {pendingCount} request{pendingCount > 1 ? 's' : ''} pending sync
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
