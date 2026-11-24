import { Stack } from 'expo-router';

export default function BazaarLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="my-bookings" options={{ presentation: 'card' }} />
    </Stack>
  );
}
