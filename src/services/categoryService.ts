import { apiClient } from './apiClient';
import type { ApiResponse, Category } from '@/types/backend';

export const categoryService = {
  async list() {
    return apiClient.get<ApiResponse<Category[]>>('/categories');
  }
};

