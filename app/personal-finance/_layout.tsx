import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function PersonalFinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Outfit-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '💰 My Finance' }} />
      <Stack.Screen name="accounts" options={{ title: '🏦 Accounts & Net Worth' }} />
      <Stack.Screen name="transactions" options={{ title: '🧾 Ledger & Transactions' }} />
      <Stack.Screen name="budgets" options={{ title: '🎯 Budgets & Pace' }} />
      <Stack.Screen name="reports" options={{ title: '📊 Reports & Analytics' }} />
      <Stack.Screen name="calendar" options={{ title: '📅 Financial Calendar' }} />
      <Stack.Screen name="recurring" options={{ title: '🔁 Recurring Payments' }} />
      <Stack.Screen name="goals" options={{ title: '🎯 Savings Goals' }} />
      <Stack.Screen name="installments" options={{ title: '💳 Loans & EMIs' }} />
      <Stack.Screen name="categories" options={{ title: '🏷️ Category Management' }} />
      <Stack.Screen name="settings" options={{ title: '⚙️ Finance Security & Settings' }} />
    </Stack>
  );
}
