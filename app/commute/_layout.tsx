import { Stack } from 'expo-router';

export default function CommuteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="find-rides" />
      <Stack.Screen name="my-rides" />
      <Stack.Screen name="ride" />
      <Stack.Screen name="offer-ride" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
