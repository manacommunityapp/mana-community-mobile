import { Stack } from 'expo-router';

export default function FinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#047857' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '💳 Society Maintenance & Dues' }} />
    </Stack>
  );
}
