import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/backend';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export const roleService = {
  async list(includeHidden = false) {
    const query = includeHidden ? '?includeHidden=true' : '';
    return apiClient.get<ApiResponse<Role[]>>(`/roles${query}`);
  }
};

