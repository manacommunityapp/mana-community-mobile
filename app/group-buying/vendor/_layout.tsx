import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function VendorLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text, headerTitleStyle: { fontFamily: 'Outfit-Bold' } }}>
      <Stack.Screen name="[id]" options={{ title: 'Vendor Profile' }} />
    </Stack>
  );
}