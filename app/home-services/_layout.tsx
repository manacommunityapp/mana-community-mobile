import { Stack } from 'expo-router';

export default function HomeServicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="find-help" />
      <Stack.Screen name="my-help" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="packages" />
      <Stack.Screen name="jobs" />
    </Stack>
  );
}
