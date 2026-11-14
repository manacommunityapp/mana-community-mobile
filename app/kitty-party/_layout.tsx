import { Stack } from 'expo-router';

export default function KittyPartyLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#BE185D',
        headerTitleStyle: { fontWeight: '800', fontSize: 16, color: '#111827' },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="kittyPartyIndex" options={{ title: 'Social Circles' }} />
      <Stack.Screen name="kittyPartyCreateScreen" options={{ title: 'Create Circle' }} />
      <Stack.Screen name="kittyPartyDetailsScreen" options={{ title: 'Circle Details' }} />
      <Stack.Screen name="kittyPartyLedgerScreen" options={{ title: 'Kitty Ledger' }} />
      <Stack.Screen name="kittyPartyHousieScreen" options={{ title: 'Mana Housie' }} />
      <Stack.Screen name="kittyPartyEventScreen" options={{ headerShown: false }} />
      <Stack.Screen name="kittyPartyFeedScreen" options={{ headerShown: false }} />
      <Stack.Screen name="kittyPartyExpenseScreen" options={{ title: 'Bill Splitting' }} />
      <Stack.Screen name="kittyPartyLeaderboardScreen" options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="kittyPartyVendorPackagesScreen" options={{ title: 'Party Vendors' }} />
    </Stack>
  );
}
