import { apiClient } from './apiClient';
import { ItemManagement } from '@/Utils/constants';

// Define the item data structure to match the backend model
export interface ItemData {
  id?: string;
  name: string;
  code: string;
  categoryId: string;
  description?: string;
  reorderLevel?: number;
  maxLevel?: number;
  unitOfMeasure?: string;
  vendorId?: string;
  unitPrice?: number;
  currency?: 'INR' | 'AED';
  quantity?: number;
  purchaseDate?: string;
  status?: string;
  isActive?: boolean;
}

// Define the item configuration data structure
export interface ItemConfigData {
  id?: string;
  name: string;
  description?: string;
  control_type: 'Textbox' | 'Dropdown' | 'Textarea';
  collection_id?: string;
  data_type?: 'text' | 'number' | 'unit';
  sequence: number;
  max_length?: number;
  item_unit_id?: string;
  is_mandatory: boolean;
}

// Define the response structure
export interface ItemResponse {
  data: ItemManagement | ItemManagement[];
  message?: string;
  meta?: any;
}

// Define pagination response
export interface PaginatedItemsResponse {
  data: ItemManagement[];
  meta?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Get all items with pagination and filters
export const getItems = async (
  page: number = 1,
  limit: number = 10,
  filters: {
    categoryId?: string;
    search?: string;
    status?: string;
  } = {}
): Promise<PaginatedItemsResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiClient.get<ItemResponse>(`/items?${params.toString()}`);
    
    // Handle the response based on actual backend structure
    return {
      data: Array.isArray(response.data) ? response.data : [response.data as ItemManagement],
      meta: response.meta || {
        currentPage: page,
        totalPages: 1,
        totalItems: Array.isArray(response.data) ? response.data.length : 1,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
};

// Get a single item by ID
export const getItemById = async (id: string): Promise<ItemManagement> => {
  try {
    const response = await apiClient.get<ItemResponse>(`/items/${id}`);
    return response.data as ItemManagement;
  } catch (error) {
    console.error(`Error fetching item with id ${id}:`, error);
    throw error;
  }
};

// Create a new item
export const createItem = async (itemData: ItemData): Promise<ItemManagement> => {
  try {
    const response = await apiClient.post<ItemResponse>('/items', itemData);
    return response.data as ItemManagement;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

// Update an existing item
export const updateItem = async (id: string, itemData: Partial<ItemData>): Promise<ItemManagement> => {
  try {
    const response = await apiClient.put<ItemResponse>(`/items/${id}`, itemData);
    return response.data as ItemManagement;
  } catch (error) {
    console.error(`Error updating item with id ${id}:`, error);
    throw error;
  }
};

// Delete an item (soft delete)
export const deleteItem = async (id: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/items/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting item with id ${id}:`, error);
    throw error;
  }
};

// Item Configuration APIs
// Get all item configurations
export const getItemConfigurations = async (
  page: number = 1,
  limit: number = 10,
  filters: {
    search?: string;
    controlType?: string;
  } = {}
): Promise<any> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters.search) params.append('search', filters.search);
    if (filters.controlType) params.append('controlType', filters.controlType);
    
    const response = await apiClient.get(`/item-configurations?${params.toString()}`);
    return response;
  } catch (error) {
    console.error('Error fetching item configurations:', error);
    throw error;
  }
};

// Get a single item configuration by ID
export const getItemConfigurationById = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/item-configurations/${id}`);
    return response;
  } catch (error) {
    console.error(`Error fetching item configuration with id ${id}:`, error);
    throw error;
  }
};

// Create a new item configuration
export const createItemConfiguration = async (configData: ItemConfigData): Promise<any> => {
  try {
    const response = await apiClient.post('/item-configurations', configData);
    return response;
  } catch (error) {
    console.error('Error creating item configuration:', error);
    throw error;
  }
};

// Create multiple item configurations
export const createMultipleItemConfigurations = async (configData: ItemConfigData[]): Promise<any> => {
  try {
    const response = await apiClient.post('/item-configurations/bulk', configData);
    return response;
  } catch (error) {
    console.error('Error creating multiple item configurations:', error);
    throw error;
  }
};

// Update an existing item configuration
export const updateItemConfiguration = async (id: string, configData: Partial<ItemConfigData>): Promise<any> => {
  try {
    const response = await apiClient.put(`/item-configurations/${id}`, configData);
    return response;
  } catch (error) {
    console.error(`Error updating item configuration with id ${id}:`, error);
    throw error;
  }
};

// Delete an item configuration (soft delete)
export const deleteItemConfiguration = async (id: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/item-configurations/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting item configuration with id ${id}:`, error);
    throw error;
  }
};

// Get categories for dropdown
export const getCategories = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Get vendors for dropdown
export const getVendors = async (): Promise<any[]> => {
  try {
    const response = await apiClient.get('/vendors');
    return response.data;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
};