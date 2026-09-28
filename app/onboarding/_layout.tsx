import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,          // no swipe-back during onboarding
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="community" />
      <Stack.Screen name="details" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="pending" options={{ gestureEnabled: false }} />
      <Stack.Screen name="tour" />
    </Stack>
  );
}
