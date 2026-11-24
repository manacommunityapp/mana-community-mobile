import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="offline-sync" />
      <Stack.Screen name="password" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="security" />
    </Stack>
  );
}
