// Extended Static Data Service - Replaces all API calls with static mock data (JavaScript version)
// This file extends the existing staticDataService.js with additional data structures

// Import existing mock data
import { 
  mockUsers, 
  mockRoles, 
  mockSuppliers, 
  mockItems, 
  mockInventory, 
  mockStores, 
  mockPurchaseOrders, 
  mockSalesInvoices, 
  mockCustomers, 
  mockCategories 
} from './staticDataService';

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock Company ID (used throughout)
const MOCK_COMPANY_ID = 'company-001';

// ==================== MOCK DATA ====================

// Purchase Order Items Data
const mockPurchaseOrderItems = [
  {
    id: 'poi-001-1',
    company_id: MOCK_COMPANY_ID,
    purchase_order_id: 'po-001',
    item_id: 'item-001',
    order_qty: 10,
    order_price: 9999.90,
    received_qty: 10,
    returned_qty: 0,
    remarks: null,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'poi-001-2',
    company_id: MOCK_COMPANY_ID,
    purchase_order_id: 'po-001',
    item_id: 'item-002',
    order_qty: 5,
    order_price: 749.95,
    received_qty: 5,
    returned_qty: 0,
    remarks: null,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'poi-002-1',
    company_id: MOCK_COMPANY_ID,
    purchase_order_id: 'po-002',
    item_id: 'item-003',
    order_qty: 100,
    order_price: 499.00,
    received_qty: 100,
    returned_qty: 0,
    remarks: null,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'poi-002-2',
    company_id: MOCK_COMPANY_ID,
    purchase_order_id: 'po-002',
    item_id: 'item-001',
    order_qty: 5,
    order_price: 4999.95,
    received_qty: 5,
    returned_qty: 0,
    remarks: 'Special discount applied',
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  }
];

// System Message Config Data
const mockSystemMessageConfig = [
  { 
    id: 'smc-001', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'ORDER_CREATED',
    value: 'Order Created',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-002', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'APPROVAL_PENDING',
    value: 'Approval Pending Level {@}',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-003', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'APPROVER_COMPLETED',
    value: '{@} Approved',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-004', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'ORDER_ISSUED',
    value: 'Order Issued',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-005', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'ORDER_RECEIVED',
    value: 'Order Received',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-006', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'ORDER_PARTIALLY_RECEIVED',
    value: 'Order Partially Received',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  },
  { 
    id: 'smc-007', 
    company_id: MOCK_COMPANY_ID,
    category_id: 'PURCHASE_ORDER',
    sub_category_id: 'ORDER_CANCELLED',
    value: 'Order Cancelled',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  }
];

// Workflow Config Data
const mockWorkflowConfig = [
  {
    id: 'wc-001',
    company_id: MOCK_COMPANY_ID,
    process_name: 'Purchase Order',
    level: 1,
    role_id: 'role-001',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  }
];

// Supplier Items Data (linking suppliers to items they supply)
const mockSupplierItems = [
  {
    id: 'si-001',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supplier-001',
    item_id: 'item-001',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'si-002',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supplier-001',
    item_id: 'item-002',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'si-003',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supplier-002',
    item_id: 'item-003',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'si-004',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supplier-002',
    item_id: 'item-001',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  },
  {
    id: 'si-005',
    company_id: MOCK_COMPANY_ID,
    supplier_id: 'supplier-003',
    item_id: 'item-002',
    is_active: true,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  }
];

// ==================== EXTENDED STATIC DATA SERVICE FUNCTIONS ====================

// Simulate async delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Generic search function
const searchData = (data, searchQuery, searchFields) => {
  if (!searchQuery) return data;
  const query = searchQuery.toLowerCase();
  return data.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(query);
    });
  });
};

// Generic pagination
const paginateData = (data, page, limit) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: data.slice(start, end),
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
    hasNextPage: end < data.length,
    hasPrevPage: page > 1,
  };
};

// ==================== EXTENDED SERVICE FUNCTIONS ====================

// Get purchase order items by purchase order ID
export const fetchPurchaseOrderItems = async (poId) => {
  await delay();
  const items = mockPurchaseOrderItems.filter(item => item.purchase_order_id === poId);
  
  // Enrich items with item details
  const enrichedItems = items.map(item => {
    const itemDetails = mockItems.find(i => i.id === item.item_id);
    return {
      ...item,
      item_mgmt: itemDetails ? {
        item_name: itemDetails.item_name,
        description: `${itemDetails.item_name} - ${itemDetails.item_code}`,
        selling_price: itemDetails.selling_price,
        max_level: itemDetails.max_level,
        category_id: itemDetails.category_id
      } : null
    };
  });
  
  return { data: enrichedItems, error: null };
};

// Get supplier by ID
export const fetchSupplierById = async (supplierId) => {
  await delay();
  const supplier = mockSuppliers.find(s => s.id === supplierId);
  return { data: supplier || null, error: supplier ? null : { message: 'Supplier not found' } };
};

// Get store by ID
export const fetchStoreById = async (storeId) => {
  await delay();
  const store = mockStores.find(s => s.id === storeId);
  return { data: store || null, error: store ? null : { message: 'Store not found' } };
};

// Get system message config
export const fetchSystemMessageConfig = async (categoryId = 'PURCHASE_ORDER') => {
  await delay();
  const config = mockSystemMessageConfig.filter(c => c.category_id === categoryId);
  return { data: config, error: null };
};

// Get workflow config
export const fetchWorkflowConfig = async (processName = 'Purchase Order') => {
  await delay();
  const config = mockWorkflowConfig.find(c => c.process_name === processName);
  return { data: config || null, error: null };
};

// Get supplier items
export const fetchSupplierItems = async (supplierId) => {
  await delay();
  const supplierItemIds = mockSupplierItems
    .filter(si => si.supplier_id === supplierId)
    .map(si => si.item_id);
    
  const items = mockItems.filter(item => supplierItemIds.includes(item.id));
  return { data: items, error: null };
};

// Export all mock data
export { 
  mockUsers, 
  mockRoles, 
  mockSuppliers, 
  mockItems, 
  mockInventory, 
  mockStores, 
  mockPurchaseOrders, 
  mockPurchaseOrderItems,
  mockSalesInvoices, 
  mockCustomers, 
  mockCategories,
  mockSystemMessageConfig,
  mockWorkflowConfig,
  mockSupplierItems
};