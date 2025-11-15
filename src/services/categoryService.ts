import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse, Category } from '@/types/backend';

export interface ListCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  isActive?: boolean;
  subCategory?: string;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export const categoryService = {
  async listCategories(params: ListCategoriesParams = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get<ApiListResponse<Category>>(`/categories${queryString}`);
  },

  async getCategory(id: string) {
    return apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
  },

  async createCategory(payload: CreateCategoryPayload) {
    return apiClient.post<ApiResponse<Category>>('/categories', payload);
  },

  async updateCategory(id: string, payload: UpdateCategoryPayload) {
    return apiClient.put<ApiResponse<Category>>(`/categories/${id}`, payload);
  },

  async deleteCategory(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/categories/${id}`);
  }
};