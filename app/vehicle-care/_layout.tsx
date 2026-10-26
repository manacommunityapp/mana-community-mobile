import { Stack } from 'expo-router';

export default function VehicleCareLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="book" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="vendor" />
    </Stack>
  );
}
