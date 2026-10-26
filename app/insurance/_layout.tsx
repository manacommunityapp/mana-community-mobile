import { Stack } from 'expo-router';

export default function InsuranceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="catalogue/[category]" />
      <Stack.Screen name="compare/index" />
      <Stack.Screen name="policies/index" />
      <Stack.Screen name="policies/[id]" />
      <Stack.Screen name="claims/index" />
      <Stack.Screen name="group-enquiry" />
      <Stack.Screen name="consents" />
    </Stack>
  );
}
