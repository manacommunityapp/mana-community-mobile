import { Stack } from 'expo-router';

export default function JewelleryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Jewellery Hub', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Product Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="try-on" options={{ title: 'Virtual Try-On', presentation: 'modal' }} />
      <Stack.Screen name="wishlist" options={{ title: 'My Wishlist', headerBackTitle: 'Back' }} />
      <Stack.Screen name="appointments" options={{ title: 'Appointments', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
