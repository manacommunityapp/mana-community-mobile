import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🚌 Community Trips & Treks' }} />
      <Stack.Screen name="split" options={{ title: '💰 Trip Split & Expenses' }} />
      <Stack.Screen name="create" options={{ title: '🗺️ Host a Community Trip' }} />
      <Stack.Screen name="roster" options={{ title: '📋 Passenger Manifest Roster' }} />
      <Stack.Screen name="flights" options={{ title: '✈ Search Flights' }} />
    </Stack>
  );
}
