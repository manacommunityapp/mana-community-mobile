import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function FinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="society-dashboard" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="vendors" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="ledger" />
      <Stack.Screen name="society-reports" />
    </Stack>
  );
}
