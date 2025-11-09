import { useState, useEffect } from "react"; // React core and hooks for component state & lifecycle
import { useNavigate, useParams } from "react-router-dom"; // Routing utilities: navigation and URL params
import { useForm, Controller, FieldError } from "react-hook-form"; // Form management: validation, control, watch, etc.
import { ArrowUpRight, Download, Paperclip, Printer } from "lucide-react";

// UI components from your design system (likely shadcn/ui)
import { Input } from "@/components/ui/input"; // Text input field
import { Label } from "@/components/ui/label"; // Label for form fields
import { Button } from "@/components/ui/button"; // Clickable button
import { Textarea } from "@/components/ui/textarea"; // Multi-line text input
import { Checkbox } from "@/components/ui/checkbox"; // Checkbox input
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Card container components for grouping UI

// Supabase client for talking to your backend/database
import { supabase } from "@/Utils/types/supabaseClient";

// Date formatting helper
import { format } from "date-fns"; // Used to format JS Date objects into strings

// Icons from lucide-react for visual cues
import {
  SquareChartGantt,
  Package,
  Mail,
  ArrowLeft,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  CalendarCheck2,
  Tally5,
  FolderPen,
  ChartNoAxesCombined,
  Calendar1,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectUser } from "@/redux/features/userSlice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ISystemMessageConfig, IWorkflowConfig } from "@/Utils/constants";
import generatePurchaseReturnPDF from "./PurchaseReturnPrintTemplate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/Utils/formatters";

// Represents a single supply item
interface Supply {
  unit_price: any;
  order_price: any;
  id: string;
  name: string;
  description: string;
  price: number;
  brand_id: string;
  orderQty?: number;
  receivedQty?: number;
  return_qty?: number;
  return_reason?: string; // Optional reason for return, if applicable
  item_id?: string; // Optional item ID if needed for submission
  order_qty?: number; // Quantity ordered, if applicable
}

// Structure expected by react-hook-form for the entire form
interface FormValues {
  returnRequestNumber: string;
  returnStatus: string;
  createdDate: string;
  linkedPONumber: string;
  supplierName: string;
  supplierEmail: string;
  supplierAddress: string;
  originalPODate: string;
  remarks: string;
  purchaseOrderId: string;
  createdBy: string;
  totalItems?: number | null;
  totalValue?: number | null;
  selectedSupplies: Supply[];
  supplier_id: string | null;
  returnDate?: string;
  companyId: string;

  // 🔽 Add these for file uploads
  image_1?: File | null;
  image_2?: File | null;
  attachment?: File | null;
}

interface ApprovalStatus {
  status: string;
  trail: string;
  role_id: string | null;
  sequence_no: number;
  isFinalized: boolean;
  approvedBy: string;
  date: string;
  comment: string;
}


// --- Main Component ---
const ReturnForm = () => {
  const navigate = useNavigate(); // Function to programmatically navigate routes
  const { id } = useParams<{ id?: string }>(); // Extract `id` param from URL if present
  const isEdit = Boolean(id) && location.pathname.includes('edit');
  const isView = Boolean(id) && location.pathname.includes('view');
  const userData = useSelector(selectUser);
  const companyId = userData?.company_id;

  // --- Local UI / data state ---
  const [supplies, setSupplies] = useState<Supply[]>([]); // All supplies fetched based on PO number search
  const [searchTerm, setSearchTerm] = useState<string>(""); // Term used to filter supplies in dropdown
  const [showSuppliesDropdown, setShowSuppliesDropdown] =
    useState<boolean>(false); // Controls visibility of supply dropdown
  const [selectedSupplies, setSelectedSupplies] = useState<Supply[]>([]); // Confirmed selected supplies for return
  const [tempSelectedSupplies, setTempSelectedSupplies] = useState<string[]>(
    []
  ); // Intermediate selection (before confirmation)
  const [confirmedSupplyIds, setConfirmedSupplyIds] = useState<string[]>([]); // Stable, user-confirmed selection for count badge
  const [isSelectedSuppliesExpanded, setIsSelectedSuppliesExpanded] =
    useState<boolean>(false); // UI state (e.g., expand/collapse)
  const [poNumbers, setPoNumbers] = useState<string[]>([]); // List of valid PO numbers fetched initially
  const [supplierName, setSupplierName] = useState<string | null>(null); // Supplier name from linked PO
  const [supplierEmail, setSupplierEmail] = useState<string | null>(null); // Supplier email
  const [supplierAddress, setSupplierAddress] = useState<string | null>(null); // Supplier address
  const [supplierId, setSupplierId] = useState<string | null>(null); 
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>(""); // Used to search for supplies via PO number
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const { id: returnRequestId } = useParams<{ id: string }>();
  const [originalPODate, setOriginalPODate] = useState("");
  const [returnQtyErrors, setReturnQtyErrors] = useState<Record<string, string>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  // show preview URL or filename
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null); 

  // original attachment metadata loaded from DB (so we can keep track)
  const [existingAttachment, setExistingAttachment] = useState<any | null>(null);

  // flag to indicate user wants to remove the existing uploaded attachment
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  // @ts-ignore 
  const [orderDetailsByItemId, setOrderDetailsByItemId] = useState<
    Record<string, { order_qty: number; received_qty: number }>
  >({});

  const [systemMsgConfig, setSystemMsgConfig] = useState<ISystemMessageConfig[]>([]);
  const [workflowConfig, setWorkflowConfig] = useState<IWorkflowConfig | null>(null);
  const statusApprovalPending = systemMsgConfig.find(config => config.sub_category_id === "APPROVAL_PENDING");
  const statusApprovalCompleted = systemMsgConfig.find(config => config.sub_category_id === "APPROVER_COMPLETED");
  const statusCreated = systemMsgConfig.find(config => config.sub_category_id === "ORDER_RETURN_CREATED");
  const [returnStatus, setReturnStatus] = useState<ISystemMessageConfig>();
  const [currentWorkflow, setCurrentWorkflow] = useState<IWorkflowConfig>();
  const [currentApprovalStatus, setCurrentApprovalStatus] = useState<ApprovalStatus | undefined>();
  const [reasonErrors, setReasonErrors] = useState<Record<string, string>>({});
  const [alreadyReturnedMap, setAlreadyReturnedMap] = useState<Record<string, number>>({});
  const [purchaseReturnForPrint, setPurchaseReturnForPrint] = useState<any | null>(null);
  const [originalReturnQuantities, setOriginalReturnQuantities] = useState<Record<string, number>>({});

  const isResubmitting = isEdit && returnStatus?.sub_category_id === 'ORDER_RETURN_CREATED';

  // --- react-hook-form setup ---
  const {
    control, // Used for controlled inputs (e.g., via Controller)
    handleSubmit, // Wraps onSubmit to handle validation
    watch, // Observe specific form fields
    setValue,
    reset, // Manually set form values (used for populating from effects)
    formState: { errors, isDirty }, // Validation errors
  } = useForm<FormValues>({
    defaultValues: {
      returnRequestNumber: "", // Will be generated if new
      returnStatus: "", // Default status
      createdDate: format(new Date(), "yyyy-MM-dd"), // Today's date in YYYY-MM-DD
      linkedPONumber: "", // To be filled by user/select
      supplierName: "", // Autofilled when PO is watched
      supplierEmail: "",
      supplierAddress: "",
      originalPODate: "",
      remarks: "",
      selectedSupplies: [], // Empty to start
    },
  }); // Closing the configuration object and function call

  useEffect(() => {
    if (isEdit || isView) return;

    if (!selectedPoNumber || !searchTerm.trim() || searchTerm.trim().length < 3) {
      setSupplies([]);
      setShowSuppliesDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await (supabase.rpc as any)(
          "get_item_names_by_po_number",
          { po_number_input: selectedPoNumber.trim() }
        );

        if (error || !Array.isArray(data)) {
          console.error("RPC error or invalid data:", error);
          setSupplies([]);
          setShowSuppliesDropdown(false);
          return;
        }

        const mapped = data.map((itm: any, index: number) => {
          const itemId = itm.item_id || itm.id;

          if (!itemId) {
            console.warn(
              `⚠️ No valid item_id found for item at index ${index}:`,
              itm
            );
          }

          return {
            id: itemId || `fallback-${index}`,
            item_id: itemId, // ✅ Ensure this is always set
            name: itm.item_name || `Unnamed Item ${index + 1}`,
            description: itm.description || "",
            price: itm.price || 0,
            brand_id: itm.brand_id || "",
            unit_price: itm.unit_price ?? itm.price ?? 0,
            order_price: itm.order_price ?? 0,
            return_qty: 0,
            return_reason: "",
          };
        });

        console.log("✅ Mapped supplies:", mapped);
        setSupplies(mapped);
        setShowSuppliesDropdown(true);
      } catch (err) {
        console.error("⚠️ RPC fetch error:", err);
        setSupplies([]);
        setShowSuppliesDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isEdit, isView, searchTerm]);

  // System Message Config
  useEffect(() => {
    const fetchSystemMessageConfig = async () => {
      if (!companyId) return;

      try {
        const { data, error } = await supabase
          .from('system_message_config')
          .select('*')
          .eq("company_id", companyId)
          .eq("category_id", 'PURCHASE_ORDER_RETURN');

        if (error) throw error;

        if (data.length > 0) {
          setSystemMsgConfig(data);
          const statusCreated = data.find(config => config.sub_category_id === "ORDER_RETURN_CREATED");
          const statusApprovalPending = data.find(config => config.sub_category_id === "APPROVAL_PENDING");
          const statusApprovalCompleted = data.find(config => config.sub_category_id === "APPROVER_COMPLETED");

          if (!statusCreated || !statusApprovalPending || !statusApprovalCompleted) {
            console.error('Missing ORDER_CREATED, APPROVAL_PENDING or APPROVER_COMPLETED in system_message_config');
            toast.error('Status configuration is incomplete', { position: "top-center" });
            return;
          }

          if (!isEdit && !isView) {
            const defaultStatusId = workflowConfig ? statusApprovalPending.id : statusApprovalCompleted.id;
            setValue("returnStatus", defaultStatusId);
          }
        } else {
          console.error('No system message config found for PURCHASE_ORDER');
          toast.error('Failed to load status configuration', { position: "top-center" });
        }
      } catch (error) {
        console.error('Error fetching system message config:', error);
        // toast.error('Failed to fetch status configuration', { position: "top-center" });
      }
    };

    fetchSystemMessageConfig();
  }, [setValue, workflowConfig, companyId]);

  // Fetch workflow config
    useEffect(() => {
      if (!companyId) return;
  
      const fetchWorkflowConfig = async () => {
        try {
          const { data, error } = await supabase
            .from("workflow_config")
            .select("*")
            .eq('company_id', companyId)
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

  useEffect(() => {
    if (!selectedPOId || !inventoryList.length) return;
    const fetchAlreadyReturned = async () => {
      const map: Record<string, number> = {};

      for (const item of inventoryList) {
        const qty = await getAlreadyReturnedQty(selectedPOId, item.item_id);
        map[String(item.item_id)] = qty;
      }

      setAlreadyReturnedMap(map);
    };

    fetchAlreadyReturned();
  }, [selectedPOId, inventoryList]);

  useEffect(() => {
    if (!isEdit) {
      setOriginalReturnQuantities({});
    }
  }, [isEdit]);

  useEffect(() => {
    if (!returnRequestId) return;

    const fetchPurchaseReturnToPrint = async () => {
      try {
        // Fetch purchase_return along with supplier info and return status
        const { data: returnData, error: returnError } = await supabase
          .from("purchase_return")
          .select(`id, purchase_retrun_number, return_date, total_items, total_value, remark, return_status, supplier_id,
          supplier_mgmt (supplier_name, email, address),
          system_message_config!purchase_return_return_status_fkey (sub_category_id)
        `)
          .eq("id", returnRequestId)
          .single();

        if (returnError) throw returnError;
        if (!returnData) throw new Error("Purchase return not found");

        // Fetch purchase_return_items along with item_mgmt
        const { data: itemsData, error: itemsError } = await supabase
          .from("purchase_return_items")
          .select(`id, returned_qty, order_price, item_id, remarks, return_reason,
          item_mgmt (item_name, description)
        `)
          .eq("purchase_return_id", returnRequestId)
          .order("id", { ascending: true });

        if (itemsError) throw itemsError;

        // Map items to ReturnItem[]
        const items: any[] = (itemsData || []).map(item => ({
          returned_qty: item.returned_qty,
          order_price: item.order_price,
          return_reason: item.return_reason,
          item_mgmt: {
            item_name: item.item_mgmt?.item_name || "N/A",
            description: item.item_mgmt?.description || ""
          }
        }));

        // Map supplier
        const supplier: any | null = returnData.supplier_mgmt
          ? {
            supplier_name: returnData.supplier_mgmt.supplier_name,
            email: returnData.supplier_mgmt.email,
            address: returnData.supplier_mgmt.address
          }
          : null;

        // Use sub_category_id as status
        const status = returnData.system_message_config?.sub_category_id.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: any) => c.toUpperCase()) || "UNKNOWN";

        // Final purchase return object
        const finalReturn: any = {
          purchase_retrun_number: returnData.purchase_retrun_number,
          return_date: returnData.return_date,
          total_items: returnData.total_items,
          total_value: returnData.total_value,
          status,
          remarks: returnData.remark,
          supplier,
          items
        };

        setPurchaseReturnForPrint(finalReturn);
      } catch (err: any) {
        console.error("Error fetching purchase return:", err);
      }
    };

    fetchPurchaseReturnToPrint();
  }, [returnRequestId]);

  // Get already returned qty of the item
  const getAlreadyReturnedQty = async (
    purchaseOrderId: string,
    itemId: string
  ): Promise<number> => {
    if (!purchaseOrderId || !itemId) return 0;

    try {
      // Get all return requests for the purchase order
      const { data: returnRequests, error: returnRequestsError } = await supabase
        .from("purchase_return")
        .select("id")
        .eq("purchase_order_id", purchaseOrderId);

      if (returnRequestsError) throw returnRequestsError;
      if (!returnRequests?.length) return 0;

      const returnIds = returnRequests.map((r) => r.id);

      // Get all returned items for these return requests matching the item_id
      const { data: returnedItems, error: returnedItemsError } = await supabase
        .from("purchase_return_items")
        .select("returned_qty")
        .in("purchase_return_id", returnIds)
        .eq("item_id", itemId);

      if (returnedItemsError) throw returnedItemsError;
      if (!returnedItems?.length) return 0;

      // Total returned_qty
      const totalReturnedQty = returnedItems.reduce(
        (sum, item) => sum + (item.returned_qty || 0),
        0
      );

      return totalReturnedQty;
    } catch (error) {
      console.error("Error fetching returned quantity:", error);
      return 0;
    }
  };

  // --- Filtered view of supplies for type-ahead / search inside dropdown ---
  const filteredSupplies = supplies.filter(
    (supply) =>
      supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supply.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Supply selection logic (temporary + confirm) ---
  const handleSupplyToggle = (supply: Supply) => {
    // Toggle selection of a supply in temp storage before confirmation
    if (tempSelectedSupplies.includes(supply.id)) {
      setTempSelectedSupplies(
        tempSelectedSupplies.filter((id) => id !== supply.id)
      );
    } else {
      setTempSelectedSupplies([...tempSelectedSupplies, supply.id]);
    }
  };

  const handleConfirmSupplies = () => {
    const newSelectedSupplies = supplies.filter(
      (s) =>
        tempSelectedSupplies.includes(s.id) ||
        selectedSupplies.some((sel) => sel.id === s.id)
    );

    setSelectedSupplies(newSelectedSupplies);
    setValue("selectedSupplies", newSelectedSupplies); 
    setConfirmedSupplyIds(newSelectedSupplies.map((s) => s.id));

    // Clear temp selected, search value and close dropdown
    setTempSelectedSupplies([]);
    setShowSuppliesDropdown(false);
    setSearchTerm('');
    setIsSelectedSuppliesExpanded(true)
  };

  console.log("Selected supplies =>", watch().selectedSupplies);

  // --- Reusable error message display component ---
  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null; // Nothing to show if no message
    return (
      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" /> {/* Icon to indicate error */}
        {message}
      </p>
    );
  };

  // --- Today's date (used in submission or defaults) ---
  const today = format(new Date(), "yyyy-MM-dd");

  // --- Fetch list of valid purchase orders on initial mount ---
  useEffect(() => {
    const fetchFilteredPOs = async () => {
      try {
        // Query for active purchase orders with specific statuses
        const { data, error } = await supabase
          .from("purchase_order")
          .select(
            `
            po_number,
            created_at,
            order_status:system_message_config!inner(sub_category_id)
          `
          )
          .eq("is_active", true)
          .eq('company_id', userData?.company_id!)
          .in("order_status.sub_category_id", [
            "ORDER_RECEIVED",
            "ORDER_PARTIALLY_RECEIVED",
          ]);

        if (error) throw error;

        // Extract PO numbers safely
        const poList = (data ?? [])
          .map((r: any) => r.po_number)
          .filter((po: any) => typeof po === "string");

        setPoNumbers(poList); // Store available PO numbers
      } catch (err) {
        console.error(err); // Log failure
      }
    };

    fetchFilteredPOs(); // Trigger fetch once
  }, []); // Empty deps: run only on mount

  // --Merged UseEffect--
  // --- Watch the linked purchase order number to auto-populate supplier info ---
  const watchedPONumber = watch("linkedPONumber"); // React-hook-form watcher

  const fetchAllData = async (poNumber: string) => {
  console.log("🔄 Starting fetchAllData for PO number:", poNumber);
  if (!poNumber) {
    console.warn("⚠️ No PO number provided, aborting fetchAllData");
    return;
  }

  // helper to normalize rpc responses (Supabase RPC sometimes returns { data: [...] } or just [...])
  const normalizeRpc = (res: any) => {
    if (!res) return null;
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    // some rpc wrapper returns [{ data: [...] }]
    if (Array.isArray(res) && res[0]?.data && Array.isArray(res[0].data)) return res[0].data;
    return null;
  };

  try {
    // 1️⃣ Get PO metadata
    const { data: poMeta, error: poMetaError } = await supabase
      .from("purchase_order")
      .select("id, supplier_id, order_date")
      .eq("po_number", poNumber)
      .single();
    console.log("📄 Fetched purchase_order meta:", poMeta, poMetaError);
    if (poMetaError || !poMeta?.id) {
      console.error("❌ Could not fetch PO ID for RPC:", poMetaError);
      return;
    }

    setSelectedPOId(poMeta.id);
    // 2️⃣ Populate original PO date
    if (poMeta.order_date) {
      console.log("📅 Setting originalPODate to:", poMeta.order_date);
      setOriginalPODate(poMeta.order_date);
      // make sure key matches your form's field name
      setValue("originalPODate", poMeta.order_date);
    }

    // 3️⃣ Fetch inventory & PO items in parallel
    console.log("🔍 Fetching consolidated inventory and PO items...");
    const [inventoryRaw, itemsResponse] = await Promise.all([
      // keep typing as any because rpc is flexible
      (supabase.rpc as any)("get_consolidated_inventory", {
        po_id: poMeta.id,
        search_query: null,
      }),
      (supabase.rpc as any)("get_purchase_order_items", {
        p_po_number: poNumber,
      }),
    ]);

    console.log("📦 Inventory RPC response (raw):", inventoryRaw);
    console.log("🧾 Items RPC response (raw):", itemsResponse);

    const inventoryData = normalizeRpc(inventoryRaw) as
      | {
          item_id: string;
          item_name: string;
          total_quantity: number;
          received_qty: number;
        }[]
      | null;

    const itemsData = normalizeRpc(itemsResponse) as
      | {
          unit_price: any;
          order_price: any;
          item_name: string;
          order_qty: number;
          received_qty: number;
          description?: string;
          price?: number;
          brand_id?: string;
        }[]
      | null;

    // 4️⃣ Fetch supplier info
    if (poMeta.supplier_id) {
      const { data: supData, error: supError } = await supabase
        .from("supplier_mgmt")
        .select("supplier_name, email, address, supplier_id")
        .eq("id", poMeta.supplier_id)
        .single();
      if (!supError && supData) {
        setSupplierName(supData.supplier_name);
        setSupplierEmail(supData.email);
        setSupplierAddress(supData.address);
        setSupplierId(supData.supplier_id);
      }
    }

    // 5️⃣ Set raw inventory list for the table
    if (inventoryData && Array.isArray(inventoryData)) {
      console.log("🔧 Setting inventoryList:", inventoryData);
      setInventoryList(inventoryData);
    } else {
      console.warn("⚠️ No inventoryData returned");
      setInventoryList([]); // keep state predictable
    }

    // 6️⃣ Build selectedSupplies with all required fields
    if (Array.isArray(itemsData) && Array.isArray(inventoryData)) {
      console.log("🔨 Building availableSupplies from itemsData & inventoryData");
      const itemMap: Record<string, { order_qty: number; received_qty: number }> = {};
      const availableSupplies: Supply[] = [];

      // 6.1️⃣ Map item_name → item_id
      const inventoryMap: Record<string, string> = {};
      inventoryData.forEach((inv) => {
        if (inv?.item_name && inv?.item_id) {
          inventoryMap[inv.item_name] = inv.item_id;
        }
      });

      console.log("🔗 inventoryMap:", inventoryMap);

      // 6.2️⃣ For each PO item, look up its inventory ID
      itemsData.forEach((itm, idx) => {
        const name = itm?.item_name || `Unknown Item ${idx + 1}`;
        const item_id_from_inventory = inventoryMap[name];
        if (!item_id_from_inventory) {
          console.warn(`⚠️ item_id not found for "${name}" — skipping this PO item`);
          return;
        }

        // record order/received for table (use safe defaults)
        itemMap[item_id_from_inventory] = {
          order_qty: typeof itm.order_qty === "number" ? itm.order_qty : 0,
          received_qty: typeof itm.received_qty === "number" ? itm.received_qty : 0,
        };

        // build Supply (match your Supply interface)
        availableSupplies.push({
          id: item_id_from_inventory,
          item_id: item_id_from_inventory,
          name,
          description: itm.description || "",
          price: typeof itm.price === "number" ? itm.price : 0,
          brand_id: itm.brand_id || "",
          unit_price: typeof itm.unit_price === "number" ? itm.unit_price : (typeof itm.price === "number" ? itm.price : 0),
          order_price: typeof itm.order_price === "number" ? itm.order_price : 0,
          return_qty: 0,
          return_reason: "",
        });
      });

      console.log("✅ Built availableSupplies:", availableSupplies);
      console.log("🗺️ itemMap:", itemMap);

      // 6.3️⃣ Sync to state & form
      setSelectedSupplies(availableSupplies);
      setValue("selectedSupplies", availableSupplies, {
        shouldDirty: !isEdit && !isView,
        shouldTouch: !isEdit && !isView,
      });
      if (!isEdit && !isView) {
        setConfirmedSupplyIds(availableSupplies.map((s) => s.id));
      }
      setOrderDetailsByItemId(itemMap);
    } else {
      console.warn(
        "⚠️ itemsData or inventoryData not arrays, skipping supplies build"
      );
      // keep consistent state
      setSelectedSupplies([]);
      setValue("selectedSupplies", [], {
        shouldDirty: !isEdit && !isView,
        shouldTouch: !isEdit && !isView,
      });
      setOrderDetailsByItemId({});
    }
  } catch (err) {
    console.error("❌ Error in fetchAllData:", err);
  }
};

  // Trigger on PO change
  // ✅ Fetch fresh data on PO change
  useEffect(() => {
    if (watchedPONumber) {
      console.log(
        "🔁 PO number changed, fetching all related data for:",
        watchedPONumber
      );
      fetchAllData(watchedPONumber);
    }
  }, [watchedPONumber]);

  // ✅ Handle edit mode population
  useEffect(() => {
  if (!returnRequestId || !companyId) return;

  const fetchEditData = async () => {
    try {
      // 1️⃣ Fetch the main return request
      const { data: returnData, error: returnError } = await supabase
        .from("purchase_return")
        .select("*, purchase_order_id")
        .eq("id", returnRequestId)
        .eq("is_active", true)
        .single();

      if (returnError || !returnData) {
        console.error("❌ Failed to fetch return request:", returnError);
        return;
      }

      setSelectedPOId(returnData.purchase_order_id);

      // 1.1️⃣ Get linked PO number
      let poNumber: string | undefined;
      if (returnData.purchase_order_id) {
        const { data: poData, error: poError } = await supabase
          .from("purchase_order")
          .select("po_number")
          .eq("id", returnData.purchase_order_id)
          .single();

        if (poError) {
          console.error("❌ Failed to fetch PO number:", poError);
        } else {
          poNumber = poData?.po_number ?? undefined;
        }
      }

      setCurrentApprovalStatus(
        (Array.isArray(returnData.approval_status)
          ? returnData.approval_status.at(-1)
          : returnData.approval_status) as ApprovalStatus | undefined
      );

      const [returnStatusData, workflowConfigData] = await Promise.all([
        supabase.from("system_message_config").select("*").eq('company_id', companyId).eq("category_id", 'PURCHASE_ORDER_RETURN'),
        supabase.from("workflow_config").select("*").eq('company_id', companyId).eq("process_name", "Purchase Return Request"),
      ])

      if (returnStatusData.error) throw returnStatusData.error;
      if (workflowConfigData.error) throw workflowConfigData.error;

      const currentWorkflowConfig = workflowConfigData.data?.find((config) => config.id === returnData.workflow_id);
      setCurrentWorkflow(currentWorkflowConfig);

      const returnStatus = returnStatusData.data?.find((status) => status.id === returnData.return_status);
      setReturnStatus(returnStatus);


      // 2️⃣ Reset form fields
      reset({
        linkedPONumber: poNumber ?? "",
        returnStatus: returnData.return_status ?? '',
        returnRequestNumber: returnData.purchase_retrun_number,
        remarks: returnData.remark ?? "",
        createdDate: returnData.created_at?.slice(0, 10) ?? today,
        returnDate: returnData.return_date?.slice(0, 10) ?? today,
      });

      // --- Hydrate attachment preview & metadata (edit mode) ---
      try {
        if (returnData.attachment) {
          let parsed: any = returnData.attachment;
          if (typeof parsed === "string") {
            // could be a JSON string or plain URL
            try {
              parsed = JSON.parse(parsed);
            } catch {
              // keep as string (legacy plain URL or filename)
            }
          }

          // store parsed metadata (object) or plain string
          setExistingAttachment(parsed ?? null);
          setRemoveExistingAttachment(false);

          // prefer explicit url in metadata
          if (parsed && typeof parsed === "object" && parsed.url && typeof parsed.url === "string") {
            setAttachmentPreview(parsed.url);
          } else if (parsed && typeof parsed === "object" && parsed.path && typeof parsed.path === "string") {
            // generate public url from stored path if available
            try {
              const { data: publicUrlData } = supabase.storage
                .from("return-files")
                .getPublicUrl(parsed.path);
              const publicUrl = (publicUrlData as any)?.publicUrl ?? (publicUrlData as any)?.publicURL ?? null;
              setAttachmentPreview(publicUrl);
            } catch (err) {
              console.error("Failed to generate public URL from path:", err);
              setAttachmentPreview(null);
            }
          } else if (typeof parsed === "string" && parsed.startsWith("http")) {
            // legacy plain URL
            setAttachmentPreview(parsed);
          } else {
            setAttachmentPreview(null);
          }

          // we don't want the DB-stored attachment to be treated as a local File
          // ensure form field is null (user can upload a fresh file to replace)
          setValue("attachment", null, { shouldDirty: false });
        } else {
          // no attachment in DB
          setExistingAttachment(null);
          setAttachmentPreview(null);
          setRemoveExistingAttachment(false);
          setValue("attachment", null, { shouldDirty: false });
        }
      } catch (err) {
        console.error("Failed to hydrate attachment preview:", err);
        setExistingAttachment(null);
        setAttachmentPreview(null);
        setRemoveExistingAttachment(false);
        setValue("attachment", null, { shouldDirty: false });
      }

      // ✅ Fetch full related data
      if (poNumber) {
        await fetchAllData(poNumber);
      }

      // 3️⃣ Supplier info
      if (returnData.supplier_id) {
        const { data: supData, error: supError } = await supabase
          .from("supplier_mgmt")
          .select("supplier_name, email, address")
          .eq("id", returnData.supplier_id)
          .single();

        if (!supError && supData) {
          setSupplierName(supData.supplier_name ?? "");
          setSupplierEmail(supData.email ?? "");
          setSupplierAddress(supData.address ?? "");
          setValue("supplierName", supData.supplier_name ?? "");
          setValue("supplierEmail", supData.email ?? "");
          setValue("supplierAddress", supData.address ?? "");
        }
      }

      // 4️⃣ Fetch inventory list for this PO
      const { data: invRes, error: invErr } = await supabase.rpc(
        "get_consolidated_inventory" as any,
        {
          po_id: returnData.purchase_order_id,
          search_query: null,
        }
      );

      if (invErr) {
        console.error("❌ Failed to fetch inventory for edit:", invErr);
      } else {
        console.log("📦 Inventory from edit fetch:", invRes?.[0]);
      }

      // 5️⃣ Fetch return items
      const { data: returnItems, error: returnItemsError } = await supabase
        .from("purchase_return_items")
        .select("*")
        .eq("purchase_return_id", returnRequestId)
        .eq("is_active", true);

      if (returnItemsError || !returnItems) {
        console.error("❌ Failed to fetch return items:", returnItemsError);
        return;
      }

      const initialQuantities: Record<string, number> = {};
      returnItems.forEach((item: any) => {
        if (item.item_id && item.returned_qty) {
          initialQuantities[item.item_id] = item.returned_qty;
        }
      });
      setOriginalReturnQuantities(initialQuantities);

      // 6️⃣ Merge inventory with return items
      const editedSupplies: Supply[] = returnItems.map((ri: any) => {
        const inv = (invRes || []).find(
          (i: any) => String(i.item_id) === ri.item_id
        );

        return {
          id: ri.item_id,
          item_id: ri.item_id,
          name: inv?.item_name ?? `Unknown Item (${ri.item_id})`,
          description: "",
          unit_price: typeof ri.unit_price === "number" ? ri.unit_price : ri.order_price ?? 0,
          order_price: typeof ri.order_price === "number" ? ri.order_price : 0,
          price: ri.order_price,
          brand_id: "",
          orderQty: inv?.total_quantity ?? 0,
          receivedQty: inv?.received_qty ?? 0,
          return_qty: ri.returned_qty,
          return_reason: ri.return_reason ?? "",
        };
      });

      console.log("🛠️ Mapped edited supplies:", editedSupplies);
      setSelectedSupplies(editedSupplies);
      setValue("selectedSupplies", editedSupplies, {
        shouldDirty: false,
        shouldTouch: false,
      });
      setConfirmedSupplyIds(editedSupplies.map((s) => s.id));
      setIsSelectedSuppliesExpanded(true)
    } catch (err) {
      console.error("❌ Error in edit fetch:", err);
    }
  };

  fetchEditData();
}, [returnRequestId, systemMsgConfig, companyId]);

const extractStoragePathFromPublicUrl = (url: string, bucket = "return-files"): string | null => {
  try {
    console.log("Extracting from URL:", url);
    const u = new URL(url);
    const pathname = u.pathname;
    console.log("Pathname:", pathname);
    
    // Try multiple patterns that Supabase might use
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/object/public/${bucket}/`,
      `/${bucket}/`,
    ];
    
    for (const pattern of patterns) {
      const idx = pathname.indexOf(pattern);
      if (idx !== -1) {
        const extracted = decodeURIComponent(pathname.slice(idx + pattern.length));
        console.log("Extracted path:", extracted);
        return extracted;
      }
    }
    
    console.log("No matching pattern found for pathname:", pathname);
    return null;
  } catch (e) {
    console.error("URL parsing error:", e);
    return null;
  }
};

  // detect if a URL or filename looks like an image
const isImageUrl = (u: string) => {
  if (!u) return false;
  if (u.startsWith("data:")) return true;
  try {
    const lower = u.toLowerCase();
    return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/.test(lower) || lower.includes("image/");
  } catch {
    return false;
  }
};

// call to clear the attachment both in form and local preview
  const handleRemoveAttachment = () => {
    console.log("Marking attachment for removal (UI only)");

    // Hide preview immediately
    setAttachmentPreview(null);
    setValue("attachment", null, { shouldDirty: true });

    // Mark that user wants to remove existing file after save
    setRemoveExistingAttachment(true);
  };

const uploadAttachmentToBucket = async (
  file: File,
  returnRequestNumber: string
): Promise<{ url: string; type: string; size: number; path: string }> => {
  const filePath = `${returnRequestNumber}/${Date.now()}_${file.name}`;

  try {
    // Upload the file to the "return-files" bucket
    const { error: uploadError } = await supabase.storage
      .from("return-files")   // 👈 hardcoded bucket name
      .upload(filePath, file);

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    // Generate public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from("return-files")   // 👈 same bucket
      .getPublicUrl(filePath);

    const publicUrl =
      (publicUrlData as any)?.publicUrl ??
      (publicUrlData as any)?.publicURL ??
      "";

    return {
      url: publicUrl,
      type: file.type,
      size: file.size,
      path: filePath,
    };
  } catch (err) {
    console.error("Error in uploadAttachmentToBucket:", err);
    throw err;
  }
};


// Utility: handle file selection & preview
const handleAttachmentChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setAttachmentPreview: React.Dispatch<React.SetStateAction<string | null>>,
  setFile: (file: File) => void
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Save the file in react-hook-form
  setFile(file);

  // Generate preview
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentPreview(reader.result as string); // data URL for <img>
    };
    reader.readAsDataURL(file);
  } else {
    setAttachmentPreview(file.name); // just show filename for docs/pdf
  }
};

  const validateBeforeSubmit = () => {
    const newReasonErrors: Record<string, string> = {};
    const newQtyErrors: Record<string, string> = {};

    // Filter out fallback items
    const validSupplies = selectedSupplies.filter((s) => s.item_id);
    validSupplies.forEach((s) => {
      const qty = Number(s.return_qty);

      // Empty or invalid qty
      if (isNaN(qty) || qty === 0) {
        newQtyErrors[s.item_id!] = "Return quantity is required";
      }
      // less than 1 qty
      else if (qty < 1) {
        newQtyErrors[s.item_id!] = "Must be at least 1";
      }

      // Reason required only if qty > 0
      if (qty > 0 && (!s.return_reason || s.return_reason.trim() === "")) {
        newReasonErrors[s.item_id!] = "Reason is required for returned items";
      }
    });

    setReturnQtyErrors(newQtyErrors);
    setReasonErrors(newReasonErrors);

    return (
      Object.keys(newQtyErrors).length === 0 &&
      Object.keys(newReasonErrors).length === 0
    );
  };


  // ✅ Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      // Validate before submit
      const isValid = validateBeforeSubmit();
      if (!isValid) {
        console.warn("Validation failed — check fields before submitting.");
        return;
      }

      // Build already returned map (for validation)
      const alreadyReturnedMap: Record<string, number> = {};
      if (selectedPOId) {
        for (const item of inventoryList) {
          alreadyReturnedMap[item.item_id] = await getAlreadyReturnedQty(selectedPOId, item.item_id);
        }
      }

      // Filter valid supplies
      const validSupplies = data.selectedSupplies.filter((s) => s.item_id);
      const errors: Record<string, string> = {};

      // Prevent invalid quantities in create mode
      if (!isEdit) {
        for (const supply of validSupplies) {
          const inventory = inventoryList.find(
            (item) => item.item_id === supply.item_id || item.item_id === supply.id
          );
          if (!inventory) continue;

          const itemId = supply.item_id || supply.id;
          const alreadyReturnedQty = alreadyReturnedMap[itemId] || 0;
          const returnableQty = inventory.total_quantity - alreadyReturnedQty;
          const returnQty = Number(supply.return_qty) || 0;

          if (returnQty > returnableQty) {
            errors[itemId] = `Cannot exceed returnable qty (${returnableQty})`;
          }
        }

        if (Object.keys(errors).length > 0) {
          setReturnQtyErrors(errors);
          return;
        }

        setReturnQtyErrors({});
      }

      const totalReturnValue = validSupplies.reduce(
        (total, s: any) => total + (Number(s.avg_unit_price) * Number(s.return_qty) || 0),
        0
      );

      const totalReturnQty = validSupplies.reduce(
        (total, s) => total + (Number(s.return_qty) || 0),
        0
      );

      // EDIT MODE
      if (isEdit && returnRequestId) {
        try {
          // Fetch current return request
          const { data: currentReturn, error: fetchError } = await supabase
            .from("purchase_return")
            .select("id, company_id, return_status, approval_status, workflow_id")
            .eq("id", returnRequestId)
            .single();

          if (fetchError || !currentReturn) {
            toast.error("Failed to fetch current return data.");
            return;
          }

          // Detect resubmission
          const isResubmitted = currentReturn.return_status === statusCreated?.id;

          // Upload new attachment if provided
          let attachmentMeta: { url: string; type: string; size: number; path: string } | null = null;
          if (data.attachment) {
            attachmentMeta = await uploadAttachmentToBucket(data.attachment, data.returnRequestNumber);
          }

          // Build update data
          const updateData: any = {
            remark: data.remarks,
            modified_at: new Date().toISOString(),
          };

          // Track if we need to delete old file later
          let deletedAttachmentPath: string | null = null;

          if (attachmentMeta) {
            // New file uploaded
            updateData.attachment = attachmentMeta;
          } else if (removeExistingAttachment) {
            // Mark DB field null
            updateData.attachment = null;

            if (existingAttachment?.path) {
              deletedAttachmentPath = existingAttachment.path;
            } else if (typeof existingAttachment === "string" && existingAttachment.startsWith("http")) {
              deletedAttachmentPath = extractStoragePathFromPublicUrl(existingAttachment, "return-files");
            } else if (existingAttachment?.url) {
              deletedAttachmentPath = extractStoragePathFromPublicUrl(existingAttachment.url, "return-files");
            }
          }

          // Handle RESUBMIT case
          if (isResubmitted) {
            // Fetch first workflow level
            const { data: prWorkflow, error: prWfError } = await supabase
              .from('workflow_config')
              .select('*')
              .eq('company_id', userData?.company_id ?? '')
              .eq('process_name', 'Purchase Return Request')
              .eq('is_active', true)
              .order('level', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (prWfError) {
              console.error('Error loading Purchase Return workflow:', prWfError);
            }

            const updatedApprovalStatus =
              prWorkflow && Array.isArray(currentReturn.approval_status)
                ? [
                  ...currentReturn.approval_status,
                  {
                    status: `Level ${prWorkflow.level} Approval Pending`,
                    trail: 'Pending',
                    role_id: prWorkflow.role_id,
                    sequence_no: currentReturn.approval_status.length,
                    isFinalized: false,
                    date: new Date().toISOString(),
                    comment: data.remarks || '',
                  },
                ]
                : currentReturn.approval_status;

            const totalAmountReturn = validSupplies.reduce((total, s: any) => total + (Number(s.unit_price) * Number(s.return_qty) || 0), 0);

            Object.assign(updateData, {
              return_status: statusApprovalPending?.id,
              approval_status: updatedApprovalStatus,
              workflow_id: prWorkflow?.id ?? currentReturn.workflow_id,
              next_level_role_id: prWorkflow?.role_id ?? null,
              total_items: totalReturnQty,
              total_value: totalAmountReturn,
            });
          }

          // Update DB
          const { error: updateError } = await supabase
            .from("purchase_return")
            .update(updateData)
            .eq("id", returnRequestId);

          if (updateError) {
            console.error("Failed to update return request:", updateError);
            return;
          }

          if (isResubmitted) {
            for (const item of validSupplies) {
              const { id, return_qty, return_reason, unit_price } = item;
              const order_price = (return_qty ?? 0) * (unit_price ?? 0);

              // Update the purchase return items
              await supabase
                .from("purchase_return_items")
                .update({
                  returned_qty: return_qty,
                  return_reason,
                  order_price,
                })
                .eq("purchase_return_id", returnRequestId)
                .eq("item_id", id);

              // Reduce inventory while resubmitting
              try {
                const { data: inventories, error: invError } = await supabase
                  .from("inventory_mgmt")
                  .select("id, item_qty, purchase_order_id")
                  .eq("purchase_order_id", selectedPOId!)
                  .eq("item_id", id);

                if (invError || !inventories || inventories.length === 0) continue;

                const inventory = inventories[0];
                const newQty = (inventory.item_qty ?? 0) - (return_qty ?? 0);

                await supabase
                  .from("inventory_mgmt")
                  .update({ item_qty: newQty })
                  .eq("id", inventory.id);

              } catch (invErr) {
                console.error(`Failed to update inventory for item ${id}:`, invErr);
              }
            }
          }

          // Delete the old file from storage only after successful save
          if (deletedAttachmentPath) {
            const { error: removeError } = await supabase.storage
              .from("return-files")
              .remove([deletedAttachmentPath]);

            if (removeError) {
              console.error("Failed to remove file from storage:", removeError);
            }
          }

          // Log system activity
          const systemLogs = {
            company_id: currentReturn.company_id,
            transaction_date: new Date().toISOString(),
            module: "Return Management",
            scope: "Edit",
            key: `${data.returnRequestNumber}`,
            log: isResubmitted
              ? `Purchase Return ${data.returnRequestNumber} resubmitted for approval.`
              : `Purchase Return ${data.returnRequestNumber} updated.`,
            action_by: userData?.id,
            created_at: new Date().toISOString(),
          };

          await supabase.from("system_log").insert(systemLogs);

          toast.success(isResubmitted ? "Return request resubmitted for approval." : "Return request updated successfully.");
          navigate("/dashboard/return-request", { state: { refresh: true } });
        } catch (err) {
          console.error("Unexpected error in edit mode:", err);
          toast.error("Unexpected error while updating. Please try again.");
        }

        return;
      }

      // CREATE MODE
      if (!data.linkedPONumber) {
        toast.error("Please select a purchase order.");
        return;
      }

      const { data: poData, error: poError } = await supabase
        .from("purchase_order")
        .select("id, supplier_id, created_by, company_id")
        .eq("po_number", data.linkedPONumber)
        .single();

      if (poError || !poData?.id) {
        toast.error("Failed to fetch purchase order ID.");
        return;
      }

      const purchaseOrderId = poData.id;
      const supplierId = poData.supplier_id;

      try {
        const filteredSupplies =
          validSupplies?.filter(
            (s) =>
              s.return_qty !== undefined &&
              s.return_qty !== null &&
              s.return_qty > 0 &&
              (s.item_id || s.id)
          ) || [];

        if (filteredSupplies.length === 0) {
          toast.error("Please return at least one valid item.");
          return;
        }

        // Upload attachment if provided
        let attachmentMeta: { url: string; type: string; size: number; path: string } | null = null;
        if (data.attachment) {
          attachmentMeta = await uploadAttachmentToBucket(data.attachment, data.returnRequestNumber);
        }

        // Fetch first workflow level
        const { data: prWorkflow, error: prWfError } = await supabase
          .from('workflow_config')
          .select('*')
          .eq('company_id', userData?.company_id ?? '')
          .eq('process_name', 'Purchase Return Request')
          .eq('is_active', true)
          .order('level', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (prWfError) {
          console.error('Error loading Purchase Return workflow:', prWfError);
        }

        // Build initial approval status for PR: Pending at Level 1 if workflow exists
        const initialApprovalStatus = prWorkflow ? [
          {
            status: `Level ${prWorkflow.level} Approval Pending`,
            trail: 'Pending',
            role_id: prWorkflow.role_id,
            sequence_no: 0,
            isFinalized: false,
            date: new Date().toISOString(),
            comment: data.remarks || '',
          },
        ] : [];

        // Insert into purchase_return
        const { data: inserted, error } = await supabase
          .from("purchase_return")
          .insert({
            return_date: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            purchase_retrun_number: data.returnRequestNumber,
            approval_status: initialApprovalStatus as any,
            created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            purchase_order_id: purchaseOrderId,
            total_items: totalReturnQty,
            total_value: totalReturnValue,
            remark: data.remarks,
            supplier_id: supplierId ?? undefined,
            company_id: userData?.company_id ?? null,
            created_by: userData?.id,
            attachment: attachmentMeta,
            return_status: data.returnStatus,
            ...(prWorkflow && { workflow_id: prWorkflow.id }),
            ...(prWorkflow && { next_level_role_id: prWorkflow.role_id }),
          })
          .select();

        if (error || !inserted?.[0]) {
          toast.error("Failed to save return.");
          return;
        }

        const returnId = inserted[0].id;

        // Insert return items (no inventory mutation yet)
        const itemsPayload = filteredSupplies.map((s: any) => ({
          purchase_return_id: returnId,
          item_id: s.item_id || s.id,
          returned_qty: s.return_qty || 0,
          return_reason: s.return_reason || "No reason provided",
          company_id: userData?.company_id ?? null,
          remarks: data.remarks,
          order_price: Number(s.return_qty || 0) * Number(s.avg_unit_price || 0),
        }));

        await supabase.from("purchase_return_items").insert(itemsPayload);

        // Decrease inventory immediately upon creation
        try {
          for (const item of itemsPayload) {
            const { data: inventories, error: invError } = await supabase
              .from("inventory_mgmt")
              .select("id, item_qty")
              .eq("purchase_order_id", purchaseOrderId)
              .eq("item_id", item.item_id);
            if (invError || !inventories || inventories.length === 0) continue;

            const inventory = inventories[0];
            const newQty = (inventory.item_qty ?? 0) - (item.returned_qty || 0);
            await supabase
              .from("inventory_mgmt")
              .update({ item_qty: newQty })
              .eq("id", inventory.id);
          }
        } catch (invErr) {
          console.error("Failed to decrease inventory on creation:", invErr);
        }

        // Create system log
        const systemLogs = {
          company_id: userData?.company_id,
          transaction_date: new Date().toISOString(),
          module: "Return Management",
          scope: "Add",
          key: `${data.returnRequestNumber}`,
          log: `Purchase Return ${data.returnRequestNumber} created.`,
          action_by: userData?.id,
          created_at: new Date().toISOString(),
        };

        const { error: systemLogError } = await supabase
          .from("system_log")
          .insert(systemLogs);

        if (systemLogError) throw systemLogError;

        toast.success("Return request created successfully.");
        navigate("/dashboard/return-request", { state: { refresh: true } });
      } catch (err) {
        console.error("Unexpected error:", err);
        toast.error("Unexpected error occurred. Please try again.");
      }
    } catch (err) {
      console.error("Error in form onSubmit function:", err);
      toast.error("Something went wrong. Please try again later.");
    }
  };


  useEffect(() => {
    const generateReturnNumber = async () => {
      if (!supplierId) return;

      // Today's date DDMMYY
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2, 4);
      const formattedDate = `${dd}${mm}${yy}`;

      // Supplier
      const formattedSupplier = supplierId.toUpperCase();

      const basePrefix = `RO-${formattedDate}-${formattedSupplier}`;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("purchase_return")
        .select("purchase_retrun_number")
        .ilike("purchase_retrun_number", `${basePrefix}%`)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      if (error) {
        console.error("Error fetching existing return numbers:", error.message);
        return;
      }

      const existingCount = data?.length || 0;
      const newSequence = existingCount + 1;

      return `${basePrefix}-${newSequence}`;
    };

    if (!isEdit && !isView) {
      (async () => {
        const autoNumber = await generateReturnNumber();
        if (autoNumber) {
          setValue("returnRequestNumber", autoNumber);
        }
      })();
    }
  }, [isEdit, isView, supplierId, setValue, supabase]);

  const selectedNames = new Set(selectedSupplies.map((s) => s.name));

  // Return current status to display on status input
  const getCurrentReturnStatus = () => {
    if (isEdit || isView) {
      if (returnStatus?.sub_category_id === "APPROVAL_PENDING") {
        return returnStatus?.value?.replace('{@}', `${currentWorkflow?.level || ''}`) || '';
      } else if (returnStatus?.sub_category_id === "APPROVER_COMPLETED" && currentApprovalStatus?.isFinalized) {
        return returnStatus?.value?.replace('{@} Return Approved', 'Purchase Return Approved') || '';
      } else if (returnStatus?.sub_category_id === "APPROVER_COMPLETED" && !currentApprovalStatus) {
        return returnStatus?.value?.replace('{@} Return Approved', 'Purchase Return Approved') || '';
      } else {
        return returnStatus?.value;
      }
    } else {
      return (workflowConfig
        ? statusApprovalPending?.value?.replace('{@}', `${workflowConfig?.level || ''}`) || ''
        : statusApprovalCompleted?.value?.replace('{@} Return Approved', 'Purchase Return Approved') || '');
    }
  };

  // Handling Return Quantity input change
  const handleReturnQtyChange = (
    item: any,
    e: React.ChangeEvent<HTMLInputElement>,
    alreadyReturnedQty: number = 0 
  ) => {
    const { item_id, total_quantity, unit_price = 0 } = item;
    const inputValue = e.target.value;
    const qty = parseInt(inputValue) || 0;

    let adjustedAlreadyReturnedQty = alreadyReturnedQty;
    if (isResubmitting) {
      const originalQty = originalReturnQuantities[item_id] || 0;
      adjustedAlreadyReturnedQty = alreadyReturnedQty - originalQty;
    }
    
    const returnableQty = total_quantity - adjustedAlreadyReturnedQty;

    // Validate quantity instantly
    if (inputValue && qty > returnableQty) {
      setReturnQtyErrors((prev) => ({
        ...prev,
        [item_id]: `Cannot exceed returnable qty (${returnableQty})`,
      }));
    } else if (inputValue && qty < 1) {
      setReturnQtyErrors((prev) => ({
        ...prev,
        [item_id]: "Must be at least 1",
      }));
    } else {
      setReturnQtyErrors((prev) => {
        const copy = { ...prev };
        delete copy[item_id];
        return copy;
      });
    }

    // Update selected supplies
    const updated = [...selectedSupplies];
    const idx = updated.findIndex((s) => s.item_id === item_id || s.id === item_id);

    if (idx !== -1) {
      updated[idx] = {
        ...updated[idx],
        return_qty: qty,
        order_price: qty * (updated[idx].unit_price ?? unit_price ?? 0), 
      };
    } else {
      updated.push({
        ...item,
        id: item_id,
        item_id,
        unit_price,
        return_qty: qty,
        return_reason: "",
        order_price: qty * unit_price,
      });
    }

    setSelectedSupplies(updated);
    setValue("selectedSupplies", updated, { shouldDirty: true, shouldTouch: true });
  };

  // Handling Reason select change
  const handleReasonChange = (item: any, e: React.ChangeEvent<HTMLSelectElement>) => {
    const { item_id } = item;
    const reason = e.target.value;

    const updated = [...selectedSupplies];
    const idx = updated.findIndex((s) => s.item_id === item_id || s.id === item_id);

    if (idx !== -1) {
      updated[idx].return_reason = reason;
    } else {
      updated.push({
        ...item,
        id: item_id,
        item_id: item_id,
        return_qty: 0,
        return_reason: reason,
      });
    }

    // Validate reason required if return_qty > 0
    const currentQty = updated.find((s) => s.item_id === item_id)?.return_qty || 0;
    if (currentQty > 0 && reason.trim() === "") {
      setReasonErrors((prev) => ({
        ...prev,
        [item_id]: "Reason is required for returned items",
      }));
    } else {
      setReasonErrors((prev) => {
        const copy = { ...prev };
        delete copy[item_id];
        return copy;
      });
    }

    setSelectedSupplies(updated);
    setValue("selectedSupplies", updated, { shouldDirty: true, shouldTouch: true });
  };

  // Print return request
  const handlePrint = () => {
    if (!purchaseReturnForPrint || !userData) return;
    generatePurchaseReturnPDF(purchaseReturnForPrint, userData);
  };

  // Function to generate PDF
  const generatePDF = (purchaseReturn: any, userData: any) => {
    if (!purchaseReturn || !userData) return;

    const doc = new jsPDF();
    const companyData = userData.company_data;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("PURCHASE RETURN", 15, 20);

    // Company details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 15, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyData.name || "GarageInventory", 15, 36);
    doc.text(companyData.address || "123 Garage Street, City, State 12345", 15, 42);
    doc.text(`Phone: ${companyData.phone || "(555) 123-4567"}`, 15, 48);

    // Return details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Return Details:", 135, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Return #: ${purchaseReturn.purchase_retrun_number || "N/A"}`, 135, 36);
    doc.text(
      `Date: ${purchaseReturn.return_date ? format(new Date(purchaseReturn.return_date), "dd-MM-yyyy") : "N/A"}`,
      135,
      42
    );
    doc.text(`Status: ${purchaseReturn.status || "N/A"}`, 135, 48);

    // Supplier details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier:", 15, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(purchaseReturn.supplier?.supplier_name || "N/A", 15, 66);
    doc.text(purchaseReturn.supplier?.address || "N/A", 15, 72);
    doc.text(purchaseReturn.supplier?.email || "N/A", 15, 78);

    // Items table including totals
    autoTable(doc, {
      startY: 90,
      head: [["Item Name", "Description", "Return Reason", "Returned Qty", "Unit Price", "Amount"]],
      body: [
        ...purchaseReturn.items.map((item: any) => {
          const formattedAmount = formatCurrency(item.order_price ?? 0).substring(1); // remove symbol
          const unitPrice = item.returned_qty ? (item.order_price ?? 0) / item.returned_qty : 0;
          const formattedUnitPrice = formatCurrency(unitPrice).substring(1);
          return [
            item.item_mgmt?.item_name || "N/A",
            item.item_mgmt?.description || "-",
            item.return_reason || "-",
            item.returned_qty || 0,
            formattedUnitPrice,
            formattedAmount,
          ];
        }),
        // Totals row
        [
          { content: "Grand Total", colSpan: 3, styles: { halign: "left" } },
          purchaseReturn.total_items || 0,
          "",
          (formatCurrency(purchaseReturn.total_value ?? 0).substring(1)),
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 10,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 15, right: 15 },
      didParseCell: (data) => {
        if (data.row.index === purchaseReturn.items.length) {
          data.cell.styles.fontStyle = "bold";
          // data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontSize = 10;
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 90;

    // Totals
    // doc.setFontSize(11);
    // doc.setFont("helvetica", "bold");
    // doc.text(`Total Items: ${purchaseReturn.total_items || 0}`, 15, finalY + 10);
    // const totalValueNumeric = formatCurrency(purchaseReturn.total_value ?? 0).substring(1);
    // doc.text(`Total Returned Value: ${totalValueNumeric}`, 110, finalY + 10);

    // Remarks
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Remarks: ${purchaseReturn.remarks?.trim() || "N/A"}`, 15, finalY + 10);

    // Footer
    doc.setDrawColor(200);
    doc.line(15, 273, 195, 273);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Thank you!", 15, 279);
    doc.text(`Contact: ${companyData.email}`, 15, 285);

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generatePDF(purchaseReturnForPrint, userData);
    if (doc) {
      doc.save(`${purchaseReturnForPrint?.purchase_retrun_number || 'download'}.pdf`);
      toast.success("PDF downloaded successfully");
    }
  };

  // --- Render the form UI ---

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 w-full">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => {
              if (isDirty && !isView) {
                setShowCancelDialog(true);
              } else {
                navigate("/dashboard/return-request", { state: { refresh: true } });
              }
            }}
            className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>

          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 rounded-lg bg-blue-100">
              <SquareChartGantt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isView ? "View Return Request" : isEdit ? "Edit Return Request" : "Add Return Request"}
              </h1>
              <p className="text-gray-600">
                {isView
                  ? "View details of an existing return request"
                  : isEdit
                    ? "Update details of an existing return request"
                    : "Create a new return request for damaged or unused items"}
              </p>
            </div>

            {isView && (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  className="transition-colors me-2"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" /> Download as PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden bg-white">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl text-blue-800">
              Request Information
            </CardTitle>
            <CardDescription className="text-blue-600">
              Fill in the return details below. Fields marked with{" "}
              <span className="text-red-500">*</span> are required.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <SquareChartGantt className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Return Request Number */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="returnRequestNumber"
                      className={`flex items-center gap-1 font-medium transition-colors ${errors.returnRequestNumber
                        ? "text-red-500"
                        : "text-gray-700"
                        } group-hover:text-blue-700`}
                    >
                      <SquareChartGantt className="h-4 w-4" />
                      Return Request Number{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="returnRequestNumber"
                      control={control}
                      defaultValue=""
                      rules={{
                        required: "Return Request Number is required",
                      }}
                      render={({ field }) => (
                        <>
                          <Input
                            {...field}
                            readOnly
                            disabled={isView}
                            className={`${errors.returnRequestNumber
                              ? "border-red-500 focus:ring-red-300"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                              } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}
                          />
                          <ErrorMessage
                            message={
                              (errors.returnRequestNumber as FieldError)?.message
                            }
                          />
                        </>
                      )}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="status"
                      className={`flex items-center gap-1 font-medium transition-colors ${errors.returnStatus ? "text-red-500" : "text-gray-700"
                        } group-hover:text-blue-700`}
                    >
                      <ChartNoAxesCombined className="h-4 w-4" />
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="return_status_display"
                      value={getCurrentReturnStatus() || ''}
                      readOnly
                      disabled={isView}
                      className={`h-10 w-full bg-gray-50 ${errors.returnStatus ? "border-red-500" : ""
                        }`}
                    />
                    <ErrorMessage message={errors.returnStatus?.message} />
                  </div>

                  {/* Created Date */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="createdDate"
                      className={`flex items-center gap-1 font-medium transition-colors ${errors.createdDate ? "text-red-500" : "text-gray-700"
                        } group-hover:text-blue-700`}
                    >
                      <Calendar1 className="h-4 w-4" />
                      Request Created Date{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="createdDate"
                      control={control}
                      defaultValue={isEdit || isView ? "" : today}
                      rules={{ required: "Created Date is required" }}
                      render={({ field }) => (
                        <>
                          <Input
                            {...field}
                            type="date"
                            readOnly={isEdit}
                            disabled={isView}
                            className={`${errors.createdDate
                              ? "border-red-500 focus:ring-red-300"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                              } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}
                          />
                          <ErrorMessage
                            message={
                              (errors.createdDate as FieldError)?.message
                            }
                          />
                        </>
                      )}
                    />
                  </div>

                  {/* Linked PO Number */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="linkedPONumber"
                      className={`flex items-center gap-1 font-medium transition-colors ${errors.linkedPONumber
                        ? "text-red-500"
                        : "text-gray-700"
                        } group-hover:text-blue-700`}
                    >
                      <Tally5 className="h-4 w-4" />
                      Linked PO Number <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="linkedPONumber"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Linked PO Number is required" }}
                      render={({ field }) => (
                        <>
                          <div className="flex items-center gap-2">
                            {isEdit || isView ? (
                              <Input
                                {...field}
                                readOnly
                                disabled={isView}
                                value={field.value || ""}
                                className={`flex-1 border rounded-md px-3 py-2 text-sm ${errors.linkedPONumber
                                  ? "border-red-500 focus:ring-red-300"
                                  : "border-gray-300 focus:ring-blue-300"
                                  }`}
                              />
                            ) : (
                              <select
                                {...field}
                                id="linkedPONumber"
                                className={`flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ${errors.linkedPONumber
                                  ? "border-red-500 focus:ring-red-300"
                                  : "border-gray-300 focus:ring-blue-300"
                                  }`}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setSelectedPoNumber(e.target.value);
                                }}
                              >
                                <option value="">-- Select PO Number --</option>
                                {poNumbers.map((po, idx) => (
                                  <option key={idx} value={po}>
                                    {po}
                                  </option>
                                ))}
                              </select>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={!selectedPoNumber && !selectedPOId}
                                  onClick={() => navigate(`/dashboard/purchaseOrderView/${selectedPOId}`)}
                                  className="whitespace-nowrap cursor-pointer"
                                >
                                  <ArrowUpRight className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Purchase Order</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <ErrorMessage
                            message={(errors.linkedPONumber as FieldError)?.message}
                          />
                        </>
                      )}
                    />
                  </div>

                  {/* Supplier Name */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="supplierName"
                      className="flex items-center gap-1 font-medium text-gray-700 group-hover:text-blue-700 transition-colors"
                    >
                      <FolderPen className="h-4 w-4" />
                      Supplier Name
                    </Label>
                    <Controller
                      name="supplierName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={supplierName ?? ""}
                          onChange={(e) => {
                            setSupplierName(e.target.value);
                            field.onChange(e);
                          }}
                          readOnly
                          disabled={isView}
                          className="w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-blue-300"
                        />
                      )}
                    />
                  </div>

                  {/* Supplier Email */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="supplierEmail"
                      className="flex items-center gap-1 font-medium text-gray-700 group-hover:text-blue-700 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Supplier Email
                    </Label>
                    <Controller
                      name="supplierEmail"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={supplierEmail ?? ""}
                          onChange={(e) => {
                            setSupplierEmail(e.target.value);
                            field.onChange(e);
                          }}
                          readOnly
                          disabled={isView}
                          className="w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-blue-300"
                        />
                      )}
                    />
                  </div>

                  {/* Supplier Address */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="supplierAddress"
                      className="flex items-center gap-1 font-medium text-gray-700 group-hover:text-blue-700 transition-colors"
                    >
                      <Package className="h-4 w-4" />
                      Supplier Address
                    </Label>
                    <Controller
                      name="supplierAddress"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={supplierAddress ?? ""}
                          onChange={(e) => {
                            setSupplierAddress(e.target.value);
                            field.onChange(e);
                          }}
                          readOnly
                          disabled={isView}
                          className="w-full border rounded-md px-3 py-2 text-sm border-gray-300 focus:ring-blue-300"
                        />
                      )}
                    />
                  </div>

                  {/* Date of Original PO */}
                  <div className="space-y-2 group">
                    <Label
                      htmlFor="originalPODate"
                      className={`flex items-center gap-1 font-medium transition-colors ${errors.originalPODate ? "text-red-500" : "text-gray-700"
                        } group-hover:text-blue-700`}
                    >
                      <CalendarCheck2 className="h-4 w-4" />
                      Date of Original PO{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="originalPODate"
                      control={control}
                      defaultValue=""
                      rules={{ required: "Original PO Date is required" }}
                      render={({ field }) => (
                        <>
                          <Input
                            {...field}
                            value={originalPODate}
                            readOnly
                            disabled={isView}
                            className={
                              errors.originalPODate
                                ? "border-red-500 focus:ring-red-300"
                                : ""
                            }
                          />
                          <ErrorMessage
                            message={
                              (errors.originalPODate as FieldError)?.message
                            }
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Supplies Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Supplies Details
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 group relative">
                    <Label className="text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium">
                      <Search className="h-4 w-4" />
                      {isEdit || isView ? "Item Information" : "Search Item"}
                    </Label>
                    {!isEdit && !isView && (
                      <div className="relative">
                        <Input
                          placeholder="Search for supplies by name or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => setShowSuppliesDropdown(true)}
                          className={`pl-10 pr-4 py-2 rounded-md shadow-sm focus:ring-4 ${errors.selectedSupplies
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                            } transition-all duration-200`}
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    )}

                    {showSuppliesDropdown && filteredSupplies.length > 0 && !isEdit && !isView && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Available Supplies ({filteredSupplies.length})
                            </span>
                          </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {filteredSupplies.map((supply, index) => (
                            <div
                              key={supply.id}
                              className={`p-4 hover:bg-blue-50 transition-colors duration-200 ${index !== filteredSupplies.length - 1
                                ? "border-b border-gray-100"
                                : ""
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={
                                      tempSelectedSupplies.includes(supply.id) ||
                                      selectedSupplies.some(s => s.id === supply.id)
                                    }
                                    onCheckedChange={() =>
                                      handleSupplyToggle(supply)
                                    }
                                    onClick={(e: any) => e.stopPropagation()}
                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Package className="h-3 w-3 text-gray-400" />
                                      <p className="font-medium text-gray-900 text-sm">
                                        {supply.name}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-500 ml-5">
                                      {supply.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {tempSelectedSupplies.length +
                                selectedSupplies.length}{" "}
                              selected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTempSelectedSupplies([]);
                                setShowSuppliesDropdown(false);
                                setSearchTerm("");
                              }}
                              className="text-gray-600 hover:bg-gray-100 px-3 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleConfirmSupplies}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                            >
                              Confirm Selection
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {showSuppliesDropdown &&
                      searchTerm &&
                      filteredSupplies.length === 0 && !isEdit && !isView && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-6 text-center">
                            <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">
                              No supplies found matching "{searchTerm}"
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              Try adjusting your search terms or select
                              different brands
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {selectedSupplies.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          Selected Supplies
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {confirmedSupplyIds.length}
                          </span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setIsSelectedSuppliesExpanded(
                                !isSelectedSuppliesExpanded
                              )
                            }
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 text-xs flex items-center gap-1"
                          >
                            <span>
                              {isSelectedSuppliesExpanded
                                ? "Collapse"
                                : "Expand"}
                            </span>
                            {isSelectedSuppliesExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplies([]);
                              setValue("selectedSupplies", []);
                              setConfirmedSupplyIds([]);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                            disabled={isEdit || isView}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isSelectedSuppliesExpanded
                          ? "max-h-[1000px] opacity-100"
                          : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="mt-3 border rounded-lg overflow-hidden">
                          <table className="w-full border-collapse rounded-md overflow-hidden">
                            <thead className="bg-blue-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Item Name</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Received Qty</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Already Returned Qty</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Returnable Qty</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Return Qty</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">Reason for Return</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inventoryList
                                .filter((item) => selectedNames.has(item.item_name))
                                .map((item) => {
                                  const { item_id, item_name, total_quantity = 0 } = item;
                                  const selected = selectedSupplies.find(
                                    (s) => s.item_id === item_id || s.id === item_id
                                  );

                                  let priorReturnedQty;
                                  if (isEdit || isView || isResubmitting) {
                                    priorReturnedQty =
                                      alreadyReturnedMap[item_id] === undefined || originalReturnQuantities[item_id] === undefined
                                        ? 0
                                        : (alreadyReturnedMap[item_id] ?? 0) - (originalReturnQuantities[item_id] ?? 0);
                                  } else {
                                    priorReturnedQty = alreadyReturnedMap[item_id] ?? 0;
                                  }

                                  return (
                                    <tr key={item_id} className="border-t hover:bg-gray-50">
                                      <td className="px-4 py-2 text-sm text-gray-700">{item_name}</td>
                                      <td className="px-4 py-2 text-sm text-gray-700">{total_quantity}</td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {priorReturnedQty}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {total_quantity - (alreadyReturnedMap[item_id] ?? 0)}
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        {(isEdit && !isResubmitting) || isView ? (
                                          <span className="text-gray-700">
                                            {selected?.return_qty ?? "-"}
                                          </span>
                                        ) : (
                                          <Input
                                            type="number"
                                            value={selected?.return_qty || ""}
                                            className="h-8 w-24 rounded-md border-gray-300"
                                            onChange={(e) => handleReturnQtyChange(item, e, alreadyReturnedMap[item_id] ?? 0)}
                                            disabled={isView}
                                          />
                                        )}
                                        {returnQtyErrors[item_id] && (
                                          <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {returnQtyErrors[item_id]}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        {(isEdit && !isResubmitting) || isView ? (
                                          <span className="text-gray-700">
                                            {selected?.return_reason ?? "-"}
                                          </span>
                                        ) : (
                                          <>
                                            <select
                                              className={`h-8 w-full rounded-md border px-2 text-sm text-gray-700 ${reasonErrors[item_id] ? "border-red-500" : "border-gray-300"
                                                }`}
                                              value={selected?.return_reason ?? ""}
                                              onChange={(e) => handleReasonChange(item, e)}
                                              disabled={isView}
                                            >
                                              <option value="">Select reason</option>
                                              <option value="Damaged">Damaged</option>
                                              <option value="Wrong Item">Wrong Item</option>
                                              <option value="Expired">Expired</option>
                                              <option value="Other">Other</option>
                                            </select>
                                            {reasonErrors[item_id] && (
                                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {reasonErrors[item_id]}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {!isSelectedSuppliesExpanded && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700">
                            {selectedSupplies.length} supplies selected - Click
                            expand to view details
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks & Attachments Section */}
              <div className="space-y-3">
                <div className="space-y-6 pt-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <CalendarCheck2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Remarks & Attachments
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2 group">
                      <Label className="text-gray-700 group-hover:text-blue-700 transition-colors duration-200 font-medium">
                        Remarks
                      </Label>
                      <Controller
                        name="remarks"
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Enter any notes about the return request..."
                            className="resize-none min-h-[100px] border border-gray-200 focus:border-blue-500 focus:ring-blue-200 shadow-sm transition-all duration-200"
                            disabled={isView}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2 group">
                      <Label
                        htmlFor="attachment"
                        className={`${errors.attachment ? "text-red-500" : "text-gray-700"} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                      >
                        <Paperclip className="h-4 w-4" /> Attachment (JPG - max 5MB)
                      </Label>
                      <Input
                        id="attachment"
                        type="file"
                        accept=".jpg"
                        onChange={(e) =>
                          handleAttachmentChange(e, setAttachmentPreview, (file) =>
                            setValue("attachment", file, { shouldDirty: true })
                          )
                        }
                        className={`${errors.attachment
                          ? "text-red-500 border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                          } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}
                        disabled={isView}
                      />
                      {attachmentPreview && (
                        <div className="mt-2 flex items-start gap-3">
                          {isImageUrl(attachmentPreview) ? (
                            <img
                              src={attachmentPreview}
                              alt="Attachment Preview"
                              className="h-32 w-32 object-cover rounded-md border border-gray-200"
                            />
                          ) : (
                            <div className="flex flex-col">
                              {attachmentPreview.startsWith("http") ? (
                                <a
                                  href={attachmentPreview}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-600 underline"
                                >
                                  Open attachment
                                </a>
                              ) : (
                                <p className="text-sm text-gray-600">{attachmentPreview}</p>
                              )}
                            </div>
                          )}
                          {!isView && (
                            <div className="flex flex-col items-start gap-2">
                              <button
                                type="button"
                                onClick={handleRemoveAttachment}
                                className="text-sm text-red-600 hover:underline"
                                disabled={isView}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {errors.attachment?.message && (
                        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.attachment.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit/Cancel Buttons */}
              {!isView && (
                <div className="pt-6 border-t flex justify-end gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (isDirty && !isView) {
                        setShowCancelDialog(true);
                      } else {
                        navigate("/dashboard/return-request", {
                          state: { refresh: true },
                        });
                      }
                    }}
                    disabled={isView}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={isView}
                  >
                    Save
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg text-blue-600">
                Unsaved Changes
              </DialogTitle>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel? Unsaved changes will be lost.
              </p>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                No
              </Button>
              <Button
                variant="destructive"
                onClick={() => navigate("/dashboard/return-request")}
              >
                Yes, Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReturnForm;
