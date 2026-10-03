import { Stack } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function AcademyLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'DMSans-Bold', fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: '🎓 Mana Academy' }} />
      <Stack.Screen name="my-learning" options={{ title: '📚 My Learning & Passes' }} />
      <Stack.Screen name="teaching" options={{ title: '👨‍🏫 Instructor Hub' }} />
      <Stack.Screen name="admin" options={{ title: '🛡️ Academy Admin' }} />
    </Stack>
  );
}

