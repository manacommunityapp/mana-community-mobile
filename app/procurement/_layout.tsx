import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function ProcurementLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E3A5F' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: '🏭 Procurement Hub' }} />
      <Stack.Screen name="supplier-marketplace" options={{ title: 'Supplier Marketplace' }} />
      <Stack.Screen name="rfq/new" options={{ title: 'Create RFQ', presentation: 'modal' }} />
      <Stack.Screen name="rfq/[id]" options={{ title: 'RFQ Detail' }} />
      <Stack.Screen name="purchase-orders" options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="association" options={{ title: 'Association Procurement' }} />
    </Stack>
  );
}
