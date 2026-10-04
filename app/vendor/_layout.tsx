import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useVendorGuard } from '@/hooks/useRoleGuard';
import { VENDOR_COLORS } from '@/constants/vendorTheme';

export default function VendorLayout() {
  const { authorized, isLoading } = useVendorGuard();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={VENDOR_COLORS.accent} size="large" />
      </View>
    );
  }

  if (!authorized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
