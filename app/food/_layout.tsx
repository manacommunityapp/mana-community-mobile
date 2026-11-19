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
      <Stack.Screen name="checkout" />
      <Stack.Screen name="slots" />
      <Stack.Screen name="baskets" />
      <Stack.Screen name="substitutes" />
    </Stack>
  );
}
