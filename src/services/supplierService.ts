import { apiClient } from './apiClient';
import type {  ApiListResponse, Supplier } from '@/types/backend';

export const supplierService = {
  async listSuppliers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    contact?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.contact) queryParams.append('contact', params.contact);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get<ApiListResponse<Supplier>>(`/suppliers${queryString}`);
  },

  async getSupplier(id: string) {
    return apiClient.get<Supplier>(`/suppliers/${id}`);
  },

  async createSupplier(supplier: Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>) {
    return apiClient.post<Supplier>(`/suppliers`, supplier);
  },

  async updateSupplier(id: string, supplier: Partial<Omit<Supplier, '_id' | 'createdAt' | 'updatedAt'>>) {
    return apiClient.put<Supplier>(`/suppliers/${id}`, supplier);
  },

  async deleteSupplier(id: string) {
    return apiClient.delete<{ success: boolean }>(`/suppliers/${id}`);
  }
};