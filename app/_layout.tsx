import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';

// Suppress dev warning and error overlays in the mobile app UI
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  'Unknown child element passed to Stack',
  'Unknown child element passed to Tabs',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found in the navigation state',
]);
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as ScreenCapture from 'expo-screen-capture';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useDeviceSecurity } from '@/hooks/useDeviceSecurity';
import { setupGlobalFonts } from '@/utils/globalFonts';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthGuard() {
  const { isAuthenticated, isLoading, user, loadUser, logout } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  const isPending  = user?.status === 'PENDING' || user?.status === 'SUSPENDED';

  usePushNotifications(isAuthenticated && !isPending);
  useIdleTimeout(isAuthenticated && !isPending, logout);
  useDeviceSecurity();

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    const group = segments[0] as string | undefined;
    const inAuth        = group === 'auth';
    const inOnboarding  = group === 'onboarding';
    const inTabs        = group === 'tabs';
    const inGuard       = group === 'guard';
    const inVendor      = group === 'vendor';
    const inAdminRole   = group === 'admin-role';

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

    // Fully verified — send to role-appropriate home
    if (inOnboarding || inAuth) {
      const role = user?.role;
      if (role === 'SECURITY' || role === 'GUARD') {
        router.replace('/guard/tabs/dashboard');
      } else if (role === 'VENDOR') {
        router.replace('/vendor/tabs/dashboard');
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMMUNITY_ADMIN') {
        router.replace('/admin-role/tabs/dashboard');
      } else {
        router.replace('/tabs/feed');
      }
    }
  }, [isAuthenticated, isLoading, isPending, segments]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => { ScreenCapture.allowScreenCaptureAsync(); };
  }, []);

  const [fontsLoaded] = Font.useFonts({
    'Outfit-Regular':    require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-SemiBold':   require('../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold':       require('../assets/fonts/Outfit-Bold.ttf'),
    'Outfit-ExtraBold':  require('../assets/fonts/Outfit-ExtraBold.ttf'),
    'DMSans-Regular':    require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':     require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold':   require('../assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold':       require('../assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      setupGlobalFonts();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
            <Stack.Screen name="notices" />
            <Stack.Screen name="governance" />
            <Stack.Screen name="offers" />
            <Stack.Screen name="academy" />
            <Stack.Screen name="cpos" />
            <Stack.Screen name="cpn" />
            <Stack.Screen name="guard" />
            <Stack.Screen name="vendor" />
            <Stack.Screen name="admin-role" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
