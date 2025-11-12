import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse } from '@/types/backend';

export interface DailyExpense {
  id: string;
  product: {
    id: string;
    name: string;
    code: string;
  };
  description: string;
  amount: number;
  date: string;
  createdBy: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export const dailyExpenseService = {
  async list(params: { page?: number; limit?: number; from?: string; to?: string; productId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.productId) query.append('productId', params.productId);

    const path = `/expenses${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<DailyExpense>>(path);
  },

  async create(payload: { productId: string; description: string; amount: number; date?: string }) {
    return apiClient.post<ApiResponse<DailyExpense>>('/expenses', payload);
  },

  async delete(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/expenses/${id}`);
  }
};

