import api from './apiClient';

export interface CheckoutOptions {
  gatewayOptions: string[];
  manualPaymentEnabled: boolean;
  manualPaymentModes: string[];
  defaultGateway: string;
  paymentInstructions: string | null;
  convenienceFeePercent: number;
  maxTransactionAmount: number | null;
}

export interface PlatformPaymentConfig {
  id: number;
  cashfreeEnabled: boolean;
  razorpayEnabled: boolean;
  manaPayEnabled: boolean;
  bbpsEnabled: boolean;
  defaultGateway: string;
  convenienceFeePercent: number;
  maxTransactionAmount: number | null;
  updatedAt: string;
}

export interface CommunityPaymentSettings {
  allowedPaymentGateways: string[];
  manualPaymentEnabled: boolean;
  manualPaymentModes: string[];
  paymentInstructions: string | null;
  defaultGateway: string | null;
  cashierCanRecordPayment: boolean;
  fallbackGateway: string | null;
}

export const paymentConfigService = {
  async getCheckoutOptions(): Promise<CheckoutOptions> {
    const res = await api.get<CheckoutOptions>('/payments/checkout-options');
    return res.data;
  },

  async getPlatformConfig(): Promise<PlatformPaymentConfig> {
    const res = await api.get<PlatformPaymentConfig>('/admin/payment-config');
    return res.data;
  },

  async updatePlatformConfig(
    config: Partial<PlatformPaymentConfig>,
  ): Promise<PlatformPaymentConfig> {
    const res = await api.put<PlatformPaymentConfig>('/admin/payment-config', config);
    return res.data;
  },

  async getCommunityPaymentSettings(): Promise<CommunityPaymentSettings> {
    const res = await api.get<CommunityPaymentSettings>('/community/payment-settings');
    return res.data;
  },

  async updateCommunityPaymentSettings(
    settings: Partial<CommunityPaymentSettings>,
  ): Promise<CommunityPaymentSettings> {
    const res = await api.put<CommunityPaymentSettings>('/community/payment-settings', settings);
    return res.data;
  },
};
