import { Stack } from 'expo-router';

export default function MarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]"  options={{ presentation: 'card' }} />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="my-listings" />
    </Stack>
  );
}
