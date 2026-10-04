import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAdminGuard } from '@/hooks/useRoleGuard';
import { COLORS } from '@/constants/config';

export default function AdminLayout() {
  const { authorized, isLoading } = useAdminGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="members" />
      <Stack.Screen name="moderation" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="community-settings" />
      <Stack.Screen name="audit-logs" />
      <Stack.Screen name="bulk-upload" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
