export interface Product {
  productId: string;
  productName: string;
  category: string;
  quantityInStock: number;
  unitPrice: number;
  reorderPoint: number;
  supplier: string;
  location: string;
  lastRestocked: string;
  monthlySales: number[];
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  categoryCount: number;
  lowStockItems: number;
  turnoverRate: number;
  daysOfSupply: number;
}

export interface FilterProps {
  dateRange: [Date | null, Date | null];
  category: string;
  supplier: string;
  location: string;
}
export interface InventoryData {
  inventory: Product[];
}

export interface Role {
  id: string;
  role_name: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  role_id: string;
  roles: Role;
}

export interface PaginationData {
  total: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}