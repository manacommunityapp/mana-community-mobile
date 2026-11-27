import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function VouchersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Free Sample Vouchers' }} />
      <Stack.Screen name="kiosk" options={{ title: 'Clubhouse Sample Kiosk' }} />
    </Stack>
  );
}
