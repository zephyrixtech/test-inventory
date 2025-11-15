import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse, StoreStock } from '@/types/backend';

export const storeStockService = {
  async list(params: { page?: number; limit?: number; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);

    const path = `/store-stock${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<StoreStock>>(path);
  },

  async save(payload: { productId: string; quantity: number; margin?: number; currency?: 'INR' | 'AED' }) {
    return apiClient.post<ApiResponse<StoreStock>>('/store-stock', payload);
  },

  async adjustQuantity(id: string, quantity: number) {
    return apiClient.put<ApiResponse<StoreStock>>(`/store-stock/${id}/quantity`, { quantity });
  }
};

