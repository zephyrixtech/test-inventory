import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse } from '@/types/backend';

export interface Store {
  _id: string;
  id?: string;
  company: string;
  name: string;
  code: string;
  type: 'Central Store' | 'Branch Store';
  parent?: {
    _id: string;
    name: string;
    code: string;
    type: 'Central Store' | 'Branch Store';
  } | null;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListStoresParams {
  search?: string;
  type?: 'all' | 'Central Store' | 'Branch Store';
  managerId?: string;
  parentId?: string;
}

export interface CreateStorePayload {
  name: string;
  code: string;
  type: 'Central Store' | 'Branch Store';
  parentId?: string | null;
  managerId?: string | null;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateStorePayload extends Partial<CreateStorePayload> {
  isActive?: boolean;
}

export const storeService = {
  async listStores(params: ListStoresParams = {}) {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params.managerId) queryParams.append('managerId', params.managerId);
    if (params.parentId) queryParams.append('parentId', params.parentId);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get<ApiResponse<Store[]>>(`/stores${queryString}`);
  },

  async getStore(id: string) {
    return apiClient.get<ApiResponse<Store>>(`/stores/${id}`);
  },

  async createStore(payload: CreateStorePayload) {
    return apiClient.post<ApiResponse<Store>>('/stores', payload);
  },

  async updateStore(id: string, payload: UpdateStorePayload) {
    return apiClient.put<ApiResponse<Store>>(`/stores/${id}`, payload);
  },

  async deleteStore(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/stores/${id}`);
  }
};

