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
          title: '🚗 Smart Parking & EV Hub',
          headerShown: false,
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
    </Stack>
  );
}
