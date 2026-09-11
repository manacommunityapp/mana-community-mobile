import { Stack } from 'expo-router';

export default function SportsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tournaments" />
      <Stack.Screen name="tournament" />
      <Stack.Screen name="matches" />
      <Stack.Screen name="match" />
      <Stack.Screen name="my-teams" />
      <Stack.Screen name="create-team" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
