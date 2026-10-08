import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function DealLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontFamily: 'Outfit-Bold' } }}>
      <Stack.Screen name="[id]" options={{ title: 'Group Deal' }} />
    </Stack>
  );
}