import { Stack } from 'expo-router';

export default function MobilityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="book" />
      <Stack.Screen name="history" />
      <Stack.Screen name="track" />
      <Stack.Screen name="driver" />
      <Stack.Screen name="carpool" />
      <Stack.Screen name="airport-rides" />
      <Stack.Screen name="journeys" />
      <Stack.Screen name="journeys/requests" />
      <Stack.Screen name="journeys/slots" />
      <Stack.Screen name="journeys/proposals" />
      <Stack.Screen name="journeys/bookings" />
      <Stack.Screen name="ops" />
    </Stack>
  );
}
