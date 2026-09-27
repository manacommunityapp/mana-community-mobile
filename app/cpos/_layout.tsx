import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function CPOSLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🏢 Property & Tenancy Hub' }} />
    </Stack>
  );
}
