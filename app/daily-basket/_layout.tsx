import { Stack } from 'expo-router';

export default function DailyBasketLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scanner" />
    </Stack>
  );
}
