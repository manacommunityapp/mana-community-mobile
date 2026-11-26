import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineSyncService } from '@/services/offlineSyncService';
import { SPACING } from '@/constants/config';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(offlineSyncService.isOnline);

  useEffect(() => {
    const unsub = offlineSyncService.onStatusChange((status) => {
      setOnline(status);
    });
    return unsub;
  }, []);

  if (online) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={16} color="#FFFFFF" />
      <Text style={styles.bannerText}>Offline mode — cached data active</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
