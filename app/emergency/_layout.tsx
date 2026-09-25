import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function EmergencyLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#DC2626' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🚨 Emergency SOS Hub' }} />
    </Stack>
  );
}
