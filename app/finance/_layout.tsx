import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function FinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Outfit-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🏢 Maintenance Dues' }} />
      <Stack.Screen name="society-dashboard" options={{ title: '🏛️ Society Treasury & ERP' }} />
      <Stack.Screen name="invoices" options={{ title: '📄 Invoices & Demands' }} />
      <Stack.Screen name="vendors" options={{ title: '💼 Vendors & TDS' }} />
      <Stack.Screen name="expenses" options={{ title: '✍️ Expense Approvals' }} />
      <Stack.Screen name="ledger" options={{ title: '📖 Chart of Accounts' }} />
      <Stack.Screen name="society-reports" options={{ title: '📊 AGM & Tax Statements' }} />
    </Stack>
  );
}
