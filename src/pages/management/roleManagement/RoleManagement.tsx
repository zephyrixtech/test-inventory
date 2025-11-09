import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/Utils/types/supabaseClient';
import toast from 'react-hot-toast';
import type { ModuleKey } from '@/constants/permissions';
import type { IUser } from '@/Utils/constants';

const moduleOrder: ModuleKey[] = [
  "Dashboard",
  "Users",
  "Category Master",
  "Customer Master",
  "Item Configurator",
  "Item Master",
  "Supplier Management",
  "Store Management",
  "Purchase Order Management",
  "Inventory Management",
  "Sales Invoice",
  "Reports",
  "Workflow Configuration",
  "Administration",
  "Purchase Order Approvals",
  "Returns Management",
  "Returns Eligible",
  "Audit Trail",
  "Role Management",
];

type RoleWithPermissions = {
  id: string;
  name: string;
  permissions: Record<ModuleKey, boolean>;
};

export const RoleManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, Record<ModuleKey, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const userDataString = localStorage.getItem('userData');
  const userData: IUser | null = userDataString ? JSON.parse(userDataString) : null;

  useEffect(() => {
    if (!userData) {
      navigate('/dashboard');
    }
  }, [userData, navigate]);

  if (!userData) return null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: roleData, error: roleError } = await supabase
          .from('role_master')
          .select('id, name')
          .eq('company_id', userData.company_id)
          .order('name');

        if (roleError) {
          console.error('role_master fetch error', roleError);
          toast.error('Failed to load roles');
          return;
        }

        if (!roleData || roleData.length === 0) {
          toast.error('No roles found');
          setRoles([]);
          setOriginalPermissions({});
          return;
        }

        const roleIds = roleData.map((r: any) => r.id);
        const { data: permData, error: permError } = await supabase
          .from('role_module_permissions')
          .select('role_id, module_key, allowed')
          .in('role_id', roleIds);

        if (permError) {
          console.warn('role_module_permissions fetch failed, using defaults:', permError.message || permError);
        }

        const permsMap = (permData || []).reduce((acc: any, p: any) => {
          if (!acc[p.role_id]) acc[p.role_id] = {};
          acc[p.role_id][p.module_key as ModuleKey] = p.allowed;
          return acc;
        }, {} as Record<string, Record<ModuleKey, boolean>>);

        const rolesWithPerms: RoleWithPermissions[] = (roleData || []).map((role: any) => ({
          id: role.id,
          name: role.name,
          permissions: {
            ...moduleOrder.reduce((acc, m) => { acc[m] = false; return acc; }, {} as Record<ModuleKey, boolean>),
            ...(permsMap[role.id] || {}),
          },
        }));

        setRoles(rolesWithPerms);
        const original = rolesWithPerms.reduce((acc, r) => {
          acc[r.id] = { ...r.permissions };
          return acc;
        }, {} as Record<string, Record<ModuleKey, boolean>>);
        setOriginalPermissions(original);
        setHasChanges(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load role authorizations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData?.company_id]);

  const handlePermissionChange = (roleId: string, module: ModuleKey, checked: boolean) => {
    setRoles(prev => {
      const updatedRoles = prev.map(r => 
        r.id === roleId 
          ? { ...r, permissions: { ...r.permissions, [module]: checked } }
          : r
      );
      const updatedHasChanges = updatedRoles.some(r => {
        const orig = originalPermissions[r.id] || {};
        return moduleOrder.some(m => (orig[m] || false) !== (r.permissions[m] || false));
      });
      setHasChanges(updatedHasChanges);
      return updatedRoles;
    });
  };

  const logChange = async (roleName: string, module: ModuleKey, action: 'granted' | 'revoked') => {
    const logEntry = {
      company_id: userData.company_id,
      transaction_date: new Date().toISOString(),
      module: 'Role Management',
      scope: 'Update Authorization',
      key: `${roleName} - ${module}`,
      log: `Role ${roleName} access to module ${module} ${action}.`,
      action_by: userData.id,
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('system_log').insert(logEntry);
      if (error) console.error('Logging error:', error);
    } catch (err) {
      console.error('Failed to write system_log:', err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const changes: Array<{ roleId: string; roleName: string; module: ModuleKey; action: 'granted' | 'revoked' }> = [];

      for (const role of roles) {
        const oldPerms = originalPermissions[role.id] || {};
        const newPerms = role.permissions;

        for (const module of moduleOrder) {
          const oldAllowed = oldPerms[module] ?? false;
          const newAllowed = newPerms[module] ?? false;

          if (oldAllowed !== newAllowed) {
            changes.push({ roleId: role.id, roleName: role.name, module, action: newAllowed ? 'granted' : 'revoked' });
          }
        }

        try {
          const { error: deleteError } = await supabase
            .from('role_module_permissions')
            .delete()
            .eq('role_id', role.id);
          if (deleteError) throw deleteError;

          const allowedModules = Object.entries(newPerms)
            .filter(([_, allowed]) => allowed)
            .map(([module]) => ({ role_id: role.id, module_key: module as ModuleKey, allowed: true }));

          if (allowedModules.length > 0) {
            const { error: insertError } = await supabase
              .from('role_module_permissions')
              .insert(allowedModules);
            if (insertError) throw insertError;
          }
        } catch (err) {
          console.error('Failed to persist permissions for role', role.id, err);
          toast.error('Failed to update some role permissions');
        }
      }

      for (const change of changes) {
        await logChange(change.roleName, change.module, change.action);
      }

      setOriginalPermissions(roles.reduce((acc, r) => { acc[r.id] = { ...r.permissions }; return acc; }, {} as Record<string, Record<ModuleKey, boolean>>));
      setHasChanges(false);
      toast.success('Role authorizations updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update authorizations');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[85vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Role Authorizations
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage module access for predefined roles
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {hasChanges && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Unsaved changes detected. Click Save to persist updates.</AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg overflow-hidden border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50 border-gray-200">
                    <TableHead className="w-48 font-semibold">Module</TableHead>
                    {roles
                      .filter(role => role.name !== 'Super Admin')
                      .map(role => (
                        <TableHead key={role.id} className="text-center font-semibold">
                          {role.name}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleOrder.map((module) => (
                    <TableRow key={module} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{module}</TableCell>
                      {roles
                        .filter(role => role.name !== 'Super Admin')
                        .map(role => (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={role.permissions[module]}
                              onCheckedChange={(checked) => handlePermissionChange(role.id, module, !!checked)}
                              className="mx-auto"
                            />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/administration')}
                disabled={isSaving}
                className="transition-colors"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
