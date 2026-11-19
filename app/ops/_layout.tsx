import { Stack } from 'expo-router';

export default function OpsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="passes" />
      <Stack.Screen name="parcels" />
      <Stack.Screen name="move-request" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="watchlist-check" />
    </Stack>
  );
}
