import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse, Item, StoreStock } from '@/types/backend';

export interface ItemListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const inventoryService = {
  async getItems(params: ItemListParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.categoryId && params.categoryId !== 'all') query.append('categoryId', params.categoryId);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const path = `/items${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<Item>>(path);
  },

  async getItem(id: string) {
    return apiClient.get<ApiResponse<Item>>(`/items/${id}`);
  },

  async createItem(payload: Partial<Item>) {
    return apiClient.post<ApiResponse<Item>>('/items', payload);
  },

  async updateItem(id: string, payload: Partial<Item>) {
    return apiClient.put<ApiResponse<Item>>(`/items/${id}`, payload);
  },

  async deactivateItem(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/items/${id}`);
  },

  async listStoreStock(params: { page?: number; limit?: number; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);

    const path = `/store-stock${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<StoreStock>>(path);
  }
};

