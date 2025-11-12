import React, { useState } from 'react';
import { useForm, Controller } from "react-hook-form";
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

// Static data instead of API calls
const staticSuppliers = [
  { id: "1", supplier_name: "ABC Supplier", email: "abc@example.com", address: "123 Main St", supplier_id: "SUP001" },
  { id: "2", supplier_name: "XYZ Supplier", email: "xyz@example.com", address: "456 Oak Ave", supplier_id: "SUP002" },
  { id: "3", supplier_name: "DEF Supplier", email: "def@example.com", address: "789 Pine Rd", supplier_id: "SUP003" }
];

const staticStores = [
  { id: "1", name: "Main Store", address: "100 Main St", type: "Retail" },
  { id: "2", name: "Warehouse", address: "200 Industrial Blvd", type: "Warehouse" },
  { id: "3", name: "Outlet Store", address: "300 Discount Ln", type: "Outlet" }
];

const staticItems = [
  { id: "1", item_id: "ITEM001", item_name: "Widget A", description: "High-quality widget", selling_price: 10.99, max_level: 100, supplier_id: "1" },
  { id: "2", item_id: "ITEM002", item_name: "Widget B", description: "Standard widget", selling_price: 7.50, max_level: 200, supplier_id: "1" },
  { id: "3", item_id: "ITEM003", item_name: "Gadget X", description: "Advanced gadget", selling_price: 25.00, max_level: 50, supplier_id: "2" },
  { id: "4", item_id: "ITEM004", item_name: "Gadget Y", description: "Basic gadget", selling_price: 15.75, max_level: 75, supplier_id: "2" },
  { id: "5", item_id: "ITEM005", item_name: "Tool Z", description: "Multi-purpose tool", selling_price: 30.25, max_level: 30, supplier_id: "3" }
];

const staticSystemMessageConfig = [
  { id: "1", sub_category_id: "ORDER_CREATED", value: "Order Created" },
  { id: "2", sub_category_id: "APPROVAL_PENDING", value: "Approval Pending Level {@}" },
  { id: "3", sub_category_id: "APPROVER_COMPLETED", value: "{@} Approved" },
  { id: "4", sub_category_id: "ORDER_ISSUED", value: "Order Issued" },
  { id: "5", sub_category_id: "ORDER_RECEIVED", value: "Order Received" },
  { id: "6", sub_category_id: "ORDER_PARTIALLY_RECEIVED", value: "Order Partially Received" },
  { id: "7", sub_category_id: "ORDER_CANCELLED", value: "Order Cancelled" }
];

const staticWorkflowConfig = {
  id: "1",
  level: 1,
  role_id: "ROLE001",
  process_name: "Purchase Order"
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US');
};

const getLocalDateTime = () => {
  return new Date().toISOString();
};

const triggerNotificationUpdate = () => {
  console.log("Notification update triggered");
};

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const backorderId = searchParams.get("backorder");
  const formRef = useRef(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [suppliers, setSuppliers] = useState(staticSuppliers);
  const [stores, setStores] = useState(staticStores);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [allSelectedItems, setAllSelectedItems] = useState([]);
  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(false);
  const [isFetchingStores, setIsFetchingStores] = useState(false);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [isLoading, setIsLoading] = useState(!!(editId || duplicateId || backorderId));
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [userId, setUserId] = useState("user123");
  const [companyId, setCompanyId] = useState("company123");
  const [companyEmail, setCompanyEmail] = useState("company@example.com");
  const [companyName, setCompanyName] = useState("Test Company");
  const [isEmailAuthenticated, setIsEmailAuthenticated] = useState(false);
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("");
  const [orderStatus, setOrderStatus] = useState();
  const [currentWorkflow, setCurrentWorkflow] = useState(staticWorkflowConfig);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [notifySupplier, setNotifySupplier] = useState(true);
  const [currentApprovalStatus, setCurrentApprovalStatus] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationData, setCancellationData] = useState({
    reason: "Pricing Issue",
    details: "",
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationErrors, setCancellationErrors] = useState({});
  const [workflowConfig, setWorkflowConfig] = useState(staticWorkflowConfig);
  const { control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
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
  const [systemMsgConfig, setSystemMsgConfig] = useState(staticSystemMessageConfig);
  const [backorderRef, setBackorderRef] = useState("");
  const [isBackorderCreated, setIsBackorderCreated] = useState(true);
  const [isIssuing, setIsIssuing] = useState(false);
  const [allApprovalStatus, setAllApprovalStatus] = useState([]);
  const [currentUserName, setCurrentUserName] = useState("John Doe");
  const [isSupplierSelected, setIsSupplierSelected] = useState(false);

  const watchedSupplierId = watch("supplier_id");
  const watchedStoreId = watch("store_id");
  const watchedIssuedBy = watch("issued_by");
  const watchedIssuedOn = watch("issued_on");
  const watchedPOnumber = watch("po_number");

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
      // Simulate API call with static data
      setCurrentUserName("John Doe");
    };
    fetchCurrentUserName();
  }, [userId]);

  // Generate new PO number
  const generateNewPoNumber = async (supplierId) => {
    const supplier = staticSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yy = today.getFullYear().toString().slice(-2);
      const datePart = `${dd}${mm}${yy}`;
      
      // For demo purposes, just return a fixed PO number
      const poNumber = isCreatingBackorder ? `BO-${supplier.supplier_id}-${datePart}-001` : `PO-${supplier.supplier_id}-${datePart}-001`;
      return poNumber;
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
      
      // Simulate API calls with static data
      setTimeout(() => {
        // Set some default data for demo
        const supplier = staticSuppliers[0];
        setSupplierSearch(supplier.supplier_name);
        setSupplierEmail(supplier.email);
        setSupplierAddress(supplier.address);
        setIsSupplierSelected(true);
        
        const store = staticStores[0];
        setDeliveryAddress(store.address);
        
        // Add some sample items
        const sampleItems = staticItems.slice(0, 3).map(item => ({
          ...item,
          order_qty: 5,
          received_qty: null,
        }));
        
        setAllSelectedItems(sampleItems);
        setTotalItems(sampleItems.length);
        setSelectedItems(sampleItems.slice(0, itemsPerPage));
        setValue("purchase_order_items", sampleItems);
        
        setIsLoading(false);
      }, 500);
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
    const fetchSuppliers = async () => {
      setIsFetchingSuppliers(true);
      setTimeout(() => {
        if (supplierSearch.length >= 3) {
          const filtered = staticSuppliers.filter(supplier => 
            supplier.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
            supplier.supplier_id.toLowerCase().includes(supplierSearch.toLowerCase())
          );
          setSuppliers(filtered);
        } else {
          setSuppliers(staticSuppliers);
        }
        setIsFetchingSuppliers(false);
      }, 300);
    };

    const timeoutId = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(timeoutId);
  }, [supplierSearch]);

  // Fetch Stores
  useEffect(() => {
    const fetchStores = async () => {
      setIsFetchingStores(true);
      setTimeout(() => {
        setStores(staticStores);
        if (staticStores.length > 0 && !editId && !duplicateId) {
          setValue("store_id", staticStores[0].id);
          setDeliveryAddress(staticStores[0].address);
        }
        setIsFetchingStores(false);
      }, 300);
    };

    fetchStores();
  }, [setValue, editId, duplicateId]);

  // Fetch Items for Search
  useEffect(() => {
    const fetchItems = async () => {
      if (!watchedSupplierId) {
        setAvailableItems([]);
        setShowItemDropdown(false);
        return;
      }
      setIsFetchingItems(true);
      
      setTimeout(() => {
        const supplierItems = staticItems.filter(item => item.supplier_id === watchedSupplierId);
        
        if (itemSearch.length >= 3) {
          const filtered = supplierItems.filter(item => 
            item.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
            item.item_id.toLowerCase().includes(itemSearch.toLowerCase())
          );
          setAvailableItems(filtered);
          setShowItemDropdown(true);
        } else {
          setAvailableItems(supplierItems);
          setShowItemDropdown(itemSearch.length >= 3 && !!watchedSupplierId);
        }
        setIsFetchingItems(false);
      }, 300);
    };

    const timeoutId = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedSupplierId, itemSearch]);

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

  // Update Delivery Address
  useEffect(() => {
    const selectedStore = stores.find((s) => s.id === watchedStoreId);
    setDeliveryAddress(selectedStore?.address || "");
  }, [watchedStoreId, stores]);

  // Calculate Totals
  useEffect(() => {
    const totalItems = allSelectedItems.reduce((sum, item) => sum + item.order_qty, 0);
    const totalValue = allSelectedItems.reduce((sum, item) => sum + item.selling_price * item.order_qty, 0);
    setValue("total_items", totalItems);
    setValue("total_value", totalValue);
    setValue("purchase_order_items", allSelectedItems);
  }, [allSelectedItems, setValue]);

  // System Message Config
  useEffect(() => {
    // Simulate fetching system message config
    setSystemMsgConfig(staticSystemMessageConfig);
    
    if (!editId) {
      const defaultStatusId = workflowConfig ? statusApprovalPending.id : statusApprovalCompleted.id;
      setValue("order_status", defaultStatusId);
    }
  }, [setValue, workflowConfig]);

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

  const handleSupplierSelect = (supplier) => {
    setValue("supplier_id", supplier.id);
    setSupplierSearch(supplier.supplier_name);
    setSupplierEmail(supplier.email || "");
    setSupplierAddress(supplier.address || "");
    setShowSupplierDropdown(false);
    setIsSupplierSelected(true);

    // Reset item-related states
    setItemSearch("");
    setSelectedItems([]);
    setAllSelectedItems([]);
    setValue("purchase_order_items", []);
    setAvailableItems([]);
    setCurrentPage(1);
    setTotalItems(0);
  };

  const handleItemSelect = (item) => {
    if (allSelectedItems.some((selected) => selected.id === item.id)) {
      toast.error("Item already selected", { position: "top-center" });
      return;
    }
    const newItem = {
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

  const openDeleteDialog = (itemId) => {
    setItemToDelete(itemId);
    setShowDeleteDialog(true);
  };

  const handleQuantityChange = (itemId, quantity) => {
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

  const handlePriceChange = (itemId, price) => {
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

  const validateCancellation = () => {
    const errors = {};

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
    setTimeout(() => {
      toast.success("Purchase Order has been cancelled.", { position: "top-center" });
      navigate("/dashboard/purchaseOrderManagement");
      setIsCancelling(false);
      setShowCancellationModal(false);
    }, 1000);
  };

  const onSubmit = async (data) => { 
    setFormError(null);
    try {
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
    } catch (error) {
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

  const ErrorMessage = ({ message }) => {
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
  const handleRecQuantityChange = (itemId, quantity) => {
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
  const validateReceivedQuantities = () => {
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
      const isPartiallyReceived = () => {
        return allSelectedItems.some(item => {
          const rec = receivedQuantities.find(recItem => recItem.itemId === item.id);
          return rec && rec.recQuantity >= 0 && rec.recQuantity < item.order_qty;
        });
      };

      const partiallyRecStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_PARTIALLY_RECEIVED")?.id;
      const recStatus = systemMsgConfig.find(config => config.sub_category_id === "ORDER_RECEIVED")?.id;

      const poStatus = isPartiallyReceived() ? partiallyRecStatus : recStatus;
      const totalReceivedQty = receivedQuantities.reduce((sum, item) => sum + item.recQuantity, 0);

      toast.success(isPartiallyReceived() ? 'Purchase Order marked as Partially Received.' : 'Purchase Order marked as Received.', { position: "top-center" });
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

  function createHTMLEmail(purchaseOrderData) {
    const itemsHtml = (purchaseOrderData.orderItems || []).map((item) => `
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

  const handleSendEmail = async (purchaseOrderData) => {
    if (!purchaseOrderData) {
      toast.error("Purchase order data is required", { position: "top-center" });
      return;
    }

    toast.success('Purchase Order has been issued successfully.', {
      position: "top-center",
    });
    navigate("/dashboard/purchaseOrderManagement");
  };

  const handleConfirmIssuePO = async () => {
    setIsIssuing(true);
    setTimeout(() => {
      if (notifySupplier && isEmailAuthenticated) {
        const orderedItems = allSelectedItems.map((poItem) => {
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
        toast.success('Purchase Order has been issued successfully.', { position: "top-center" });
        navigate("/dashboard/purchaseOrderManagement");
      }
      setIsIssuing(false);
    }, 1000);
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
                      <ErrorMessage message={errors.purchase_order_items?.message} />
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
                            onValueChange={(value) => {
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
        <div className={`${showCancelDialog ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[100vh] overflow-y-auto">
              <div className="pb-4">
                <h3 className="text-lg font-semibold">
                  Confirm Cancel
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Are you sure you want to cancel? Unsaved changes will be lost.
                </p>
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Item Delete Dialog */}
        <div className={`${showDeleteDialog ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[100vh] overflow-y-auto">
              <div className="pb-4">
                <h3 className="text-lg font-semibold">
                  Confirm Item Removal
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Are you sure you want to remove this item from the Purchase Order?
                </p>
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No
                </button>
                <button
                  onClick={() => handleItemRemove()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* New Cancellation Modal */}
        <div className={`${showCancellationModal ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[100vh] overflow-y-auto">
              <div className="pb-4">
                <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  Cancel Purchase Order
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Please provide a reason for cancelling this Purchase Order. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="selected_reason" className="text-sm font-medium">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={cancellationData.reason}
                  onValueChange={(value) => {
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
                <div className="space-y-2 mt-4">
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

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure you want to cancel this Purchase Order? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={() => {
                    setShowCancellationModal(false);
                    setCancellationData({ reason: "Pricing Issue", details: "" });
                    setCancellationErrors({});
                  }}
                  disabled={isCancelling}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  No, Keep PO
                </button>
                <button
                  onClick={handleConfirmCancellation}
                  disabled={isCancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog for Purchase Order Receival */}
        <div className={`${isRecDialogOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[100vh] overflow-y-auto">
              <div className="pb-4">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                  Confirm Purchase Order Receival
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Please verify the quantities received for each item in this purchase order.
                </p>
              </div>

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
                              {(recQty >= 0 && recQty < item.order_qty) && (
                                <div className='ps-4'>
                                  <ShieldAlert className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsRecDialogOpen(false);
                    setReceivedQuantities([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => handleConfirmReceival()}
                >
                  <CheckCheck className="h-4 w-4" />
                  Confirm Receival
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog for Purchase Order Issue */}
        <div className={`${isIssueDialogOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[100vh] overflow-y-auto">
              <div className="pb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  Confirm Purchase Order Issue
                </h3>
                <p className="text-gray-900 text-md font-semibold mt-1">
                  Are you sure you want to issue this Purchase Order?
                </p>
              </div>

              <div className="flex items-center space-x-2 pb-4">
                <input
                  type="checkbox"
                  checked={isEmailAuthenticated ? notifySupplier : false}
                  onChange={() =>
                    notifySupplier ? setNotifySupplier(false) : setNotifySupplier(true)
                  }
                  disabled={!isEmailAuthenticated}
                  className="border-gray-300 text-blue-600 cursor-pointer focus:ring-blue-500 disabled:cursor-not-allowed me-1"
                />
                <Label className="text-xs text-gray-700">
                  Notify Supplier via Email upon Issuing PO
                </Label>
                {!isEmailAuthenticated && (
                  <div className="text-xs text-gray-500">
                    Company email is not authenticated. Please authenticate before enabling this option.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={() => setIsIssueDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;