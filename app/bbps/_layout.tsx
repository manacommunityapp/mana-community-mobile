import { Stack } from 'expo-router';

export default function BBPSLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="fetch-bill" />
    </Stack>
  );
}
