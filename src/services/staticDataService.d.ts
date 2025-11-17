export type PaginatedResponse<T = any> = {
  data: T[]
  count?: number
  error?: unknown
}

export declare function fetchUsers(
  params: Record<string, unknown>
): Promise<PaginatedResponse>

export declare function deleteUser(userId: string): Promise<void>

export declare function fetchSuppliers(
  params: Record<string, unknown>
): Promise<PaginatedResponse>

export declare function deleteSupplier(supplierId: string): Promise<void>

export declare function simulateRPC(
  functionName: string,
  params?: Record<string, unknown>
): Promise<any>


