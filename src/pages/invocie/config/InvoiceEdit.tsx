import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ArrowLeft,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  MapPin,
  Mail,
  Phone,
  Search,
  Package,
  Store,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/Utils/types/supabaseClient';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/Utils/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define Store type
type Store = {
  id: string;
  name: string;
  address?: string | null;
  is_active: boolean | null;
};

// Define Supply type
type Supply = {
  id: string;
  name: string;
  description: string;
  price: number;
  availableStock?: number;
};

// Schema for invoice items
const invoiceItemSchema = z.object({
  id: z.string().uuid('Item must have a valid UUID'),
  name: z.string().min(1, 'Item name is required').max(100, 'Item name must be less than 100 characters'),
  quantity: z.number().min(1, 'Quantity must be at least 1').int('Quantity must be an integer'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  total: z.number().min(0, 'Total cannot be negative'),
  availableStock: z.number().min(0).optional(),
}).refine(
  (data) => data.quantity <= (data.availableStock ?? Infinity),
  { message: 'Quantity exceeds available stock', path: ['quantity'] }
);

// Schema for the invoice
const invoiceFormSchema = z.object({
  storeId: z.string().optional(), // Store selection is optional but required for item search
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Invalid date format'),
  customerName: z.string().min(1, 'Customer name is required'),
  contactNumber: z.string().regex(/^[0-9]{10}$/, 'Contact number must be 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  billingAddress: z.string().min(0, 'Billing address is required').optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  additionalCharges: z.number().min(0, 'Additional charges cannot be negative').optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
  availableStock?: number;
}

type Customer = {
  id: string;
  fullname: string;
  address: string;
  company_id: string | null;
  created_at: string;
  created_by: string | null;
  customer_id: string | null;
  email: string | null;
  is_active: boolean | null;
  phone: string | null;
  type: string;
};

type StockRow = { item_id: string; total_qty: number };

// Generate invoice number
function generateInvoiceNumber(lastNumber = 1): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const serial = String(lastNumber).padStart(4, '0');
  return `INV-${dd}${mm}${yy}-${serial}`;
}

export default function InvoiceEdit() {
  const userData = localStorage.getItem('userData');
  const user = userData ? JSON.parse(userData) : null;
  const companyId = user?.company_id;
  const userId = user?.id;

  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [_, setError] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [filteredSupplies, setFilteredSupplies] = useState<Supply[]>([]);
  const [tempSelectedSupplies, setTempSelectedSupplies] = useState<string[]>([]);
  const [selectedSupplies, setSelectedSupplies] = useState<Supply[]>([]);
  const [showSuppliesDropdown, setShowSuppliesDropdown] = useState(false);
  const [displayStockMap, setDisplayStockMap] = useState<Record<string, number>>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  // const [errors, setErrors] = useState({ customerName: null });
  const containerRef = useRef(null);

  // Helper function to clear validation errors
  const clearValidationErrors = () => {
    setError('');
    setFormStatus('idle');
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
    reset,
    watch,
    setValue,
    control,
    trigger,
    getValues,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      storeId: '',
      invoiceNumber: generateInvoiceNumber(),
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      contactNumber: '',
      email: '',
      billingAddress: '',
      items: [],
      additionalCharges: 0,
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedFields = watch();
  const initialValuesRef = useRef<any>(null);

  // Capture initial values
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = getValues();
    }
  }, []);

  // Debug form state
  useEffect(() => {
    console.log('Form State:', { isValid, errors, items: watchedFields.items });
  }, [isValid, errors, watchedFields.items]);

  // Fetch stores for the company
  useEffect(() => {
    const fetchStores = async () => {
      if (!companyId) return;
      
      try {
        const { data, error } = await supabase
          .from('store_mgmt')
          .select('id, name, address, is_active')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching stores:', error);
          toast.error('Failed to fetch stores');
          return;
        }

        setStores(data || []);
      } catch (error) {
        console.error('Unexpected error fetching stores:', error);
        toast.error('An unexpected error occurred while fetching stores');
      }
    };

    fetchStores();
  }, [companyId]);

  // Fetch invoice data for editing
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      const fetchInvoice = async () => {
        try {
          const { data, error } = await supabase
            .from('sales_invoice')
            .select(`
              *,
              sales_invoice_items (
                item_id,
                quantity,
                unit_price,
                discount_percentage,
                item_mgmt (item_name, selling_price)
              ),
              customer_data: customer_mgmt!sales_invoice_customer_id_fkey(*)
            `)
            .eq('id', id)
            .eq('company_id', companyId)
            .single();

          if (error || !data) throw new Error('Failed to fetch invoice');

          const invoiceItems = data.sales_invoice_items.map((item: any) => {
            const quantity = item.quantity || 0;
            const unitPrice = item.unit_price || 0;
            const discountPercentage = Number(item.discount_percentage) || 0;
            
            // For editing: We show percentage in UI but we have amount in DB
            // Calculate total using percentage for consistency with UI display
            const total = quantity * unitPrice * (1 - discountPercentage / 100);
            
            return {
              id: item.item_id,
              name: item.item_mgmt.item_name,
              quantity: quantity,
              unitPrice: unitPrice,
              discount: discountPercentage, // UI expects percentage
              total: total,
              availableStock: 0,
            };
          });

          const itemIds = invoiceItems.map((item: any) => item.id);
          const { data: stockData, error: stockError } = await supabase
            .rpc('get_total_stock_for_items_by_store', { item_ids: itemIds, p_store_id: data?.store_id ?? '' });

          if (stockError) {
            console.error('Supabase stock error:', stockError.message);
          }

          const stockMap = ((stockData as StockRow[]) || []).reduce((acc: Record<string, number>, s: any) => {
            acc[s.item_id] = Number(s.total_qty) || 0;
            return acc;
          }, {} as Record<string, number>);

          // Keep raw current stock for display purposes only (do not add previous qty in the label)
          setDisplayStockMap(stockMap);

          // Build a map of previously invoiced quantities to support delta-aware validation
          const previousQuantitiesMap: Record<string, number> = invoiceItems.reduce((acc: Record<string, number>, it: any) => {
            acc[it.id] = Number(it.quantity) || 0;
            return acc;
          }, {} as Record<string, number>);

          const nextValues = {
            storeId: data.store_id || '',
            invoiceNumber: data.invoice_number || '',
            date: data.invoice_date || '',
            customerName: data.customer_data?.fullname || data.customer_name || '',
            contactNumber: data.customer_data?.phone || data.contact_number || '',
            email: data.customer_data?.email || data.email || '',
            billingAddress: data.customer_data?.address || data.billing_address || '',
            items: invoiceItems.map((item: any) => ({
              ...item,
              // During edit, allow up to (current stock + previously invoiced qty)
              availableStock: (stockMap[item.id] ?? 0) + (previousQuantitiesMap[item.id] || 0),
            })),
            additionalCharges: 0,
          };
          reset(nextValues);
          initialValuesRef.current = nextValues;

          setSelectedCustomer(data?.customer_data ?? undefined);
          setSelectedStore(data?.store_id ?? '');

          setSelectedSupplies(
            invoiceItems.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: '',
              price: item.unitPrice,
              availableStock: (stockMap[item.id] ?? 0) + (previousQuantitiesMap[item.id] || 0),
            }))
          );
        } catch (err) {
          setError('Failed to load invoice data');
          setFormStatus('error');
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoice();
    }
  }, [id, isEditing, reset, companyId]);

  // Generate invoice number
  useEffect(() => {
    const fetchAndSetNextInvoiceNumber = async () => {
      if (isEditing) return;
      if (!companyId) return;
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const todayPrefix = `INV-${dd}${mm}${yy}-`;
      const { data, error } = await supabase
        .from('sales_invoice')
        .select('invoice_number')
        .eq('company_id', companyId)
        .like('invoice_number', `${todayPrefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);
      let nextSerial = 1;
      if (!error && data && data.length > 0 && data[0].invoice_number) {
        const match = data[0].invoice_number.match(/-(\d{4})$/);
        if (match) {
          nextSerial = parseInt(match[1], 10) + 1;
        }
      }
      setValue('invoiceNumber', generateInvoiceNumber(nextSerial));
    };
    fetchAndSetNextInvoiceNumber();
  }, [isEditing, companyId, setValue]);

  // Fetch customers based on search term
  useEffect(() => {
    // If there's a selected customer and the search term exactly matches, don't fetch or show dropdown
    if (
      selectedCustomer &&
      customerSearchTerm.trim().toLowerCase() === selectedCustomer.fullname.toLowerCase()
    ) {
      setValue('customerName', selectedCustomer.fullname)
      setValue('email', selectedCustomer?.email ?? '')
      setValue('contactNumber', selectedCustomer?.phone ?? '')
      setValue('billingAddress', selectedCustomer?.address ?? '')
      setShowCustomerDropdown(false);
      setFilteredCustomers([]);
      return;
    }

    if (!customerSearchTerm.trim() || customerSearchTerm.trim().length < 3) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('customer_mgmt')
          .select('id, fullname, address, company_id, created_at, created_by, customer_id, email, is_active, phone, type')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .eq('status', true)
          .or(`fullname.ilike.%${customerSearchTerm.trim()}%,customer_id.ilike.%${customerSearchTerm.trim()}%`)
          .limit(10);

        if (fetchError) throw fetchError;

        setFilteredCustomers(data);
        setShowCustomerDropdown(true);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to fetch customers. Please try again.');
        setFilteredCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchTerm, selectedCustomer]);
  
  // Handle selecting a customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.fullname);
    setShowCustomerDropdown(false);
  };

  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case 'retail':
        return 'bg-green-100 text-green-800';
      case 'vip':
        return 'bg-yellow-100 text-yellow-800';
      case 'wholesale':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Handle store selection change
  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    setValue('storeId', storeId);
    
    // Clear existing items and search when store changes
    setSelectedSupplies([]);
    setFilteredSupplies([]);
    setItemSearchTerm('');
    setShowSuppliesDropdown(false);
    setTempSelectedSupplies([]);
    
    // Clear form items and reset validation state
    reset({
      ...watchedFields,
      storeId: storeId,
      items: [],
    });
    
    // Clear display stock map
    setDisplayStockMap({});
    
    // Clear any existing validation errors
    clearValidationErrors();
  };

  // Item search - now filtered by selected store
  useEffect(() => {
    const fetchSupplies = async () => {
      if (!itemSearchTerm.trim() || itemSearchTerm.trim().length < 3 || !selectedStore) {
        setFilteredSupplies([]);
        setShowSuppliesDropdown(false);
        return;
      }

      try {
        // First get items that exist in the selected store's inventory
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_mgmt')
          .select('item_id, item_qty')
          .eq('store_id', selectedStore)
          .eq('company_id', companyId)
          .gt('item_qty', 0);

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
          toast.error('Failed to fetch inventory data');
          return;
        }

        if (!inventoryData || inventoryData.length === 0) {
          setFilteredSupplies([]);
          setShowSuppliesDropdown(true);
          return;
        }

        // Get unique item IDs from inventory, filtering out null values
        const itemIds = [...new Set(inventoryData.map(item => item.item_id).filter(Boolean))] as string[];

        // Now fetch item details for these items
        const { data: itemData, error: itemError } = await supabase
          .from('item_mgmt')
          .select('id, item_name, description, selling_price')
          .eq('is_active', true)
          .eq('company_id', companyId)
          .in('id', itemIds)
          .or(`item_name.ilike.%${itemSearchTerm.trim()}%,description.ilike.%${itemSearchTerm.trim()}%`);

        if (itemError) {
          console.error('Supabase error:', itemError.message);
          toast.error('Failed to fetch supplies');
          return;
        }

        if (!itemData || itemData.length === 0) {
          setFilteredSupplies([]);
          setShowSuppliesDropdown(true);
          return;
        }

        // Create a map of item quantities by store
        const itemQuantityMap = inventoryData.reduce((acc: Record<string, number>, inv: any) => {
          acc[inv.item_id] = (acc[inv.item_id] || 0) + (inv.item_qty || 0);
          return acc;
        }, {});

        const mappedSupplies: Supply[] = itemData.map((item: any) => ({
          id: item.id,
          name: item.item_name || 'Unnamed Item',
          description: item.description || 'No description',
          price: item.selling_price ? parseFloat(item.selling_price) : 0,
          availableStock: itemQuantityMap[item.id] ?? 0,
        }));

        setFilteredSupplies(mappedSupplies);
        setShowSuppliesDropdown(true);
      } catch (error) {
        console.error('Unexpected error in fetchSupplies:', error);
        toast.error('An unexpected error occurred');
      }
    };

    const timeoutId = setTimeout(fetchSupplies, 300);
    return () => clearTimeout(timeoutId);
  }, [itemSearchTerm, selectedStore, companyId]);

  const handleSupplyToggle = (supply: Supply, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const isSelected = tempSelectedSupplies.includes(supply.id);
    if (isSelected) {
      setTempSelectedSupplies(tempSelectedSupplies.filter((id: string) => id !== supply.id));
    } else {
      setTempSelectedSupplies([...tempSelectedSupplies, supply.id]);
    }
  };

  console.log("filteredSupplies =>", filteredSupplies);
  console.log("tempSelectedSupplies =>", filteredSupplies);

  const fetchTempSuppliesData = async (tempSelectedSuppliesIDs: string[]) => {
    try {
      const idsToFetch = tempSelectedSuppliesIDs.filter(
        id => !selectedSupplies.some(existing => existing.id === id)
      );

      if (idsToFetch.length === 0) return [];

      const { data, error } = await supabase
        .from('item_mgmt')
        .select('id, item_name, description, selling_price')
        .eq('company_id', companyId)
        .in('id', idsToFetch);

      if (error) {
        console.error('Error fetching selected supplies:', error.message);
        toast.error('Failed to fetch selected supplies.');
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.item_name || 'Unnamed Item',
        description: item.description || 'No description',
        price: item.selling_price ? parseFloat(item.selling_price) : 0,
      }));
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred while confirming supplies.');
      return [];
    }
  };

  // Get available stock 
  const getAvailableStock = async (items: any, storeId: string) => {
    try {
      const itemIds = items.map((item: any) => item.id);
      const { data: stockData, error: stockError } = await supabase
        .rpc('get_total_stock_for_items_by_store', { item_ids: itemIds, p_store_id: storeId });

      if (stockError) {
        console.error('Supabase stock error:', stockError.message);
        return [];
      }

      return stockData ?? [];
    } catch (err) {
      console.error('Unexpected stock fetch error:', err);
      return [];
    }
  };

  const handleConfirmSupplies = async () => {
    // Fetch data for new supplies
    const tempSuppliesData = await fetchTempSuppliesData(tempSelectedSupplies) || [];

    // Merge with existing selected supplies, avoiding duplicates
    const newSelectedSupplyIds = [...new Set([...tempSelectedSupplies, ...selectedSupplies.map(s => s.id)])];
    const newSelectedSupplies = [
      ...selectedSupplies.filter(s => newSelectedSupplyIds.includes(s.id)),
      ...tempSuppliesData
    ];
    setSelectedSupplies(newSelectedSupplies);
    const itemAvailableStocks =
      (await getAvailableStock(tempSuppliesData, watchedFields.storeId as string)) || [];

    // Append to invoice form fields
    tempSuppliesData.forEach((supply) => {
      // Get availableStock from filteredSupplies if present
      const availableStock = itemAvailableStocks.find(item => item.item_id === supply.id)?.total_qty ?? 0;

      append({
        id: supply.id,
        name: supply.name,
        quantity: 1,
        unitPrice: supply.price,
        discount: 0,
        total: supply.price,
        availableStock, 
      });
    });

    // Clear validation errors
    clearValidationErrors();
    setItemSearchTerm('');
    setShowSuppliesDropdown(false);
    setTempSelectedSupplies([]);
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const qty = typeof (item as any).quantity === 'number' && !isNaN((item as any).quantity) ? (item as any).quantity : 0;
    const price = typeof (item as any).unitPrice === 'number' && !isNaN((item as any).unitPrice) ? (item as any).unitPrice : 0;
    const discount = typeof item.discount === 'number' && !isNaN(item.discount) ? item.discount : 0;
    let total = qty * price;
    if (discount) {
      total *= 1 - discount / 100;
    }
    return Math.max(total, 0);
  };

  const calculateTotal = () => {
    const itemsTotal = watchedFields.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    return itemsTotal + (watchedFields.additionalCharges || 0);
  };

  // Helper function to get detailed inventory information for debugging
  // const getInventoryDetails = async (itemId: string) => {
  //   try {
  //     const { data: inventoryRows, error } = await supabase
  //       .from('inventory_mgmt')
  //       .select('id, item_qty, created_at, store_id, purchase_order_id')
  //       .eq('item_id', itemId)
  //       .eq('company_id', companyId)
  //       .order('created_at', { ascending: true });

  //     if (error) {
  //       console.error('Error fetching inventory details:', error);
  //       return null;
  //     }

  //     return inventoryRows;
  //   } catch (error) {
  //     console.error('Error in getInventoryDetails:', error);
  //     return null;
  //   }
  // };

  // New function to restore inventory quantities using FIFO logic
  const restoreInventoryQuantitiesFIFO = async (itemId: string, quantityToRestore: number) => {
    try {
      console.log(`Starting FIFO restoration for item ${itemId}, quantity to restore: ${quantityToRestore}`);
      
      // Get all inventory rows for this item, ordered by creation date (oldest first)
      const { data: inventoryRows, error: fetchError } = await supabase
        .from('inventory_mgmt')
        .select('id, item_qty, created_at, store_id, purchase_order_id')
        .eq('item_id', itemId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true }); // Oldest first for FIFO

      if (fetchError) {
        throw new Error(`Failed to fetch inventory rows: ${fetchError.message}`);
      }

      if (!inventoryRows || inventoryRows.length === 0) {
        throw new Error(`No inventory found for item ID: ${itemId}`);
      }

      console.log(`Found ${inventoryRows.length} inventory rows for item ${itemId}`);
      
      // Log current inventory state
      inventoryRows.forEach((row, index) => {
        console.log(`Row ${index + 1}: ID=${row.id}, Qty=${row.item_qty}, Created=${row.created_at}`);
      });

      let remainingQuantity = quantityToRestore;
      const updates: Array<{ id: string; newQuantity: number; oldQuantity: number }> = [];

      // Process each row in FIFO order to restore quantities
      for (const row of inventoryRows) {
        if (remainingQuantity <= 0) break;

        const currentQuantity = row.item_qty || 0;
        const maxCapacity = 999999; // Set a reasonable maximum capacity
        const availableSpace = maxCapacity - currentQuantity;

        if (availableSpace <= 0) {
          console.log(`Skipping row ${row.id} - no space available (current: ${currentQuantity}, max: ${maxCapacity})`);
          continue; // Skip full rows
        }

        if (availableSpace >= remainingQuantity) {
          // This row has enough space
          const newQuantity = currentQuantity + remainingQuantity;
          updates.push({
            id: row.id,
            newQuantity,
            oldQuantity: currentQuantity
          });
          console.log(`Row ${row.id}: Restoring from ${currentQuantity} to ${newQuantity} (remaining: 0)`);
          remainingQuantity = 0;
        } else {
          // This row doesn't have enough space, fill it up
          updates.push({
            id: row.id,
            newQuantity: maxCapacity,
            oldQuantity: currentQuantity
          });
          console.log(`Row ${row.id}: Restoring from ${currentQuantity} to ${maxCapacity} (remaining: ${remainingQuantity - availableSpace})`);
          remainingQuantity -= availableSpace;
        }
      }

      // If we still have remaining quantity, add it to the first row
      if (remainingQuantity > 0 && inventoryRows.length > 0) {
        const firstRow = inventoryRows[0];
        const currentQuantity = firstRow.item_qty || 0;
        const existingUpdate = updates.find(u => u.id === firstRow.id);
        
        if (existingUpdate) {
          existingUpdate.newQuantity += remainingQuantity;
          console.log(`Row ${firstRow.id}: Adding remaining ${remainingQuantity} to existing update`);
        } else {
          updates.push({
            id: firstRow.id,
            newQuantity: currentQuantity + remainingQuantity,
            oldQuantity: currentQuantity
          });
          console.log(`Row ${firstRow.id}: Adding remaining ${remainingQuantity} (new total: ${currentQuantity + remainingQuantity})`);
        }
      }

      console.log(`Total quantity to restore: ${quantityToRestore}, Updates needed: ${updates.length}`);

      // Apply all updates
      for (const update of updates) {
        console.log(`Updating row ${update.id}: ${update.oldQuantity} -> ${update.newQuantity}`);
        
        const { error: updateError } = await supabase
          .from('inventory_mgmt')
          .update({ item_qty: update.newQuantity })
          .eq('id', update.id);

        if (updateError) {
          throw new Error(`Failed to update inventory row ${update.id}: ${updateError.message}`);
        }
      }

      console.log(`FIFO restoration completed successfully for item ${itemId}`);
      return true;
    } catch (error) {
      console.error('Error in FIFO inventory restoration:', error);
      throw error;
    }
  };

  // Function to handle form submission with proper validation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing validation errors
    clearValidationErrors();
    
    // Trigger validation for all fields
    const isValid = await trigger();
    
    if (!isValid) {
      setFormStatus('error');
      setError('Please fix the validation errors before submitting.');
      return;
    }
    
    // If validation passes, submit the form
    handleSubmit(onSubmit)(e);
  };

  // New function to reduce inventory quantities
  const reduceInventoryQuantitiesFIFO = async (itemId: string, requiredQuantity: number, storeId: string) => {
    try {

      // Get all inventory rows for this item in the specific store
      const { data: inventoryRows, error: fetchError } = await supabase
        .from('inventory_mgmt')
        .select('id, item_qty, created_at, store_id, purchase_order_id')
        .eq('item_id', itemId)
        .eq('store_id', storeId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch inventory rows: ${fetchError.message}`);
      }

      if (!inventoryRows || inventoryRows.length === 0) {
        throw new Error(`No inventory found for item ID ${itemId} in store ID ${storeId}`);
      }

      console.log(`Found ${inventoryRows.length} inventory rows for item ${itemId}`);
      
      // Log current inventory state
      inventoryRows.forEach((row, index) => {
        console.log(`Row ${index + 1}: ID=${row.id}, Qty=${row.item_qty}, Created=${row.created_at}`);
      });

      let remainingQuantity = requiredQuantity;
      const updates: Array<{ id: string; newQuantity: number; oldQuantity: number }> = [];

      // Process each row in FIFO order within the store
      for (const row of inventoryRows) {
        if (remainingQuantity <= 0) break;

        const availableInRow = row.item_qty || 0;
        if (availableInRow <= 0) {
          console.log(`Skipping row ${row.id} - no quantity available`);
          continue; // Skip rows with no quantity
        }

        if (availableInRow >= remainingQuantity) {
          // This row has enough quantity
          const newQuantity = availableInRow - remainingQuantity;
          updates.push({
            id: row.id,
            newQuantity,
            oldQuantity: availableInRow
          });
          console.log(`Row ${row.id}: Reducing from ${availableInRow} to ${newQuantity} (remaining: 0)`);
          remainingQuantity = 0;
        } else {
          // This row doesn't have enough, take all from it
          updates.push({
            id: row.id,
            newQuantity: 0,
            oldQuantity: availableInRow
          });
          console.log(`Row ${row.id}: Reducing from ${availableInRow} to 0 (remaining: ${remainingQuantity - availableInRow})`);
          remainingQuantity -= availableInRow;
        }
      }

      // Check if we have enough total quantity
      const totalAvailable = inventoryRows.reduce((sum, row) => sum + (row.item_qty || 0), 0);
      if (totalAvailable < requiredQuantity) {
        throw new Error(`Insufficient inventory in store ${storeId}. Available: ${totalAvailable}, Required: ${requiredQuantity}`);
      }

      console.log(`Total available: ${totalAvailable}, Required: ${requiredQuantity}, Updates needed: ${updates.length}`);

      // Apply all updates
      for (const update of updates) {
        console.log(`Updating row ${update.id}: ${update.oldQuantity} -> ${update.newQuantity}`);

        const { error: updateError } = await supabase
          .from('inventory_mgmt')
          .update({ item_qty: update.newQuantity })
          .eq('id', update.id);

        if (updateError) {
          throw new Error(`Failed to update inventory row ${update.id}: ${updateError.message}`);
        }
      }

      console.log(`FIFO reduction completed successfully for item ${itemId} in store ${storeId}`);
      return true;
    } catch (error) {
      console.error('Error in FIFO inventory reduction:', error);
      throw error;
    }
  };

  const checkStockAvailability = async (items: InvoiceItem[], storeId: string) => {
    const stockErrors: string[] = [];

    try {
      const itemIds = items.map(item => item.id);

      // Call the RPC once for all items
      const { data: stockData, error: stockError } = await supabase
        .rpc('get_total_stock_for_items_by_store', { item_ids: itemIds, p_store_id: storeId });

      if (stockError) {
        stockErrors.push(`Unable to check stock availability - ${stockError.message}`);
        return stockErrors;
      }

      // Convert RPC result into a quick lookup map
      const stockMap = ((stockData as StockRow[]) || []).reduce((acc: Record<string, number>, s: any) => {
        acc[s.item_id] = Number(s.total_qty) || 0;
        return acc;
      }, {} as Record<string, number>);

      // Compare available vs required for each item
      for (const item of items) {
        // availableStock in form during edit already includes previous qty
        const formAvailable = typeof item.availableStock === 'number' ? item.availableStock : undefined;
        const totalAvailableStock = formAvailable !== undefined ? formAvailable : (stockMap[item.id] ?? 0);
        const requiredQuantity = item.quantity || 0;

        if (totalAvailableStock < requiredQuantity) {
          stockErrors.push(
            `${item.name}: Available ${totalAvailableStock}, Required ${requiredQuantity}`
          );
        }
      }
    } catch (error) {
      stockErrors.push(`Unable to check stock availability - unexpected error`);
    }

    return stockErrors;
  };

  const handleItemChange = async (index: number, field: keyof InvoiceItem, value: any) => {
    const currentItem = watchedFields.items[index];
    let updatedItem = { ...currentItem, [field]: value };

    if (field === 'discount') {
      if (value === '') {
        (updatedItem as any).discount = undefined;
      } else {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          (updatedItem as any).discount = undefined;
        } else {
          (updatedItem as any).discount = parsed;
        }
      }
    } else if (field === 'quantity') {
      if (value === '') {
        (updatedItem as any).quantity = undefined;
      } else {
        const parsed = parseInt(value);
        if (isNaN(parsed)) {
          (updatedItem as any).quantity = undefined;
        } else {
          const maxAllowed = updatedItem.availableStock ?? Infinity;
          (updatedItem as any).quantity = parsed;
          if (typeof maxAllowed === 'number' && !isNaN(maxAllowed) && parsed > maxAllowed) {
            (updatedItem as any).quantity = maxAllowed as any;
            toast.error(`Quantity cannot exceed available stock (${maxAllowed})`);
          }
        }
      }
    } else if (field === 'unitPrice') {
      if (value === '') {
        (updatedItem as any).unitPrice = undefined;
      } else {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          (updatedItem as any).unitPrice = undefined;
        } else {
          (updatedItem as any).unitPrice = parsed;
        }
      }
    }

    updatedItem.total = calculateItemTotal(updatedItem);
    setValue(`items.${index}`, updatedItem);
    // Don't trigger validation here - let it happen on form submit
  };

   const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
  console.log('Form submitted with data:', data);
  setError('');
  setFormStatus('submitting');
  
  try {
    setIsLoading(true);

    // Check stock availability before proceeding
    const stockErrors = await checkStockAvailability(data.items, data?.storeId ?? '');
    if (stockErrors.length > 0) {
      throw new Error(`Insufficient stock for the following items:\n${stockErrors.join('\n')}`);
    }

    // Calculate amounts for invoice
    // 1. Gross amount (before discounts) + additional charges
    const grossItemsTotal = data.items.reduce((sum, item) => {
      const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemSubtotal;
    }, 0);
    const grossAmount = grossItemsTotal + (data.additionalCharges || 0);

    // 2. Total discount amount (convert percentage to actual amount)
    const totalDiscountAmount = data.items.reduce((sum, item) => {
      const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountPercentage = item.discount || 0; // This is percentage from UI
      const discountAmount = (itemSubtotal * discountPercentage) / 100; // Convert to actual amount
      return sum + discountAmount;
    }, 0);

    // 3. Net amount (after discounts) = gross amount - discount amount
    const netAmount = grossAmount - totalDiscountAmount;

    // Start a transaction by using multiple operations
    const invoicePayload = {
      invoice_number: data.invoiceNumber,
      invoice_date: data.date,
      customer_name: data.customerName,
      billing_address: data.billingAddress,
      contact_number: data.contactNumber,
      email: data.email || null,
      total_items: data.items.length,
      invoice_amount: grossAmount, // Gross amount (before discounts)
      discount_amount: totalDiscountAmount, // Total discount amount
      net_amount: netAmount, // Final amount (after discounts)
      created_at: new Date().toISOString(),
      created_by: userId,
      company_id: companyId,
      customer_id: selectedCustomer?.id,
      store_id: data?.storeId,
    };

    let invoiceId: string;

    if (isEditing && id) {
      // For editing, restore previous quantities first
      const { data: existingItems } = await supabase
        .from('sales_invoice_items')
        .select('item_id, quantity')
        .eq('sales_invoice_id', id);

      if (existingItems) {
        // Restore quantities for existing items using FIFO logic
        for (const item of existingItems) {
          const prevQty = item.quantity || 0;
          await restoreInventoryQuantitiesFIFO(item.item_id, prevQty);
        }
      }

      const { data: updatedInvoice, error } = await supabase
        .from('sales_invoice')
        .update(invoicePayload)
        .eq('id', id)
        .select()
        .single();
      if (error || !updatedInvoice) throw error || new Error('Invoice update failed');
      invoiceId = updatedInvoice.id;
      await supabase.from('sales_invoice_items').delete().eq('sales_invoice_id', id);

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Sales Invoice',
        scope: 'Edit',
        key: `${invoicePayload.invoice_number}`,
        log: `Invoice: ${invoicePayload.invoice_number} updated.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;
    } else {
      const { data: newInvoice, error } = await supabase
        .from('sales_invoice')
        .insert([invoicePayload])
        .select()
        .single();
      if (error || !newInvoice) throw error || new Error('Invoice creation failed');
      invoiceId = newInvoice.id;

      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Sales Invoice',
        scope: 'Add',
        key: `${invoicePayload.invoice_number}`,
        log: `Invoice: ${invoicePayload.invoice_number} created.`,
        action_by: userId,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;
    }

    // Insert invoice items with individual discount percentages
    const itemsPayload = data.items.map((item) => ({
      sales_invoice_id: invoiceId,
      item_id: item.id,
      quantity: item.quantity || 0,
      unit_price: item.unitPrice || 0,
      discount_percentage: item.discount || 0,
      company_id: companyId,
      created_at: new Date().toISOString(),
    }));

    if (itemsPayload.length > 0) {
      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(itemsPayload);
      if (itemsError) throw itemsError;
    }

    // Reduce inventory quantities for each item using FIFO logic
    for (const item of data.items) {
      try {
        const currentQty = item.quantity || 0;
        // On edit, availableStock already includes previous quantity, so the delta is:
        // newlyAdded = max(0, currentQty - (availableStock - baseStock)) but simpler:
        // We restored previous quantities earlier; now reduce exactly the currentQty.
        await reduceInventoryQuantitiesFIFO(item.id, currentQty, data?.storeId ?? '');
      } catch (itemError: any) {
        console.error('Error updating inventory for item:', itemError);
        throw new Error(`Failed to update inventory for item ${item.name}: ${itemError.message}`);
      }
    }

    toast.success(`${isEditing ? 'Invoice updated successfully!' : 'Invoice created successfully!'}`);
    setFormStatus('success');
    setTimeout(() => navigate('/dashboard/invoice'), 1000);
  } catch (error: any) {
    console.error('Error submitting form:', error);
    setError(error.message || 'Failed to save invoice. Please check all fields and try again.');
    setFormStatus('error');
  } finally {
    setIsLoading(false);
  }
};


  if (isLoading && isEditing) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading invoice data...</p>
      </div>
    );
  }

  const hasUnsavedChanges = isDirty || JSON.stringify(watchedFields) !== JSON.stringify(initialValuesRef.current || {});

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowCancelDialog(true);
              } else {
                navigate('/dashboard/invoice');
              }
            }}
            className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Update Invoice' : 'Create New Invoice'}
              </h1>
              <p className="text-gray-600">Create or update invoice details</p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800">Invoice Information</CardTitle>
            <CardDescription className="text-blue-600">
              {isEditing ? 'Update the invoice details below' : 'Fill in the invoice details below to create a new invoice'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               

                <div className="space-y-2 group">
                  <Label
                    htmlFor="invoiceNumber"
                    className={`${errors.invoiceNumber ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <FileText className="h-4 w-4" /> Invoice Number
                  </Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="INV-YYYY-XXX"
                    {...register('invoiceNumber')}
                    className={`${errors.invoiceNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 bg-gray-50 ${watchedFields.invoiceNumber ? 'border-blue-300' : ''}`}
                    readOnly
                  />
                  {errors.invoiceNumber && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.invoiceNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 group">
                  <Label
                    htmlFor="store"
                    className={`${errors.storeId ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <Store className="h-4 w-4" /> Store
                  </Label>
                  <Select onValueChange={handleStoreChange} value={selectedStore}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                                             {stores.map((store) => (
                         <SelectItem key={store.id} value={store.id}>
                           {store.name}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                  {!selectedStore && (
                    <p className="text-sm text-blue-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Please select a store to search for items
                    </p>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="date"
                    className={`${errors.date ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <Calendar className="h-4 w-4" /> Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    {...register('date')}
                    onChange={() => {
                      // Clear validation errors when user starts typing
                      if (errors.date) {
                        clearValidationErrors();
                      }
                    }}
                    className={`${errors.date ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.date ? 'border-blue-300' : ''}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.date.message}
                    </p>
                  )}
                </div>

                <div ref={containerRef} className="space-y-2 group relative">
                  <Label className={`text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}>
                    <User className="h-4 w-4" /> Customer Name
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Search customer by name or customer ID..."
                      value={isEditing ? selectedCustomer?.fullname : customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        if (selectedCustomer) {
                          setSelectedCustomer(undefined); // Clear selection if user edits the input
                        }
                      }}
                      onFocus={() => {
                        if (
                          filteredCustomers.length > 0 &&
                          (!selectedCustomer || customerSearchTerm.trim().toLowerCase() !== selectedCustomer.fullname.toLowerCase())
                        ) {
                          setShowCustomerDropdown(true);
                        }
                      }}
                      className={`pr-4 py-2 rounded-md shadow-sm focus:ring-4 ${errors.customerName
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                        } transition-all duration-200`}
                    />
                    {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /> */}
                  </div>
                  {errors.customerName && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.customerName.message}
                    </p>
                  )}
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                      {/* Header */}
                      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Available Customers ({filteredCustomers.length})
                          </span>
                        </div>
                      </div>

                      {/* List of Customers */}
                      <div className="max-h-80 overflow-y-auto">
                        {filteredCustomers.map((customer, index) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors duration-200 ${index !== filteredCustomers.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <div className="flex justify-between items-start">
                              {/* Customer Details */}
                              <div className='flex'>
                                <div className='me-3'>
                                  <User className="h-4 w-4 text-gray-400 mt-1" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-gray-900 text-sm">{customer.fullname}</p>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>ID:</span>
                                    <span className="text-gray-600">{customer.customer_id || customer.id}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Customer Type Badge */}
                              <div className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeStyles(customer.type)}`}>
                                {customer.type}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showCustomerDropdown && customerSearchTerm.trim().length >= 3 && filteredCustomers.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="p-4 text-center text-gray-500 text-sm">
                        <p className='mb-2'>No customers found for "{customerSearchTerm}"</p>
                        <Button
                          onClick={() => navigate('/dashboard/customer-management/add')}
                          className="transition-colors"
                          type='button'
                        >
                          Create Customer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="contactNumber"
                    className={`${errors.contactNumber ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <Phone className="h-4 w-4" /> Contact Number
                  </Label>
                  <Input
                    id="contactNumber"
                    value={selectedCustomer?.phone ?? ''}
                    readOnly
                    placeholder="10 digits"
                    onChange={() => {
                      // Clear validation errors when user starts typing
                      if (errors.contactNumber) {
                        clearValidationErrors();
                      }
                    }}
                    className={`${errors.contactNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.contactNumber ? 'border-blue-300' : ''}`}
                  />
                  {errors.contactNumber && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.contactNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="email"
                    className={`${errors.email ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <Input
                    id="email"
                    value={selectedCustomer?.email ?? ''}
                    readOnly
                    placeholder="example@example.com"
                    onChange={() => {
                      // Clear validation errors when user starts typing
                      if (errors.email) {
                        clearValidationErrors();
                      }
                    }}
                    className={`${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.email ? 'border-blue-300' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label
                    htmlFor="billingAddress"
                    className={`${errors.billingAddress ? 'text-red-500' : 'text-gray-700'} group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                  >
                    <MapPin className="h-4 w-4" /> Billing Address
                  </Label>
                  <Textarea
                    id="billingAddress"
                    value={selectedCustomer?.address ?? ''}
                    readOnly
                    placeholder="Billing address"
                    onChange={() => {
                      // Clear validation errors when user starts typing
                      if (errors.billingAddress) {
                        clearValidationErrors();
                      }
                    }}
                    className={`w-full resize-none min-h-[100px] ${errors.billingAddress ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${watchedFields.billingAddress ? 'border-blue-300' : ''}`}
                  />
                  {errors.billingAddress && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.billingAddress.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 group relative">
                  <Label className="text-gray-700 group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium">
                    <Search className="h-4 w-4" /> Search Items
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={selectedStore ? "Search for items by name or description..." : "Please select a store first"}
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      onFocus={() => selectedStore && setShowSuppliesDropdown(true)}
                      disabled={!selectedStore}
                      className={`pl-10 pr-4 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${
                        selectedStore 
                          ? 'border-gray-200 focus:border-blue-500 focus:ring-blue-200' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                      }`}
                    />
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                      selectedStore ? 'text-gray-400' : 'text-gray-300'
                    }`} />
                  </div>

                  {showSuppliesDropdown && filteredSupplies.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Available Items ({filteredSupplies.length})
                          </span>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {filteredSupplies.map((supply, index) => (
                          <div
                            key={supply.id}
                            className={`p-3 hover:bg-blue-50 transition-colors duration-200 ${index !== filteredSupplies.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={
                                    tempSelectedSupplies.includes(supply.id) ||
                                    selectedSupplies.some((s) => s.id === supply.id)
                                  }
                                  onCheckedChange={() => {
                                    const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent<HTMLButtonElement>;
                                    handleSupplyToggle(supply, syntheticEvent);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="h-3 w-3 text-gray-400" />
                                    <p className="font-medium text-gray-900 text-sm">{supply.name}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 ml-5">{supply.description}</p>
                                  <p className="text-xs text-gray-500 ml-5">Stock: {supply.availableStock ?? 0}</p>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-blue-600 text-sm">${supply.price.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">per unit</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{tempSelectedSupplies.length + selectedSupplies.length} selected</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTempSelectedSupplies([]);
                              setShowSuppliesDropdown(false);
                              setItemSearchTerm('');
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

                  {showSuppliesDropdown && itemSearchTerm && filteredSupplies.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="p-6 text-center">
                        <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No items found matching "{itemSearchTerm}"</p>
                        <p className="text-gray-400 text-xs mt-1">Try adjusting your search terms</p>
                      </div>
                    </div>
                  )}
                  {errors.items && typeof errors.items === 'object' && errors.items.message && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.items.message}
                    </p>
                  )}
                </div>

                {fields.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-700 font-medium flex items-center gap-2">
                        Invoice Items
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {fields.length}
                        </span>
                      </Label>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800 w-[30%]">
                              Item Name
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">
                              Unit Price
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">
                              Discount (%)
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">
                              Total
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-blue-800">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((item, index) => {
                            const field = watchedFields.items[index];
                            return (
                              <tr key={item.id} className="border-t hover:bg-gray-50">
                                {/* Item Name */}
                                <td className="px-4 py-3 align-top">
                                  <div>
                                    <p className="font-medium text-gray-900">{field?.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Available Stock:{' '}
                                      {displayStockMap[field?.id as string] ??
                                        field?.availableStock ??
                                        0}
                                    </p>
                                    {errors.items?.[index]?.name && (
                                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.items[index]?.name?.message}
                                      </p>
                                    )}
                                    {errors.items?.[index]?.id && (
                                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {errors.items[index]?.id?.message}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Quantity */}
                                <td className="px-4 py-3">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={field?.quantity ?? ''}
                                    onChange={(e) => {
                                      handleItemChange(index, 'quantity', e.target.value);
                                      if (errors.items?.[index]?.quantity)
                                        clearValidationErrors();
                                    }}
                                    className="h-8 w-24 text-sm"
                                  />
                                  {errors.items?.[index]?.quantity && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {errors.items[index]?.quantity?.message}
                                    </p>
                                  )}
                                  {field?.availableStock !== undefined &&
                                    field?.quantity !== undefined &&
                                    (field?.availableStock || 0) < (field?.quantity || 0) && (
                                      <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Quantity exceeds available stock (
                                        {field?.availableStock || 0})
                                      </p>
                                    )}
                                </td>

                                {/* Unit Price */}
                                <td className="px-4 py-3">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={field?.unitPrice ?? ''}
                                    onChange={(e) => {
                                      handleItemChange(index, 'unitPrice', e.target.value);
                                      if (errors.items?.[index]?.unitPrice)
                                        clearValidationErrors();
                                    }}
                                    className="h-8 w-24 text-sm"
                                  />
                                  {errors.items?.[index]?.unitPrice && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {errors.items[index]?.unitPrice?.message}
                                    </p>
                                  )}
                                </td>

                                {/* Discount */}
                                <td className="px-4 py-3">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={field?.discount ?? ''}
                                    onChange={(e) => {
                                      handleItemChange(index, 'discount', e.target.value);
                                      if (errors.items?.[index]?.discount)
                                        clearValidationErrors();
                                    }}
                                    className="h-8 w-24 text-sm"
                                  />
                                  {errors.items?.[index]?.discount && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {errors.items[index]?.discount?.message}
                                    </p>
                                  )}
                                </td>

                                {/* Total */}
                                <td className="px-4 py-3 text-blue-600 font-semibold">
                                  {formatCurrency(calculateItemTotal(field))}
                                  {errors.items?.[index]?.total && (
                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {errors.items[index]?.total?.message}
                                    </p>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="px-4 py-3">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      remove(index);
                                      setSelectedSupplies((prev) =>
                                        prev.filter((supply) => supply.id !== item.id)
                                      );
                                      clearValidationErrors();
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full p-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {!selectedStore ? 'Select a store first' : 'No items added yet'}
                    </p>
                    <p className="text-sm">
                      {!selectedStore 
                        ? 'Choose a store from the dropdown above to start searching for items' 
                        : 'Search and select items above to add them to your invoice'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <div className="text-right">
                  <Label className="text-gray-700 font-medium">Total Amount</Label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        setShowCancelDialog(true);
                      } else {
                        navigate('/dashboard/invoice');
                      }
                    }}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {(isSubmitting || isLoading) ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : formStatus === 'success' ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {isEditing ? 'Updated!' : 'Created!'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {/* <DollarSign className="h-4 w-4" /> */}
                        {isEditing ? 'Update Invoice' : 'Create Invoice'}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg text-blue-600">Unsaved Changes</DialogTitle>
              <p className="text-sm text-gray-600">Are you sure you want to cancel? Unsaved changes will be lost.</p>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                No
              </Button>
              <Button variant="destructive" onClick={() => navigate('/dashboard/invoice')}>
                Yes, Discard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}