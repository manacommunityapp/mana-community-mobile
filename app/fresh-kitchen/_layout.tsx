import { Stack } from 'expo-router';

export default function FreshKitchenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="combo/[id]" />
    </Stack>
  );
}
