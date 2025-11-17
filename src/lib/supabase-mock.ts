// Mock Supabase client that uses static data service
import {
  fetchUsers,
  deleteUser as deleteUserStatic,
  fetchSuppliers,
  deleteSupplier as deleteSupplierStatic,
  simulateRPC,
} from "../services/staticDataService"

// Simulate delay
const delay = (ms: number = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Create a mock Supabase client
export const createMockSupabaseClient = () => {
  return {
    from: (table: string) => {
      return {
        select: (_columns?: string, _options?: any) => {
          return {
            eq: (_column: string, _value: any) => {
              return {
                eq: (_column2: string, _value2: any) => {
                  return {
                    eq: (_column3: string, _value3: any) => {
                      return {
                        not: (
                          _column4: string,
                          _operator: string,
                          _value4: any
                        ) => {
                          return {
                            single: async () => {
                              await delay()
                              return { data: null, error: null }
                            },
                            order: async (_column: string, _options?: any) => {
                              await delay()
                              return { data: [], error: null }
                            },
                          }
                        },
                        single: async () => {
                          await delay()
                          return { data: null, error: null }
                        },
                        order: async (_column: string, _options?: any) => {
                          await delay()
                          return { data: [], error: null }
                        },
                      }
                    },
                    not: (_column3: string, _operator: string, _value3: any) => {
                      return {
                        single: async () => {
                          await delay()
                          return { data: null, error: null }
                        },
                        order: async (_column: string, _options?: any) => {
                          await delay()
                          return { data: [], error: null }
                        },
                      }
                    },
                    single: async () => {
                      await delay()
                      return { data: null, error: null }
                    },
                    order: async (_column: string, _options?: any) => {
                      await delay()
                      return { data: [], error: null }
                    },
                  }
                },
                not: (_column2: string, _operator: string, _value2: any) => {
                  return {
                    single: async () => {
                      await delay()
                      return { data: null, error: null }
                    },
                    order: async (_column: string, _options?: any) => {
                      await delay()
                      return { data: [], error: null }
                    },
                  }
                },
                single: async () => {
                  await delay()
                  return { data: null, error: null }
                },
                order: async (_column: string, _options?: any) => {
                  await delay()
                  return { data: [], error: null }
                },
                range: async (start: number, end: number) => {
                  await delay()

                  // Handle different tables
                  if (table === "user_mgmt") {
                    const result = await fetchUsers({
                      page: Math.floor(start / (end - start + 1)) + 1,
                      limit: end - start + 1,
                    })
                    return {
                      data: result.data,
                      count: result.count,
                      error: result.error,
                    }
                  }

                  if (table === "supplier_mgmt") {
                    const result = await fetchSuppliers({
                      page: Math.floor(start / (end - start + 1)) + 1,
                      limit: end - start + 1,
                    })
                    return {
                      data: result.data,
                      count: result.count,
                      error: result.error,
                    }
                  }

                  return { data: [], count: 0, error: null }
                },
              }
            },
            insert: async (_data: any) => {
              await delay()
              return { data: null, error: null }
            },
            update: (_data: any) => {
              return {
                eq: async (column: string, value: any) => {
                  await delay()

                  if (table === "user_mgmt" && column === "id") {
                    await deleteUserStatic(value)
                  }

                  if (table === "supplier_mgmt" && column === "id") {
                    await deleteSupplierStatic(value)
                  }

                  return { data: null, error: null }
                },
              }
            },
            delete: () => {
              return {
                eq: async (_column: string, _value: any) => {
                  await delay()
                  return { data: null, error: null }
                },
              }
            },
          }
        },
      }
    },
    rpc: async (functionName: string, params?: any) => {
      await delay()
      return simulateRPC(functionName, params)
    },
    auth: {
      signInWithPassword: async (credentials: any) => {
        await delay()
        // Mock successful login
        return {
          data: {
            user: {
              id: "user-001",
              email: credentials.email,
            },
            session: {
              access_token: "mock-token",
            },
          },
          error: null,
        }
      },
      signOut: async () => {
        await delay()
        return { error: null }
      },
      getUser: async () => {
        await delay()
        return {
          data: {
            user: {
              id: "user-001",
              email: "user@example.com",
            },
          },
          error: null,
        }
      },
    },
  }
}

// Export mock client as default
export const supabase = createMockSupabaseClient()

