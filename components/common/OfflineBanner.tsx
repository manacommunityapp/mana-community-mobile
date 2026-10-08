import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      <TouchableOpacity onPress={() => offlineSyncService.flush()} style={styles.syncBtn}>
        <Text style={styles.syncText}>Sync</Text>
      </TouchableOpacity>
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
  syncBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  syncText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
