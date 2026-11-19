import { Stack } from 'expo-router';

export default function HealthcareLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Healthcare' }} />
      <Stack.Screen name="followups" options={{ title: 'Prescription Follow-ups' }} />
      <Stack.Screen name="referrals" options={{ title: 'Referrals' }} />
      <Stack.Screen name="credentials" options={{ title: 'Provider Credentials' }} />
      <Stack.Screen name="diagnostics" options={{ title: 'Diagnostics SLA' }} />
    </Stack>
  );
}
