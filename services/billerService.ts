import api from './apiClient';

export type BillerCategory =
  | 'ELECTRICITY' | 'WATER' | 'GAS' | 'BROADBAND' | 'DTH'
  | 'FASTAG' | 'MUNICIPAL_TAX' | 'CREDIT_CARD'
  | 'EDUCATION' | 'LPG' | 'LANDLINE';

export interface BillerDto {
  id: string;
  name: string;
  shortName: string;
  category: BillerCategory;
  icon: string;
  state: string;
  consumerIdLabel: string;
  consumerIdHint: string;
  consumerIdLength?: number;
}

export interface FetchedBillDto {
  billerId: string;
  billerName: string;
  consumerId: string;
  customerName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  amount: number;
  overdueAmount?: number;
  units?: number;
  periodFrom?: string;
  periodTo?: string;
  status: 'DUE' | 'OVERDUE' | 'PAID';
}

export interface BillPaymentResponse {
  upiIntentUrl: string;
  phonePeUrl: string;
  transactionRef: string;
  amount: number;
}

export const billerService = {
  async getBillersByCategory(category: BillerCategory): Promise<BillerDto[]> {
    const res = await api.get<BillerDto[]>('/v1/bbps/billers', { params: { category } });
    if (!Array.isArray(res.data)) throw new Error('The biller service returned an invalid response.');
    return res.data;
  },

  async fetchBill(billerId: string, consumerId: string): Promise<FetchedBillDto> {
    const res = await api.post<FetchedBillDto>('/v1/bbps/bill/fetch', { billerId, consumerId });
    if (!res.data?.billNumber || !Number.isFinite(Number(res.data.amount))) {
      throw new Error('The biller did not return a valid bill. No payment was started.');
    }
    return res.data;
  },

  async payBill(billNumber: string, billerId: string, amount: number, method: 'UPI' | 'WALLET'): Promise<BillPaymentResponse> {
    const res = await api.post<BillPaymentResponse>('/v1/bbps/bill/pay', { billNumber, billerId, amount, method });
    if (!res.data?.transactionRef || !res.data?.upiIntentUrl) {
      throw new Error('The bill payment service did not confirm a payment handoff.');
    }
    return res.data;
  },
};
