import { Stack } from 'expo-router';

export default function DiscoverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#7C3AED' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🕸️ Community Discover' }} />
    </Stack>
  );
}
