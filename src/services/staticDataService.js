// Static Data Service - Replaces all API calls with static mock data (JavaScript version)

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock Company ID (used throughout)
const MOCK_COMPANY_ID = 'company-001';

// ==================== MOCK DATA ====================

// Users Data
const mockUsers = [
	{
		id: 'user-001',
		company_id: MOCK_COMPANY_ID,
		first_name: 'John',
		last_name: 'Doe',
		email: 'john.doe@example.com',
		phone: '+1234567890',
		role_id: 'role-001',
		status: 'active',
		is_active: true,
		failed_attempts: 0,
		image: null,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'user-002',
		company_id: MOCK_COMPANY_ID,
		first_name: 'Jane',
		last_name: 'Smith',
		email: 'jane.smith@example.com',
		phone: '+1234567891',
		role_id: 'role-002',
		status: 'active',
		is_active: true,
		failed_attempts: 0,
		image: null,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'user-003',
		company_id: MOCK_COMPANY_ID,
		first_name: 'Admin',
		last_name: 'User',
		email: 'admin@example.com',
		phone: '+1234567892',
		role_id: 'role-003',
		status: 'active',
		is_active: true,
		failed_attempts: 0,
		image: null,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Roles Data
const mockRoles = [
	{
		id: 'role-001',
		company_id: MOCK_COMPANY_ID,
		name: 'Manager',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'role-002',
		company_id: MOCK_COMPANY_ID,
		name: 'Employee',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'role-003',
		company_id: MOCK_COMPANY_ID,
		name: 'Super Admin',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Suppliers Data
const mockSuppliers = [
	{
		id: 'supplier-001',
		company_id: MOCK_COMPANY_ID,
		supplier_id: 'SUP-001',
		supplier_name: 'ABC Suppliers Inc.',
		email: 'contact@abcsuppliers.com',
		phone: '+1-555-0101',
		contact_person: 'John Supplier',
		status: 'Active',
		is_active: true,
		address: '123 Supplier St, City, State 12345',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'supplier-002',
		company_id: MOCK_COMPANY_ID,
		supplier_id: 'SUP-002',
		supplier_name: 'XYZ Trading Co.',
		email: 'info@xyztrading.com',
		phone: '+1-555-0102',
		contact_person: 'Jane Trader',
		status: 'Active',
		is_active: true,
		address: '456 Trade Ave, City, State 12346',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'supplier-003',
		company_id: MOCK_COMPANY_ID,
		supplier_id: 'SUP-003',
		supplier_name: 'Global Materials Ltd.',
		email: 'sales@globalmaterials.com',
		phone: '+1-555-0103',
		contact_person: 'Bob Materials',
		status: 'Pending',
		is_active: true,
		address: '789 Material Blvd, City, State 12347',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Categories Data
const mockCategories = [
	{
		id: 'cat-001',
		company_id: MOCK_COMPANY_ID,
		name: 'Electronics',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'cat-002',
		company_id: MOCK_COMPANY_ID,
		name: 'Furniture',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'cat-003',
		company_id: MOCK_COMPANY_ID,
		name: 'Office Supplies',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Items Data
const mockItems = [
	{
		id: 'item-001',
		company_id: MOCK_COMPANY_ID,
		item_name: 'Laptop Computer',
		item_code: 'LAP-001',
		category_id: 'cat-001',
		reorder_level: 10,
		max_level: 100,
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'item-002',
		company_id: MOCK_COMPANY_ID,
		item_name: 'Office Chair',
		item_code: 'CHAIR-001',
		category_id: 'cat-002',
		reorder_level: 5,
		max_level: 50,
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'item-003',
		company_id: MOCK_COMPANY_ID,
		item_name: 'Printer Paper',
		item_code: 'PAPER-001',
		category_id: 'cat-003',
		reorder_level: 20,
		max_level: 200,
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Inventory Data
const mockInventory = [
	{
		id: 'inv-001',
		company_id: MOCK_COMPANY_ID,
		item_id: 'item-001',
		store_id: 'store-001',
		item_qty: 25,
		unit_price: 999.99,
		selling_price: 1299.99,
		stock_date: new Date().toISOString(),
		expiry_date: null,
		purchase_order_id: 'po-001',
		created_at: new Date().toISOString(),
	},
	{
		id: 'inv-002',
		company_id: MOCK_COMPANY_ID,
		item_id: 'item-002',
		store_id: 'store-001',
		item_qty: 15,
		unit_price: 149.99,
		selling_price: 199.99,
		stock_date: new Date().toISOString(),
		expiry_date: null,
		purchase_order_id: 'po-002',
		created_at: new Date().toISOString(),
	},
	{
		id: 'inv-003',
		company_id: MOCK_COMPANY_ID,
		item_id: 'item-003',
		store_id: 'store-001',
		item_qty: 150,
		unit_price: 4.99,
		selling_price: 7.99,
		stock_date: new Date().toISOString(),
		expiry_date: null,
		purchase_order_id: 'po-003',
		created_at: new Date().toISOString(),
	},
];

// Stores Data
const mockStores = [
	{
		id: 'store-001',
		company_id: MOCK_COMPANY_ID,
		store_name: 'Main Warehouse',
		store_code: 'WH-001',
		store_manager_id: 'user-001',
		is_active: true,
		address: '100 Warehouse Rd, City, State',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'store-002',
		company_id: MOCK_COMPANY_ID,
		store_name: 'Branch Store',
		store_code: 'BR-001',
		store_manager_id: 'user-002',
		is_active: true,
		address: '200 Branch St, City, State',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Purchase Orders Data
const mockPurchaseOrders = [
	{
		id: 'po-001',
		company_id: MOCK_COMPANY_ID,
		po_number: 'PO-2024-001',
		supplier_id: 'supplier-001',
		order_date: new Date().toISOString(),
		order_status: 'APPROVER_COMPLETED',
		total_value: 24999.75,
		is_active: true,
		issued_by: 'user-001',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'po-002',
		company_id: MOCK_COMPANY_ID,
		po_number: 'PO-2024-002',
		supplier_id: 'supplier-002',
		order_date: new Date().toISOString(),
		order_status: 'APPROVER_COMPLETED',
		total_value: 2249.85,
		is_active: true,
		issued_by: 'user-001',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// Sales Invoices Data
const mockSalesInvoices = [
	{
		id: 'invoice-001',
		company_id: MOCK_COMPANY_ID,
		invoice_number: 'INV-2024-001',
		invoice_date: new Date().toISOString(),
		customer_id: 'customer-001',
		customer_name: 'Acme Corporation',
		store_id: 'store-001',
		invoice_amount: 1299.99,
		discount_amount: 0,
		net_amount: 1299.99,
		total_items: 1,
		email: 'billing@acme.com',
		contact_number: '+1-555-1001',
		billing_address: '100 Customer St, City, State',
		created_by: 'user-001',
		created_at: new Date().toISOString(),
	},
	{
		id: 'invoice-002',
		company_id: MOCK_COMPANY_ID,
		invoice_number: 'INV-2024-002',
		invoice_date: new Date().toISOString(),
		customer_id: 'customer-002',
		customer_name: 'Tech Solutions Inc.',
		store_id: 'store-001',
		invoice_amount: 399.98,
		discount_amount: 20.0,
		net_amount: 379.98,
		total_items: 2,
		email: 'orders@techsolutions.com',
		contact_number: '+1-555-1002',
		billing_address: '200 Tech Blvd, City, State',
		created_by: 'user-001',
		created_at: new Date().toISOString(),
	},
];

// Customers Data
const mockCustomers = [
	{
		id: 'customer-001',
		company_id: MOCK_COMPANY_ID,
		customer_id: 'CUST-001',
		customer_name: 'Acme Corporation',
		email: 'billing@acme.com',
		phone: '+1-555-1001',
		contact_person: 'John Customer',
		status: 'Active',
		is_active: true,
		address: '100 Customer St, City, State',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
	{
		id: 'customer-002',
		company_id: MOCK_COMPANY_ID,
		customer_id: 'CUST-002',
		customer_name: 'Tech Solutions Inc.',
		email: 'orders@techsolutions.com',
		phone: '+1-555-1002',
		contact_person: 'Jane Tech',
		status: 'Active',
		is_active: true,
		address: '200 Tech Blvd, City, State',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	},
];

// ==================== STATIC DATA SERVICE FUNCTIONS ====================

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

// ==================== DASHBOARD DATA ====================

export const fetchDashboardData = async () => {
	await delay();
	const metrics = {
		totalItems: mockItems.length,
		totalValue: mockInventory.reduce((sum, inv) => sum + inv.item_qty * (inv.selling_price || 0), 0),
		totalPurchaseOrders: mockPurchaseOrders.length,
		totalPurchaseOrderValue: mockPurchaseOrders.reduce((sum, po) => sum + (po.total_value || 0), 0),
	};

	const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
	const categoryData = mockCategories.map((cat, index) => {
		const stock = mockInventory
			.filter(inv => {
				const item = mockItems.find(i => i.id === inv.item_id);
				return item && item.category_id === cat.id;
			})
			.reduce((sum, inv) => sum + (inv.item_qty || 0), 0);
		return { name: cat.name, stock, fill: colors[index % colors.length] };
	});

	const salesData = [];
	const today = new Date();
	for (let i = 29; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		const daySales = mockSalesInvoices
			.filter(inv => new Date(inv.invoice_date).toDateString() === date.toDateString())
			.reduce((sum, inv) => sum + (inv.net_amount || 0), 0);
		salesData.push({ day: date.toISOString().split('T')[0], sales: Math.round(daySales) });
	}

	const fastMovingItems = [
		{ name: 'Laptop Computer', avgQuantity: 25 },
		{ name: 'Office Chair', avgQuantity: 15 },
		{ name: 'Printer Paper', avgQuantity: 150 },
	];

	const slowMovingItems = [
		{ name: 'Old Item 1', avgQuantity: 2 },
		{ name: 'Old Item 2', avgQuantity: 3 },
		{ name: 'Old Item 3', avgQuantity: 1 },
	];

	const inventoryAlerts = mockItems
		.map(item => {
			const totalQty = mockInventory.filter(inv => inv.item_id === item.id).reduce((sum, inv) => sum + (inv.item_qty || 0), 0);
			if (item.reorder_level && totalQty <= item.reorder_level) {
				return {
					itemName: item.item_name,
					currentQty: totalQty,
					reorderLevel: item.reorder_level,
					maxLevel: item.max_level || 0,
					alertType: 'low_stock',
					severity: totalQty === 0 ? 'high' : totalQty <= item.reorder_level * 0.5 ? 'medium' : 'low',
				};
			}
			if (item.max_level && totalQty >= item.max_level) {
				return {
					itemName: item.item_name,
					currentQty: totalQty,
					reorderLevel: item.reorder_level || 0,
					maxLevel: item.max_level,
					alertType: 'excess_stock',
					severity: totalQty >= item.max_level * 1.5 ? 'high' : totalQty >= item.max_level * 1.2 ? 'medium' : 'low',
				};
			}
			return null;
		})
		.filter(Boolean);

	return { metrics, categoryData, salesData, fastMovingItems, slowMovingItems, inventoryAlerts };
};

// ==================== USERS SERVICE ====================

export const fetchUsers = async params => {
	await delay();
	let data = [...mockUsers];
	if (params?.filterStatus && params.filterStatus !== 'all') {
		data = data.filter(u => u.status === params.filterStatus);
	}
	if (params?.filterRole && params.filterRole !== 'all') {
		data = data.filter(u => u.role_id === params.filterRole);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['first_name', 'last_name', 'email']);
	}
	if (params?.sortField && params?.sortDirection) {
		data.sort((a, b) => {
			const aVal = a[params.sortField];
			const bVal = b[params.sortField];
			return params.sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	const paginated = paginateData(data, page, limit);
	return { data: paginated.data, count: paginated.total, error: null };
};

export const fetchRoles = async () => {
	await delay();
	return { data: mockRoles, error: null };
};

export const deleteUser = async userId => {
	await delay();
	const index = mockUsers.findIndex(u => u.id === userId);
	if (index !== -1) mockUsers[index].is_active = false;
	return { error: null };
};

export const createUser = async userData => {
	await delay();
	const newUser = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		first_name: userData.first_name || '',
		last_name: userData.last_name || '',
		email: userData.email || '',
		phone: userData.phone || null,
		role_id: userData.role_id || null,
		status: userData.status || 'active',
		is_active: true,
		failed_attempts: 0,
		image: userData.image || null,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockUsers.push(newUser);
	return { data: newUser, error: null };
};

export const updateUser = async (userId, userData) => {
	await delay();
	const index = mockUsers.findIndex(u => u.id === userId);
	if (index === -1) return { data: null, error: { message: 'User not found' } };
	mockUsers[index] = { ...mockUsers[index], ...userData, modified_at: new Date().toISOString() };
	return { data: mockUsers[index], error: null };
};

// ==================== SUPPLIERS SERVICE ====================

export const fetchSuppliers = async params => {
	await delay();
	let data = [...mockSuppliers];
	if (params?.statusFilter && params.statusFilter !== 'all') {
		data = data.filter(s => s.status === params.statusFilter);
	}
	if (params?.contactFilter && params.contactFilter !== 'all') {
		data = data.filter(s => s.contact_person === params.contactFilter);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['supplier_name', 'supplier_id']);
	}
	if (params?.sortField && params?.sortDirection) {
		data.sort((a, b) => {
			const aVal = a[params.sortField];
			const bVal = b[params.sortField];
			return params.sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	const paginated = paginateData(data, page, limit);
	return { data: paginated.data, count: paginated.total, error: null };
};

export const fetchSupplierById = async id => {
	await delay();
	const supplier = mockSuppliers.find(s => s.id === id);
	return { data: supplier || null, error: supplier ? null : { message: 'Supplier not found' } };
};

export const deleteSupplier = async supplierId => {
	await delay();
	const index = mockSuppliers.findIndex(s => s.id === supplierId);
	if (index !== -1) mockSuppliers[index].is_active = false;
	return { error: null };
};

export const createSupplier = async supplierData => {
	await delay();
	const newSupplier = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		supplier_id: supplierData.supplier_id || `SUP-${Date.now()}`,
		supplier_name: supplierData.supplier_name || '',
		email: supplierData.email || '',
		phone: supplierData.phone || '',
		contact_person: supplierData.contact_person || '',
		status: supplierData.status || 'Active',
		is_active: true,
		address: supplierData.address || '',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockSuppliers.push(newSupplier);
	return { data: newSupplier, error: null };
};

export const updateSupplier = async (supplierId, supplierData) => {
	await delay();
	const index = mockSuppliers.findIndex(s => s.id === supplierId);
	if (index === -1) return { data: null, error: { message: 'Supplier not found' } };
	mockSuppliers[index] = { ...mockSuppliers[index], ...supplierData, modified_at: new Date().toISOString() };
	return { data: mockSuppliers[index], error: null };
};

// ==================== ITEMS SERVICE ====================

export const fetchItems = async params => {
	await delay();
	let data = [...mockItems];
	if (params?.categoryFilter && params.categoryFilter !== 'all') {
		data = data.filter(i => i.category_id === params.categoryFilter);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['item_name', 'item_code']);
	}
	if (params?.sortField && params?.sortDirection) {
		data.sort((a, b) => {
			const aVal = a[params.sortField];
			const bVal = b[params.sortField];
			return params.sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	return { data: paginateData(data, page, limit).data, count: data.length, error: null };
};

export const fetchItemById = async id => {
	await delay();
	const item = mockItems.find(i => i.id === id);
	return { data: item || null, error: item ? null : { message: 'Item not found' } };
};

export const createItem = async itemData => {
	await delay();
	const newItem = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		item_name: itemData.item_name || '',
		item_code: itemData.item_code || '',
		category_id: itemData.category_id || null,
		reorder_level: itemData.reorder_level || 0,
		max_level: itemData.max_level || 0,
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockItems.push(newItem);
	return { data: newItem, error: null };
};

export const updateItem = async (itemId, itemData) => {
	await delay();
	const index = mockItems.findIndex(i => i.id === itemId);
	if (index === -1) return { data: null, error: { message: 'Item not found' } };
	mockItems[index] = { ...mockItems[index], ...itemData, modified_at: new Date().toISOString() };
	return { data: mockItems[index], error: null };
};

export const deleteItem = async itemId => {
	await delay();
	const index = mockItems.findIndex(i => i.id === itemId);
	if (index !== -1) mockItems[index].is_active = false;
	return { error: null };
};

// ==================== INVENTORY SERVICE ====================

export const fetchInventory = async params => {
	await delay();
	let data = [...mockInventory];
	if (params?.storeFilter && params.storeFilter !== 'all') {
		data = data.filter(inv => inv.store_id === params.storeFilter);
	}
	if (params?.searchQuery) {
		const lower = params.searchQuery.toLowerCase();
		const matchingItemIds = mockItems.filter(item => item.item_name.toLowerCase().includes(lower) || item.item_code.toLowerCase().includes(lower)).map(item => item.id);
		data = data.filter(inv => matchingItemIds.includes(inv.item_id));
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	return { data: paginateData(data, page, limit).data, count: data.length, error: null };
};

// ==================== SALES INVOICE SERVICE ====================

export const fetchSalesInvoices = async params => {
	await delay();
	let data = [...mockSalesInvoices];
	if (params?.customerFilter && params.customerFilter !== 'all') {
	data = data.filter(inv => inv.customer_id === params.customerFilter);
	}
	if (params?.dateFrom) {
		data = data.filter(inv => inv.invoice_date >= params.dateFrom);
	}
	if (params?.dateTo) {
		data = data.filter(inv => inv.invoice_date <= params.dateTo);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['invoice_number', 'customer_name']);
	}
	if (params?.sortField && params?.sortDirection) {
		data.sort((a, b) => {
			const aVal = a[params.sortField];
			const bVal = b[params.sortField];
			return params.sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	return { data: paginateData(data, page, limit).data, count: data.length, error: null };
};

export const fetchInvoiceById = async id => {
	await delay();
	const invoice = mockSalesInvoices.find(inv => inv.id === id);
	return { data: invoice || null, error: invoice ? null : { message: 'Invoice not found' } };
};

// ==================== CUSTOMERS SERVICE ====================

export const fetchCustomers = async params => {
	await delay();
	let data = [...mockCustomers];
	if (params?.statusFilter && params.statusFilter !== 'all') {
		data = data.filter(c => c.status === params.statusFilter);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['customer_name', 'customer_id', 'email']);
	}
	if (params?.sortField && params?.sortDirection) {
		data.sort((a, b) => {
			const aVal = a[params.sortField];
			const bVal = b[params.sortField];
			return params.sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
		});
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	return { data: paginateData(data, page, limit).data, count: data.length, error: null };
};

export const fetchCustomerById = async id => {
	await delay();
	const customer = mockCustomers.find(c => c.id === id);
	return { data: customer || null, error: customer ? null : { message: 'Customer not found' } };
};

export const createCustomer = async customerData => {
	await delay();
	const newCustomer = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		customer_id: customerData.customer_id || `CUST-${Date.now()}`,
		customer_name: customerData.fullname || customerData.customer_name || '',
		email: customerData.email || '',
		phone: customerData.phone || '',
		contact_person: customerData.contact_person || '',
		status: customerData.status === 'true' || customerData.status === true ? 'Active' : 'Inactive',
		is_active: true,
		address: customerData.address || '',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockCustomers.push(newCustomer);
	return { data: newCustomer, error: null };
};

export const updateCustomer = async (customerId, customerData) => {
	await delay();
	const index = mockCustomers.findIndex(c => c.id === customerId);
	if (index === -1) return { data: null, error: { message: 'Customer not found' } };
	mockCustomers[index] = {
		...mockCustomers[index],
		customer_name: customerData.fullname || customerData.customer_name || mockCustomers[index].customer_name,
		email: customerData.email || mockCustomers[index].email,
		phone: customerData.phone || mockCustomers[index].phone,
		contact_person: customerData.contact_person || mockCustomers[index].contact_person,
		status: customerData.status === 'true' || customerData.status === true ? 'Active' : 'Inactive',
		address: customerData.address || mockCustomers[index].address,
		modified_at: new Date().toISOString(),
	};
	return { data: mockCustomers[index], error: null };
};

// ==================== CATEGORIES & STORES ====================

export const fetchCategories = async () => {
	await delay();
	return { data: mockCategories, error: null };
};

export const createCategory = async categoryData => {
	await delay();
	const newCategory = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		name: categoryData.name || '',
		is_active: true,
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockCategories.push(newCategory);
	return { data: newCategory, error: null };
};

export const updateCategory = async (categoryId, categoryData) => {
	await delay();
	const index = mockCategories.findIndex(c => c.id === categoryId);
	if (index === -1) return { data: null, error: { message: 'Category not found' } };
	mockCategories[index] = { ...mockCategories[index], ...categoryData, modified_at: new Date().toISOString() };
	return { data: mockCategories[index], error: null };
};

export const fetchStores = async () => {
	await delay();
	return { data: mockStores, error: null };
};

export const createStore = async storeData => {
	await delay();
	const newStore = {
		id: generateId(),
		company_id: MOCK_COMPANY_ID,
		store_name: storeData.store_name || '',
		store_code: storeData.store_code || `STORE-${Date.now()}`,
		store_manager_id: storeData.store_manager_id || null,
		is_active: true,
		address: storeData.address || '',
		created_at: new Date().toISOString(),
		modified_at: new Date().toISOString(),
	};
	mockStores.push(newStore);
	return { data: newStore, error: null };
};

export const updateStore = async (storeId, storeData) => {
	await delay();
	const index = mockStores.findIndex(s => s.id === storeId);
	if (index === -1) return { data: null, error: { message: 'Store not found' } };
	mockStores[index] = { ...mockStores[index], ...storeData, modified_at: new Date().toISOString() };
	return { data: mockStores[index], error: null };
};

// ==================== REPORTS + RPC (SIMULATED) ====================

export const fetchPurchaseOrders = async params => {
	await delay();
	let data = [...mockPurchaseOrders];
	if (params?.statusFilter && params.statusFilter !== 'all') {
		data = data.filter(po => po.order_status === params.statusFilter);
	}
	if (params?.supplierFilter && params.supplierFilter !== 'all') {
		data = data.filter(po => po.supplier_id === params.supplierFilter);
	}
	if (params?.searchQuery) {
		data = searchData(data, params.searchQuery, ['po_number']);
	}
	const page = params?.page || 1;
	const limit = params?.limit || 10;
	return { data: paginateData(data, page, limit).data, count: data.length, error: null };
};

export const fetchReportData = async params => {
	await delay();
	return fetchPurchaseOrders(params);
};

export const simulateRPC = async (functionName, params) => {
	await delay();
	if (functionName === 'get_purchase_orders_for_report') return fetchReportData(params);
	if (functionName === 'get_supplier_ids_from_purchase_orders') return { data: mockPurchaseOrders.map(po => po.supplier_id).filter(Boolean), error: null };
	if (functionName === 'get_consolidated_inventory') {
		return {
			data: mockInventory.filter(inv => (params.po_id ? inv.purchase_order_id === params.po_id : true)),
			error: null,
		};
	}
	if (functionName === 'get_purchase_order_items') return { data: [], error: null };
	if (functionName === 'fetch_purchase_orders') return fetchPurchaseOrders(params);
	return { data: [], error: null };
};

// ==================== AUTHENTICATION (STATIC) ====================

export const authenticateUser = async (email, password) => {
	await delay(500);
	const user = mockUsers.find(u => u.email === email && u.is_active);
	if (!user) return { data: null, error: { message: 'Invalid email or password' } };
	const userData = {
		...user,
		company_id: MOCK_COMPANY_ID,
		company_data: { currency: '$', name: 'Demo Company' },
	};
	return { data: { user: userData, session: { access_token: `mock-token-${Date.now()}`, user: userData } }, error: null };
};

export const getSession = async () => {
	await delay();
	const storedUserData = localStorage.getItem('userData');
	if (!storedUserData) return { data: { session: null }, error: null };
	const userData = JSON.parse(storedUserData);
	return { data: { session: { access_token: 'mock-token', user: userData } }, error: null };
};

// Export mocks (optional)
export { mockUsers, mockRoles, mockSuppliers, mockItems, mockInventory, mockStores, mockPurchaseOrders, mockSalesInvoices, mockCustomers, mockCategories };


