import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function CPNLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '💼 Professional Network (CPN)' }} />
    </Stack>
  );
}
