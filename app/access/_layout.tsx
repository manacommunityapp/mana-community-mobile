import { Stack } from 'expo-router';

export default function AccessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="turnstiles" options={{ title: 'Pedestrian Turnstiles' }} />
    </Stack>
  );
}
