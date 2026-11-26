import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { websocketManager, type WsState } from '@/services/websocketManager';
import { backgroundSync, type SyncStatus } from '@/services/backgroundSync';

export interface GuardStateSyncInfo {
  wsState: WsState;
  networkType: string;
  isOnline: boolean;
  reconnectAttempt: number;
  syncStatus: SyncStatus;
  pendingMutations: number;
  conflictsCount: number;
  forceReconnectAndSync: () => void;
}

/**
 * Coordinates WebSocket health, Wi-Fi <-> Cellular NetInfo handovers,
 * offline queue draining, and UI delta reconciliation on mobile guard tablets.
 */
export function useGuardStateSync(onReconciled?: () => void): GuardStateSyncInfo {
  const [wsState, setWsState] = useState<WsState>(websocketManager.state);
  const [networkType, setNetworkType] = useState<string>(websocketManager.networkType);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(websocketManager.attemptCount);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
  const [pendingMutations, setPendingMutations] = useState<number>(0);
  const [conflictsCount, setConflictsCount] = useState<number>(0);

  useEffect(() => {
    const unsubWs = websocketManager.onStateChange((state, meta) => {
      setWsState(state);
      setReconnectAttempt(meta.attempt);
      setNetworkType(meta.networkType);
    });

    const unsubConnect = websocketManager.onConnect(() => {
      onReconciled?.();
    });

    const unsubNet = NetInfo.addEventListener((net) => {
      setIsOnline(!!net.isConnected && net.isInternetReachable !== false);
      setNetworkType(String(net.type ?? 'unknown'));
    });

    const unsubBg = backgroundSync.addListener((status, pending, conflicts) => {
      setSyncStatus(status);
      setPendingMutations(pending);
      setConflictsCount(conflicts);
    });

    void backgroundSync.refresh();

    return () => {
      unsubWs();
      unsubConnect();
      unsubNet();
      unsubBg();
    };
  }, [onReconciled]);

  const forceReconnectAndSync = useCallback(() => {
    websocketManager.forceReconnect();
    void backgroundSync.run();
  }, []);

  return {
    wsState,
    networkType,
    isOnline,
    reconnectAttempt,
    syncStatus,
    pendingMutations,
    conflictsCount,
    forceReconnectAndSync,
  };
}
