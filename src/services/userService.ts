import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse } from '@/types/backend';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'superadmin' | 'admin' | 'purchaser' | 'biller';
  status: 'active' | 'inactive' | 'locked';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  failedAttempts?: number;
  lastLoginAt?: string | null;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'locked';
  role?: 'all' | User['role'];
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: User['role'];
  status?: User['status'];
  password: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: User['role'];
  status?: User['status'];
  password?: string;
  failedAttempts?: number;
}

const buildQueryString = (params: ListUsersParams = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.role && params.role !== 'all') searchParams.set('role', params.role);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const userService = {
  list(params: ListUsersParams = {}) {
    const query = buildQueryString(params);
    return apiClient.get<ApiListResponse<User>>(`/users${query}`);
  },

  get(id: string) {
    return apiClient.get<ApiResponse<User>>(`/users/${id}`);
  },

  create(payload: CreateUserPayload) {
    return apiClient.post<ApiResponse<User>>('/users', payload);
  },

  update(id: string, payload: UpdateUserPayload) {
    return apiClient.put<ApiResponse<User>>(`/users/${id}`, payload);
  },

  deactivate(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/users/${id}`);
  }
};
