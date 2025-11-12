// Using static data service instead of Supabase
import { fetchDashboardData as fetchStaticDashboardData } from '../services/staticDataService';

// Dashboard data interfaces
export interface DashboardMetrics {
  totalItems: number;
  totalValue: number;
  totalPurchaseOrders: number;
  totalPurchaseOrderValue: number;
}

export interface CategoryStockData {
  name: string;
  stock: number;
  fill: string;
}

export interface SalesData {
  // ISO date string (YYYY-MM-DD) for the day
  day: string;
  sales: number;
}

export interface MovingItem {
  name: string;
  avgQuantity: number;
}

export interface InventoryAlert {
  itemName: string;
  currentQty: number;
  reorderLevel: number;
  maxLevel: number;
  alertType: 'low_stock' | 'excess_stock';
  severity: 'high' | 'medium' | 'low';
}

export interface DashboardData {
  metrics: DashboardMetrics;
  categoryData: CategoryStockData[];
  salesData: SalesData[];
  fastMovingItems: MovingItem[];
  slowMovingItems: MovingItem[];
  inventoryAlerts: InventoryAlert[];
}

// Color palette for categories (kept for reference, not used in static version)
const categoryColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

/**
 * Fetch all dashboard data - now using static data service
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  return fetchStaticDashboardData();
};

// Re-export types for backward compatibility
export type { DashboardData, DashboardMetrics, CategoryStockData, SalesData, MovingItem, InventoryAlert };
