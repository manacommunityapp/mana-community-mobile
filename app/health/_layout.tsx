import { Stack } from "expo-router";

export default function HealthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ title: "🩺 Mana Health Hub", headerShown: false }} />
      <Stack.Screen name="doctors/index" options={{ title: "👨‍⚕️ Find Doctors" }} />
      <Stack.Screen name="doctors/[id]" options={{ title: "Doctor Profile" }} />
      <Stack.Screen name="appointments/book" options={{ title: "📅 Book Appointment" }} />
      <Stack.Screen name="appointments/[id]" options={{ title: "Appointment Details" }} />
      <Stack.Screen name="family/index" options={{ title: "👨‍👩‍👧 Family Health" }} />
      <Stack.Screen name="records/index" options={{ title: "🔒 Health Vault & Records" }} />
      <Stack.Screen name="labs/index" options={{ title: "🧪 Lab Tests & Packages" }} />
      <Stack.Screen name="camps/index" options={{ title: "⛺ Clubhouse Health Camps" }} />
      <Stack.Screen name="benefits/index" options={{ title: "💳 Health Wallet & Benefits" }} />
      <Stack.Screen name="provider/index" options={{ title: "🏥 Provider Operations Workspace" }} />
      <Stack.Screen name="homecare/index" options={{ title: "🏡 Home Healthcare" }} />
      <Stack.Screen name="emergency" options={{ title: "🚨 Medical Emergency Network" }} />
      <Stack.Screen name="ai-assistant" options={{ title: "🤖 AI Symptom Navigator" }} />
      <Stack.Screen name="care-journey/index" options={{ title: "Care Journey Tracker" }} />
      <Stack.Screen name="labs/book" options={{ title: "📅 Book Home Collection" }} />
      <Stack.Screen name="pharmacy/index" options={{ title: "💊 Medicine Delivery" }} />
      <Stack.Screen name="appointments/video-room" options={{ title: "Video Consultation", headerShown: false }} />
    </Stack>
  );
}