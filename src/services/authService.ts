import { apiClient } from './apiClient';
import type { ApiResponse, AuthResponse } from '@/types/backend';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  companyName: string;
  companyCode: string;
  currency: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    return apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
  },

  async me() {
    return apiClient.get<ApiResponse<AuthResponse['user']>>('/auth/me');
  },

  async logout(refreshToken?: string) {
    return apiClient.post<ApiResponse<{ success: boolean }>>('/auth/logout', { refreshToken });
  }
};

