import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSportsAdminGuard } from '@/hooks/useRoleGuard';
import { SPORTS_ADMIN_COLORS } from '@/constants/sportsAdminTheme';

export default function SportsAdminLayout() {
  const { authorized, isLoading } = useSportsAdminGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={SPORTS_ADMIN_COLORS.accent} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
