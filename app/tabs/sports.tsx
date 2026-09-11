import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/config';

// Sports tab now navigates to the full sports stack at /sports
export default function SportsTabEntry() {
  const router = useRouter();
  useEffect(() => { router.replace('/sports'); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}
