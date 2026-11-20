import { useState, useEffect } from 'react';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';

export type ImageQuality = 'full' | 'reduced' | 'placeholder';

function qualityFromConnectionType(type: NetInfoStateType, isConnected: boolean | null): ImageQuality {
  if (!isConnected) return 'placeholder';
  switch (type) {
    case 'wifi':
    case 'ethernet':
      return 'full';
    case 'cellular':
      return 'reduced';
    default:
      return 'placeholder';
  }
}

export function useAdaptiveImage(): ImageQuality {
  const [quality, setQuality] = useState<ImageQuality>('full');

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setQuality(qualityFromConnectionType(state.type, state.isConnected));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setQuality(qualityFromConnectionType(state.type, state.isConnected));
    });
    return unsubscribe;
  }, []);

  return quality;
}
