import { Stack } from 'expo-router';

export default function WellnessBasketLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="plan-builder" />
      <Stack.Screen name="weekly-menu" />
    </Stack>
  );
}
