import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEventAdminGuard } from '@/hooks/useRoleGuard';
import { EVENT_ADMIN_COLORS } from '@/constants/eventAdminTheme';

export default function EventAdminLayout() {
  const { authorized, isLoading } = useEventAdminGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={EVENT_ADMIN_COLORS.accent} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
