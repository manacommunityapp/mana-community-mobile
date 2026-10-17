import { Stack } from 'expo-router';
export default function GoldLayout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
