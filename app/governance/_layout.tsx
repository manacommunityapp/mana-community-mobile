import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function GovernanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '🏛️ Governance & Voting Hub',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="meetings"
        options={{
          title: '📅 Digital AGM & Live Meetings',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="proposals"
        options={{
          title: '💡 Resident Proposals & Grievances',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="voting"
        options={{
          title: '🗳️ Secret Ballot Digital Voting',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="vault"
        options={{
          title: '📜 Passed Resolutions & Vault',
          headerShown: true,
        }}
      />
    </Stack>
  );
}

