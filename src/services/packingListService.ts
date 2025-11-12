import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse } from '@/types/backend';

export interface PackingListItemInput {
  productId: string;
  quantity: number;
}

export interface PackingListInput {
  location: string;
  boxNumber: string;
  items: PackingListItemInput[];
  shipmentDate?: string;
  packingDate?: string;
  image?: string;
  status?: 'pending' | 'approved' | 'shipped' | 'rejected';
}

export const packingListService = {
  async list(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const path = `/packing-lists${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<any>>(path);
  },

  async create(payload: PackingListInput) {
    return apiClient.post<ApiResponse<any>>('/packing-lists', payload);
  },

  async update(id: string, payload: Partial<PackingListInput>) {
    return apiClient.put<ApiResponse<any>>(`/packing-lists/${id}`, payload);
  }
};

