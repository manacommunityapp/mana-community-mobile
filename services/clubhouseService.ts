import api from './apiClient';
import type {
  FlatTabAccount,
  GuestAccessPass,
  GuestPassQuote,
  IssueGuestPassesResponse,
  PosAuthorizationResponse,
  PosOrder,
  PosTabChallenge,
  TurnstileValidateResponse,
} from '@/types/clubhouse';

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export const clubhouseService = {
  async getFlatTabAccount(
    societyId: number,
    flatId: number,
    unitCode = 'Tower A - 1204',
  ): Promise<FlatTabAccount> {
    const res = await api.get<FlatTabAccount>('/clubhouse/pos/account', {
      params: { societyId, flatId, unitCode },
    });
    return res.data;
  },

  async listPendingChallenges(societyId: number, flatId: number): Promise<PosTabChallenge[]> {
    const res = await api.get<PosTabChallenge[]>('/clubhouse/pos/challenges', {
      params: { societyId, flatId },
    });
    return res.data;
  },

  async resolveChallenge(
    challengeId: string,
    approvedBy: string,
    approve: boolean,
  ): Promise<PosAuthorizationResponse> {
    const res = await api.post<PosAuthorizationResponse>(
      `/clubhouse/pos/challenges/${challengeId}/approve`,
      { approvedBy, approve },
    );
    return res.data;
  },

  async listPosOrders(societyId: number): Promise<PosOrder[]> {
    const res = await api.get<PosOrder[]>('/clubhouse/pos/orders', { params: { societyId } });
    return res.data;
  },

  async authorizeCoffeeWithPin(
    societyId: number,
    flatId: number,
    pin: string,
  ): Promise<PosAuthorizationResponse> {
    const res = await api.post<PosAuthorizationResponse>('/clubhouse/pos/authorize', {
      societyId,
      flatId,
      unitCode: `Tower A - ${flatId}`,
      terminalId: 'CAFE-MOBILE-POS',
      outletName: 'Clubhouse Brew & Bean Café',
      clientTxUuid: `mob-${Date.now()}`,
      itemsSummary: 'Cappuccino + Espresso Shot',
      subtotalPaise: 24000,
      gstPaise: 1200,
      settlementMode: 'FLAT_TAB',
      authMethod: 'PIN',
      pin,
    });
    return res.data;
  },

  async quotePoolGuests(
    societyId: number,
    flatId: number,
    visitDate: string,
    guestCount: number,
  ): Promise<GuestPassQuote> {
    const res = await api.post<GuestPassQuote>('/clubhouse/passes/quote', {
      societyId,
      facilityCode: 'SWIMMING_POOL',
      flatId,
      visitDate,
      guestCount,
    });
    return res.data;
  },

  async issuePoolPasses(
    societyId: number,
    flatId: number,
    visitDate: string,
    guestNames: string[],
  ): Promise<IssueGuestPassesResponse> {
    const res = await api.post<IssueGuestPassesResponse>('/clubhouse/passes/issue', {
      societyId,
      facilityCode: 'SWIMMING_POOL',
      flatId,
      unitCode: `Tower A - ${flatId}`,
      visitDate,
      guestNames,
      paymentMode: 'FLAT_TAB',
    });
    return res.data;
  },

  async listPasses(societyId: number, flatId: number): Promise<GuestAccessPass[]> {
    const res = await api.get<GuestAccessPass[]>('/clubhouse/passes', {
      params: { societyId, flatId },
    });
    return res.data;
  },

  async cancelPass(passId: string): Promise<GuestAccessPass> {
    const res = await api.post<GuestAccessPass>(`/clubhouse/passes/${passId}/cancel`);
    return res.data;
  },

  async validateTurnstileQr(societyId: number, qrToken: string): Promise<TurnstileValidateResponse> {
    const res = await api.post<TurnstileValidateResponse>('/clubhouse/turnstile/validate', {
      societyId,
      facilityCode: 'SWIMMING_POOL',
      turnstileId: 'POOL-TURNSTILE-1',
      qrToken,
    });
    return res.data;
  },
};
