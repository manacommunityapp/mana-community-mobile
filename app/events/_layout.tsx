import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="create" options={{ presentation: 'card' }} />
      <Stack.Screen name="register" options={{ presentation: 'card' }} />
      <Stack.Screen name="my-events" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="passes" />
      <Stack.Screen name="gatepass" />
      <Stack.Screen name="gallery" />
      <Stack.Screen name="meals" />
      <Stack.Screen name="pooja" />
      <Stack.Screen name="programs" />
      <Stack.Screen name="sponsors" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="volunteers" />
      <Stack.Screen name="donations" />
      <Stack.Screen name="expenses" />
    </Stack>
  );
}
