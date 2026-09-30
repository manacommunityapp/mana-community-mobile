import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function GroupBuyingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '🛒 Group Buying & Deals' }} />
    </Stack>
  );
}
