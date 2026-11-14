import { Stack } from 'expo-router';
import { COLORS, FONTS } from '@/constants/config';

export default function HrmLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="leaves" />
      <Stack.Screen name="apply-leave" options={{ presentation: 'modal' }} />
      <Stack.Screen name="shifts" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="payslips" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="helpdesk" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="compliance" />
      <Stack.Screen name="compliance-alerts" />
      <Stack.Screen name="passport" />
      <Stack.Screen name="pool" options={{ title: 'Workforce Pool' }} />
      <Stack.Screen name="jobs" options={{ title: 'Job Board' }} />
      <Stack.Screen name="handover" options={{ title: 'Duty Handover' }} />
      <Stack.Screen name="integrations" options={{ title: 'Integration Settings' }} />
      <Stack.Screen name="forecasting" options={{ title: 'Forecasting' }} />
    </Stack>
  );
}
