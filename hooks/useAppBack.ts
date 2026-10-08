import { useCallback, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

interface UseAppBackOptions {
  /**
   * Fallback route if router.canGoBack() is false. Default is '/tabs/feed'.
   */
  fallbackRoute?: string;
  /**
   * Optional custom handler before navigation (e.g. closing an open modal).
   * Return `true` to indicate the back event was consumed/handled and stop navigation.
   */
  onBeforeBack?: () => boolean | void;
  /**
   * Set to true if this is a root screen (e.g. Feed/Home) where double back press exits the app.
   */
  isRootScreen?: boolean;
}

export function useAppBack(options: UseAppBackOptions = {}) {
  const { fallbackRoute = '/tabs/feed', onBeforeBack, isRootScreen = false } = options;
  const router = useRouter();
  const lastBackPressTime = useRef<number>(0);

  const goBack = useCallback(() => {
    // Check if custom interceptor handled it (like closing an open modal or drawer)
    if (onBeforeBack) {
      const handled = onBeforeBack();
      if (handled) return;
    }

    if (isRootScreen) {
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        BackHandler.exitApp();
        return;
      }
      lastBackPressTime.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  }, [router, fallbackRoute, onBeforeBack, isRootScreen]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        goBack();
        return true; // prevent default OS exit if handled
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => subscription.remove();
    }, [goBack])
  );

  return { goBack };
}
