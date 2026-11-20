import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { setTenantCommunityId } from '@/services/apiClient';

interface TenantContextValue {
  communityId: number | null;
  communityName: string | null;
  isResolved: boolean;
}

const TenantCtx = createContext<TenantContextValue>({
  communityId: null,
  communityName: null,
  isResolved: false,
});

// React Native compatible base64 decoder for JWT
function base64Decode(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  // Replace URL-safe base64 chars and add padding
  const str = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  let result = '';
  let i = 0;
  while (i < padded.length) {
    const b0 = chars.indexOf(padded[i++]);
    const b1 = chars.indexOf(padded[i++]);
    const b2 = chars.indexOf(padded[i++]);
    const b3 = chars.indexOf(padded[i++]);
    result += String.fromCharCode((b0 << 2) | (b1 >> 4));
    if (b2 < 64) result += String.fromCharCode(((b1 & 0xf) << 4) | (b2 >> 2));
    if (b3 < 64) result += String.fromCharCode(((b2 & 0x3) << 6) | b3);
  }
  // Decode UTF-8
  try {
    return decodeURIComponent(
      result.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
  } catch {
    return result;
  }
}

function extractCommunityIdFromJwt(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64Decode(parts[1]));
    // Try standard claim names the backend might use
    const raw = payload.communityId ?? payload.community_id ?? payload.cid ?? null;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'mana_access_token';

function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<TenantContextValue>({
    communityId: null,
    communityName: null,
    isResolved: false,
  });

  useEffect(() => {
    getToken().then((token) => {
      if (!token) {
        setValue({ communityId: null, communityName: null, isResolved: true });
        setTenantCommunityId(null);
        return;
      }
      // JWT is the authority — do not trust raw AsyncStorage for communityId
      const fromJwt = extractCommunityIdFromJwt(token);
      setValue({ communityId: fromJwt, communityName: null, isResolved: true });
      setTenantCommunityId(fromJwt);
    });
  }, []);

  // Sync communityId into apiClient whenever it changes
  useEffect(() => {
    setTenantCommunityId(value.communityId);
  }, [value.communityId]);

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenantContext(): TenantContextValue {
  return useContext(TenantCtx);
}
