import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthGuard() {
  const { isAuthenticated, isLoading, user, loadUser } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  const isPending  = user?.status === 'PENDING' || user?.status === 'SUSPENDED';

  // Initialise push notifications once verified and authenticated
  usePushNotifications(isAuthenticated && !isPending);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    const group = segments[0] as string | undefined;
    const inAuth        = group === 'auth';
    const inOnboarding  = group === 'onboarding';
    const inTabs        = group === 'tabs';

    if (!isAuthenticated) {
      // Not logged in → welcome / onboarding entry
      if (!inOnboarding && !inAuth) router.replace('/onboarding');
      return;
    }

    if (isPending) {
      // Logged in but awaiting admin approval
      if (!inOnboarding) router.replace('/onboarding/pending');
      return;
    }

    // Fully verified — send to main app
    if (inOnboarding || inAuth) {
      router.replace('/tabs/feed');
    }
  }, [isAuthenticated, isLoading, isPending, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard />
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="tabs" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="marketplace" />
            <Stack.Screen name="auction" />
            <Stack.Screen name="sports" />
            <Stack.Screen name="events" />
            <Stack.Screen name="polls" />
            <Stack.Screen name="food" />
            <Stack.Screen name="visitors" />
            <Stack.Screen name="parking" />
            <Stack.Screen name="facilities" />
            <Stack.Screen name="services" />
            <Stack.Screen name="pets" />
            <Stack.Screen name="jobs" />
            <Stack.Screen name="commute" />
            <Stack.Screen name="discover" />
            <Stack.Screen name="emergency" />
            <Stack.Screen name="finance" />
            <Stack.Screen name="group-buying" />
            <Stack.Screen name="helpdesk" />
            <Stack.Screen name="trips" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
