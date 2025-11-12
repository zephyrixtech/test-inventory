import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse, Vendor } from '@/types/backend';

export interface VendorListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const vendorService = {
  async list(params: VendorListParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const path = `/vendors${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient.get<ApiListResponse<Vendor>>(path);
  },

  async get(id: string) {
    return apiClient.get<ApiResponse<Vendor>>(`/vendors/${id}`);
  },

  async create(payload: Partial<Vendor>) {
    return apiClient.post<ApiResponse<Vendor>>('/vendors', payload);
  },

  async update(id: string, payload: Partial<Vendor>) {
    return apiClient.put<ApiResponse<Vendor>>(`/vendors/${id}`, payload);
  },

  async deactivate(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/vendors/${id}`);
  }
};

