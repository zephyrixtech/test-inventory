import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Search, Check, X, ChevronLeft, ChevronRight, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/Utils/types/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/Utils/formatters';
import { getLocalDateTime } from '@/Utils/commonFun';
import { triggerNotificationUpdate } from '@/Utils/notificationEvents';
import { IUser } from '@/Utils/constants';

// Interface for PurchaseOrder to match displayed data
interface PurchaseOrder {
  id: string;
  supplier: string;
  createdDate: string;
  value: number;
  status: string;
  trail: string;
  po_id: string;
  po_number: string;
  po_status_info: {
    id: string;
    value: string;
    sub_category_id: string;
  };
  workflow_id: string;
  approval_status: any[];
  created_by?: string; // Added for notification purposes
}

// Interface for Workflow
interface WorkflowConfig {
  id: string;
  process_name: string;
  level: number;
  role_id: string;
  levels: number[];
  override_enabled?: boolean;
}

// Interface for Filters
interface Filters {
  level: string;
  status: string;
}

// CORRECTED Notification interfaces to match actual database columns
interface NotificationPayload {
  created_at?: string; // Auto-generated, but we can set it
  acknowledged_at?: string | null;
  assign_to: string;
  message: string;
  status: 'New' | 'Read' | 'Deleted';
  priority: 'Low' | 'Medium' | 'High';
  alert_type: string;
  entity_id: string;
}

type SortFieldPO = 'po_number' | 'created_at' | 'total_value';
type SortDirectionPO = 'ASC' | 'DESC' | null;

interface SortConfigPO {
  field: SortFieldPO | null;
  direction: SortDirectionPO;
}

// Function to format date consistently with PurchaseOrderList
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
};

const Approvals: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [filters, setFilters] = useState<Filters>({ level: 'all', status: 'all' });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [userRoleName, setUserRoleName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<IUser>();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [__, setError] = useState<string | null>(null);
  const [workflowConfigs, setWorkflowConfigs] = useState<WorkflowConfig[]>([]);
  const [processingApproval, setProcessingApproval] = useState(false);
  const navigate = useNavigate();
  const [sortConfigPO, setSortConfigPO] = useState<SortConfigPO>({
    field: 'created_at',
    direction: 'ASC',
  });

  // CORRECTED Notification Helper Functions
  const createNotifications = async (notifications: NotificationPayload[]) => {
    try {
      if (notifications.length === 0) return;

      // Map the notifications to match the exact database column structure
      const formattedNotifications = notifications.map(notification => ({
        created_at: getLocalDateTime(),
        acknowledged_at: null,
        assign_to: notification.assign_to,
        message: notification.message,
        status: notification.status,
        priority: notification.priority,
        alert_type: notification.alert_type,
        entity_id: notification.entity_id,
        company_id: companyId
      }));

      console.log('Creating notifications with correct column names:', formattedNotifications);

      const { error: notificationError } = await supabase
        .from('system_notification')
        .insert(formattedNotifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        toast.error('Failed to create some notifications');
      } else {
        console.log(`Successfully created ${notifications.length} notifications`);
        // TRIGGER NOTIFICATION UPDATE IN HEADER
        triggerNotificationUpdate();
      }
    } catch (error) {
      console.error('Error in createNotifications:', error);
    }
  };

  const getUsersInRole = async (roleId: string): Promise<string[]> => {
    try {
      const { data: users, error } = await supabase
        .from('user_mgmt')
        .select('id')
        .eq('role_id', roleId)
        .eq('company_id', companyId!)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching users in role:', error);
        return [];
      }

      return users?.map(user => user.id) || [];
    } catch (error) {
      console.error('Error in getUsersInRole:', error);
      return [];
    }
  };

  const getSuperAdminUsers = async (): Promise<string[]> => {
    try {
      // First get the Super Admin role ID
      const { data: roleData, error: roleError } = await supabase
        .from('role_master')
        .select('id')
        .eq('company_id', companyId!)
        .eq('name', 'Super Admin')
        .single();

      if (roleError || !roleData) {
        console.error('Error fetching Super Admin role:', roleError);
        return [];
      }

      // Then get all users with that role
      return await getUsersInRole(roleData.id);
    } catch (error) {
      console.error('Error in getSuperAdminUsers:', error);
      return [];
    }
  };

  useEffect(() => {
    const getCurrentUserRole = async () => {
      if (!userRoleId) return;
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('role_master')
          .select('*')
          .eq('company_id', companyId!)
          .eq('id', userRoleId)
          .single();

        if (roleError || !roleData) {
          console.error('Error fetching user role data:', roleError);
          return;
        }

        setUserRoleName(roleData.name);
      } catch (error) {
        console.error('Error in getting user role data:', error);
        return;
      }
    };

    getCurrentUserRole();
  }, [userRoleId])

  const getUserDisplayName = async (userId: string): Promise<string> => {
    try {
      const { data: userData, error } = await supabase
        .from('user_mgmt')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        console.error('Error fetching user display name:', error);
        return 'Unknown User';
      }

      return `${userData.first_name} ${userData.last_name}`.trim();
    } catch (error) {
      console.error('Error in getUserDisplayName:', error);
      return 'Unknown User';
    }
  };

const createApprovalNotifications = async (
  po: PurchaseOrder, 
  actionType: 'approved' | 'rejected', 
  nextLevelInfo?: any
) => {
  try {
    const notifications: NotificationPayload[] = [];
    const currentUserName = await getUserDisplayName(userId!);
    
    // Get PO details for message creation
    const supplierName = po.supplier;
    
    if (actionType === 'approved') {
      // Case 2: Purchase Order Approval Notifications
      
      // 1. Notification to user who approved
      notifications.push({
        priority: 'Medium',
        alert_type: 'Purchase Order Approved',
        entity_id: po.po_number,
        message: `You have successfully approved Purchase Order ${po.po_number} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
        assign_to: userId!,
        status: 'New'
      });

      // 2. Notification to Super Admin users
      const superAdminUsers = await getSuperAdminUsers();
      for (const superAdminId of superAdminUsers) {
        if (superAdminId !== userId) { // Don't send to current user if they're Super Admin
          notifications.push({
            priority: 'Medium',
            alert_type: 'Purchase Order Approved',
            entity_id: po.po_number,
            message: `Purchase Order ${po.po_number} has been approved by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
            assign_to: superAdminId,
            status: 'New'
          });
        }
      }

      // Check if this is a Super Admin override approval
      const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;
      const maxLevel = Math.max(...workflowConfigs.map((w: any) => w.level));
      const canOverride = isSuperAdmin ? await canSuperAdminOverride(po.workflow_id) : false;
      const isSuperAdminOverride = isSuperAdmin && canOverride && currentLevel < maxLevel;

      if (isSuperAdminOverride) {
      // Super Admin Override: Notify ALL level users that Super Admin approved on their behalf

        // Notify users from current level to max level
        for (let level = currentLevel; level <= maxLevel; level++) {
          const levelWorkflow = workflowConfigs.find((w: any) => w.level === level);
          if (levelWorkflow) {
            const levelUsers = await getUsersInRole(levelWorkflow.role_id);
            for (const levelUserId of levelUsers) {
              if (levelUserId !== userId) { // Don't send to the Super Admin approver
                const isCurrentLevel = level === currentLevel;
                const isFinalLevel = level === maxLevel;
                
                let levelMessage = '';
                if (isCurrentLevel && isFinalLevel) {
                  // Single level workflow
                  levelMessage = `Purchase Order ${po.po_number} has been approved and completed by Super Admin ${currentUserName} on your behalf for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`;
                } else if (isCurrentLevel) {
                  // Current level
                  levelMessage = `Purchase Order ${po.po_number} has been approved by Super Admin ${currentUserName} on your behalf at Level ${level} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. All subsequent levels have also been approved automatically.`;
                } else if (isFinalLevel) {
                  // Final level
                  levelMessage = `Purchase Order ${po.po_number} has been approved and completed by Super Admin ${currentUserName} on your behalf at Level ${level} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`;
                } else {
                  // Intermediate levels
                  levelMessage = `Purchase Order ${po.po_number} has been approved by Super Admin ${currentUserName} on your behalf at Level ${level} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`;
                }

                notifications.push({
                  priority: isFinalLevel ? 'High' : 'Medium',
                  alert_type: isFinalLevel ? 'Purchase Order Completed' : 'Purchase Order Approved',
                  entity_id: po.po_number,
                  message: levelMessage,
                  assign_to: levelUserId,
                  status: 'New'
                });
              }
            }
          }
        }

        // Notify PO creator about Super Admin override completion
        if (po.created_by && po.created_by !== userId) {
          notifications.push({
            priority: 'High',
            alert_type: 'Purchase Order Completed',
            entity_id: po.po_number,
            message: `Your Purchase Order ${po.po_number} has been approved and completed through all levels by Super Admin ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
            assign_to: po.created_by,
            status: 'New'
          });
        }
      } else {
        // Regular approval process (non-Super Admin override)
        const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;
        const currentLevelWorkflow = workflowConfigs.find((w: any) => w.level === currentLevel);
        
        // 3. Notification to current level users (excluding the approver)
        if (currentLevelWorkflow) {
          const currentLevelUsers = await getUsersInRole(currentLevelWorkflow.role_id);
          for (const userId_current of currentLevelUsers) {
            if (userId_current !== userId) { // Don't send to the approver
              notifications.push({
                priority: 'Medium',
                alert_type: 'Purchase Order Approved',
                entity_id: po.po_number,
                message: `Purchase Order ${po.po_number} has been approved by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
                assign_to: userId_current,
                status: 'New'
              });
            }
          }
        }

        // 4. Notification to next level users (if not final approval)
        if (nextLevelInfo && !nextLevelInfo.isMaxLevel && nextLevelInfo.nextRoleId) {
          const nextLevelUsers = await getUsersInRole(nextLevelInfo.nextRoleId);
          for (const nextUserId of nextLevelUsers) {
            notifications.push({
              priority: 'Medium',
              alert_type: 'Purchase Order Approval Requested',
              entity_id: po.po_number,
              message: `Approval required for Purchase Order ${po.po_number} approved by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
              assign_to: nextUserId,
              status: 'New'
            });
          }
        } else if (nextLevelInfo && nextLevelInfo.isMaxLevel) {
          // Final approval - notify all relevant stakeholders
          const allStakeholders = new Set<string>();
          
          // Add creator if available
          if (po.created_by) {
            allStakeholders.add(po.created_by);
          }
          
          // Add all workflow level users
          for (const workflow of workflowConfigs) {
            const usersInLevel = await getUsersInRole(workflow.role_id);
            usersInLevel.forEach(u => allStakeholders.add(u));
          }
          
          for (const stakeholder of allStakeholders) {
            if (stakeholder !== userId) { // Don't notify the final approver
              notifications.push({
                priority: 'High',
                alert_type: 'Purchase Order Completed',
                entity_id: po.po_number,
                message: `Purchase Order ${po.po_number} has been fully approved and completed by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}.`,
                assign_to: stakeholder,
                status: 'New'
              });
            }
          }
        }
      }

    } else if (actionType === 'rejected') {
      // Case 3: Purchase Order Rejection Notifications
      
      // 1. Notification to user who rejected
      notifications.push({
        priority: 'High',
        alert_type: 'Purchase Order Rejected',
        entity_id: po.po_number,
        message: `You have rejected Purchase Order ${po.po_number} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. Reason: ${comment || 'No reason provided'}.`,
        assign_to: userId!,
        status: 'New'
      });

      // 2. Notification to Super Admin users
      const superAdminUsers = await getSuperAdminUsers();
      for (const superAdminId of superAdminUsers) {
        if (superAdminId !== userId) {
          notifications.push({
            priority: 'High',
            alert_type: 'Purchase Order Rejected',
            entity_id: po.po_number,
            message: `Purchase Order ${po.po_number} has been rejected by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. Reason: ${comment || 'No reason provided'}.`,
            assign_to: superAdminId,
            status: 'New'
          });
        }
      }

      // Get current level for determining notification logic
      const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 1;

      // 3. For Level 1 (lowest level) rejections - Always notify PO creator
      if (currentLevel === 1) {
        console.log(po, '<================ created_by');
        // Notification to PO creator is mandatory for Level 1 rejections
        if (po.created_by && po.created_by !== userId) {
          notifications.push({
            priority: 'High',
            alert_type: 'Purchase Order Rejected',
            entity_id: po.po_number,
            message: `Your Purchase Order ${po.po_number} has been rejected at Level 1 by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. Reason: ${comment || 'No reason provided'}.`,
            assign_to: po.created_by,
            status: 'New'
          });
        } else if (!po.created_by) {
          // Log warning if created_by is missing for a Level 1 rejection
          console.warn(`PO ${po.po_number} rejected at Level 1 but created_by is missing. Cannot notify creator.`);
        }
      } else {
        // 4. For higher level rejections - notify previous level approver and creator
        const rejectedToUserId = getLatestApprovedUser(po.approval_status, currentLevel - 1);
        if (rejectedToUserId && rejectedToUserId !== userId) {
          notifications.push({
            priority: 'High',
            alert_type: 'Purchase Order Rejected',
            entity_id: po.po_number,
            message: `Purchase Order ${po.po_number} that you previously approved has been rejected by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. Reason: ${comment || 'No reason provided'}.`,
            assign_to: rejectedToUserId,
            status: 'New'
          });
        }

        // Also notify PO creator for higher level rejections
        if (po.created_by && po.created_by !== userId) {
          notifications.push({
            priority: 'High',
            alert_type: 'Purchase Order Rejected',
            entity_id: po.po_number,
            message: `Your Purchase Order ${po.po_number} has been rejected at Level ${currentLevel} by ${currentUserName} for supplier ${supplierName} valued at ${formatCurrency(po.value)}. Reason: ${comment || 'No reason provided'}.`,
            assign_to: po.created_by,
            status: 'New'
          });
        }
      }
    }

    // Create all notifications
    await createNotifications(notifications);
    
  } catch (error) {
    console.error('Error creating approval notifications:', error);
    toast.error('Failed to create notifications');
  }
};

  // Fetch user details and setup user role
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Retrieve user from localStorage
        const user = JSON.parse(localStorage.getItem('userData') || '{}');
        if (!user?.id || !user?.role_id) {
          const errorMsg = 'User not found in localStorage';
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
        setUserRoleId(user.role_id);
        setUserId(user.id);
        setCompanyId(user.company_id)
        setUserData(user);

        // Fetch workflow configurations
        await fetchWorkflowConfigs();

        // Fetch Super Admin role ID
        const { data: roleData, error: roleError } = await supabase
          .from('role_master')
          .select('id')
          .eq('company_id', user.company_id)
          .eq('name', 'Super Admin')
          .single();

        if (roleError) {
          console.error('Error fetching Super Admin role:', roleError);
          const errorMsg = 'Failed to fetch role information';
          setError(errorMsg);
          return;
        }

        setIsSuperAdmin(user.role_id === roleData.id);
      } catch (error) {
        console.error('Error initializing user:', error);
        const errorMsg = 'Failed to initialize user';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    };

    initializeUser();
  }, [companyId]);

  // Fetch workflow configurations
  const fetchWorkflowConfigs = async () => {
    if (!companyId) return;
    try {
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow_config')
        .select('*')
        .eq('company_id', companyId)
        .eq('process_name', 'Purchase Order')
        .eq('is_active', true)
        .order('level', { ascending: true });

      if (workflowError) {
        console.error('Error fetching workflow configs:', workflowError);
        toast.error('Failed to fetch workflow configurations');
        return;
      }

      // Group by workflow ID and collect levels
      const groupedWorkflows: { [key: string]: WorkflowConfig } = {};
      workflowData?.forEach((config: any) => {
        if (!groupedWorkflows[config.id]) {
          groupedWorkflows[config.id] = {
            id: config.id,
            process_name: config.process_name,
            level: config.level,
            role_id: config.role_id,
            levels: [],
            override_enabled: config.override_enabled || false
          };
        }
        groupedWorkflows[config.id].levels.push(config.level);
      });

      setWorkflowConfigs(Object.values(groupedWorkflows));
    } catch (error) {
      console.error('Error fetching workflow configs:', error);
      toast.error('Failed to fetch workflow configurations');
    }
  };

  // Check if Super Admin can override for a specific workflow
  const canSuperAdminOverride = async (workflowId: string): Promise<boolean> => {
    try {
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow_config')
        .select('override_enabled')
        .eq('company_id', companyId!)
        .eq('id', workflowId)
        .single();

      if (workflowError) {
        console.error('Error checking override permission:', workflowError);
        return false;
      }

      return workflowData?.override_enabled === true;
    } catch (error) {
      console.error('Error in canSuperAdminOverride:', error);
      toast.error('Error checking override permissions');
      return false;
    }
  };

  // Fetch purchase orders with pagination
  const fetchPurchaseOrders = async (page = 1, limit = 10) => {
    if (!userRoleId && !isSuperAdmin) return;
    setLoading(true);
    setError(null);

    try {
      const levelFilter = !filters.level || filters.level === "all" ? "all" : String(filters.level);

      // Call the updated PostgreSQL function
      const { data: poData, error: poError } = await supabase.rpc('fetch_purchase_orders', {
          p_company_id: companyId,
          p_user_id: userId,
          p_user_role_id: isSuperAdmin ? null : userRoleId ?? null,
          p_is_super_admin: isSuperAdmin,
          p_search_query: searchQuery || null,
          p_page: page,
          p_limit: limit,
          p_sort_by: sortConfigPO.field || "created_at",
          p_sort_order: sortConfigPO.direction || "ASC",
          p_trail_status: filters.status && filters.status !== "all" ? filters.status : null,
          p_level: levelFilter, 
        } as any
      );

      console.log('Query response:===>', { poData, poError });

      if (poError) {
        console.error('Error fetching purchase orders:', poError);
        const errorMsg = 'Failed to fetch purchase orders';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Get total count from the first row (all rows have the same total_count)
      const totalCount = poData && poData.length > 0 ? poData[0].total_count : 0;

      const formattedPOs: PurchaseOrder[] = poData?.map((po: any) => {
        const approvalStatus = po.approval_status || [];
        const lastApproval = approvalStatus.length > 0 ? approvalStatus[approvalStatus.length - 1] : {};

          return {
            id: po.po_number,
            po_id: po.id,
            po_number: po.po_number,
            workflow_id: po.workflow_id,
            approval_status: approvalStatus,
            po_status_info: {
              id: po.order_status,
              value: po.status_value || "",
              sub_category_id: po.status_sub_category_id || "",
            },
            supplier: po.supplier_name || po.supplier_id,
            createdDate: new Date(po.created_at)
              .toISOString()
              .split("T")[0],
            value: parseFloat(po.total_value) || 0,
            status: lastApproval.status || "",
            trail: lastApproval.trail,
            created_by: po.created_by,
          };
        }) || [];

      setPurchaseOrders(formattedPOs);
      setTotalCount(totalCount);

    } catch (error) {
      console.error('Unexpected error:', error);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  console.log("workflow config =>",workflowConfigs);
  

  // Updated getNextLevelWorkflow function to return next workflow ID
  const getNextLevelWorkflow = async (workflowId: string) => {
    try {
      // Extract current level from status
      const currentWorkflow = workflowConfigs.find((w: any) => w.id === workflowId);

      if (!currentWorkflow) {
        console.error('Current workflow not found for ID:', workflowId);
        return null;
      }

      const currentLevel = currentWorkflow.level;
      const nextLevel = currentLevel + 1;

      // Find max level
      const maxLevel = Math.max(...workflowConfigs.map((w: any) => w.level));

      // If current level is max, return completion info
      if (currentLevel >= maxLevel) {
        return {
          isMaxLevel: true,
          maxLevel: currentLevel,
          nextRoleId: null,
          nextWorkflowId: null
        };
      }

      // Find next level workflow
      const nextWorkflow = workflowConfigs.find((w: any) => w.level === nextLevel);

      return {
        isMaxLevel: false,
        maxLevel: maxLevel,
        nextLevel: nextLevel,
        nextRoleId: nextWorkflow?.role_id || null,
        nextWorkflowId: nextWorkflow?.id || null
      };
    } catch (error) {
      console.error('Error in getNextLevelWorkflow:', error);
      toast.error('Failed to determine next workflow level');
      return null;
    }
  };

  // Fixed handleApprove function with corrected Super Admin override logic
  // Modified handleApprove function with the desired approval flow
  const handleApprove = async (po: PurchaseOrder) => {
    if (!po || !userId) return;
    if (!companyId) return;

    setProcessingApproval(true);
    const toastId = toast.loading('Processing approval...');

    try {
      // Check if Super Admin can override for this workflow
      const canOverride = isSuperAdmin ? await canSuperAdminOverride(po.workflow_id) : false;

      if (isSuperAdmin && !canOverride) {
        // Check if current user's role matches the PO's current approval role
        const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;

        // Get current level workflow to extract expected role
        const { data: currentWorkflow, error: currentWorkflowError } = await supabase
          .from('workflow_config')
          .select('role_id')
          .eq('company_id', companyId)
          .eq('process_name', 'Purchase Order')
          .eq('level', currentLevel)
          .eq('is_active', true)
          .single();

        if (currentWorkflowError) throw currentWorkflowError;

        const isRoleMatched = currentWorkflow && currentWorkflow.role_id === userRoleId;

        if (!isRoleMatched) {
          const errorMsg = 'Super Admin override is not enabled for this workflow. Please follow the regular approval process.';
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          setProcessingApproval(false);
          return;
        }

        // Else: Proceed as a regular approver
        console.log('Super Admin is acting as regular approver for their assigned level.');
      }

      const nextLevelInfo = await getNextLevelWorkflow(po.workflow_id);

      if (!nextLevelInfo) {
        const errorMsg = 'Failed to determine next approval level';
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      const currentApprovalStatus = po.approval_status || [];
      const currentSequenceNo = currentApprovalStatus.length > 0
        ? Math.max(...currentApprovalStatus.map((a: any) => a.sequence_no || 0))
        : -1; // Start from -1 so first entry gets sequence_no 0

      let updatedApprovalStatus = [...currentApprovalStatus];
      let newOrderStatus = po.po_status_info.id;
      let updateData: any = {
        approval_status: [],
        order_status: newOrderStatus,
        modified_at: new Date().toISOString(),
      };

      // Replace the Super Admin logic section in your handleApprove function
      if (isSuperAdmin && canOverride) {
        // Super Admin logic with override enabled

        const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;

        // Get all workflow configurations to determine max level and role IDs
        const { data: allWorkflows, error: workflowError } = await supabase
          .from('workflow_config')
          .select('*')
          .eq('company_id', companyId)
          .eq('process_name', 'Purchase Order')
          .eq('is_active', true)
          .order('level', { ascending: true });

        if (workflowError) {
          console.error('Error fetching workflows:', workflowError);
          const errorMsg = 'Failed to fetch workflow configurations';
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        const maxLevel = Math.max(...allWorkflows.map((w: any) => w.level));
        const currentTime = new Date().toISOString();

        console.log('Super Admin Override Debug:', {
          currentLevel,
          maxLevel,
          currentApprovalStatus: currentApprovalStatus.length,
          currentSequenceNo
        });

        // For Super Admin override, we need to complete all levels from current to final
        const newApprovalEntries = [];
        let sequenceCounter = currentSequenceNo;

        // Add "Approved" entry for current level first
        const currentLevelWorkflow = allWorkflows.find((w: any) => w.level === currentLevel);
        if (currentLevelWorkflow) {
          newApprovalEntries.push({
            status: `Level ${currentLevel} Approved`,
            trail: 'Approved',
            role_id: currentLevelWorkflow.role_id,
            sequence_no: ++sequenceCounter,
            isFinalized: false,
            approvedBy: userId,
            date: currentTime,
            comment: comment || `Super Admin Override - Level ${currentLevel}`,
          });
        }

        // Add entries for all remaining levels up to max level
        for (let level = currentLevel + 1; level <= maxLevel; level++) {
          const workflowForLevel = allWorkflows.find((w: any) => w.level === level);

          if (!workflowForLevel) {
            console.error(`Workflow for level ${level} not found`);
            continue;
          }

          // Add "Pending" entry for this level
          newApprovalEntries.push({
            status: `Level ${level} Approval Pending`,
            trail: 'Pending',
            role_id: workflowForLevel.role_id,
            sequence_no: ++sequenceCounter,
            isFinalized: false,
            date: currentTime,
            comment: comment || `Super Admin Override - Level ${level}`,
          });

          // Add "Approved" entry for this level
          const isLastLevel = level === maxLevel;
          newApprovalEntries.push({
            status: `Level ${level} Approved`,
            trail: 'Approved',
            role_id: workflowForLevel.role_id,
            sequence_no: ++sequenceCounter,
            isFinalized: isLastLevel, // Only final level should be finalized
            approvedBy: userId,
            date: currentTime,
            comment: comment || (isLastLevel ? 'Super Admin Override - Final Approval' : `Super Admin Override - Level ${level}`),
          });
        }

        console.log('Super Admin Override - New Approval Entries:', newApprovalEntries.map(entry => ({
          status: entry.status,
          trail: entry.trail,
          sequence_no: entry.sequence_no,
          isFinalized: entry.isFinalized
        })));

        // Update approval status with the new entries
        updatedApprovalStatus = [...currentApprovalStatus, ...newApprovalEntries];

        // Get the completed status ID for APPROVER_COMPLETED
        const { data: completedStatus, error: statusError } = await supabase
          .from('system_message_config')
          .select('id')
          .eq('company_id', companyId)
          .eq('sub_category_id', 'APPROVER_COMPLETED')
          .eq('category_id', 'PURCHASE_ORDER')
          .single();

        if (statusError) {
          console.error('Error fetching completed status:', statusError);
          const errorMsg = 'Failed to fetch completion status';
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        if (completedStatus) {
          newOrderStatus = completedStatus.id;
        }

        // Set workflow_id and next_level_role_id to null for final approval
        updateData = {
          approval_status: updatedApprovalStatus,
          order_status: newOrderStatus,
          workflow_id: null,
          next_level_role_id: null,
          modified_at: currentTime,
        };

        console.log(`Super Admin with override enabled - approved directly to final level ${maxLevel} - setting workflow_id to null`);
        console.log('Final approval status array length:', updatedApprovalStatus.length);
      } else {
        // Non-Super Admin logic OR Super Admin without override (regular workflow progression)

        const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;
        const nextLevel = currentLevel + 1;

        // Get workflow configuration for the next level
        const { data: nextLevelWorkflow, error: workflowError } = await supabase
          .from('workflow_config')
          .select('*')
          .eq('company_id', companyId)
          .eq('process_name', 'Purchase Order')
          .eq('level', nextLevel)
          .eq('is_active', true)
          .single();

        if (workflowError && !nextLevelInfo.isMaxLevel) {
          console.error('Error fetching next level workflow:', workflowError);
          const errorMsg = 'Failed to fetch next level workflow';
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        const currentTime = new Date().toISOString();

        if (nextLevelInfo.isMaxLevel) {
          // Final approval - only add "Approved" entry with isFinalized: true
          const newApprovalEntry = {
            status: `Level ${nextLevelInfo.maxLevel} Approved`,
            trail: 'Approved',
            role_id: nextLevelWorkflow?.role_id || null,
            sequence_no: currentSequenceNo + 1,
            isFinalized: true,
            approvedBy: userId,
            date: currentTime,
            comment: comment || '',
          };

          updatedApprovalStatus = [...currentApprovalStatus, newApprovalEntry];

          const { data: completedStatus, error: statusError } = await supabase
            .from('system_message_config')
            .select('id')
            .eq('company_id', companyId)
            .eq('sub_category_id', 'APPROVER_COMPLETED')
            .eq('category_id', 'PURCHASE_ORDER')
            .single();

          if (statusError) {
            console.error('Error fetching completed status:', statusError);
            const errorMsg = 'Failed to fetch completion status';
            setError(errorMsg);
            toast.error(errorMsg, { id: toastId });
            return;
          }

          if (completedStatus) {
            newOrderStatus = completedStatus.id;
            updateData.order_status = newOrderStatus;
          }

          updateData.workflow_id = null;
          updateData.next_level_role_id = null;
        } else {
          // Intermediate approval - add both "Approved" for current level and "Pending" for next level

          // First, add "Approved" entry for current level
          const approvedEntry = {
            status: `Level ${currentLevel} Approved`,
            trail: 'Approved',
            role_id: userRoleId,
            sequence_no: currentSequenceNo + 1,
            isFinalized: false,
            approvedBy: userId,
            date: currentTime,
            comment: comment || '',
          };

          // Then, add "Pending" entry for next level
          const pendingEntry = {
            status: `Level ${nextLevel} Approval Pending`,
            trail: 'Pending',
            role_id: nextLevelWorkflow?.role_id || null,
            sequence_no: currentSequenceNo + 2,
            isFinalized: false,
            date: currentTime,
            comment: comment || '',
          };

          updatedApprovalStatus = [...currentApprovalStatus, approvedEntry, pendingEntry];

          // Update order status to next level pending
          const { data: pendingStatus, error: statusError } = await supabase
            .from('system_message_config')
            .select('id')
            .eq('company_id', companyId)
            .eq('sub_category_id', 'APPROVAL_PENDING')
            .eq('category_id', 'PURCHASE_ORDER')
            .ilike('value', `%Level ${nextLevel}%`)
            .single();

          if (!statusError && pendingStatus) {
            newOrderStatus = pendingStatus.id;
            updateData.order_status = newOrderStatus;
          }

          if (nextLevelInfo.nextWorkflowId) {
            updateData.workflow_id = nextLevelInfo.nextWorkflowId;
          }
          if (nextLevelInfo.nextRoleId) {
            updateData.next_level_role_id = nextLevelInfo.nextRoleId;
          }
        }

        updateData.approval_status = updatedApprovalStatus;
      }

      // Update the purchase order
      const { error: updateError } = await supabase
        .from('purchase_order')
        .update(updateData)
        .eq('id', po.po_id);

      if (updateError) {
        console.error('Error updating purchase order:', updateError);
        const errorMsg = 'Failed to update purchase order';
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 0;
      const logMessage = isSuperAdmin && canOverride
        ? `Purchase Order ${po.po_number} approved by Super Admin override (User: ${userData?.first_name} ${userData?.last_name}).`
        : `Purchase Order ${po.po_number} level ${currentLevel} approved by ${userData?.first_name} ${userData?.last_name}.`;

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Approval',
        scope: 'Edit',
        key: `${po.po_number}`,
        log: logMessage,
        action_by: userId,
        created_at: new Date().toISOString(),
      };

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      // Create notifications for approval
      await createApprovalNotifications(po, 'approved', nextLevelInfo);

      console.log('Approved by', isSuperAdmin ? 'Super Admin' : 'Purchase Manager', 'Comment:', comment);
      console.log('Updated approval status:', updatedApprovalStatus);

      // Success message based on approval type
      let successMessage = '';
      if (isSuperAdmin && canOverride) {
        successMessage = `Purchase Order ${po.po_number} has been approved through all levels by Super Admin override`;
        console.log('Super Admin with override enabled - directly approved to final level - workflow_id set to null, order_status updated to APPROVER_COMPLETED');
      } else if (nextLevelInfo.isMaxLevel) {
        successMessage = `Purchase Order ${po.po_number} has been fully approved and completed`;
        console.log('Workflow completed - workflow_id set to null, order_status updated to APPROVER_COMPLETED');
      } else {
        successMessage = `Purchase Order ${po.po_number} has been approved and forwarded to the next level`;
        if (updateData.workflow_id) {
          console.log('Workflow updated to next level:', updateData.workflow_id);
        }
        if (updateData.next_level_role_id) {
          console.log('Next level role ID updated to:', updateData.next_level_role_id);
        }
      }

      toast.success(successMessage, { id: toastId, duration: 4000 });

      setIsApproveDialogOpen(false);
      setComment('');
      setSelectedPO(null);

      // Refresh current page data
      fetchPurchaseOrders(currentPage, itemsPerPage);
    } catch (error) {
      console.error('Error in handleApprove:', error);
      const errorMsg = 'Failed to process approval';
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingApproval(false);
    }
  };

  // function to return previous workflow ID
  const getPreviousLevelWorkflow = async (workflowId: string) => {
    try {
      // Extract current level
      const currentWorkflow = workflowConfigs.find((w: any) => w.id === workflowId);

      if (!currentWorkflow) {
        console.error('Current workflow not found for ID:', workflowId);
        return null;
      }

      const currentLevel = currentWorkflow.level;
      const previousLevel = currentLevel - 1;
      if (previousLevel < 1) {
        // No level before Level 1
        return {
          isMinLevel: true,
          previousLevel: null,
          previousRoleId: null,
          previousWorkflowId: null
        };
      }

      // Get the previous level's workflow config
      const prevWorkflow = workflowConfigs.find((w: any) => w.level === previousLevel);
      return {
        isMinLevel: false,
        previousLevel,
        previousRoleId: prevWorkflow?.role_id || null,
        previousWorkflowId: prevWorkflow?.id || null
      };
    } catch (error) {
      console.error('Error in getPreviousLevelWorkflow:', error);
      toast.error('Failed to determine previous workflow level');
      return null;
    }
  };

  // function to get latest approved user
  function getLatestApprovedUser(approvalStatus: any[], level: number): string | null {
    const levelApprovedStatus = `Level ${level} Approved`;

    const matchingApprovals = approvalStatus
      .filter(entry => entry.trail === 'Approved' && entry.status === levelApprovedStatus && entry.approvedBy)
      .sort((a, b) => b.sequence_no - a.sequence_no); // latest first
    return matchingApprovals.length > 0 ? matchingApprovals[0].approvedBy : null;
  }

  // Handle rejection logic
  const handleReject = async (po: PurchaseOrder) => {
    if (!comment || !po || !userId) {
      toast.error('Rejection comment is required');
      return;
    }

    setProcessingApproval(true);
    const toastId = toast.loading('Processing rejection...');

    try {
      const currentApprovalStatus = po.approval_status || [];
      const currentSequenceNo = currentApprovalStatus.length > 0
        ? Math.max(...currentApprovalStatus.map((a: any) => a.sequence_no || 0))
        : -1;

      let updatedApprovalStatus = [...currentApprovalStatus];
      const currentTime = new Date().toISOString();

      // Get current level from the last approval status
      const currentLevel = workflowConfigs.find((w: any) => w.id === po.workflow_id)?.level ?? 1;

      let rejectedToUserId: string | null = null;

      if (currentLevel > 1) {
        // Get latest approved user from the previous level
        rejectedToUserId = getLatestApprovedUser(currentApprovalStatus, currentLevel - 1);
      }

      // Create rejection entry
      const rejectionEntry = {
        status: currentLevel === 1 ? `Created - Rejected` : `Level ${currentLevel} Approval Rejected`,
        trail: 'Rejected',
        role_id: userRoleId,
        sequence_no: currentSequenceNo + 1,
        isFinalized: false,
        rejectedBy: userId,
        rejectedTo: rejectedToUserId ?? null,
        date: currentTime,
        comment: comment,
      };

      updatedApprovalStatus = [...currentApprovalStatus, rejectionEntry];

      // Get the rejected status ID from system_message_config
      const { data: allStatus, error: statusError } = await supabase
        .from('system_message_config')
        .select('id, sub_category_id')
        .eq('company_id', companyId!)
        .eq('category_id', 'PURCHASE_ORDER');

      if (statusError) {
        console.error('Error fetching rejected status:', statusError);
        // Continue with rejection even if status lookup fails
      }

      const createdStatus = allStatus?.find(status => status.sub_category_id === 'ORDER_CREATED');
      const pendingStatus = allStatus?.find(status => status.sub_category_id === 'APPROVAL_PENDING');
      const prevWorkflowInfo = await getPreviousLevelWorkflow(po.workflow_id);

      // Prepare update data
      const updateData: any = {
        approval_status: updatedApprovalStatus,
        order_status: currentLevel === 1 ? createdStatus?.id : pendingStatus?.id,
        workflow_id: currentLevel === 1 ? null : prevWorkflowInfo?.previousWorkflowId,
        next_level_role_id: currentLevel === 1 ? null : prevWorkflowInfo?.previousRoleId,
        modified_at: currentTime,
      };

      // Update the purchase order
      const { error: updateError } = await supabase
        .from('purchase_order')
        .update(updateData)
        .eq('id', po.po_id);

      if (updateError) {
        console.error('Error updating purchase order:', updateError);
        const errorMsg = 'Failed to update purchase order';
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Approval',
        scope: 'Edit',
        key: `${po.po_number}`,
        log: `Purchase Order ${po.po_number} level ${currentLevel} rejected by ${userData?.first_name} ${userData?.last_name}.`,
        action_by: userId,
        created_at: currentTime,
      };

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      // Create notifications for rejection
      await createApprovalNotifications(po, 'rejected');

      // Success message
      const successMessage = `Purchase Order ${po.po_number} has been rejected`;

      toast.success(successMessage, { id: toastId, duration: 4000 });

      setIsRejectDialogOpen(false);
      setComment('');
      setSelectedPO(null);

      // Refresh current page data
      fetchPurchaseOrders(currentPage, itemsPerPage);
      setProcessingApproval(false);
    } catch (error) {
      console.error('Error in handleReject:', error);
      const errorMsg = 'Failed to process rejection';
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingApproval(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    if (userRoleId) {
      fetchPurchaseOrders(currentPage, itemsPerPage);
    }
  }, [userRoleId, currentPage, itemsPerPage, searchQuery, filters, isSuperAdmin, sortConfigPO]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (userRoleId) {
        setCurrentPage(1);
        fetchPurchaseOrders(1, itemsPerPage);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle filters change
  useEffect(() => {
    if (userRoleId) {
      setCurrentPage(1);
      fetchPurchaseOrders(1, itemsPerPage);
    }
  }, [filters]);

  // Handle search input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  // Handle filter reset
  const handleFilterReset = () => {
    setSearchQuery('');
    setFilters({ level: 'All Levels', status: 'all' });
    setItemsPerPage(10);
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  function handleSortPO(field: SortFieldPO): void {
    let direction: SortDirectionPO = 'ASC';
    if (sortConfigPO.field === field) {
      if (sortConfigPO.direction === 'ASC') {
        direction = 'DESC';
      } else if (sortConfigPO.direction === 'DESC') {
        direction = null;
      } else {
        direction = 'ASC';
      }
    }
    setSortConfigPO({ field: direction ? field : null, direction });
    setCurrentPage(1);
  }

  function getSortIconPO(field: SortFieldPO) {
    if (sortConfigPO.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfigPO.direction === 'ASC') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    }
    if (sortConfigPO.direction === 'DESC') {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  }

  return (
    <TooltipProvider>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Approvals</CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search PO Number or Supplier..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isSuperAdmin && (
                  <Select
                    value={filters.level}
                    onValueChange={(value) => setFilters({ ...filters, level: value })}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleFilterReset}
                  className="px-3 py-2 text-sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold w-1/4">
                      <p
                        onClick={() => handleSortPO('po_number')}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        PO Number {getSortIconPO('po_number')}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">Supplier</TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <p
                        onClick={() => handleSortPO('created_at')}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Created Date {getSortIconPO('created_at')}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <p
                        onClick={() => handleSortPO('total_value')}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        PO Value {getSortIconPO('total_value')}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">Status</TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">Approval Trail</TableHead>
                    <TableHead className="font-semibold hover:text-blue-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                {loading ? (
                  <TableBody>
                    {Array(itemsPerPage).fill(0).map((_, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) :
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center py-6">
                            <Package className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-base font-medium">No purchase orders found</p>
                            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((po, i) => (
                        <TableRow key={po.po_id + i} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-medium">{po.po_number}</TableCell>
                          <TableCell>{po.supplier}</TableCell>
                          <TableCell>{formatDate(po.createdDate)}</TableCell>
                          <TableCell className='text-right'>{formatCurrency(po.value)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${po.status.includes('Pending')
                                ? 'bg-yellow-100 text-yellow-800'
                                : po.status.includes('Approved')
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {po.status}
                            </span>
                          </TableCell>
                          <TableCell>{po.trail}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedPO(po);
                                      setIsApproveDialogOpen(true);
                                    }}
                                    className="text-green-600 hover:bg-green-50"
                                    disabled={processingApproval}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Approve</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedPO(po);
                                      setIsRejectDialogOpen(true);
                                    }}
                                    className="text-red-600 hover:bg-red-50"
                                    disabled={processingApproval}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Reject</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/dashboard/purchase-order-approvals-view/${po.po_id}`)}
                                    className="text-blue-600 hover:bg-blue-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Details</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>}
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Show
                </p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => handleItemsPerPageChange(Number(value))}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  entries
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Showing {totalCount > 0 ? startIndex : 0} to {endIndex} of {totalCount} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-700">Confirm PO Approval</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                You are approving as:{' '}
                <span className="font-semibold">{userRoleName}</span>
              </p>
              {selectedPO && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">
                    <strong>PO Number:</strong> {selectedPO.po_number}
                  </p>
                  <p className="text-sm">
                    <strong>Supplier:</strong> {selectedPO.supplier}
                  </p>
                  <p className="text-sm">
                    <strong>Value:</strong> {formatCurrency(selectedPO.value)}
                  </p>
                </div>
              )}
              <Input
                placeholder="Add any remarks or supporting notes (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this Purchase Order? Your decision will be recorded and the
                workflow will proceed to the next level.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleApprove(selectedPO!)}
                  disabled={processingApproval}
                >
                  {processingApproval ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-700">Confirm PO Rejection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                You are rejecting as:{' '}
                <span className="font-semibold">{userRoleName}</span>
              </p>
              {selectedPO && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">
                    <strong>PO Number:</strong> {selectedPO.po_number}
                  </p>
                  <p className="text-sm">
                    <strong>Supplier:</strong> {selectedPO.supplier}
                  </p>
                  <p className="text-sm">
                    <strong>Value:</strong> {formatCurrency(selectedPO.value)}
                  </p>
                </div>
              )}
              <Input
                placeholder="Add rejection comment (required)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
              <p className="text-sm text-gray-600">
                Are you sure you want to reject this Purchase Order? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPO!)}
                  disabled={!comment || processingApproval}
                >
                  {processingApproval ? 'Processing...' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default Approvals;