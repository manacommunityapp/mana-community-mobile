import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="maintenance" />
      <Stack.Screen name="procurement" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
