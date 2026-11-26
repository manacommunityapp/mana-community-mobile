import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { backgroundSync } from './backgroundSync';

let isOnline = true;
let listeners: Array<(online: boolean) => void> = [];
let unsubscribeNetInfo: (() => void) | undefined;

export const offlineSyncService = {
  init() {
    if (unsubscribeNetInfo) return;
    unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnline;
      isOnline = !!state.isConnected && state.isInternetReachable !== false;
      listeners.forEach((fn) => fn(isOnline));
      if (wasOffline && isOnline) void backgroundSync.run();
    });
  },

  get isOnline() {
    return isOnline;
  },

  onStatusChange(fn: (online: boolean) => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((listener) => listener !== fn); };
  },
};
