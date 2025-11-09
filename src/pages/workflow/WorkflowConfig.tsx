import { useState, useEffect } from "react";
import { Trash2, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { supabase } from "@/Utils/types/supabaseClient";
import { IRole, IWorkflowConfig } from "@/Utils/constants";

interface WorkflowLevel {
  uuid: string;
  id: number;
  approverRole: string;
  active: boolean;
}

// Zod schema for validation
const workflowSchema = z.object({
  businessProcess: z.string().min(1, "Business process is required"),
  levels: z.array(z.object({
    id: z.number(),
    approverRole: z.string().min(1, "Approver role is required"),
    active: z.boolean(),
    uuid: z.string()
  })).min(1, "At least one level is required")
    .refine((levels) => levels.some(level => level.active), {
      message: "At least one active approval level is required"
    })
    .refine((levels) => {
      const activeRoles = levels.filter(level => level.active).map(level => level.approverRole);
      return new Set(activeRoles).size === activeRoles.length;
    }, {
      message: "Duplicate approver roles are not allowed"
    }),
  superAdminOverride: z.boolean()
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

const WorkflowConfiguration = () => {
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [allRoles, setAllRoles] = useState<IRole[]>([]);
  const [workflowLevels, setWorkflowLevels] = useState<IWorkflowConfig[]>([])
  const [tempLevel, setTempLevel] = useState<WorkflowLevel | null>(null);

  const user = localStorage.getItem("userData");
  const userData = JSON.parse(user || '{}');
  const companyId = userData?.company_id || null;

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      businessProcess: "Purchase Order",
      levels: [],
      superAdminOverride: false
    },
    mode: "onChange"
  });

  const watchedLevels = watch("levels");
  const watchedBusinessProcess = watch("businessProcess");

  const handleAddLevel = () => {
    const currentLevels = getValues("levels");
    const newLevel: WorkflowLevel = {
      id: currentLevels.length + 1,
      approverRole: "",
      active: true,
      uuid: "",
    };
    setValue("levels", [...currentLevels, newLevel]);
    setIsEditing(newLevel.id);
    setTempLevel(newLevel); // Initialize temp state for new level
  };

  const handleEdit = (id: number) => {
    const level = getValues("levels").find((level) => level.id === id);
    if (level) {
      setTempLevel({ ...level }); // Copy current level to temp state
      setIsEditing(id);
    }
  };

  const handleSave = () => {
    if (!tempLevel?.approverRole) {
      toast.error("Please select an approver role");
      return;
    }

    const currentLevels = getValues("levels");
    const updatedLevels = currentLevels.map((level) =>
      level.id === isEditing ? { ...level, ...tempLevel } : level
    );
    setValue("levels", updatedLevels);
    setIsEditing(null);
    setTempLevel(null);
    toast.success("Level updated successfully");
  };

  const handleCancel = () => {
    setIsEditing(null);
    setTempLevel(null);
  };

  const handleDelete = (id: number) => {
    const currentLevels = getValues("levels");
    const filteredLevels = currentLevels.filter(level => level.id !== id);
    const reorderedLevels = filteredLevels.map((level, index) => ({
      ...level,
      id: index + 1,
    }));
    setValue("levels", reorderedLevels);
    setIsEditing(null);
    setTempLevel(null);
    toast.success("Level deleted successfully");
  };

  const handleTempChange = (field: keyof WorkflowLevel, value: string | boolean) => {
    if (tempLevel) {
      setTempLevel({ ...tempLevel, [field]: value });
    }
  };

  const onSubmit = async (data: WorkflowFormData) => {
    try {
      const payload = data.levels.map(level => ({
        id: level.uuid || undefined,
        process_name: data.businessProcess,
        override_enabled: data.superAdminOverride,
        level: level.id,
        role_id: level.approverRole,
        is_active: level.active,
        created_by: userData.id,
        modified_by: userData.id,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        company_id: companyId,
      }));

      const updatePayload = payload.filter(level => level.id).map(({ created_by, created_at, ...rest }) => rest);
      const insertPayload = payload.filter(level => level.id === undefined).map(({ modified_at, modified_by, id, ...rest }) => rest);

      // Delete any workflow level row not included in payload
      const payloadIds = payload.map(p => p.id).filter(Boolean);
      const existingIds = workflowLevels.map(config => config.id);
      const idsToDelete = existingIds.filter((id: string) => !payloadIds.includes(id));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('workflow_config')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error deleting removed levels:', deleteError);
          toast.error('Failed to delete removed workflow levels');
          return;
        }
      }

      // Update existing
      for (const row of updatePayload) {
        const { id, ...values } = row;

        const { error: updateError } = await supabase
          .from('workflow_config')
          .update(values)
          .eq('id', id!);

        if (updateError) {
          console.error('Error updating workflow config:', updateError);
          toast.error('Failed to update workflow config');
          return;
        }
      }

      // Insert new
      const { error: insertError } = await supabase
        .from('workflow_config')
        .insert(insertPayload);

      if (insertError) {
        console.error('Error inserting workflow config:', insertError);
        toast.error('Failed to insert workflow config');
        return;
      }

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Workflow Configuration',
        scope: 'Edit',
        key: '',
        log: `Workflow configuration for ${data.businessProcess} updated.`,
        action_by: userData.id,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;
      fetchWorkflowConfig();
      toast.success(`Workflow for ${data.businessProcess} saved successfully`);
    } catch (error) {
      console.error("Save workflow config error:", error);
      toast.error('Failed to save workflow config');
    }
  };

  const getAvailableRoles = (currentLevelId: number) => {
    const currentLevels = getValues("levels");
    const usedRoles = currentLevels
      .filter(level => level.id !== currentLevelId && level.approverRole)
      .map(level => level.approverRole);

    return allRoles.filter(role => !usedRoles.includes(role.id));
  };

  // Load workflow based on businessProcess
  const fetchWorkflowConfig = async () => {
    const { data, error } = await supabase
      .from('workflow_config')
      .select('*')
      .eq('company_id', companyId)
      .eq("process_name", watchedBusinessProcess)
      .order("level", { ascending: true })

    if (error) {
      console.error('Error fetching workflow config:', error);
      toast.error('Failed to fetch workflow config');
      return;
    }

    if (data.length > 0) {
      setWorkflowLevels(data)
      const configLevels = data.map(configLevel => ({
        uuid: configLevel.id,
        id: configLevel.level,
        approverRole: configLevel.role_id,
        active: configLevel.is_active ?? false
      }));
      reset({
        businessProcess: data[0].process_name,
        levels: configLevels,
        superAdminOverride: data[0].override_enabled ?? false
      })
    } else {
      setWorkflowLevels([]);
      reset({
        businessProcess: watchedBusinessProcess,
        levels: [],
        superAdminOverride: false
      })
    }
  }

  useEffect(() => {
    fetchWorkflowConfig();
  }, [watchedBusinessProcess]);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase
        .from('role_master')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (data) {
        setAllRoles(data);
      }
    }
    fetchRoles();
  }, []);

  // Check if all levels have a non-empty approverRole
  const allLevelsHaveApproverRole = watchedLevels.length > 0 && watchedLevels.every(level => level.approverRole !== "");

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8 8-8 8 3.59 8 8 8s8-3.59 8-8-3.59-8-8-8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Workflow Configuration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure approval workflows for business processes
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Business Process</label>
                <Controller
                  name="businessProcess"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Select Business Process" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                        <SelectItem value="Purchase Return Request">Purchase Return Request</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.businessProcess && (
                  <p className="text-red-600 text-sm mt-1">{errors.businessProcess.message}</p>
                )}
              </div>

              <div className="mb-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Level</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Approver Role</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-[14px] font-medium hover:text-blue-700 tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {watchedLevels.map((level) => (
                        <tr key={level.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{level.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing === level.id ? (
                              <Select
                                value={tempLevel?.approverRole || ""}
                                onValueChange={(value) => handleTempChange("approverRole", value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableRoles(level.id).map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              level.approverRole ? (
                                <Badge
                                  variant="outline"
                                  className="capitalize bg-gray-100 text-gray-800 border-gray-300"
                                >
                                  {allRoles.find((role) => role.id === level.approverRole)?.name}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 italic">No role selected</span>
                              )
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isEditing === level.id ? (
                              <input
                                type="checkbox"
                                checked={tempLevel?.active ?? false}
                                onChange={(e) => handleTempChange("active", e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            ) : (
                              <span className={`text-lg ${level.active ? "text-green-600" : "text-red-600"}`}>
                                {level.active ? "✓" : "✗"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {isEditing === level.id ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={handleSave} type="button">
                                    Apply
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={handleCancel} type="button">
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEdit(level.id)}
                                    type="button"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(level.id)}
                                    type="button"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200"
                  onClick={handleAddLevel}
                  type="button"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Level
                </Button>
                {errors.levels && (
                  <p className="text-red-600 text-sm mt-2">{errors.levels.message}</p>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Controller
                            name="superAdminOverride"
                            control={control}
                            render={({ field }) => (
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                              />
                            )}
                          />
                          <span>Allow SuperAdmin to override all approval levels</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>When enabled, SuperAdmins can perform approvals for all levels in this process.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!allLevelsHaveApproverRole}
                  onClick={handleSubmit(onSubmit)}
                  className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200 ${!allLevelsHaveApproverRole ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Save Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkflowConfiguration;