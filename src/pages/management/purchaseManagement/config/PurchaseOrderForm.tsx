import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, X, Copy, Ban, CheckCheck, ShieldAlert, CalendarCheck, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/Utils/types/supabaseClient";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ISystemMessageConfig, IWorkflowConfig } from '@/Utils/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate } from '@/Utils/formatters';
import { Json } from '@/Utils/types/database.types';
import { getLocalDateTime } from '@/Utils/commonFun';
import { triggerNotificationUpdate } from '@/Utils/notificationEvents';

// Interfaces (unchanged)
interface Supplier {
  id: string;
  supplier_name: string;
  email: string;
  address: string;
  supplier_id: string;
}

interface Store {
  id: string;
  name: string;
  address: string;
  type: string;
}

interface Item {
  id: string;
  item_id: string;
  item_name: string;
  description: string;
  selling_price: number;
  max_level: number;
  supplier_id: string;
  category_id?: string;
}

interface SelectedItem extends Item {
  received_qty: number | null;
  order_qty: number;
  total_value?: number;
}

interface ApprovalStatus {
  status: string;
  trail: string;
  sequence_no: number;
  isFinalized: boolean;
  approvedBy: string;
  date: string;
  comment: string;
}

type PurchaseOrderFormData = {
  po_number: string;
  order_date: string;
  supplier_id: string;
  store_id: string;
  order_status: string;
  total_items: number;
  total_value: number;
  payment_details: string;
  remarks: string;
  created_at: string;
  modified_at: string;
  created_by: string;
  modified_by: string | null;
  workflow_id?: string | null;
  purchase_order_items: SelectedItem[];
  issued_by: string | null;
  issued_on: string | null;
  approval_status?: ApprovalStatus[];
};

// Cancellation interfaces
interface CancellationData {
  reason: "Pricing Issue" | "Supplier Delay" | "Alternative Item Procured" | "Others";
  details?: string;
}

type ReceivedQuantity = {
  itemId: string;
  recQuantity: number;
};

interface SendEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  id?: string;
}

// Validation schema (unchanged)
const purchaseOrderSchema = z.object({
  po_number: z.string().min(1, "PO Number is required"),
  order_date: z.string().min(1, "Date of Order is required"),
  supplier_id: z.string().min(1, "Supplier Name is required"),
  store_id: z.string().min(1, "Store Name is required"),
  order_status: z.string().min(1, "Order status is required"),
  total_items: z.number().min(0, "Total items cannot be negative"),
  total_value: z.number().min(0, "Total value cannot be negative"),
  payment_details: z.string(),
  remarks: z.string(),
  created_at: z.string(),
  modified_at: z.string(),
  created_by: z.string().min(1, "Created by is required"),
  modified_by: z.string().nullable(),
  issued_by: z.string().nullable(),
  issued_on: z.string().nullable(),
  workflow_id: z.string().nullable().optional(),
  purchase_order_items: z.array(
    z.object({
      id: z.string(),
      item_id: z.string(),
      item_name: z.string(),
      description: z.string(),
      selling_price: z.number(),
      max_level: z.number(),
      supplier_id: z.string(),
      category_id: z.string().optional(),
      order_qty: z.number().min(1, "Quantity must be at least 1"),
      received_qty: z.number().nullable(),
    })
  ).min(1, "At least one item is required"),
});

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const backorderId = searchParams.get("backorder");
  const formRef = useRef<HTMLFormElement>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [allSelectedItems, setAllSelectedItems] = useState<SelectedItem[]>([]);
  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(false);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [isLoading, setIsLoading] = useState(!!(editId || duplicateId || backorderId));
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyEmail, setCompanyEmail] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isEmailAuthenticated, setIsEmailAuthenticated] = useState(false)
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<ReceivedQuantity[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string | null>('');
  const [orderStatus, setOrderStatus] = useState<ISystemMessageConfig>();
  const [currentWorkflow, setCurrentWorkflow] = useState<IWorkflowConfig>();
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [notifySupplier, setNotifySupplier] = useState(true);
  const [currentApprovalStatus, setCurrentApprovalStatus] = useState<ApprovalStatus | undefined>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [totalItems, setTotalItems] = useState<number>(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationData, setCancellationData] = useState<CancellationData>({
    reason: "Pricing Issue",
    details: "",
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationErrors, setCancellationErrors] = useState<{ [key: string]: string }>({});
  const [workflowConfig, setWorkflowConfig] = useState<IWorkflowConfig | null>(null);
  const { control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      po_number: "",
      order_date: new Date().toISOString().split("T")[0],
      supplier_id: "",
      store_id: "",
      order_status: "",
      total_items: 0,
      total_value: 0,
      payment_details: "",
      remarks: "",
      created_at: new Date().toISOString(),
      modified_at: "",
      created_by: "",
      modified_by: null,
      workflow_id: null,
      purchase_order_items: [],
      issued_by: null,
      issued_on: null,
    },
  });
  const [systemMsgConfig, setSystemMsgConfig] = useState<ISystemMessageConfig[]>([]);
  const [backorderRef, setBackorderRef] = useState<string>('');
  const [isBackorderCreated, setIsBackorderCreated] = useState<boolean>(true);
  const [isIssuing, setIsIssuing] = useState(false);
  const [allApprovalStatus, setAllApprovalStatus] = useState<ApprovalStatus[] | undefined>([])
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isSupplierSelected, setIsSupplierSelected] = useState(false);

  const watchedSupplierId = watch("supplier_id");
  const watchedStoreId = watch("store_id");
  // const watchedOrderStatus = watch("order_status");
  const watchedIssuedBy = watch("issued_by");
  const watchedIssuedOn = watch('issued_on');
  const watchedPOnumber = watch('po_number')

  const isFormDisabled = !!editId && (currentStatus === "ORDER_ISSUED" || currentStatus === "ORDER_PARTIALLY_RECEIVED");
  const isCreatingBackorder = !!backorderId;

  const shouldShowCancelButton = editId && (currentStatus === "APPROVER_COMPLETED" || currentStatus === "APPROVAL_PENDING");
  const showIssuePOBtn = editId && currentStatus === "APPROVER_COMPLETED" && (currentApprovalStatus?.isFinalized || !currentApprovalStatus) && !watchedIssuedBy && !watchedIssuedOn;

  const statusCreated = systemMsgConfig.find(config => config.sub_category_id === "ORDER_CREATED");
  const statusApprovalPending = systemMsgConfig.find(config => config.sub_category_id === "APPROVAL_PENDING");
  const statusApprovalCompleted = systemMsgConfig.find(config => config.sub_category_id === "APPROVER_COMPLETED");

  // Fetch user ID
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserId(parsed.id);
        setCompanyId(parsed.company_id);
        setCompanyEmail(parsed.company_data.email);
        setCompanyName(parsed.company_data.name);
        setValue("created_by", parsed.id);
      } catch (e) {
        console.error("Error parsing userData:", e);
      }
    }
  }, [setValue]);

  // Fetch current user name
  useEffect(() => {
    const fetchCurrentUserName = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('user_mgmt')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        if (error) throw error;
        setCurrentUserName(`${data.first_name} ${data.last_name}`);
      } catch (error) {
        console.error("Error fetching current user name:", error);
      }
    };
    fetchCurrentUserName();
  }, [userId]);

  // Fetch workflow config
  useEffect(() => {
    if (!companyId) return;

    const fetchWorkflowConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("workflow_config")
          .select("*")
          .eq('company_id', companyId!)
          .eq("process_name", "Purchase Order")
          .eq("level", 1)
          .single();

        if (error) throw error;
        console.log("workflow config data =>", data);
        
        if (data) {
          setWorkflowConfig(data); 
        } else {
          setWorkflowConfig(null)
        }
      } catch (error) {
        console.error("Error fetching workflow config:", error);
        // toast.error("Failed to fetch workflow configuration.");
        setWorkflowConfig(null);
      }
    };

    fetchWorkflowConfig();
  }, [companyId]);

  // Generate new PO number
  const generateNewPoNumber = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from("supplier_mgmt")
        .select("supplier_id")
        .eq("id", supplierId)
        .single();

      if (error) throw error;

      if (data) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yy = today.getFullYear().toString().slice(-2);
        const datePart = `${dd}${mm}${yy}`;

        const { data: existingPOs, error: poError } = await supabase
          .from("purchase_order")
          .select("po_number")
          .eq('company_id', companyId!)
          .eq("supplier_id", supplierId)
          .like("po_number", isCreatingBackorder ? `BO-${data.supplier_id}-${datePart}-%` : `PO-${data.supplier_id}-${datePart}-%`);

        if (poError) throw poError;

        // Extract sequence numbers and find the next one
        const sequenceNumbers = existingPOs
          .map((po: { po_number: string | null }) => {
            const match = po.po_number?.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num: number) => !isNaN(num));

        const nextSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) + 1 : 1;
        const poNumber = isCreatingBackorder ? `BO-${data.supplier_id}-${datePart}-${String(nextSequence).padStart(3, "0")}` : `PO-${data.supplier_id}-${datePart}-${String(nextSequence).padStart(3, "0")}`;
        return poNumber;
      }
    } catch (error) {
      console.error("Error generating PO number:", error);
      toast.error("Failed to generate PO number.", { position: "top-center" });
    }
    return "";
  };

  // Fetch existing purchase order
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      const targetId = editId || duplicateId || backorderId;
      if (!targetId) return;
      if (!companyId) return;

      setIsLoading(true);
      try {
        // Fetch purchase order with related items
        const { data: poData, error: poError } = await supabase
          .from("purchase_order")
          .select(`
            id,
            po_number,
            order_date,
            supplier_id,
            store_id,
            order_status,
            total_items,
            total_value,
            payment_details,
            remarks,
            created_at,
            modified_at,
            created_by,
            modified_by,
            workflow_id,
            approval_status,
            issued_by,
            issued_on
          `)
          .eq("id", targetId)
          .single<PurchaseOrderFormData>();

        if (poError) throw poError;

        if (poData) {
          const [suppliersData, storesData, orderStatusData, workflowConfigData, poItemsData] = await Promise.all([
            supabase.from("supplier_mgmt").select("id, supplier_name, email, address, supplier_id").eq('company_id', companyId).eq("is_active", true),
            supabase.from("store_mgmt").select("id, name, address, type").eq('company_id', companyId).eq("is_active", true).eq("direct_purchase_allowed", true),
            supabase.from("system_message_config").select("*").eq('company_id', companyId),
            supabase.from("workflow_config").select("*").eq('company_id', companyId).eq("process_name", "Purchase Order"),
            supabase
              .from("purchase_order_items")
              .select(`
                item_id,
                order_qty,
                received_qty,
                order_price,
                item_mgmt (
                  id,
                  item_id,
                  item_name,
                  description,
                  selling_price,
                  max_level,
                  category_id
                )
              `, { count: "exact" })
              .eq('company_id', companyId)
              .eq("purchase_order_id", targetId),
          ]);

          if (suppliersData.error) throw suppliersData.error;
          if (storesData.error) throw storesData.error;
          if (orderStatusData.error) throw orderStatusData.error;
          if (workflowConfigData.error) throw workflowConfigData.error;
          if (poItemsData.error) throw poItemsData.error;

          setSuppliers(suppliersData.data as Supplier[]);
          setStores(storesData.data as Store[]);
          setAllApprovalStatus(poData.approval_status);
          setCurrentApprovalStatus(poData.approval_status?.at(-1));
          setBackorderRef(isCreatingBackorder ? poData.po_number : "");

          const supplier = suppliersData.data.find((s) => s.id === poData.supplier_id);
          setSupplierSearch(supplier?.supplier_name || "");
          setSupplierEmail(supplier?.email || "");
          setSupplierAddress(supplier?.address || "");
          setIsSupplierSelected(true);

          const store = storesData.data.find((s) => s.id === poData.store_id);
          setDeliveryAddress(store?.address || "");

          const currentWorkflowConfig = workflowConfigData.data?.find((config) => config.id === poData.workflow_id);
          setCurrentWorkflow(currentWorkflowConfig);

          const orderStatus = orderStatusData.data.find((status) => status.id === poData.order_status);
          setOrderStatus(orderStatus);
          setCurrentStatus(orderStatus?.sub_category_id || "");

          // Process items
          let items: SelectedItem[] = [];
          // Map purchase order items to SelectedItem format
          if (isCreatingBackorder) {
            items = poItemsData.data
              .filter((poItem) => poItem.received_qty! < poItem.order_qty!)
              .map((poItem: any) => {
                const item = poItem.item_mgmt;
                return {
                  id: item.id,
                  item_id: item.item_id,
                  item_name: item.item_name || "Unknown Item",
                  description: item.description || "",
                  selling_price: poItem.order_price / poItem.order_qty || item.selling_price || 0,
                  max_level: item.max_level || 0,
                  supplier_id: item.supplier_id || poData.supplier_id,
                  category_id: item.category_id || undefined,
                  order_qty: poItem.order_qty - poItem.received_qty,
                  received_qty: null,
                };
              });
          } else {
            items = poItemsData.data.map((poItem: any) => {
              const item = poItem.item_mgmt;
              return {
                id: item.id,
                item_id: item.item_id,
                item_name: item.item_name || "Unknown Item",
                description: item.description || "",
                selling_price: poItem.order_price / poItem.order_qty || item.selling_price || 0,
                max_level: item.max_level || 0,
                supplier_id: item.supplier_id || poData.supplier_id,
                category_id: item.category_id || undefined,
                order_qty: poItem.order_qty || 1,
                received_qty: poItem.received_qty || null,
              };
            });
          }

          setAllSelectedItems(items);
          setTotalItems(items.length);
          setSelectedItems(items.slice(0, itemsPerPage));
          setValue("purchase_order_items", items);

          if (duplicateId) {
            const newPoNumber = await generateNewPoNumber(poData.supplier_id ?? "");
            const currentDate = new Date().toISOString().split("T")[0];
            const currentTime = new Date().toISOString();
            const totalItems = items.reduce((sum, item) => sum + item.order_qty, 0);

            setValue("po_number", newPoNumber);
            setValue("order_date", currentDate);
            setValue("supplier_id", poData.supplier_id || "");
            setValue("store_id", poData.store_id || "");
            setValue("total_items", totalItems);
            setValue("total_value", items.reduce((sum: number, item: SelectedItem) => sum + item.selling_price * item.order_qty, 0));
            setValue("payment_details", poData.payment_details || "");
            setValue("remarks", poData.remarks || "");
            setValue("created_at", currentTime);
            setValue("created_by", userId || "");
          } else if (isCreatingBackorder) {
            // backorder mode
            const poNumber = await generateNewPoNumber(poData.supplier_id);
            const totalItems = items.reduce((sum, item) => sum + item.order_qty, 0);
            const totalValue = items.reduce((sum, item) => sum + (item.order_qty * item.selling_price), 0)
            const orderStatus = workflowConfig ? statusApprovalPending?.id ?? "" : statusCreated?.id ?? "";

            setValue("po_number", poNumber || "");
            setValue("order_date", new Date().toISOString().split("T")[0]);
            setValue("supplier_id", poData.supplier_id || "");
            setValue("store_id", poData.store_id || "");
            setValue("order_status", orderStatus);
            setValue("total_items", totalItems);
            setValue("total_value", totalValue);
            setValue("payment_details", poData.payment_details || "");
            setValue("remarks", poData.remarks || "");
            setValue("created_at", poData.created_at || new Date().toISOString());
            setValue("created_by", poData.created_by || userId || '');
          } else {
            // Edit mode - populate with existing data
            const totalItems = items.reduce((sum, item) => sum + item.order_qty, 0);

            setValue("po_number", poData.po_number || "");
            setValue("order_date", poData.order_date || new Date().toISOString().split("T")[0]);
            setValue("supplier_id", poData.supplier_id || "");
            setValue("store_id", poData.store_id || "");
            setValue("order_status", poData.order_status);
            setValue("total_items", poData.total_items || totalItems);
            setValue("total_value", poData.total_value || items.reduce((sum: number, item: SelectedItem) => sum + item.selling_price * item.order_qty, 0));
            setValue("payment_details", poData.payment_details || "");
            setValue("remarks", poData.remarks || "");
            setValue("created_at", poData.created_at || new Date().toISOString());
            setValue("modified_at", poData.modified_at || new Date().toISOString());
            setValue("created_by", poData.created_by || userId || '');
            setValue("modified_by", poData.modified_by || userId || null);
            setValue("issued_by", poData.issued_by);
            setValue("issued_on", poData.issued_on);
          }
        }
      } catch (error) {
        console.error("Error fetching purchase order:", error);
        toast.error("Failed to load purchase order. Please try again.");
        navigate("/dashboard/purchaseOrderManagement");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseOrder();
  }, [editId, duplicateId, backorderId, setValue, navigate, userId, systemMsgConfig, companyId]);

  // Update pagination to use allSelectedItems
  useEffect(() => {
    if (allSelectedItems.length === 0) return;

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage;
    setSelectedItems(allSelectedItems.slice(from, to));
    setTotalItems(allSelectedItems.length);
  }, [currentPage, itemsPerPage, allSelectedItems]);

  // Fetch Suppliers
  useEffect(() => {
    if (!companyId) return;

    const fetchSuppliers = async () => {
      setIsFetchingSuppliers(true);
      try {
        let query = supabase
          .from("supplier_mgmt")
          .select("id, supplier_name, email, address, supplier_id")
          .eq('company_id', companyId)
          .eq('status', 'Active')
          .eq("is_active", true);

        if (supplierSearch.length >= 3) {
          const sanitizedQuery = supplierSearch.replace(/[%_]/g, "").toLowerCase();
          query = query.or(`supplier_name.ilike.%${sanitizedQuery}%,supplier_id.ilike.%${sanitizedQuery}%`);
        } else {
          query = query.limit(0);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSuppliers(data as Supplier[]);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        setIsFetchingSuppliers(false);
      }
    };

    const timeoutId = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(timeoutId);
  }, [supplierSearch, companyId]);

  // Fetch Stores
  useEffect(() => {
    if (!companyId) return;

    const fetchStores = async () => {
      setIsFetchingStores(true);
      try {
        const { data, error } = await supabase
          .from("store_mgmt")
          .select("id, name, address, type")
          .eq('company_id', companyId)
          .eq("is_active", true)
          .eq("direct_purchase_allowed", true);

        if (error) throw error;

        if (data && data.length > 0) {
          const sortedStores = data.sort((a, b) => a.name.localeCompare(b.name)) as Store[];
          setStores(sortedStores);
          if (sortedStores.length === 1 && !editId && !duplicateId) {
            setValue("store_id", sortedStores[0].id);
            setDeliveryAddress(sortedStores[0].address);
          }
        } else {
          setStores([]);
          toast.error("No stores found with direct purchase allowed."), { position: "top-center" };
        }
      } catch (error) {
        console.error("Error fetching stores:", error);
        toast.error("Failed to fetch stores.", { position: "top-center" });
      } finally {
        setIsFetchingStores(false);
      }
    };

    fetchStores();
  }, [setValue, editId, duplicateId, companyId]);

  // Fetch Items for Search (No Pagination)
  useEffect(() => {
    if (!companyId) return;

    const fetchItems = async () => {
      if (!watchedSupplierId) {
        setAvailableItems([]);
        setShowItemDropdown(false);
        return;
      }
      setIsFetchingItems(true);
      try {
        const { data: supplierItems, error: supplierError } = await supabase
          .from('supplier_items')
          .select('item_id')
          .eq('company_id', companyId)
          .eq('supplier_id', watchedSupplierId);

        if (supplierError) throw supplierError;

        const supplierItemsIds = (supplierItems as { item_id: string }[])
          .map(item => item.item_id)
          .filter((id): id is string => id !== null);

        let query = supabase
          .from("item_mgmt")
          .select('id, item_id, item_name, description, selling_price, max_level, category_id')
          .eq('company_id', companyId)
          .in("id", supplierItemsIds);

        if (itemSearch.length >= 3) {
          const sanitizedQuery = itemSearch.trim().replace(/[%_]/g, "").toLowerCase();
          query = query.or(`item_name.ilike.%${sanitizedQuery}%,item_id.ilike.%${sanitizedQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const transformedItems: Item[] = (data || []).map((item: any) => ({
          id: item.id || "",
          item_id: item.item_id || "",
          item_name: item.item_name || "Unnamed Item",
          description: item.description || "",
          selling_price: item.selling_price || 0,
          max_level: item.max_level || 0,
          supplier_id: watchedSupplierId,
          category_id: item.category_id || undefined,
        }));
        setAvailableItems(transformedItems);
        setShowItemDropdown(itemSearch.length >= 3 && !!watchedSupplierId);
      } catch (error) {
        console.error("Error fetching items:", error);
        toast.error("Failed to fetch items.", { position: "top-center" });
      } finally {
        setIsFetchingItems(false);
      }
    };

    const timeoutId = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedSupplierId, itemSearch, companyId]);

  // Generate PO Number
  useEffect(() => {
    const generatePoNumber = async () => {
      if (!editId && !duplicateId && !backorderId && watchedSupplierId) {
        const poNumber = await generateNewPoNumber(watchedSupplierId);
        setValue("po_number", poNumber);
      }
    };

    generatePoNumber();
  }, [watchedSupplierId, editId, duplicateId, setValue, backorderId]);

  // Update Supplier Email and Address
  // useEffect(() => {
  //   const selectedSupplier = suppliers.find((s) => s.id === watchedSupplierId);
  //   setSupplierEmail(selectedSupplier?.email || "");
  //   setSupplierAddress(selectedSupplier?.address || "");
  // }, [watchedSupplierId, suppliers]);

  // Update Delivery Address
  useEffect(() => {
    const selectedStore = stores.find((s) => s.id === watchedStoreId);
    setDeliveryAddress(selectedStore?.address || "");
  }, [watchedStoreId, stores]);

  // Calculate Totals
  useEffect(() => {
    const totalItems = allSelectedItems.reduce((sum, item) => sum + item.order_qty, 0);
    const totalValue = allSelectedItems.reduce((sum: number, item) => sum + item.selling_price * item.order_qty, 0);
    setValue("total_items", totalItems);
    setValue("total_value", totalValue);
    setValue("purchase_order_items", allSelectedItems);
  }, [allSelectedItems, setValue]);

  // System Message Config
  useEffect(() => {
    const fetchSystemMessageConfig = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from('system_message_config')
          .select('*')
          .eq("company_id", companyId)
          .eq("category_id", 'PURCHASE_ORDER');

        if (error) throw error;

        if (data.length > 0) {
          setSystemMsgConfig(data);
          const statusCreated = data.find(config => config.sub_category_id === "ORDER_CREATED");
          const statusApprovalPending = data.find(config => config.sub_category_id === "APPROVAL_PENDING");
          const statusApprovalCompleted = data.find(config => config.sub_category_id === "APPROVER_COMPLETED");

          if (!statusCreated || !statusApprovalPending || !statusApprovalCompleted) {
            console.error('Missing ORDER_CREATED, APPROVAL_PENDING or APPROVER_COMPLETED in system_message_config');
            toast.error('Status configuration is incomplete', { position: "top-center" });
            return;
          }

          if (!editId) {
            const defaultStatusId = workflowConfig ? statusApprovalPending.id : statusApprovalCompleted.id;
            setValue("order_status", defaultStatusId);
          }
        } else {
          console.error('No system message config found for PURCHASE_ORDER');
          toast.error('Failed to load status configuration', { position: "top-center" });
        }
      } catch (error) {
        console.error('Error fetching system message config:', error);
        toast.error('Failed to fetch status configuration', { position: "top-center" });
      }
    };

    fetchSystemMessageConfig();
  }, [setValue, workflowConfig, companyId]);

  // Check Backorder Created
  useEffect(() => {
    if (editId) {
      const checkBackorderCreated = async () => {
        try {
          const { data, error } = await supabase
            .from('purchase_order')
            .select('*')
            .eq('backorder_reference', editId);

          if (error) throw error;
          setIsBackorderCreated(data.length > 0);
        } catch (error) {
          console.error("Checking back order created error:", error);
          toast.error('Failed to check back order created', { position: "top-center" });
        }
      };

      checkBackorderCreated();
    }
  }, [editId]);

  // Setting the order qty to received qty when dialog open
  useEffect(() => {
    if (isRecDialogOpen) {
      const initialized = allSelectedItems.map(item => ({
        itemId: item.id,
        recQuantity: item.order_qty,
      }));
      setReceivedQuantities(initialized);
    }
  }, [isRecDialogOpen, allSelectedItems]);

  useEffect(() => {
    if (!companyId || !companyEmail) return;
    checkIsEmailAuthenticated(companyEmail, companyId);
  }, [companyEmail, companyId])

  const handleSupplierSelect = (supplier: Supplier) => {
    setValue("supplier_id", supplier.id);
    setSupplierSearch(supplier.supplier_name);
    setSupplierEmail(supplier.email || "");
    setSupplierAddress(supplier.address || "");
    setShowSupplierDropdown(false);
    setIsSupplierSelected(true); // Supplier is now selected

    // Reset item-related states
    setItemSearch("");
    setSelectedItems([]);
    setAllSelectedItems([]);
    setValue("purchase_order_items", []);
    setAvailableItems([]);
    setCurrentPage(1);
    setTotalItems(0);
  };

  const handleItemSelect = (item: Item) => {
    if (allSelectedItems.some((selected) => selected.id === item.id)) {
      toast.error("Item already selected", { position: "top-center" });
      return;
    }
    const newItem: SelectedItem = {
      ...item,
      order_qty: 1,
      received_qty: null,
    };
    setAllSelectedItems((prev) => {
      const updatedItems = [...prev, newItem];
      const newTotalItems = updatedItems.length;
      setTotalItems(newTotalItems);
      const lastPage = Math.ceil(newTotalItems / itemsPerPage);
      setCurrentPage(lastPage);
      setSelectedItems(updatedItems.slice((lastPage - 1) * itemsPerPage, lastPage * itemsPerPage));
      setValue("purchase_order_items", updatedItems);
      return updatedItems;
    });
    setItemSearch("");
    setShowItemDropdown(false);
  };

  const handleItemRemove = () => {
    setAllSelectedItems((prev) => {
      const updatedItems = prev.filter((item) => item.id !== itemToDelete);
      const newTotalItems = updatedItems.length;
      setTotalItems(newTotalItems);
      const from = (currentPage - 1) * itemsPerPage;
      if (newTotalItems > 0 && from >= newTotalItems) {
        const newPage = Math.ceil(newTotalItems / itemsPerPage);
        setCurrentPage(newPage);
        setSelectedItems(updatedItems.slice((newPage - 1) * itemsPerPage, newPage * itemsPerPage));
      } else {
        setSelectedItems(updatedItems.slice(from, from + itemsPerPage));
      }
      setValue("purchase_order_items", updatedItems);
      return updatedItems;
    });
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  const openDeleteDialog = (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteDialog(true);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setAllSelectedItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === itemId ? { ...item, order_qty: Math.max(1, quantity) } : item
      );
      const from = (currentPage - 1) * itemsPerPage;
      setSelectedItems(updatedItems.slice(from, from + itemsPerPage));
      setValue("purchase_order_items", updatedItems);
      return updatedItems;
    });
  };

  const handlePriceChange = (itemId: string, price: number) => {
    setAllSelectedItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === itemId ? { ...item, selling_price: Math.max(0, price) } : item
      );
      const from = (currentPage - 1) * itemsPerPage;
      setSelectedItems(updatedItems.slice(from, from + itemsPerPage));
      setValue("purchase_order_items", updatedItems);
      return updatedItems;
    });
  };

  // New cancellation handlers
  const handleCancelPO = () => {
    setShowCancellationModal(true);
    setCancellationData({
      reason: "Pricing Issue",
      details: "",
    });
    setCancellationErrors({});
  };

  const validateCancellation = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!cancellationData.reason) {
      errors.reason = "Please select a reason for cancellation";
    }

    if (cancellationData.reason === "Others" && (!cancellationData.details || cancellationData.details.trim() === "")) {
      errors.details = "Please specify the reason when 'Others' is selected";
    }

    setCancellationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmCancellation = async () => {
    if (!validateCancellation()) {
      return;
    }

    setIsCancelling(true);
    try {
      const currentTime = new Date().toISOString();
      const cancelStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_CANCELLED")?.id;
      // Update the purchase order with cancellation data
      const { error } = await supabase
        .from("purchase_order")
        .update({
          order_status: cancelStatus,
          cancelled_by: userId,
          cancelled_on: currentTime,
          selected_reason: cancellationData.reason === "Others" ? cancellationData.details : cancellationData.reason,
          modified_at: currentTime,
          modified_by: userId,
        })
        .eq("id", editId ?? "");

      if (error) throw error;
      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Edit',
        key: `${watchedPOnumber}`,
        log: `Purchase Order ${watchedPOnumber} cancelled due to ${cancellationData.reason === "Others" ? cancellationData.details : cancellationData.reason}.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      toast.success("Purchase Order has been cancelled.", { position: "top-center" });
      navigate("/dashboard/purchaseOrderManagement");
    } catch (error: any) {
      console.error("Error cancelling purchase order:", error);
      toast.error(error.message || "Failed to cancel purchase order", { position: "top-center" });
    } finally {
      setIsCancelling(false);
      setShowCancellationModal(false);
    }
  };

const onSubmit: SubmitHandler<PurchaseOrderFormData> = async (data) => { 
  setFormError(null);
  try {
    const currentTime = getLocalDateTime();
    const isResubmitted = editId && data.order_status === statusCreated?.id;

    // Prepare approval_status for new POs (not for edits)
    const approvalStatus =
      (!editId || isResubmitted) && workflowConfig
        ? [
          ...(allApprovalStatus ?? []), 
          {
            status: statusApprovalPending?.value?.replace("{@}", `${workflowConfig.level}`),
            trail: "Pending",
            role_id: workflowConfig.role_id,
            sequence_no: (allApprovalStatus?.length ?? 0),
            isFinalized: false,
          },
        ]
        : undefined;

    const purchaseOrderData = {
      id: editId || crypto.randomUUID(),
      po_number: data.po_number,
      order_date: data.order_date,
      supplier_id: data.supplier_id,
      store_id: data.store_id,
      order_status: isResubmitted
        ? (workflowConfig ? statusApprovalPending?.id : statusCreated?.id)
        : data.order_status,
      total_items: data.total_items || 0,
      total_value: data.total_value || 0,
      payment_details: data.payment_details || null,
      remarks: data.remarks || null,
      created_at: data.created_at || currentTime,
      modified_at: currentTime,
      created_by: data.created_by || userId,
      modified_by: userId,
      company_id: companyId,
      ...(approvalStatus && { approval_status: approvalStatus as Json }),
      ...((!editId || isResubmitted) && { workflow_id: workflowConfig?.id }),
      ...((!editId || isResubmitted) && { next_level_role_id: workflowConfig?.role_id }),
      ...(backorderId && { backorder_reference: backorderId }),
    };

    if (editId) {
      // Update existing record
      const { error: poError } = await supabase
        .from("purchase_order")
        .update(purchaseOrderData)
        .eq("id", editId);

      if (poError) throw poError;

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Edit',
        key: `${data.po_number}`,
        log: `Purchase Order ${data.po_number} updated.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      const { error: deleteError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", editId);

      if (deleteError) throw deleteError;
    } else {
      // Insert new record (for both new, duplicate and backorder)
      const { error: poError } = await supabase
        .from("purchase_order")
        .insert([purchaseOrderData]);

      if (poError) throw poError;

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Add',
        key: `${data.po_number}`,
        log: `Purchase Order ${data.po_number} created.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;
    }

    const itemData = allSelectedItems.map((item) => ({
      purchase_order_id: purchaseOrderData.id,
      item_id: item.id,
      order_qty: item.order_qty,
      order_price: item.selling_price * item.order_qty,
      received_qty: item.received_qty || null,
      remarks: data.remarks || null,
      company_id: companyId,
    }));

    const { error: itemError } = await supabase
      .from("purchase_order_items")
      .insert(itemData);

    if (itemError) throw itemError;

    // Send notifications if new creation or resubmitted
    if (!editId || isResubmitted) {
      // Fetch super admin role
      const { data: superAdminRole, error: superRoleError } = await supabase
        .from('role_master')
        .select('id')
        .eq('company_id', companyId!)
        .eq('name', 'Super Admin')
        .single();

      if (superRoleError) console.error('Error fetching super admin role:', superRoleError);

      // Fetch super admins
      const { data: superAdmins, error: superAdminsError } = await supabase
        .from('user_mgmt')
        .select('id')
        .eq('company_id', companyId!)
        .eq('role_id', superAdminRole?.id!)
        .eq('is_active', true);

      if (superAdminsError) console.error('Error fetching super admins:', superAdminsError);

      const superAdminIds = superAdmins?.map((u: any) => u.id) || [];

      // Fetch approvers if workflow exists
      let approverIds: string[] = [];
      if (workflowConfig) {
        const { data: approvers, error: approversError } = await supabase
          .from('user_mgmt')
          .select('id')
          .eq('company_id', companyId!)
          .eq('role_id', workflowConfig.role_id)
          .eq('is_active', true);

        if (approversError) console.error('Error fetching approvers:', approversError);

        approverIds = approvers?.map((u: any) => u.id) || [];
      }

      // Build messages
      const supplier = suppliers.find((s) => s.id === data.supplier_id);
      const supplierName = supplier?.supplier_name || 'Unknown Supplier';
      const itemsSummary = allSelectedItems.map(item => `${item.item_name} (Qty: ${item.order_qty})`).join(', ');
      const createdMessage = `Purchase Order ${data.po_number} created for ${itemsSummary} with supplier ${supplierName}.`;
      const approvalMessage = `Approval required for Purchase Order ${data.po_number} created by ${currentUserName}.`;

      // Prepare notifications
      const notifications = [];

      // Notification for creator
      notifications.push({
        created_at: currentTime,
        priority: 'Medium',
        alert_type: 'Purchase Order Created',
        entity_id: data.po_number,
        message: createdMessage,
        assign_to: userId,
        status: 'New',
        acknowledged_at: null,
        company_id: companyId,
        is_active: true,
      });

      // Notifications for super admins (excluding the creator if they are a super admin)
      superAdminIds
        .filter(adminId => adminId !== userId) // Exclude creator to avoid duplicates
        .forEach((adminId: string) => {
          notifications.push({
            created_at: currentTime,
            priority: 'Medium',
            alert_type: 'Purchase Order Created',
            entity_id: data.po_number,
            message: createdMessage,
            assign_to: adminId,
            status: 'New',
            acknowledged_at: null,
            company_id: companyId,
            is_active: true,
          });
        });

      // Notifications for approvers if workflow (excluding users who already received notifications)
      if (workflowConfig) {
        const existingNotificationUserIds = new Set([userId, ...superAdminIds.filter(id => id !== userId)]);
        
        approverIds
          .filter(approverId => !existingNotificationUserIds.has(approverId)) // Exclude users who already have notifications
          .forEach((approverId: string) => {
            notifications.push({
              created_at: currentTime,
              priority: 'Medium',
              alert_type: 'Purchase Order Approval Requested',
              entity_id: data.po_number,
              message: approvalMessage,
              assign_to: approverId,
              status: 'New',
              acknowledged_at: null,
              company_id: companyId,
              is_active: true,
            });
          });
      }

      // Insert notifications
      const { error: notificationError } = await supabase
        .from('system_notification')
        .insert(notifications);

      if (notificationError) {
        console.error('Error inserting notifications:', notificationError);
        // Do not throw, continue with success
      } else {
        // Trigger header notification update immediately after successful insertion
        console.log('Notifications inserted successfully, triggering update...');
        triggerNotificationUpdate();
      }
    }

    toast.success(
      backorderId
        ? `Back Order created successfully`
        : editId
          ? "Purchase Order updated successfully"
          : duplicateId
            ? "Purchase Order duplicated successfully"
            : "Purchase Order created successfully",
      { position: "top-center" }
    );
    navigate("/dashboard/purchaseOrderManagement");
  } catch (error: any) {
    console.error("Error processing purchase order:", error);
    setFormError(error.message || "Failed to process purchase order. Please try again.");
    toast.error(error.message || "Failed to process purchase order", { position: "top-center" });
  }
};

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    reset();
    navigate("/dashboard/purchaseOrderManagement");
  };

  const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {message}
      </p>
    );
  };

  // Determine the page title and description based on mode
  const getPageTitle = () => {
    if (editId) return "Edit Purchase Order";
    if (duplicateId) return "Duplicate Purchase Order";
    if (backorderId) return "Create Backorder";
    return "Create Purchase Order";
  };

  const getPageDescription = () => {
    if (editId) return "Modify an existing purchase order";
    if (duplicateId) return "Create a new purchase order based on an existing one";
    if (backorderId) return "Create Backorder for partially received purchase orders";
    return "Create a new purchase order for inventory management";
  };

  const getCardTitle = () => {
    if (editId) return "Edit Purchase Order";
    if (duplicateId) return "Duplicate Purchase Order";
    return "Purchase Order Details";
  };

  const getCardDescription = () => {
    if (editId) return "Update the details below to modify the purchase order";
    if (duplicateId) return "Review and modify the details below to create a duplicate purchase order";
    return "Fill in the details below to create a new purchase order";
  };

  // Handle Received Qty input change
  const handleRecQuantityChange = (itemId: string, quantity: number) => {
    setReceivedQuantities(prev => {
      const existing = prev.find(item => item.itemId === itemId);
      if (existing) {
        return prev.map(item =>
          item.itemId === itemId ? { ...item, recQuantity: quantity } : item
        );
      }
      return [...prev, { itemId, recQuantity: quantity }];
    });
  };

  // Validating received Qty
  const validateReceivedQuantities = (): boolean => {
    return allSelectedItems.every(item => {
      const found = receivedQuantities.find(rec => rec.itemId === item.id);
      return found && found.recQuantity >= 0 && !(found.recQuantity > item.order_qty);
    });
  };

  // Handle Confirm PO Receival
  const handleConfirmReceival = async () => {
    try {
      if (!validateReceivedQuantities()) {
        toast.error("Please enter a valid received quantity for all items.", { position: "top-center" });
        return;
      }

      // Check if partially received
      const isPartiallyReceived = (): boolean => {
        return allSelectedItems.some(item => {
          const rec = receivedQuantities.find(recItem => recItem.itemId === item.id);
          return rec && rec.recQuantity >= 0 && rec.recQuantity < item.order_qty;
        });
      };

      const partiallyRecStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_PARTIALLY_RECEIVED")?.id;
      const recStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_RECEIVED")?.id;

      const poStatus = isPartiallyReceived() ? partiallyRecStatus : recStatus;
      const totalReceivedQty = receivedQuantities.reduce((sum, item) => sum + item.recQuantity, 0);

      const payload = {
        order_status: poStatus,
        received_by: userId,
        received_on: new Date().toISOString(),
        received_qty: totalReceivedQty,
      };

      const getSellingPrice = async (recItemId: string): Promise<number> => {
        const { data, error } = await supabase
          .from('item_mgmt')
          .select('selling_price')
          .eq('id', recItemId)
          .single();

        if (error) throw error;
        return data?.selling_price ?? 0;
      };

      const inventoryPayload = await Promise.all(
        receivedQuantities
          .filter(recItem => recItem.recQuantity > 0)
          .map(async (recItem) => {
            const itemSellingPrice = await getSellingPrice(recItem.itemId);
            return {
              item_id: recItem.itemId,
              store_id: watchedStoreId,
              purchase_order_id: editId,
              item_qty: recItem.recQuantity,
              unit_price: allSelectedItems.find(item => item.id === recItem.itemId)?.selling_price ?? 0,
              selling_price: itemSellingPrice,
              stock_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              company_id: companyId,
            };
          })
      );

      // Updating received qty in inventory management
      const { error: inventoryErr } = await supabase
        .from('inventory_mgmt')
        .insert(inventoryPayload)
        .select();

      if (inventoryErr) {
        console.error('Error updating inventory:', inventoryErr);
        toast.error('Failed to update purchase order', { position: "top-center" });
        return;
      }

      for (const row of receivedQuantities) {
        const { itemId, recQuantity } = row;
        const { error: updateError } = await supabase
          .from('purchase_order_items')
          .update({ received_qty: recQuantity })
          .eq('purchase_order_id', editId!)
          .eq('item_id', itemId!);

        if (updateError) {
          console.error('Error updating purchase order items:', updateError);
          toast.error('Failed to update purchase order items', { position: "top-center" });
          return;
        }
      }

      const { error: poUpdateError } = await supabase
        .from('purchase_order')
        .update(payload)
        .eq('id', editId!);

      if (poUpdateError) {
        console.error('Error updating purchase order:', poUpdateError);
        toast.error('Failed to update purchase order', { position: "top-center" });
        return;
      }

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Edit',
        key: `${watchedPOnumber}`,
        log: `Purchase Order ${watchedPOnumber} ${isPartiallyReceived() ? 'partially received' : 'received'}.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;

      isPartiallyReceived() ? toast.success('Purchase Order marked as Partially Received.', { position: "top-center" }) : toast.success('Purchase Order marked as Received.', { position: "top-center" });
      navigate("/dashboard/purchaseOrderManagement");
    } catch (error) {
      console.error("Confirm PO receival error:", error);
      toast.error('Failed to confirm PO receival', { position: "top-center" });
    }
  };

  const getCurrentOrderStatus = () => {
    if (editId) {
      if (orderStatus?.sub_category_id === "APPROVAL_PENDING") {
        return orderStatus?.value?.replace('{@}', `${currentWorkflow?.level || ''}`) || '';
      } else if (orderStatus?.sub_category_id === "APPROVER_COMPLETED" && currentApprovalStatus?.isFinalized) {
        return orderStatus?.value?.replace('{@} Approved', 'Purchase Order Approved') || '';
      } else if (orderStatus?.sub_category_id === "APPROVER_COMPLETED" && !currentApprovalStatus) {
        return orderStatus?.value?.replace('{@} Approved', 'Purchase Order Approved') || '';
      } else {
        return orderStatus?.value;
      }
    } else {
      return (workflowConfig
        ? statusApprovalPending?.value?.replace('{@}', `${workflowConfig?.level || ''}`) || ''
        : statusApprovalCompleted?.value?.replace('{@} Approved', 'Purchase Order Approved') || '');
    }
  };

  const checkIsEmailAuthenticated = async (
    companyEmail: string,
    companyId: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("id, system_config_value")
        .eq("company_email", companyEmail) // use parameter instead of hardcoding
        .eq("company_id", companyId)
        .eq("system_config_key", "EMAIL_REFRESH_TOKEN")
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        return false;
      }

      if (data?.system_config_value) {
        setIsEmailAuthenticated(true);
        setNotifySupplier(true);
        return true;
      } else {
        setIsEmailAuthenticated(false);
        setNotifySupplier(false);
        return false;
      }
    } catch (err) {
      console.error("Check email auth error:", err);
      return false;
    }
  };

  function createHTMLEmail(purchaseOrderData: any) {
    const itemsHtml = (purchaseOrderData.orderItems || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px;">${item.itemName || 'N/A'}</td>
        <td style="padding: 12px; text-align: center;">${item.itemQty || 'N/A'}</td>
        <td style="padding: 12px; text-align: right;">${item.totalAmount || 'N/A'}</td>
      </tr>
    `).join('');

    return `
    <div style="font-family: 'Trebuchet MS', sans-serif; font-size: 16px; color: #2c3e50; width: 100%; background: linear-gradient(to bottom, #f8f9fa, #e9ecef); padding: 40px 0;">
      <div style="width: 100%; max-width: 900px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.1);">
        <!-- Header -->
        <!-- <div style="padding: 24px 24px; display: flex; align-items: center; justify-content: space-between;">
          <a style="text-decoration: none;" href="[Website Link]" target="_blank">
            <img style="height: 48px; vertical-align: middle;" src="https://i.postimg.cc/RVDYmXbH/Screenshot-2025-07-10-114340.png" alt="Company Logo" />
          </a>
        </div> -->

        <!-- Main Content -->
        <div style="padding: 24px 24px;">
          <h1 style="font-weight: 700; color: #1e293b; margin: 0 0 16px; font-size: 24px;">New Purchase Order Issued</h1>
          <p style="color: #475569; line-height: 1.7; margin-bottom: 12px;">Hi ${purchaseOrderData.supplierName || 'N/A'},</p>
          <p style="color: #475569; line-height: 1.7; margin-bottom: 24px;">We are pleased to inform you that a new <strong>Purchase Order</strong> has been issued. Please review the details below:</p>

          <!-- PO Details -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4b5563;">
            <table style="width: 100%; font-size: 15px; color: #475569;">
              <tr>
                <td style="font-weight: 600; padding: 8px 0;">PO Number:</td>
                <td style="padding: 8px 0;">${purchaseOrderData.poNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td style="font-weight: 600; padding: 8px 0;">Issued Date:</td>
                <td style="padding: 8px 0;">${purchaseOrderData.issuedOn || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <!-- Item Summary -->
          <h2 style="font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 16px;">Order Items</h2>
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; outline: none;">
            <thead>
              <tr style="background: #4b5563; color: #ffffff;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Item Name</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">Quantity</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Delivery Details -->
          <p style="font-weight: 600; color: #333; margin: 24px 0 12px;">Delivery To:</p>
          <div style="background-color: #fafafa; padding: 10px; border-radius: 6px; line-height: 1.6;">
            <p style="margin: 0; font-weight: 600; color: #333;">${purchaseOrderData.deliveryStore || 'N/A'}</p>
            <p style="margin: 0 4px 0 0; color: #555; font-size: 13px;">${purchaseOrderData.deliveryAddress || ''}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1e293b; padding: 24px; text-align: center; font-size: 14px; color: #f1f5f9;">
          <p style="margin: 0 0 8px;">Sent by ${purchaseOrderData.companyName || 'N/A'}</p>
          <p style="margin: 0;">
            <a href="[Unsubscribe Link]" style="color: #a5b4fc; text-decoration: none; margin-right: 16px; font-weight: 500;">Unsubscribe</a>
            <a href="[Contact Link]" style="color: #a5b4fc; text-decoration: none; font-weight: 500;">Contact Us</a>
          </p>
        </div>
      </div>
    </div>`
      ;
  }

  const handleSendEmail = async (purchaseOrderData: any) => {
    if (!purchaseOrderData) {
      toast.error("Purchase order data is required", { position: "top-center" });
      return;
    }

    if (!companyId || !companyEmail) {
      toast.error("Company email or ID missing", { position: "top-center" });
      return;
    }

    const emailContent = createHTMLEmail(purchaseOrderData);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("User session is invalid. Please login again.", { position: "top-center" });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            from: companyEmail,
            to: purchaseOrderData.supplierEmail,
            subject: "New Purchase Order Issued",
            text: "New Purchase Order Issued",
            html: emailContent,
            company_id: companyId,
            company_name: companyName,
          }),
        }
      );

      const result: SendEmailResponse = await response.json() as SendEmailResponse;

      if (!(response.ok && result.success)) {
        console.error("Email sending failed:", result);

        // Show the exact message returned from edge function
        toast.error(result.message || "Email sending failed", { position: "top-center" });
      }

      // Create system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Edit',
        key: `${watchedPOnumber}`,
        log: `Purchase Order ${watchedPOnumber} issued.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      };

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) {
        throw systemLogError;
      }

      setIsIssuing(false);
      toast.success('Purchase Order has been issued successfully.', {
        position: "top-center",
      });
      navigate("/dashboard/purchaseOrderManagement");

    } catch (error: any) {
      console.error("Email send failed:", error);

      // If fetch itself failed, show error.message
      toast.error(error?.message || "Email sending failed", { position: "top-center" });

      // Still log + navigate
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Purchase Management',
        scope: 'Edit',
        key: `${watchedPOnumber}`,
        log: `Purchase Order ${watchedPOnumber} issued (email failed).`,
        action_by: userId,
        created_at: new Date().toISOString(),
      };

      await supabase.from('system_log').insert(systemLogs);

      setIsIssuing(false);
      toast.success(`Purchase Order has been issued successfully.`, {
        position: "top-center",
      });
      navigate("/dashboard/purchaseOrderManagement");
    }
  };

  const handleConfirmIssuePO = async () => {
    setIsIssuing(true);
    try {
      const nextOrderStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_ISSUED")?.id;
      const payload = {
        order_status: nextOrderStatus,
        issued_by: userId,
        issued_on: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('purchase_order')
        .update(payload)
        .eq('id', editId!);

      if (error) {
        console.error('Error updating purchase order:', error);
        toast.error('Failed to update purchase order', { position: "top-center" });
        return;
      }

      if (notifySupplier && isEmailAuthenticated) {
        const orderedItems = allSelectedItems.map((poItem: any) => {
          return {
            id: poItem.id,
            itemId: poItem.item_id,
            itemName: poItem.item_name,
            itemQty: poItem.order_qty,
            totalAmount: formatCurrency(poItem.order_qty * poItem.selling_price)
          }
        })
        const poSupplier = suppliers.find(supplier => supplier.id === watchedSupplierId);
        const poStore = stores.find(store => store.id === watchedStoreId);
        const purchaseOrderData = {
          supplierName: poSupplier?.supplier_name,
          supplierEmail: poSupplier?.email,
          poNumber: watchedPOnumber,
          issuedOn: formatDate(new Date().toISOString()),
          deliveryStore: poStore?.name,
          deliveryAddress: poStore?.address,
          orderItems: orderedItems,
          viewLink: '#',
          companyName: companyName,
        }
        handleSendEmail(purchaseOrderData);
      } else {
        // Creating system log
        const systemLogs = {
          company_id: companyId,
          transaction_date: new Date().toISOString(),
          module: 'Purchase Management',
          scope: 'Edit',
          key: `${watchedPOnumber}`,
          log: `Purchase Order ${watchedPOnumber} issued.`,
          action_by: userId,
          created_at: new Date().toISOString(),
        }

        const { error: systemLogError } = await supabase
          .from('system_log')
          .insert(systemLogs);

        if (systemLogError) throw systemLogError;

        setIsIssuing(false);
        toast.success('Purchase Order has been issued successfully.', { position: "top-center" });
        navigate("/dashboard/purchaseOrderManagement");
      }
    } catch (error) {
      console.error("Confirm issue PO error:", error);
      toast.error('Failed to confirm issue PO', { position: "top-center" });
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster />
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/purchaseOrderManagement")}
            className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              {duplicateId ? (
                <Copy className="h-6 w-6 text-blue-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600">
                {getPageDescription()}
              </p>
            </div>
          </div>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{formError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl text-blue-800">{getCardTitle()}</CardTitle>
              <CardDescription className="text-blue-600">
                {getCardDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  {isCreatingBackorder && (
                    <div className="gap-4">
                      <div className="space-y-2 group">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="backorder_reference" className="group-hover:text-blue-500 transition-colors duration-200">
                            Backorder Reference
                          </Label>
                          <a
                            href={`/dashboard/purchaseOrderView/${backorderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600"
                          >
                            View original Purchase Order
                          </a>
                        </div>
                        <Input
                          id="backorder_reference"
                          value={backorderRef}
                          readOnly
                          className="h-10 w-full bg-gray-50"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="po_number" className="group-hover:text-blue-500 transition-colors duration-200">PO Number</Label>
                      <Controller
                        name="po_number"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="po_number"
                            readOnly={!!editId || isCreatingBackorder}
                            className={`h-10 w-full ${editId || backorderId ? "bg-gray-50" : ""} ${errors.po_number ? "border-red-500" : ""}`}
                          />
                        )}
                      />
                      <ErrorMessage message={errors.po_number?.message} />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="order_date" className="group-hover:text-blue-500 transition-colors duration-200">Date of Order <span className="text-red-500">*</span></Label>
                      <Controller
                        name="order_date"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            id="order_date"
                            className={`h-10 w-full ${errors.order_date ? "border-red-500" : ""} ${isFormDisabled || isCreatingBackorder ? 'bg-gray-50' : ''}`}
                            readOnly={isFormDisabled || isCreatingBackorder}
                          />
                        )}
                      />
                      <ErrorMessage message={errors.order_date?.message} />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="store_id" className="group-hover:text-blue-500 transition-colors duration-200">Store Name <span className="text-red-500">*</span></Label>
                      <Controller
                        name="store_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isFormDisabled || isCreatingBackorder}
                          >
                            <SelectTrigger className={`h-10 w-full ${errors.store_id ? "border-red-500" : ""} ${isFormDisabled || isCreatingBackorder ? 'bg-gray-50 text-gray-900' : ''}`}>
                              <SelectValue placeholder={isFetchingStores ? "Loading stores..." : "Select store"} />
                            </SelectTrigger>
                            <SelectContent>
                              {stores.length > 0 ? (
                                stores.map((store) => (
                                  <SelectItem key={store.id} value={store.id}>
                                    {store.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-gray-500">No direct purchase stores available</div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <ErrorMessage message={errors.store_id?.message} />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="delivery_address" className="group-hover:text-blue-500 transition-colors duration-200">Delivery Address</Label>
                      <Input
                        id="delivery_address"
                        value={deliveryAddress}
                        readOnly
                        className="h-10 w-full bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="order_status" className="group-hover:text-blue-500 transition-colors duration-200">Order Status</Label>
                      <Input
                        id="order_status_display"
                        value={getCurrentOrderStatus() || ''}
                        readOnly
                        className={`h-10 w-full bg-gray-50 ${errors.order_status ? "border-red-500" : ""}`}
                      />
                      <ErrorMessage message={errors.order_status?.message} />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="total_items" className="group-hover:text-blue-500 transition-colors duration-200">Total Items</Label>
                      <Controller
                        name="total_items"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            id="total_items"
                            value={field.value || 0}
                            readOnly
                            className="h-10 w-full bg-gray-50"
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="total_value" className="group-hover:text-blue-500 transition-colors duration-200">Total Value</Label>
                      <Controller
                        name="total_value"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            id="total_value"
                            value={field.value || 0}
                            readOnly
                            className="h-10 w-full bg-gray-50"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Supplier Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="supplier_id" className="group-hover:text-blue-500 transition-colors duration-200">Supplier Name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="supplier_id"
                          value={supplierSearch}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSupplierSearch(value);
                            setShowSupplierDropdown(value.length >= 3);

                            // Clear email & address when deletes supplier name
                            if (isSupplierSelected) {
                              setSupplierEmail("");
                              setSupplierAddress("");
                              setValue("supplier_id", "");
                              setIsSupplierSelected(false);
                            }
                          }}
                          onFocus={() => {
                            // Only show dropdown if no supplier selected and 3+ chars typed
                            if (!isSupplierSelected && supplierSearch.length >= 3) {
                              setShowSupplierDropdown(true);
                            }
                          }}
                          placeholder="Type to search suppliers..."
                          className={`h-10 w-full ${errors.supplier_id ? "border-red-500" : ""} ${isFormDisabled || isCreatingBackorder ? 'bg-gray-50' : ''}`}
                          readOnly={isFormDisabled || isCreatingBackorder}
                        />
                        {showSupplierDropdown && !isFormDisabled && !isCreatingBackorder && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {isFetchingSuppliers ? (
                              <div className="px-3 py-2 text-gray-500">Loading suppliers...</div>
                            ) : suppliers.length > 0 ? (
                              suppliers.map((supplier) => (
                                <div
                                  key={supplier.id}
                                  onClick={() => handleSupplierSelect(supplier)}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  {supplier.supplier_name}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500">No matching supplier found</div>
                            )}
                          </div>
                        )}
                      </div>
                      <ErrorMessage message={errors.supplier_id?.message} />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="supplier_email" className="group-hover:text-blue-500 transition-colors duration-200">Supplier Email</Label>
                      <Input
                        id="supplier_email"
                        value={supplierEmail}
                        readOnly
                        className="h-10 w-full bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="supplier_address" className="group-hover:text-blue-500 transition-colors duration-200">Supplier Address</Label>
                      <Input
                        id="supplier_address"
                        value={supplierAddress}
                        readOnly
                        className="h-10 w-full bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Item Selection</h3>
                  <div className="space-y-2 group">
                    <Label htmlFor="itemSearch" className="group-hover:text-blue-500 transition-colors duration-200">Item Field <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="itemSearch"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        onFocus={() => setShowItemDropdown(itemSearch.length >= 3 && !!watchedSupplierId)}
                        placeholder="Search for items by name or number..."
                        className="h-10 w-full"
                        disabled={!watchedSupplierId}
                        readOnly={isFormDisabled || isCreatingBackorder}
                      />
                      {showItemDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {isFetchingItems ? (
                            <div className="px-3 py-2 text-gray-500">Loading items...</div>
                          ) : availableItems.length > 0 ? (
                            availableItems
                              .filter((item) => !allSelectedItems.some((selected) => selected.id === item.id))
                              .map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => handleItemSelect(item)}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  {item.item_id} - {item.item_name}
                                </div>
                              ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500">No matching items available for this supplier</div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.purchase_order_items && allSelectedItems.length === 0 && (
                      <ErrorMessage message={errors.purchase_order_items.message} />
                    )}
                  </div>
                  {allSelectedItems.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium flex items-center gap-2">
                          Selected Items
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {allSelectedItems.length}
                          </span>
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItems([]);
                            setAllSelectedItems([]);
                            setValue("purchase_order_items", []);
                            setCurrentPage(1);
                            setTotalItems(0);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                          disabled={isFormDisabled || isCreatingBackorder}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Item Number</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Item Name</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Description</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Unit Price</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Order Quantity</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedItems.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-4 py-2 text-sm">{item.item_id}</td>
                                <td className="px-4 py-2 text-sm">{item.item_name}</td>
                                <td className="px-4 py-2 text-sm">{item.description}</td>
                                <td className="px-4 py-2 text-sm">
                                  <Input
                                    type="number"
                                    value={item.selling_price}
                                    onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value))}
                                    className="h-8 w-24"
                                    min="0"
                                    step="0.01"
                                    readOnly={isFormDisabled || isCreatingBackorder}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <Input
                                    type="number"
                                    value={item.order_qty}
                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                                    className="h-8 w-24"
                                    min="1"
                                    readOnly={isFormDisabled || isCreatingBackorder}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(item.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full p-1"
                                    disabled={isFormDisabled || isCreatingBackorder}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-between px-2 pb-6 gap-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Show</p>
                          <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value: string) => {
                              setItemsPerPage(Number(value));
                              setCurrentPage(1);
                            }}
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
                            Showing{' '}
                            {selectedItems.length > 0
                              ? (currentPage - 1) * itemsPerPage + 1
                              : 0}{' '}
                            to {Math.min(currentPage * itemsPerPage, totalItems)} of{' '}
                            {totalItems} entries
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              aria-label="Previous page"
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
                              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages || totalPages === 0}
                              aria-label="Next page"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="payment_details" className="group-hover:text-blue-500 transition-colors duration-200">Payment Details</Label>
                      <Controller
                        name="payment_details"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="payment_details"
                            className={`min-h-[5.5rem] w-full ${isFormDisabled || isCreatingBackorder ? 'bg-gray-50' : ''}`}
                            placeholder="Enter payment details"
                            readOnly={isFormDisabled || isCreatingBackorder}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="remarks" className="group-hover:text-blue-500 transition-colors duration-200">Remarks</Label>
                      <Controller
                        name="remarks"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="remarks"
                            className={`min-h-[5.5rem] w-full ${isFormDisabled || isCreatingBackorder ? 'bg-gray-50' : ''}`}
                            placeholder="Enter remarks"
                            readOnly={isFormDisabled || isCreatingBackorder}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <div>
                    {shouldShowCancelButton && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleCancelPO}
                        disabled={isSubmitting || isCancelling}
                        className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                      >
                        <span className="flex items-center gap-2">
                          <Ban className="h-4 w-4" />
                          Cancel PO
                        </span>
                      </Button>
                    )}
                    {(editId && currentStatus === 'ORDER_ISSUED') && (
                      <Button
                        type="button"
                        onClick={() => setIsRecDialogOpen(true)}
                        className="text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Mark as Received
                      </Button>
                    )}
                    {(editId && currentStatus === 'ORDER_PARTIALLY_RECEIVED') && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                type="button"
                                onClick={() => navigate(`/dashboard/purchaseOrderForm?backorder=${editId}`)}
                                className="text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                                disabled={isBackorderCreated}
                              >
                                <CalendarCheck className="h-4 w-4" />
                                Create Backorder
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {isBackorderCreated && (
                            <TooltipContent>
                              Back order already created.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {showIssuePOBtn && (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsIssueDialogOpen(true);
                          setNotifySupplier(true);
                        }}
                        className="text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        Issue PO
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || selectedItems.length === 0 || isLoading || isFormDisabled}
                      className="text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {editId ? "Updating..." : duplicateId ? "Duplicating..." : "Creating..."}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {duplicateId ? (
                            <Copy className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {editId ? "Update Purchase Order" : duplicateId ? "Create Duplicate" : backorderId ? "Create Backorder" : "Create Purchase Order"}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Existing Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Confirm Cancel
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel? Unsaved changes will be lost.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex justify-between items-center">
              <DialogClose asChild>
                <Button variant="outline">
                  No
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmCancel}
              >
                Yes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Existing Item Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Confirm Item Removal
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this item from the Purchase Order?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex justify-between items-center">
              <DialogClose asChild>
                <Button variant="outline"
                  onClick={() => setItemToDelete(null)} >
                  No
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => handleItemRemove()}
              >
                Yes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Cancellation Modal */}
        <Dialog open={showCancellationModal} onOpenChange={setShowCancellationModal}>
          <DialogContent className="max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Cancel Purchase Order
              </DialogTitle>
              <DialogDescription>
                Please provide a reason for cancelling this Purchase Order. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="selected_reason" className="text-sm font-medium">
                Reason for Cancellation <span className="text-red-500">*</span>
              </Label>
              <Select
                value={cancellationData.reason}
                onValueChange={(value: "Pricing Issue" | "Supplier Delay" | "Alternative Item Procured" | "Others") => {
                  setCancellationData({
                    ...cancellationData,
                    reason: value,
                    details: value === "Others" ? cancellationData.details : "",
                  });
                  setCancellationErrors({});
                }}
              >
                <SelectTrigger className={`h-10 w-full ${cancellationErrors.reason ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pricing Issue">Pricing Issue</SelectItem>
                  <SelectItem value="Supplier Delay">Supplier Delay</SelectItem>
                  <SelectItem value="Alternative Item Procured">Alternative Item Procured</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              {cancellationErrors.reason && (
                <ErrorMessage message={cancellationErrors.reason} />
              )}
            </div>

            {cancellationData.reason === "Others" && (
              <div className="space-y-2">
                <Label htmlFor="cancellation_details" className="text-sm font-medium">
                  Please specify the reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="cancellation_details"
                  value={cancellationData.details}
                  onChange={(e) => {
                    setCancellationData({
                      ...cancellationData,
                      details: e.target.value,
                    });
                    setCancellationErrors({});
                  }}
                  placeholder="Enter the specific reason for cancellation"
                  className={`min-h-[80px] w-full ${cancellationErrors.details ? "border-red-500" : ""}`}
                />
                {cancellationErrors.details && (
                  <ErrorMessage message={cancellationErrors.details} />
                )}
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">
                Are you sure you want to cancel this Purchase Order? This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="flex justify-between items-center">
              <DialogClose asChild>
                <Button variant="outline"
                  onClick={() => {
                    setShowCancellationModal(false);
                    setCancellationData({ reason: "Pricing Issue", details: "" });
                    setCancellationErrors({});
                  }}
                  disabled={isCancelling}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50" >
                  No, Keep PO
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleConfirmCancellation}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {isCancelling ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    Yes, Cancel PO
                  </span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Purchase Order Receival */}
        <Dialog open={isRecDialogOpen} onOpenChange={setIsRecDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[100vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
                Confirm Purchase Order Receival
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Please verify the quantities received for each item in this purchase order.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    Order Items Summary
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {allSelectedItems.length} items • Total ordered: {allSelectedItems.reduce((sum, item) => sum + item.order_qty, 0)} units
                  </p>
                </div>

                <div className="w-full">
                  {/* Table Header */}
                  <div className="grid grid-cols-9 gap-4 bg-gray-50 p-4 border-b border-gray-200 font-semibold text-gray-900">
                    <div className="col-span-3">Item Name</div>
                    <div className="col-span-3 text-center">Ordered Quantity</div>
                    <div className="col-span-3 text-start">Received Quantity</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {allSelectedItems.map((item) => {
                      const recItem = receivedQuantities.find(recItem => recItem.itemId === item.id);
                      const recQty = recItem?.recQuantity ?? item.order_qty;
                      return (
                        <div
                          key={item.id}
                          className={`${(recQty >= 0 && recQty < item.order_qty) ? "bg-amber-200 hover:bg-amber-100 border-gray-500" : "bg-gray-50 hover:bg-gray-50"} grid grid-cols-9 gap-4 px-4 py-3 transition-colors font-medium`}
                        >
                          <div className="col-span-3 font-medium text-sm text-gray-900 flex items-center">
                            {item.item_name}
                          </div>
                          <div className="col-span-3 text-center text-sm flex items-center justify-center">
                            {item.order_qty}
                          </div>
                          <div className="col-span-3 text-center text-sm flex items-center justify-start">
                            <Input
                              type="number"
                              min="1"
                              placeholder="0"
                              value={recQty}
                              onChange={(e) => handleRecQuantityChange(item.id, Number(e.target.value))}
                              className="w-20 text-center border-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {(recQty >= 0 && recQty < item.order_qty) &&
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className='ps-4'>
                                      <ShieldAlert className="h-4 w-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Received quantity is less than ordered.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center pt-4 border-t border-gray-200">
              <DialogClose asChild>
                <Button variant="outline" className="px-6" onClick={() => setReceivedQuantities([])}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleConfirmReceival()}
              >
                <CheckCheck className="h-4 w-4" />
                Confirm Receival
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Purchase Order Issue */}
        <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogContent className="max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                Confirm Purchase Order Issue
              </DialogTitle>
              <DialogDescription className="text-gray-900 text-md font-semibold">
                Are you sure you want to issue this Purchase Order?
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center space-x-2 pb-2">
              {/* Tooltip Wrapper */}
              <div className="relative group flex items-center">
                <Checkbox
                  checked={isEmailAuthenticated ? notifySupplier : false}
                  onCheckedChange={() =>
                    notifySupplier ? setNotifySupplier(false) : setNotifySupplier(true)
                  }
                  disabled={!isEmailAuthenticated}
                  className="border-gray-300 text-blue-600 cursor-pointer focus:ring-blue-500 disabled:cursor-not-allowed me-1"
                />
                <Label className="text-xs text-gray-700">
                  Notify Supplier via Email upon Issuing PO
                </Label>

                {/* Tooltip */}
                {!isEmailAuthenticated && (
                  <div className="absolute left-0 top-8 z-10 hidden w-52 rounded-md bg-gray-800 text-white text-xs px-2 py-1 group-hover:block shadow-md">
                    Company email is not authenticated. Please authenticate before enabling this option.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center">
              <DialogClose asChild>
                <Button variant="outline" className="px-6">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleConfirmIssuePO()}
                disabled={isIssuing}
              >
                {isIssuing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Issuing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Confirm
                  </span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;