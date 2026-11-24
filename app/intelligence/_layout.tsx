import { Stack } from 'expo-router';

export default function IntelligenceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="discover" />
    </Stack>
  );
}
