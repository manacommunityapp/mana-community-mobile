import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function ParkingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '🚗 Mana Parking OS',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="marketplace"
        options={{
          title: '🅿️ Temporary Parking Marketplace',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ev-charging"
        options={{
          title: '⚡ EV Charging & Power Metering',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="anpr"
        options={{
          title: '📷 ANPR Plate Recognition & Gates',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="violations"
        options={{
          title: '⚠️ Parking Violations & Fines',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="swaps-waitlist"
        options={{
          title: '🔄 Slot Swaps & Waitlist',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
