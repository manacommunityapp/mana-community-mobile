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
      <Stack.Screen name="index"   />  {/* Welcome          */}
      <Stack.Screen name="account" />  {/* Step 1 — Account */}
      <Stack.Screen name="community" />{/* Step 2 — Community invite */}
      <Stack.Screen name="details" />  {/* Step 3 — Flat / block */}
      <Stack.Screen name="verify"  />  {/* Step 4 — KYC     */}
      <Stack.Screen name="pending" options={{ gestureEnabled: false }} />
      <Stack.Screen name="tour"    />  {/* Feature tour      */}
    </Stack>
  );
}
