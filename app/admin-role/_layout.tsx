import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAdminGuard } from '@/hooks/useRoleGuard';
import { ADMIN_COLORS } from '@/constants/adminTheme';

export default function AdminRoleLayout() {
  const { authorized, isLoading } = useAdminGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ADMIN_COLORS.accent} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
