import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function OffersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: '🏷️ Community Deals & Offers' }} />
      <Stack.Screen name="market-days" options={{ title: '🥬 Society Farmers Market' }} />
      <Stack.Screen name="partners" options={{ title: '🏪 Verified Merchant Directory' }} />
      <Stack.Screen name="demands" options={{ title: '🤝 Bulk Community Demand Pools' }} />
      <Stack.Screen name="my-claims" options={{ title: '🎟️ Resident Voucher Wallet' }} />
    </Stack>
  );
}

