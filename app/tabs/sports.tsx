import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/config';

export default function SportsTabEntry() {
  const router = useRouter();
  useEffect(() => { router.push('/sports'); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}
