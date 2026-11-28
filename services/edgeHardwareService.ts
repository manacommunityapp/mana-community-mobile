import api from './apiClient';

export interface EdgeBarrierOutcome {
  controllerId: string;
  cmdNonce: string;
  outcome: string;
  relayPulseMs: number;
  relayCoilTarget: string;
  hardwareInterlockEngaged: boolean;
}

export function isWatchdogRollbackRequired(
  serialBusHealthy: boolean,
  tlsMqttHealthy: boolean,
  secondsSinceBoot: number,
): boolean {
  return secondsSinceBoot > 30 || !serialBusHealthy || !tlsMqttHealthy;
}

export async function dispatchEdgeBarrierCommand(payload: {
  controllerId: string;
  cmdNonce: string;
  commandType: 'OPEN_ONLY' | 'CLOSE';
  loopAOccupied: boolean;
  loopBOccupied: boolean;
  issuedAt: string;
  ttlSeconds?: number;
}): Promise<EdgeBarrierOutcome> {
  const { data } = await api.post<EdgeBarrierOutcome>('/api/v1/edge/barrier/command', payload);
  return data;
}
