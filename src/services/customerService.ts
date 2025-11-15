import { apiClient } from './apiClient';
import type { ApiListResponse, ApiResponse } from '@/types/backend';

// Define the Customer interface to match the backend model
export interface Customer {
  _id?: string;
  company: string;
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  status: 'Active' | 'Inactive';
  isActive: boolean;
  taxNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define the parameters for listing customers
export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Define the payload for creating/updating a customer
export interface CreateCustomerPayload {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  status: 'Active' | 'Inactive';
  taxNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  isActive?: boolean;
}

// Customer service with all CRUD operations
export const customerService = {
  // Fetch all customers with pagination and filters
  async listCustomers(params: ListCustomersParams = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiClient.get<ApiListResponse<Customer>>(`/customers${queryString}`);
  },

  // Fetch a single customer by ID
  async getCustomer(id: string) {
    return apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
  },

  // Create a new customer
  async createCustomer(customer: CreateCustomerPayload) {
    return apiClient.post<ApiResponse<Customer>>('/customers', customer);
  },

  // Update an existing customer
  async updateCustomer(id: string, customer: UpdateCustomerPayload) {
    return apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, customer);
  },

  // Delete a customer (soft delete - sets isActive to false)
  async deleteCustomer(id: string) {
    return apiClient.delete<ApiResponse<{ success: boolean }>>(`/customers/${id}`);
  }
};