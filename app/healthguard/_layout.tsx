import { Stack } from "expo-router";

export default function HealthGuardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sos" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="incidents" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="ambulance" />
      <Stack.Screen name="responder" />
    </Stack>
  );
}
