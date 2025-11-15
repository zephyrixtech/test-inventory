import { apiClient } from './apiClient';
import type { ApiResponse } from '@/types/backend';

export interface Company {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  currency: string;
  email?: string;
  phone?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  postal_code?: string;
  bankName?: string;
  bank_name?: string;
  bankAccountNumber?: string;
  bank_account_number?: string;
  ifscCode?: string;
  ifsc_code?: string;
  ibanCode?: string;
  iban_code?: string;
  taxPercentage?: number;
  tax_percentage?: number;
  emailRefreshToken?: string;
  isEmailAuthenticated?: boolean;
  purchaseOrderReport?: {
    paymentDetails?: string;
    payment_details?: string;
    remarks?: string;
    reportFooter?: string;
    report_footer?: string;
  };
  salesReport?: {
    paymentDetails?: string;
    payment_details?: string;
    remarks?: string;
    reportFooter?: string;
    report_footer?: string;
  };
  stockReport?: {
    paymentDetails?: string;
    payment_details?: string;
    remarks?: string;
    reportFooter?: string;
    report_footer?: string;
  };
  isActive?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  modified_at?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  email?: string;
  phone?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  ibanCode?: string;
  currency?: string;
  taxPercentage?: number;
  purchaseOrderReport?: {
    paymentDetails?: string;
    remarks?: string;
    reportFooter?: string;
  };
  salesReport?: {
    paymentDetails?: string;
    remarks?: string;
    reportFooter?: string;
  };
  stockReport?: {
    paymentDetails?: string;
    remarks?: string;
    reportFooter?: string;
  };
  emailRefreshToken?: string;
  isEmailAuthenticated?: boolean;
}

export const companyService = {
  async getCompany() {
    return apiClient.get<ApiResponse<Company>>('/company-administration');
  },

  async updateCompany(payload: UpdateCompanyPayload) {
    return apiClient.put<ApiResponse<Company>>('/company-administration', payload);
  }
};

