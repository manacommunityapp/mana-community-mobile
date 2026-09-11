// This file makes Marketplace available as a tab.
// The actual screens live in app/marketplace/ (stack navigation).
// Expo Router resolves the tab tap → app/marketplace/index.tsx via the root Stack.

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/config';

/**
 * When the Marketplace tab is tapped, immediately navigate to the
 * marketplace stack screen (app/marketplace/index.tsx).
 * This avoids duplicating the full browse screen inside the tabs folder.
 */
export default function MarketplaceTabEntry() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketplace');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}
