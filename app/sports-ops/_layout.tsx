import { Stack } from 'expo-router';

export default function SportsOpsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Sports Operations' }} />
      <Stack.Screen name="subscriptions" options={{ title: 'Court Subscriptions' }} />
      <Stack.Screen name="open-play" options={{ title: 'Open Play' }} />
      <Stack.Screen name="ratings" options={{ title: 'Player Ratings' }} />
      <Stack.Screen name="coaching" options={{ title: 'Coaching Packages' }} />
    </Stack>
  );
}
