import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiError } from '@/services/apiClient';

interface Props {
  error: unknown;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function ApiErrorBanner({ error, onDismiss, autoDismissMs = 5000 }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;

  const message =
    error instanceof ApiError || error instanceof Error
      ? (error as Error).message
      : String(error);
  const correlationId = error instanceof ApiError ? error.correlationId : undefined;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (autoDismissMs > 0) {
      const t = setTimeout(() => onDismiss?.(), autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [autoDismissMs, onDismiss, translateY]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {correlationId && (
          <Text style={styles.ref}>Ref: {correlationId}</Text>
        )}
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  content: { flex: 1 },
  message: { color: '#fff', fontSize: 14, fontWeight: '500' },
  ref: { color: '#FCA5A5', fontSize: 11, marginTop: 2 },
  close: { paddingLeft: 12 },
  closeText: { color: '#fff', fontSize: 16 },
});
