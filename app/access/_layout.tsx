import { Stack } from 'expo-router';

export default function AccessLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="turnstiles" options={{ title: 'Smart Gates' }} />
      <Stack.Screen name="logs" options={{ title: 'Access history' }} />
      <Stack.Screen name="blacklist" options={{ title: 'Blacklist' }} />
    </Stack>
  );
}
