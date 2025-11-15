import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/backend';

export interface CurrencyRate {
  id: string;
  fromCurrency: 'INR' | 'AED';
  toCurrency: 'INR' | 'AED';
  rate: number;
  effectiveDate: string;
  updatedAt: string;
}

export const currencyService = {
  async list() {
    return apiClient.get<ApiResponse<CurrencyRate[]>>('/currency');
  },

  async upsert(payload: { fromCurrency: 'INR' | 'AED'; toCurrency: 'INR' | 'AED'; rate: number }) {
    return apiClient.post<ApiResponse<CurrencyRate>>('/currency', payload);
  }
};

