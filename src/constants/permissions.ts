// Utility to fetch and cache permissions for performance
import { supabase } from '@/Utils/types/supabaseClient';
// Export ModuleKey here to avoid circular imports. This is the canonical list
// of module keys used across the app.
export type ModuleKey =
  | 'Dashboard'
  | 'Supplier Management'
  | 'Store Management'
  | 'Purchase Order Management'
  | 'Inventory Management'
  | 'Sales Invoice'
  | 'Reports'
  | 'Purchase Order Approvals'
  | 'Returns Management'
  | 'Returns Eligible'
  | 'Category Master'
  | 'Customer Master'
  | 'Item Configurator'
  | 'Item Master'
  | 'Workflow Configuration'
  | 'Audit Trail'
  | 'Users'
  | 'Administration'
  | 'Role Management'
  | 'Purchase Return Requests'
  | 'All Modules';

export const ALL_MODULES: ModuleKey[] = [
  'Dashboard',
  'Supplier Management',
  'Store Management',
  'Purchase Order Management',
  'Inventory Management',
  'Sales Invoice',
  'Reports',
  'Purchase Order Approvals',
  'Returns Management',
  'Returns Eligible',
  'Category Master',
  'Customer Master',
  'Item Configurator',
  'Item Master',
  'Workflow Configuration',
  'Audit Trail',
  'Users',
  'Role Management',
  'Administration',
  'Purchase Return Requests',
  'All Modules',
];

export interface UserPermissions {
  roleId: string;
  permissions: Record<ModuleKey, boolean>;
}

export const fetchUserPermissions = async (userId: string, companyId: string): Promise<UserPermissions | null> => {
  try {
    // Fetch user's role_id from user_mgmt
    const { data: userData, error: userError } = await supabase
      .from('user_mgmt')
      .select('role_id')
      .eq('id', userId)
      .eq('company_id', companyId)
      .single();

    if (userError || !userData?.role_id) {
      console.error('Error fetching user role:', userError);
      return null;
    }

    const roleId = userData.role_id;

    // Fetch permissions for the role
    const { data: permData, error: permError } = await supabase
      .from('role_module_permissions')
      .select('module_key, allowed')
      .eq('role_id', roleId);

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return null;
    }

    const permissions = permData.reduce((acc, perm) => {
      acc[perm.module_key as ModuleKey] = perm.allowed;
      return acc;
    }, {} as Record<ModuleKey, boolean>);

    // Cache permissions in localStorage
    try {
      localStorage.setItem('userPermissions', JSON.stringify({ roleId, permissions }));
    } catch (err) {
      console.warn('Failed to cache permissions:', err);
    }

    return { roleId, permissions };
  } catch (err) {
    console.error('Error in fetchUserPermissions:', err);
    return null;
  }
};

// Get cached permissions
export const getCachedPermissions = (): UserPermissions | null => {
  try {
    const cached = localStorage.getItem('userPermissions');
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn('Failed to retrieve cached permissions:', err);
    return null;
  }
};

// Clear cached permissions (e.g., on logout)
export const clearCachedPermissions = () => {
  try {
    localStorage.removeItem('userPermissions');
  } catch (err) {
    console.warn('Failed to clear cached permissions:', err);
  }
};