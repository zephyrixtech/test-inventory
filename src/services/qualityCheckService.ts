import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/backend';

export interface QualityCheckPayload {
  productId: string;
  status: 'approved' | 'rejected' | 'pending';
  remarks?: string;
}

export const qualityCheckService = {
  async submit(payload: QualityCheckPayload) {
    return apiClient.post<ApiResponse<unknown>>('/quality-checks', payload);
  },

  async get(productId: string) {
    return apiClient.get<ApiResponse<unknown>>(`/quality-checks/${productId}`);
  }
};

