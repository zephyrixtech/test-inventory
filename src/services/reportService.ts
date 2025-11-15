import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/backend';

export const reportService = {
  async purchase(params: { from?: string; to?: string } = {}) {
    const query = new URLSearchParams();
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    const path = `/reports/purchases${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiResponse<any[]>>(path);
  },

  async stock() {
    return apiClient.get<ApiResponse<any[]>>('/reports/stock');
  },

  async sales(params: { customerId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.customerId) query.append('customerId', params.customerId);
    const path = `/reports/sales${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiResponse<any[]>>(path);
  },

  async expenses() {
    return apiClient.get<ApiResponse<any[]>>('/reports/expenses');
  }
};

