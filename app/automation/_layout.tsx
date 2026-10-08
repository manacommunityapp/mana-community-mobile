import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function AutomationLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '⚡ Mana Automation Engine',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="builder"
        options={{
          title: '🛠️ WHEN ➔ THEN Rule Builder',
          headerShown: true,
        }}
      />
    </Stack>
  );
}