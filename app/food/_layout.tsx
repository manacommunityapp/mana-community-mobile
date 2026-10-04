import { Stack } from 'expo-router';

export default function FoodLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home-chefs" />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="grocery" />
      <Stack.Screen name="pantry" />
      <Stack.Screen name="dining" />
    </Stack>
  );
}
