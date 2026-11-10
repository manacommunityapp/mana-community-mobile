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
    </Stack>
  );
}
