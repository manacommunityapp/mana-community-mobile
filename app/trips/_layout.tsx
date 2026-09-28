import { Stack } from 'expo-router';

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563EB' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🚌 Community Trips & Treks' }} />
    </Stack>
  );
}
