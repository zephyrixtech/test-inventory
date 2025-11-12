export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditReport?: string;
  status: 'pending' | 'approved' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  code: string;
  category: Category;
  description?: string;
  reorderLevel?: number;
  maxLevel?: number;
  unitOfMeasure?: string;
  vendor?: Vendor;
  unitPrice?: number;
  currency?: 'INR' | 'AED';
  quantity?: number;
  totalPrice?: number;
  purchaseDate?: string;
  status: string;
  qcStatus?: 'pending' | 'approved' | 'rejected';
  availableStock?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreStock {
  id: string;
  product: Item;
  quantity: number;
  margin: number;
  currency: 'INR' | 'AED';
  priceAfterMargin: number;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string | { name?: string; permissions?: string[] };
  permissions: string[];
  companyId?: string;
  company?: {
    id?: string;
    name?: string;
    code?: string;
    currency?: string;
  } | null;
  status?: string | null;
  isActive?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

