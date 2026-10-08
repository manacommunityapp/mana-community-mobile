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
    </Stack>
  );
}
