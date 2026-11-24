import { Stack } from 'expo-router';

export default function FacilityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="my-bookings" />
    </Stack>
  );
}
