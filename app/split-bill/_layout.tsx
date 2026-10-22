import { Stack } from 'expo-router';
export default function SplitBillLayout() {
  return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="index" /></Stack>;
}
