import { Stack } from 'expo-router';

export default function IotLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="meters" options={{ title: 'Smart Sub-Meters' }} />
    </Stack>
  );
}
