import { Stack } from 'expo-router';

export default function InteriorsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[projectId]" />
      <Stack.Screen name="credentials" />
    </Stack>
  );
}
