import { Stack } from 'expo-router';

export default function FoodLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="slots" />
      <Stack.Screen name="baskets" />
      <Stack.Screen name="refunds" />
    </Stack>
  );
}
