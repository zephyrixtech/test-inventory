// Mock Supabase client that uses static data service
import {
  fetchUsers,
  fetchRoles,
  deleteUser as deleteUserStatic,
  fetchSuppliers,
  fetchSupplierById,
  deleteSupplier as deleteSupplierStatic,
  fetchItems,
  fetchItemById,
  fetchInventory,
  fetchSalesInvoices,
  fetchInvoiceById,
  fetchCustomers,
  fetchCustomerById,
  fetchCategories,
  fetchStores,
  fetchPurchaseOrders,
  fetchReportData,
  simulateRPC,
} from '../services/staticDataService';

// Simulate delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Create a mock Supabase client
export const createMockSupabaseClient = () => {
  return {
    from: (table: string) => {
      return {
        select: (columns?: string, options?: any) => {
          return {
            eq: (column: string, value: any) => {
              return {
                eq: (column2: string, value2: any) => {
                  return {
                    eq: (column3: string, value3: any) => {
                      return {
                        not: (column4: string, operator: string, value4: any) => {
                          return {
                            single: async () => {
                              await delay();
                              return { data: null, error: null };
                            },
                            order: async (column: string, options?: any) => {
                              await delay();
                              return { data: [], error: null };
                            },
                          };
                        },
                        single: async () => {
                          await delay();
                          return { data: null, error: null };
                        },
                        order: async (column: string, options?: any) => {
                          await delay();
                          return { data: [], error: null };
                        },
                      };
                    },
                    not: (column3: string, operator: string, value3: any) => {
                      return {
                        single: async () => {
                          await delay();
                          return { data: null, error: null };
                        },
                        order: async (column: string, options?: any) => {
                          await delay();
                          return { data: [], error: null };
                        },
                      };
                    },
                    single: async () => {
                      await delay();
                      return { data: null, error: null };
                    },
                    order: async (column: string, options?: any) => {
                      await delay();
                      return { data: [], error: null };
                    },
                  };
                },
                not: (column2: string, operator: string, value2: any) => {
                  return {
                    single: async () => {
                      await delay();
                      return { data: null, error: null };
                    },
                    order: async (column: string, options?: any) => {
                      await delay();
                      return { data: [], error: null };
                    },
                  };
                },
                single: async () => {
                  await delay();
                  return { data: null, error: null };
                },
                order: async (column: string, options?: any) => {
                  await delay();
                  return { data: [], error: null };
                },
                range: async (start: number, end: number) => {
                  await delay();
                  
                  // Handle different tables
                  if (table === 'user_mgmt') {
                    const result = await fetchUsers({
                      page: Math.floor(start / (end - start + 1)) + 1,
                      limit: end - start + 1,
                    });
                    return { data: result.data, count: result.count, error: result.error };
                  }
                  
                  if (table === 'supplier_mgmt') {
                    const result = await fetchSuppliers({
                      page: Math.floor(start / (end - start + 1)) + 1,
                      limit: end - start + 1,
                    });
                    return { data: result.data, count: result.count, error: result.error };
                  }
                  
                  return { data: [], count: 0, error: null };
                },
              };
            },
            insert: async (data: any) => {
              await delay();
              return { data: null, error: null };
            },
            update: (data: any) => {
              return {
                eq: async (column: string, value: any) => {
                  await delay();
                  
                  if (table === 'user_mgmt' && column === 'id') {
                    await deleteUserStatic(value);
                  }
                  
                  if (table === 'supplier_mgmt' && column === 'id') {
                    await deleteSupplierStatic(value);
                  }
                  
                  return { data: null, error: null };
                },
              };
            },
            delete: () => {
              return {
                eq: async (column: string, value: any) => {
                  await delay();
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
    rpc: async (functionName: string, params?: any) => {
      await delay();
      return simulateRPC(functionName, params);
    },
    auth: {
      signInWithPassword: async (credentials: any) => {
        await delay();
        // Mock successful login
        return {
          data: {
            user: {
              id: 'user-001',
              email: credentials.email,
            },
            session: {
              access_token: 'mock-token',
            },
          },
          error: null,
        };
      },
      signOut: async () => {
        await delay();
        return { error: null };
      },
      getUser: async () => {
        await delay();
        return {
          data: {
            user: {
              id: 'user-001',
              email: 'user@example.com',
            },
          },
          error: null,
        };
      },
    },
  };
};

// Export mock client as default
export const supabase = createMockSupabaseClient();

