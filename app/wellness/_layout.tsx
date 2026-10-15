import { Stack } from "expo-router";

export default function WellnessLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ title: "Mana Health Buddy", headerShown: false }} />
      <Stack.Screen name="food-journal" options={{ title: "AI Food Journal", headerShown: false }} />
      <Stack.Screen name="log-meal" options={{ title: "Log Meal", headerShown: false }} />
      <Stack.Screen name="challenges" options={{ title: "Wellness Challenges", headerShown: false }} />
      <Stack.Screen name="providers" options={{ title: "Wellness Providers" }} />
      <Stack.Screen name="profile" options={{ title: "Wellness Profile" }} />
      <Stack.Screen name="water-tracker" options={{ title: "Water Tracker" }} />
    </Stack>
  );
}
