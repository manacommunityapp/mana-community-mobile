import { Stack } from 'expo-router';

export default function HomeServicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home Services' }} />
      <Stack.Screen name="bookings" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="workers" options={{ title: 'Workers' }} />
      <Stack.Screen name="plans" options={{ title: 'Recurring Plans' }} />
      <Stack.Screen name="tracking/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
