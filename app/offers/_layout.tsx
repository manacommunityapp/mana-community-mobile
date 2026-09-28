import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function OffersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🏷️ Community Deals & Offers' }} />
    </Stack>
  );
}
