import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useGuardPortalGuard } from '@/hooks/useRoleGuard';
import { GUARD_COLORS } from '@/constants/guardTheme';

export default function GuardLayout() {
  const { authorized, isLoading } = useGuardPortalGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={GUARD_COLORS.accent} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="tabs" />
    <Stack.Screen name="tabs/attendance" />
    <Stack.Screen name="tabs/handover" />
    <Stack.Screen name="tabs/daily-log" />
    <Stack.Screen name="tabs/scan" />
  </Stack>;
}
