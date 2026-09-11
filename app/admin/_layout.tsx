import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    // Kick non-admins back to feed immediately
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      router.replace('/tabs/feed');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // Don't render children if not admin (guard in useEffect handles redirect)
  if (!user || !ADMIN_ROLES.includes(user.role)) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="members" />
      <Stack.Screen name="moderation" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="community-settings" />
    </Stack>
  );
}
