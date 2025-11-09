import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "@/Utils/types/supabaseClient";
import { formatCurrency } from "@/Utils/formatters";
import { getLocalDateTime } from "@/Utils/commonFun";
import { triggerNotificationUpdate } from "@/Utils/notificationEvents";

// Notification payload for system_notification
interface NotificationPayload {
  assign_to: string;
  message: string;
  status: "New" | "Read" | "Deleted";
  priority: "Low" | "Medium" | "High";
  alert_type: string;
  entity_id: string;
}

// (removed unused supplier map)

// Interface for PurchaseReturn
interface PurchaseReturn {
  id: string;
  return_number: string;
  supplier: string;
  returnDate: string;
  total_items: number;
  value: number;
  status: string;
  remark: string;
  approval_status: any[];
  created_by: string;
  created_at: string;
  purchase_order_id: string;
  workflow_id: string | null;
  next_level_role_id: string | null;
}

// Interface for Filters
interface Filters {
  status: string;
}

type SortFieldPR = "purchase_return_number" | "return_date" | "total_value" | "total_items";
type SortDirectionPR = "ASC" | "DESC" | null;

interface SortConfigPR {
  field: SortFieldPR | null;
  direction: SortDirectionPR;
}

// Helper functions
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "Invalid Date";
  }
};

// use imported getLocalDateTime

const PurchaseReturnRequests: React.FC = () => {
  // Data returned is rendered via displayedPurchaseReturns only
  const [displayedPurchaseReturns, setDisplayedPurchaseReturns] = useState<
    PurchaseReturn[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPR, setSelectedPR] = useState<PurchaseReturn | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "all" });
  // const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [userRoleName, setUserRoleName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [sortConfigPR, setSortConfigPR] = useState<SortConfigPR>({
    field: "return_date",
    direction: "DESC",
  });
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Workflow cache for PR
  const [workflowConfigs, setWorkflowConfigs] = useState<
    { id: string; level: number; role_id: string }[]
  >([]);
  // System message config for Purchase Return (we keep maps below)
  const [_systemMsgById, setSystemMsgById] = useState<Record<string, any>>({});
  const [systemMsgBySub, setSystemMsgBySub] = useState<Record<string, any>>({});
  // removed unused userData

  const createNotifications = async (notifications: NotificationPayload[]) => {
    try {
      if (!companyId || notifications.length === 0) return;
      const formatted = notifications.map((n) => ({
        created_at: getLocalDateTime(),
        acknowledged_at: null,
        assign_to: n.assign_to,
        message: n.message,
        status: n.status,
        priority: n.priority,
        alert_type: n.alert_type,
        entity_id: n.entity_id,
        company_id: companyId,
      }));
      const { error } = await supabase
        .from("system_notification")
        .insert(formatted);
      if (error) console.error("Notification insert error:", error);
      else triggerNotificationUpdate();
    } catch (e) {
      console.error("createNotifications error", e);
    }
  };

  const getUsersInRole = async (roleId: string) => {
    const { data, error } = await supabase
      .from("user_mgmt")
      .select("id")
      .eq("role_id", roleId)
      .eq("company_id", companyId!)
      .eq("is_active", true);
    if (error) return [] as string[];
    return (data || []).map((u) => u.id);
  };

  // Check if Super Admin can override for a specific workflow
  const canSuperAdminOverride = async (
    workflowId: string,
  ): Promise<boolean> => {
    try {
      const { data: workflowData, error: workflowError } = await supabase
        .from("workflow_config")
        .select("override_enabled")
        .eq("company_id", companyId!)
        .eq("id", workflowId)
        .single();

      if (workflowError) {
        console.error("Error checking override permission:", workflowError);
        return false;
      }

      return workflowData?.override_enabled === true;
    } catch (error) {
      console.error("Error in canSuperAdminOverride:", error);
      toast.error("Error checking override permissions");
      return false;
    }
  };

  // Create notifications for approval actions
  const createApprovalNotifications = async (
    pr: PurchaseReturn,
    action: "approved" | "rejected",
    nextLevelInfo: any,
  ) => {
    const notifications: NotificationPayload[] = [];

    if (action === "approved") {
      // Notify creator
      if (pr.created_by && pr.created_by !== userId) {
        notifications.push({
          assign_to: pr.created_by,
          message: `Your Purchase Return ${pr.return_number} has been approved`,
          status: "New",
          priority: "Medium",
          alert_type: "PURCHASE_RETURN_APPROVED",
          entity_id: pr.id,
        });
      }

      // If not final approval, notify next level users
      if (!nextLevelInfo.isMaxLevel && nextLevelInfo.nextRoleId) {
        const nextUsers = await getUsersInRole(nextLevelInfo.nextRoleId);
        for (const uid of nextUsers) {
          if (uid !== userId) {
            notifications.push({
              assign_to: uid,
              message: `Approval required for Purchase Return ${pr.return_number}`,
              status: "New",
              priority: "Medium",
              alert_type: "PURCHASE_RETURN_APPROVAL_REQUESTED",
              entity_id: pr.id,
            });
          }
        }
      }
    } else if (action === "rejected") {
      // Notify creator about rejection
      if (pr.created_by && pr.created_by !== userId) {
        notifications.push({
          assign_to: pr.created_by,
          message: `Your Purchase Return ${pr.return_number} has been rejected. Reason: ${comment}`,
          status: "New",
          priority: "High",
          alert_type: "PURCHASE_RETURN_REJECTED",
          entity_id: pr.id,
        });
      }
    }

    if (notifications.length > 0) {
      await createNotifications(notifications);
    }
  };

  // Initialize user and workflow
  useEffect(() => {
    const init = async () => {
      const u = JSON.parse(localStorage.getItem("userData") || "{}");
      if (!u?.id || !u?.role_id) {
        toast.error("User not found in localStorage");
        return;
      }
      setUserId(u.id);
      setUserRoleId(u.role_id);
      setCompanyId(u.company_id);

      // Set role name
      const { data: roleData } = await supabase
        .from("role_master")
        .select("id, name")
        .eq("id", u.role_id)
        .eq("company_id", u.company_id)
        .single();
      setUserRoleName(roleData?.name || null);

      if (roleData?.name === "Super Admin") {
        setIsSuperAdmin(roleData.id === u.role_id);
      }

      // Load workflow for Purchase Return Request
      console.log("=== FETCHING WORKFLOW CONFIG ===");
      console.log("Company ID:", u.company_id);
      console.log("User Role ID:", u.role_id);

      const { data: wfData, error: wfError } = await supabase
        .from("workflow_config")
        .select("id, level, role_id")
        .eq("company_id", u.company_id)
        .eq("process_name", "Purchase Return Request")
        .eq("is_active", true)
        .order("level", { ascending: true });

      console.log("Workflow Config Result:", { data: wfData, error: wfError });

      if (wfError) {
        console.error("Error fetching workflow config:", wfError);
      }

      setWorkflowConfigs((wfData || []) as any);
      console.log("Workflow configs set:", wfData);

      // Fetch system_message_config for Purchase Return Request and index
      try {
        console.log("=== FETCHING SYSTEM MESSAGE CONFIG ===");
        console.log("Company ID:", u.company_id);

        const { data: prSys, error: prErr } = await supabase
          .from("system_message_config")
          .select("*")
          .eq("company_id", u.company_id)
          .eq("category_id", "PURCHASE_ORDER_RETURN");

        console.log("System Message Config Result:", {
          data: prSys,
          error: prErr,
        });

        if (prErr) {
          console.error("Error fetching PR system_message_config", prErr);
        } else if (prSys) {
          const byId: Record<string, any> = {};
          const bySub: Record<string, any> = {};
          prSys.forEach((c: any) => {
            if (c.id) byId[c.id] = c;
            if (c.sub_category_id) bySub[c.sub_category_id] = c;
          });

          console.log("System Message By ID:", byId);
          console.log("System Message By Sub:", bySub);

          setSystemMsgById(byId);
          setSystemMsgBySub(bySub);
        }
      } catch (err) {
        console.error(
          "Failed to fetch Purchase Return system_message_config",
          err,
        );
      }
    };
    init();
  }, []);

  // Fetch and filter data from Supabase
  const fetchPurchaseReturns = async () => {
    if (!companyId || !userRoleId) {
      console.log("Missing companyId or userRoleId, skipping fetch");
      return;
    }
    if (processingApproval) return; // Don't fetch while processing approval

    setLoading(true);
    try {
      const { data: purchaseReturnData, error: prError } =
        await supabase.rpc("get_purchase_returns_by_status", {
          p_company_id: companyId,
          p_user_id: userId,
          p_user_role_id: isSuperAdmin ? null : (userRoleId ?? undefined),
          p_is_super_admin: isSuperAdmin ?? false,
          p_search_query: searchQuery || null,
          p_page: currentPage,
          p_limit: itemsPerPage,
          p_sort_by: sortConfigPR.field || 'return_date',
          p_sort_order: sortConfigPR.direction || 'ASC',
          p_trail_status: filters.status,
        } as any);

      if (prError) {
        console.error("Supabase RPC Error =>", prError);
        toast.error("Failed to fetch purchase returns");
        return;
      }

      const dataArray = Array.isArray(purchaseReturnData) ? purchaseReturnData : [];
      const totalCount = dataArray.length > 0 ? (dataArray[0] as any).total_count ?? 0 : 0;

      // Formatted RPC Response
      const formatted = (dataArray ?? []).map((item: any) => {
        const approvalList = item.approval_status ?? [];
        const lastApproval = approvalList.length > 0 ? approvalList[approvalList.length - 1] : null;

        return {
          id: item.id,
          return_number: item.purchase_retrun_number,
          supplier: item.supplier_name,
          returnDate: item.return_date,
          total_items: item.total_items,
          value: item.total_value,
          status: lastApproval?.status ?? "Unknown",
          remark: item.remarks ?? "N/A",
          approval_status: approvalList,
          created_by: item.created_by,
          created_at: item.created_at,
          purchase_order_id: item.purchase_order_id,
          workflow_id: item.workflow_id,
          next_level_role_id: item.next_level_role_id
        };
      });

      setDisplayedPurchaseReturns(formatted);
      setTotalCount(totalCount);

    } catch (e) {
      console.error("Failed to fetch purchase returns", e);
      toast.error("Failed to fetch purchase returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have the basic requirements
    if (companyId && userRoleId) {
      fetchPurchaseReturns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyId,
    currentPage,
    itemsPerPage,
    searchQuery,
    filters,
    sortConfigPR,
    userRoleId,
    workflowConfigs, // Add workflowConfigs as dependency
  ]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setSearchQuery("");
    setFilters({ status: "all" });
    setItemsPerPage(10);
    setCurrentPage(1);
  };

  const handleSortPR = (field: SortFieldPR): void => {
    let direction: SortDirectionPR = "ASC";
    if (sortConfigPR.field === field) {
      if (sortConfigPR.direction === "ASC") {
        direction = "DESC";
      } else if (sortConfigPR.direction === "DESC") {
        direction = null;
      } else {
        direction = "ASC";
      }
    }
    setSortConfigPR({ field: direction ? field : null, direction });
    setCurrentPage(1);
  };

  const getSortIconPR = (field: SortFieldPR) => {
    if (sortConfigPR.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfigPR.direction === "ASC") {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    }
    if (sortConfigPR.direction === "DESC") {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  const getNextLevelWorkflow = (
    workflowId: string | null,
    approvalStatus: any[] = [],
  ) => {
    // If no workflow ID provided, try to determine it from approval status
    if (!workflowId) {
      console.log(
        "No workflow ID provided, trying to determine from approval status",
      );

      if (approvalStatus.length > 0) {
        const lastEntry = approvalStatus[approvalStatus.length - 1];

        // Handle rejected entries
        if (lastEntry?.trail === "Rejected") {
          const levelMatch = lastEntry.status.match(/Level (\d+)/);
          if (levelMatch) {
            const level = parseInt(levelMatch[1], 10);
            const wfConfig = workflowConfigs.find((wf) => wf.level === level);
            if (wfConfig) {
              workflowId = wfConfig.id;
              console.log(
                "Using workflow config for rejected level:",
                level,
                workflowId,
              );
              return {
                isMaxLevel: false,
                nextLevel: level,
                nextRoleId: wfConfig.role_id,
                nextWorkflowId: wfConfig.id,
                maxLevel: Math.max(...workflowConfigs.map((w) => w.level)),
              };
            }
          } else if (lastEntry.status === "Created - Rejected") {
            // If rejected at creation, start from level 1
            const level1Config = workflowConfigs.find((wf) => wf.level === 1);
            if (level1Config) {
              workflowId = level1Config.id;
              console.log(
                "Using level 1 workflow for rejected creation:",
                workflowId,
              );
              return {
                isMaxLevel: false,
                nextLevel: 1,
                nextRoleId: level1Config.role_id,
                nextWorkflowId: level1Config.id,
                maxLevel: Math.max(...workflowConfigs.map((w) => w.level)),
              };
            }
          }
        }

        // If not rejected or no level found, try to find the last approved level
        const lastApprovedEntry = [...approvalStatus]
          .reverse()
          .find((entry) => entry.trail === "Approved" && entry.role_id);

        if (lastApprovedEntry?.role_id) {
          const wfConfig = workflowConfigs.find(
            (wf) => wf.role_id === lastApprovedEntry.role_id,
          );
          if (wfConfig) {
            workflowId = wfConfig.id;
            console.log("Using workflow from last approved level:", workflowId);
          }
        }
      }

      // If no workflow ID set yet, start from level 1
      if (!workflowId) {
        const level1Config = workflowConfigs.find((wf) => wf.level === 1);
        if (level1Config) {
          workflowId = level1Config.id;
          console.log("Starting from level 1 workflow:", workflowId);
        }
      }
    }

    if (!workflowId) {
      console.log("No workflow ID could be determined");
      return null;
    }

    const current = workflowConfigs.find((w) => w.id === workflowId);
    console.log("Current workflow:", current);

    if (!current) {
      console.log("Current workflow not found");
      return null;
    }

    const maxLevel = Math.max(...workflowConfigs.map((w) => w.level));
    console.log("Max level:", maxLevel);
    console.log("Current level:", current.level);

    if (current.level >= maxLevel) {
      console.log("Current level is max level or higher");
      return { isMaxLevel: true, maxLevel } as const;
    }

    const next = workflowConfigs.find((w) => w.level === current.level + 1);
    console.log("Next workflow:", next);

    const result = {
      isMaxLevel: false,
      nextLevel: current.level + 1,
      nextRoleId: next?.role_id,
      nextWorkflowId: next?.id,
      maxLevel,
    } as const;

    console.log("Result:", result);
    return result;
  };

  // Adjust inventory back (increase) when a final-level rejection happens
  const increaseInventoryForReturn = async (pr: PurchaseReturn) => {
    const { data: items, error: itemsErr } = await supabase
      .from("purchase_return_items")
      .select("item_id, returned_qty")
      .eq("purchase_return_id", pr.id);
    if (itemsErr || !items) return;

    for (const it of items) {
      const returnQty = it.returned_qty || 0;
      if (returnQty <= 0) continue;

      const { data: inventories, error: invError } = await supabase
        .from("inventory_mgmt")
        .select("id, item_qty")
        .eq("purchase_order_id", pr.purchase_order_id)
        .eq("item_id", it.item_id);
      if (invError || !inventories || inventories.length === 0) continue;

      // Add back the quantity that was reduced at creation time
      const inventory = inventories[0];
      const newQty = (inventory.item_qty ?? 0) + returnQty;

      await supabase
        .from("inventory_mgmt")
        .update({ item_qty: newQty })
        .eq("id", inventory.id);
    }
  };

  const handleApprove = async (pr: PurchaseReturn) => {
    if (!pr || !userId) return;
    if (!companyId) return;

    setProcessingApproval(true);
    const toastId = toast.loading("Processing approval...");

    try {
      const isSuperAdmin = userRoleName?.toLowerCase().includes("super admin");

      // For Super Admin, always proceed and handle override in the approval flow
      if (isSuperAdmin) {
        console.log("Processing as Super Admin");
        // We'll handle the override logic in the approval flow
      }

      const nextLevelInfo = getNextLevelWorkflow(
        pr.workflow_id,
        pr.approval_status,
      );

      if (!nextLevelInfo) {
        const errorMsg = "Failed to determine next approval level";
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      const currentApprovalStatus = pr.approval_status || [];
      const currentSequenceNo =
        currentApprovalStatus.length > 0
          ? Math.max(
              ...currentApprovalStatus.map((a: any) => a.sequence_no || 0),
            )
          : -1; // Start from -1 so first entry gets sequence_no 0

      // Determine if this is a re-approval after rejection
      const lastEntry = currentApprovalStatus[currentApprovalStatus.length - 1];
      const isReapproval = lastEntry?.trail === "Rejected";

      // Initialize approval status array
      let updatedApprovalStatus = [...currentApprovalStatus];

      // Handle Super Admin override capability
      let canOverride = false;
      if (isSuperAdmin && pr.workflow_id) {
        canOverride = await canSuperAdminOverride(pr.workflow_id);
      }

      // Stop super admin if override is disabled
      if (isSuperAdmin && !canOverride) {
        // Check if current user's role matches the PR's current approval role
        const currentLevel = workflowConfigs.find((w: any) => w.id === pr.workflow_id)?.level ?? 0;

        // Get current level workflow to extract expected role
        const { data: currentWorkflow, error: currentWorkflowError } = await supabase
          .from('workflow_config')
          .select('role_id')
          .eq('company_id', companyId)
          .eq('process_name', 'Purchase Return Request')
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
      }

      // Determine the workflow level
      const workflowLevel = pr.workflow_id
        ? (workflowConfigs.find((w) => w.id === pr.workflow_id)?.level ?? 1)
        : 1;

      // Initialize variables for handling the approval
      const approvalLevel = workflowLevel;

      console.log("Approval State:", {
        isReapproval,
        approvalLevel,
        isSuperAdmin,
        canOverride,
        workflowLevel,
      });

      let updateData: any = {
        approval_status: [],
        modified_at: new Date().toISOString(),
      };

      // Replace the Super Admin logic section
      if (isSuperAdmin && canOverride) {
        // Super Admin logic with override enabled

        const currentLevel =
          workflowConfigs.find((w: any) => w.id === pr.workflow_id)?.level ?? 0;

        // Get all workflow configurations to determine max level and role IDs
        const { data: allWorkflows, error: workflowError } = await supabase
          .from("workflow_config")
          .select("*")
          .eq("company_id", companyId)
          .eq("process_name", "Purchase Return Request")
          .eq("is_active", true)
          .order("level", { ascending: true });

        if (workflowError) {
          console.error("Error fetching workflows:", workflowError);
          const errorMsg = "Failed to fetch workflow configurations";
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        const maxLevel = Math.max(...allWorkflows.map((w: any) => w.level));
        const currentTime = new Date().toISOString();

        console.log("Super Admin Override Debug:", {
          currentLevel,
          maxLevel,
          currentApprovalStatus: currentApprovalStatus.length,
          currentSequenceNo,
        });

        // For Super Admin override, we need to complete all levels from current to final
        const newApprovalEntries = [];
        let sequenceCounter = currentSequenceNo;

        // Add "Approved" entry for current level first
        const currentLevelWorkflow = allWorkflows.find(
          (w: any) => w.level === currentLevel,
        );
        if (currentLevelWorkflow) {
          newApprovalEntries.push({
            status: `Level ${currentLevel} Approved`,
            trail: "Approved",
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
          const workflowForLevel = allWorkflows.find(
            (w: any) => w.level === level,
          );

          if (!workflowForLevel) {
            console.error(`Workflow for level ${level} not found`);
            continue;
          }

          // Add "Pending" entry for this level
          newApprovalEntries.push({
            status: `Level ${level} Approval Pending`,
            trail: "Pending",
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
            trail: "Approved",
            role_id: workflowForLevel.role_id,
            sequence_no: ++sequenceCounter,
            isFinalized: isLastLevel, // Only final level should be finalized
            approvedBy: userId,
            date: currentTime,
            comment:
              comment ||
              (isLastLevel
                ? "Super Admin Override - Final Approval"
                : `Super Admin Override - Level ${level}`),
          });
        }

        console.log(
          "Super Admin Override - New Approval Entries:",
          newApprovalEntries.map((entry) => ({
            status: entry.status,
            trail: entry.trail,
            sequence_no: entry.sequence_no,
            isFinalized: entry.isFinalized,
          })),
        );

        // Update approval status with the new entries
        updatedApprovalStatus = [
          ...currentApprovalStatus,
          ...newApprovalEntries,
        ];

        // Get the completed status ID for APPROVER_COMPLETED
        const { data: completedStatus, error: statusError } = await supabase
          .from("system_message_config")
          .select("id")
          .eq("company_id", companyId)
          .eq("sub_category_id", "APPROVER_COMPLETED")
          .eq("category_id", "PURCHASE_ORDER_RETURN")
          .single();

        if (statusError) {
          console.error("Error fetching completed status:", statusError);
          const errorMsg = "Failed to fetch completion status";
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        // Set workflow_id and next_level_role_id to null for final approval
        updateData = {
          approval_status: updatedApprovalStatus,
          workflow_id: null,
          next_level_role_id: null,
          modified_at: currentTime,
        };

        // Update the return_status field with the completed status ID for final approval
        if (completedStatus) {
          updateData.return_status = completedStatus.id;
          console.log(
            "Super Admin Override - Setting final approval status:",
            completedStatus.id,
          );
        }

        console.log(
          `Super Admin with override enabled - approved directly to final level ${maxLevel} - setting workflow_id to null`,
        );
        console.log(
          "Final approval status array length:",
          updatedApprovalStatus.length,
        );
      } else {
        // Determine next level based on current state and permissions
        const nextLevel = approvalLevel + 1;
        const maxLevel = Math.max(...workflowConfigs.map((w) => w.level));

        // Super Admin with override can complete all levels at once
        if (isSuperAdmin && canOverride) {
          console.log("Super Admin override - completing all levels");
          const currentTime = new Date().toISOString();
          let sequenceNo = currentSequenceNo + 1;

          // Add entries for all remaining levels
          for (let level = approvalLevel; level <= maxLevel; level++) {
            const workflowForLevel = workflowConfigs.find(
              (w) => w.level === level,
            );
            if (!workflowForLevel) continue;

            // Add approval entry for this level
            updatedApprovalStatus.push({
              status: `Level ${level} Approved`,
              trail: "Approved",
              role_id: workflowForLevel.role_id,
              sequence_no: sequenceNo++,
              isFinalized: level === maxLevel,
              approvedBy: userId,
              date: currentTime,
              comment:
                comment || `Super Admin Override Approval - Level ${level}`,
            });
          }

          // Update with final status
          updateData = {
            approval_status: updatedApprovalStatus,
            workflow_id: null,
            next_level_role_id: null,
            modified_at: currentTime,
          };
        }

        // Get workflow configuration for the next level
        const { data: nextLevelWorkflow, error: workflowError } = await supabase
          .from("workflow_config")
          .select("*")
          .eq("company_id", companyId)
          .eq("process_name", "Purchase Return Request")
          .eq("level", nextLevel)
          .eq("is_active", true)
          .single();

        if (workflowError && !nextLevelInfo.isMaxLevel) {
          console.error("Error fetching next level workflow:", workflowError);
          const errorMsg = "Failed to fetch next level workflow";
          setError(errorMsg);
          toast.error(errorMsg, { id: toastId });
          return;
        }

        const currentTime = new Date().toISOString();

        if (nextLevelInfo.isMaxLevel) {
          // Final approval - only add "Approved" entry with isFinalized: true
          const newApprovalEntry = {
            status: `Level ${nextLevelInfo.maxLevel} Approved`,
            trail: "Approved",
            role_id: nextLevelWorkflow?.role_id || null,
            sequence_no: currentSequenceNo + 1,
            isFinalized: true,
            approvedBy: userId,
            date: currentTime,
            comment: comment || "",
          };

          updatedApprovalStatus = [...currentApprovalStatus, newApprovalEntry];

          const { data: completedStatus, error: statusError } = await supabase
            .from("system_message_config")
            .select("id")
            .eq("company_id", companyId)
            .eq("sub_category_id", "APPROVER_COMPLETED")
            .eq("category_id", "PURCHASE_ORDER_RETURN")
            .single();

          if (statusError) {
            console.error("Error fetching completed status:", statusError);
            const errorMsg = "Failed to fetch completion status";
            setError(errorMsg);
            toast.error(errorMsg, { id: toastId });
            return;
          }

          if (completedStatus) {
            updateData.return_status = completedStatus.id;
            console.log(
              "Last Level User - Setting final approval status:",
              completedStatus.id,
            );
          }

          updateData.workflow_id = null;
          updateData.next_level_role_id = null;
        } else {
          // Intermediate approval - add both "Approved" for current level and "Pending" for next level

          // If this is a re-approval, we'll clear any entries after the rejection
          if (isReapproval) {
            updatedApprovalStatus = currentApprovalStatus.filter((entry) => {
              const entryLevel = entry.status.match(/Level (\d+)/);
              return (
                !entryLevel || parseInt(entryLevel[1], 10) <= approvalLevel
              );
            });
          }

          // First, add "Approved" entry for current level
          const approvedEntry = {
            status: `Level ${approvalLevel} Approved`,
            trail: "Approved",
            role_id: userRoleId,
            sequence_no: currentSequenceNo + 1,
            isFinalized: false,
            approvedBy: userId,
            date: currentTime,
            comment: isReapproval
              ? `Re-approved at Level ${approvalLevel}`
              : comment || "",
          };

          // Then, add "Pending" entry for next level
          const pendingEntry = {
            status: `Level ${nextLevel} Approval Pending`,
            trail: "Pending",
            role_id: nextLevelWorkflow?.role_id || null,
            sequence_no: currentSequenceNo + 2,
            isFinalized: false,
            date: currentTime,
            comment: comment || "",
          };

          updatedApprovalStatus = [
            ...currentApprovalStatus,
            approvedEntry,
            pendingEntry,
          ];

          // Update return status to next level pending
          const { data: pendingStatus, error: statusError } = await supabase
            .from("system_message_config")
            .select("id")
            .eq("company_id", companyId)
            .eq("sub_category_id", "APPROVAL_PENDING")
            .eq("category_id", "PURCHASE_ORDER_RETURN")
            .ilike("value", `%Level ${nextLevel}%`)
            .single();

          if (!statusError && pendingStatus) {
            updateData.return_status = pendingStatus.id;
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

      // Update the purchase return
      const { error: updateError } = await supabase
        .from("purchase_return")
        .update(updateData)
        .eq("id", pr.id);

      if (updateError) {
        console.error("Error updating purchase return:", updateError);
        const errorMsg = "Failed to update purchase return";
        setError(errorMsg);
        toast.error(errorMsg, { id: toastId });
        return;
      }

      // Inventory is adjusted at creation time now. No change on approval.

      const currentLevel =
        workflowConfigs.find((w: any) => w.id === pr.workflow_id)?.level ?? 0;
      const logMessage =
        isSuperAdmin && canOverride
          ? `Purchase Return ${pr.return_number} approved by Super Admin override (User: ${userRoleName}).`
          : `Purchase Return ${pr.return_number} level ${currentLevel} approved by ${userRoleName}.`;

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: "Return Approval",
        scope: "Edit",
        key: `${pr.return_number}`,
        log: logMessage,
        action_by: userId,
        created_at: new Date().toISOString(),
      };

      const { error: systemLogError } = await supabase
        .from("system_log")
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      // Create notifications for approval
      await createApprovalNotifications(pr, "approved", nextLevelInfo);

      console.log(
        "Approved by",
        isSuperAdmin ? "Super Admin" : "Regular User",
        "Comment:",
        comment,
      );
      console.log("Updated approval status:", updatedApprovalStatus);

      // Success message based on approval type
      let successMessage = "";
      if (isSuperAdmin && canOverride) {
        successMessage = `Purchase Return ${pr.return_number} has been approved through all levels by Super Admin override`;
        console.log(
          "Super Admin with override enabled - directly approved to final level - workflow_id set to null",
        );
      } else if (nextLevelInfo.isMaxLevel) {
        successMessage = `Purchase Return ${pr.return_number} has been fully approved and completed`;
        console.log("Workflow completed - workflow_id set to null");
      } else {
        successMessage = `Purchase Return ${pr.return_number} has been approved and forwarded to the next level`;
        if (updateData.workflow_id) {
          console.log(
            "Workflow updated to next level:",
            updateData.workflow_id,
          );
        }
        if (updateData.next_level_role_id) {
          console.log(
            "Next level role ID updated to:",
            updateData.next_level_role_id,
          );
        }
      }

      toast.success(successMessage, { id: toastId, duration: 4000 });

      setIsApproveDialogOpen(false);
      setComment("");
      setSelectedPR(null);

      // Refresh current page data
      fetchPurchaseReturns();
    } catch (error) {
      console.error("Error in handleApprove:", error);
      const errorMsg = "Failed to process approval";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleReject = async (pr: PurchaseReturn) => {
    console.log("=== HANDLE REJECT DEBUG ===");
    console.log("PR to reject:", pr);
    console.log("Comment:", comment);
    console.log("User ID:", userId);
    console.log("Company ID:", companyId);
    console.log("User Role ID:", userRoleId);
    console.log("Workflow Configs:", workflowConfigs);
    console.log("System Message By Sub:", systemMsgBySub);

    if (!comment) {
      console.log("No comment provided for rejection");
      toast.error("Comment required for rejection");
      return;
    }

    if (!userId || !companyId) {
      console.log("User not authenticated");
      toast.error("User not authenticated");
      return;
    }

    setProcessingApproval(true);
    const toastId = toast.loading("Processing rejection...");
    try {
      const currentSeq = pr.approval_status?.length
        ? Math.max(...pr.approval_status.map((a: any) => a.sequence_no || 0))
        : -1;
      console.log("Current Sequence:", currentSeq);

      const now = new Date().toISOString();
      console.log("Current Time:", now);

      // Determine current level based on workflow or approval status
      let currentLevel = 1;
      if (pr.workflow_id) {
        currentLevel =
          workflowConfigs.find((w) => w.id === pr.workflow_id)?.level ?? 1;
      } else {
        // Try to determine from approval status
        const approvalStatusArray = Array.isArray(pr.approval_status)
          ? pr.approval_status
          : [];
        if (approvalStatusArray.length > 0) {
          const lastEntry = approvalStatusArray[approvalStatusArray.length - 1];
          if (lastEntry && typeof lastEntry === "object" && lastEntry.status) {
            const match = lastEntry.status.match(/Level (\d+)/);
            if (match) {
              currentLevel = parseInt(match[1], 10);
            }
          }
        }
      }
      console.log("Current Level:", currentLevel);

      // Determine the user for re-approval
      let rejectedToUserId: string | null = null;
      if (currentLevel > 1) {
        const previousLevel = currentLevel - 1;
        const approvalEntries = Array.isArray(pr.approval_status)
          ? pr.approval_status
          : [];
        const matchingApprovals = approvalEntries
          .filter(
            (entry: any) =>
              entry?.trail === "Approved" &&
              typeof entry?.status === "string" &&
              entry.status.includes(`Level ${previousLevel} `),
          )
          .sort(
            (a: any, b: any) => (b.sequence_no || 0) - (a.sequence_no || 0),
          );
        rejectedToUserId = matchingApprovals.length
          ? matchingApprovals[0]?.approvedBy || null
          : null;
      }

      const rejectionEntry = {
        status:
          currentLevel === 1
            ? "Created - Rejected"
            : `Level ${currentLevel} Approval Rejected`,
        trail: "Rejected",
        role_id: userRoleId,
        sequence_no: currentSeq + 1,
        isFinalized: false,
        rejectedBy: userId,
        rejectedTo: currentLevel === 1 ? null : rejectedToUserId ?? null,
        date: now,
        comment,
      };
      console.log("Rejection Entry:", rejectionEntry);

      const updatedApprovalStatus = [
        ...(pr.approval_status || []),
        rejectionEntry,
      ];
      console.log("Updated Approval Status:", updatedApprovalStatus);

      // Determine previous level workflow info for resetting workflow_id and next_level_role_id
      let previousWorkflowId = null;
      let previousRoleId = null;

      if (currentLevel > 1) {
        const previousWorkflow = workflowConfigs.find(
          (w) => w.level === currentLevel - 1,
        );
        if (previousWorkflow) {
          previousWorkflowId = previousWorkflow.id;
          previousRoleId = previousWorkflow.role_id;
        }
      }

      const updateData: any = {
        approval_status: updatedApprovalStatus,
        modified_at: now,
        // Reset workflow to previous level if > 1, else clear
        workflow_id: previousWorkflowId,
        next_level_role_id: previousRoleId,
      };
      console.log("Update Data:", updateData);

      // If rejection at level 1, set return status to created.
      if (currentLevel === 1) {
        const lastIdx = updatedApprovalStatus.length - 1;
        if (lastIdx >= 0) {
          updatedApprovalStatus[lastIdx] = {
            ...updatedApprovalStatus[lastIdx],
            rejectedTo: null,
          };
        }

        const createdStatus = systemMsgBySub["ORDER_RETURN_CREATED"];
        if (createdStatus && createdStatus.id) {
          updateData.return_status = createdStatus.id;
        }

        // clear workflow and next role
        updateData.workflow_id = null;
        updateData.next_level_role_id = null;

        updateData.approval_status = updatedApprovalStatus;
      }

      // Set a rejected status id if available
      const rejectedCfg =
        systemMsgBySub["RETURN_REJECTED"] ||
        systemMsgBySub["APPROVAL_REJECTED"] ||
        systemMsgBySub["ORDER_CANCELLED"];
      console.log("Rejected Config:", rejectedCfg);

      if (rejectedCfg && rejectedCfg.id) {
        // Instead of replacing the entire approval_status array with just an ID,
        // we update the rejection entry to include the status_id
        const lastEntryIndex = updatedApprovalStatus.length - 1;
        if (lastEntryIndex >= 0) {
          updatedApprovalStatus[lastEntryIndex] = {
            ...updatedApprovalStatus[lastEntryIndex],
            status_id: rejectedCfg.id,
          };
        }
        updateData.approval_status = updatedApprovalStatus;
        console.log("Added status_id to rejection entry:", rejectedCfg.id);
      }

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: "Return Approval",
        scope: "Edit",
        key: pr.return_number,
        log: `Purchase Return ${pr.return_number} rejected. Reason: ${comment}`,
        action_by: userId,
        created_at: new Date().toISOString(),
      };

      const { error: systemLogError } = await supabase
        .from("system_log")
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      const { error: upErr } = await supabase
        .from("purchase_return")
        .update(updateData)
        .eq("id", pr.id);
      if (upErr) {
        console.error("Update error:", upErr);
        throw upErr;
      }

      // If this rejection ends the workflow (no further approvals), restore inventory
      try {
        if (!updateData.workflow_id) {
          await increaseInventoryForReturn(pr);
        }
      } catch (invErr) {
        console.error("Failed to restore inventory after rejection:", invErr);
      }

      // Notify creator
      if (pr.created_by && pr.created_by !== userId) {
        await createNotifications([
          {
            priority: "High",
            alert_type: "Purchase Return Rejected",
            entity_id: pr.return_number,
            message: `Your Purchase Return ${pr.return_number} has been rejected. Reason: ${comment}`,
            assign_to: pr.created_by,
            status: "New",
          } as any,
        ]);
      }

      toast.success(`Purchase Return ${pr.return_number} rejected`, {
        id: toastId,
        duration: 4000,
      });
      setIsRejectDialogOpen(false);
      setComment("");
      setSelectedPR(null);
      fetchPurchaseReturns();
    } catch (error) {
      console.error("Error in handleReject:", error);
      const errorMsg = "Failed to process rejection";
      setError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setProcessingApproval(false);
      // Refresh current page data
      fetchPurchaseReturns();
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

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
                <CardTitle className="text-2xl font-bold">
                  Purchase Return Requests
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search Return Number or Supplier..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
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
                        onClick={() => handleSortPR("purchase_return_number")}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Return Number {getSortIconPR("purchase_return_number")}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">
                      Supplier
                    </TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <p
                        onClick={() => handleSortPR("return_date")}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Return Date {getSortIconPR("return_date")}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold w-1/4 text-right">
                    <p
                        onClick={() => handleSortPR("total_items")}
                        className="h-8 flex items-center text-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Total Items {getSortIconPR("total_items")}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <p
                        onClick={() => handleSortPR("total_value")}
                        className="h-8 flex items-center justify-end gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Total Value {getSortIconPR("total_value")}
                      </p>
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700">
                      Remark
                    </TableHead>
                    <TableHead className="font-semibold hover:text-blue-700 text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(itemsPerPage)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : displayedPurchaseReturns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center py-6">
                          <Package className="h-12 w-12 text-gray-300 mb-2" />
                          <p className="text-base font-medium">
                            No purchase returns found
                          </p>
                          <p className="text-sm text-gray-500">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedPurchaseReturns.map((pr, i) => (
                      <TableRow
                        key={pr.id + i}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          {pr.return_number}
                        </TableCell>
                        <TableCell>{pr.supplier}</TableCell>
                        <TableCell>{formatDate(pr.returnDate)}</TableCell>
                        <TableCell className="text-right">
                          {pr.total_items}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pr.value)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pr.status.toLowerCase().includes("created") ||
                              pr.status.toLowerCase().includes("return created")
                                ? "bg-yellow-100 text-yellow-800"
                                : pr.status
                                      .toLowerCase()
                                      .includes("approved") ||
                                    pr.status
                                      .toLowerCase()
                                      .includes("completed")
                                  ? "bg-green-100 text-green-800"
                                  : pr.status
                                        .toLowerCase()
                                        .includes("rejected") ||
                                      pr.status
                                        .toLowerCase()
                                        .includes("cancelled")
                                    ? "bg-red-100 text-red-800"
                                    : pr.status
                                          .toLowerCase()
                                          .includes("pending") ||
                                        pr.status
                                          .toLowerCase()
                                          .includes("approval pending")
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {pr.status}
                          </span>
                        </TableCell>
                        <TableCell>{pr.remark}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedPR(pr);
                                    setIsApproveDialogOpen(true);
                                  }}
                                  className="text-green-600 hover:bg-green-50"
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
                                    setSelectedPR(pr);
                                    setIsRejectDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:bg-red-50"
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
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/purchase-return-view/${pr.id}`,
                                    )
                                  }
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
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Show</p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) =>
                    handleItemsPerPageChange(Number(value))
                  }
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
                <p className="text-sm text-muted-foreground">entries</p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Showing {totalCount > 0 ? startIndex : 0} to {endIndex} of{" "}
                  {totalCount} entries
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

        <Dialog
          open={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-700">
                Confirm Purchase Return Approval
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                You are approving as:{" "}
                <span className="font-semibold">{userRoleName}</span>
              </p>
              {selectedPR && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">
                    <strong>Return Number:</strong> {selectedPR.return_number}
                  </p>
                  <p className="text-sm">
                    <strong>Supplier:</strong> {selectedPR.supplier}
                  </p>
                  <p className="text-sm">
                    <strong>Value:</strong> {formatCurrency(selectedPR.value)}
                  </p>
                </div>
              )}
              <Input
                placeholder="Add any remarks or supporting notes (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this Purchase Return? Your
                decision will be recorded.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsApproveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleApprove(selectedPR!)}
                  disabled={!selectedPR || processingApproval}
                >
                  {processingApproval ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-700">
                Confirm Purchase Return Rejection
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                You are rejecting as:{" "}
                <span className="font-semibold">{userRoleName}</span>
              </p>
              {selectedPR && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm">
                    <strong>Return Number:</strong> {selectedPR.return_number}
                  </p>
                  <p className="text-sm">
                    <strong>Supplier:</strong> {selectedPR.supplier}
                  </p>
                  <p className="text-sm">
                    <strong>Value:</strong> {formatCurrency(selectedPR.value)}
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
                Are you sure you want to reject this Purchase Return? This
                action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPR!)}
                  disabled={!comment || !selectedPR || processingApproval}
                >
                  {processingApproval ? "Processing..." : "Reject"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default PurchaseReturnRequests;
