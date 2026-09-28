import { Stack } from 'expo-router';

export default function HelpdeskLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🛠️ Smart Helpdesk & Care' }} />
    </Stack>
  );
}
