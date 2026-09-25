import { Stack } from 'expo-router';

export default function GroupBuyingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#059669' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🛒 Group Buying & Deals' }} />
    </Stack>
  );
}
