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
      <Stack.Screen name="manage-suppliers" options={{ title: 'Manage Suppliers' }} />
      <Stack.Screen name="submit-quote" options={{ title: 'Record Supplier Quote', presentation: 'modal' }} />
      <Stack.Screen name="analytics" options={{ title: 'Procurement Analytics' }} />
      <Stack.Screen name="add-product" options={{ title: 'Add Product', presentation: 'modal' }} />
      <Stack.Screen name="finance" options={{ title: 'MSME Finance Connect' }} />
      <Stack.Screen name="supplier/[id]" options={{ title: 'Supplier Profile' }} />
      <Stack.Screen name="auction/index" options={{ title: 'Reverse Auctions' }} />
      <Stack.Screen name="auction/new" options={{ title: 'New Auction', presentation: 'modal' }} />
      <Stack.Screen name="auction/[id]" options={{ title: 'Auction Detail' }} />
      <Stack.Screen name="bulkbuy/index" options={{ title: 'BulkBuy Campaigns' }} />
      <Stack.Screen name="bulkbuy/new" options={{ title: 'New Campaign', presentation: 'modal' }} />
      <Stack.Screen name="bulkbuy/[id]" options={{ title: 'Campaign Detail' }} />
      <Stack.Screen name="calendar/index" options={{ title: 'Purchase Calendar' }} />
      <Stack.Screen name="calendar/new" options={{ title: 'Schedule Item', presentation: 'modal' }} />
      <Stack.Screen name="record-delivery" options={{ title: 'Record Delivery', presentation: 'modal' }} />
    </Stack>
  );
}
