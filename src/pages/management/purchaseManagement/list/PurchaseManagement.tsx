import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/Utils/types/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Download,
} from 'lucide-react';
import { IPurchaseOrder, ISystemMessageConfig, IUser } from '@/Utils/constants';
import { formatCurrency } from '@/Utils/formatters';
import { exportSupabaseTableToCSV } from '@/Utils/csvExport';
import { format } from 'date-fns';

interface PurchaseOrderDisplay {
  id: string;
  poNumber: string;
  dateOfOrder: string;
  supplierName: string;
  supplierEmail: string;
  status: string;
  totalItems: number;
  totalAmount: number;
}

// interface IPurchaseOrder {
//   id: string;
//   po_number: string | null;
//   order_date: string | null;
//   order_status: string | null;
//   total_items: number | null;
//   total_value: number | null;
//   supplier_id: string | null;
//   is_active: boolean;
// }

type SortField =
  | 'poNumber'
  | 'dateOfOrder'
  | 'supplierName'
  | 'status'
  | 'totalItems'
  | 'totalAmount';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dateOfOrder',
    direction: 'desc',
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<PurchaseOrderDisplay>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDisplay[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusOptions, setStatusOptions] = useState<ISystemMessageConfig[]>([]);
  const user = localStorage.getItem("userData");
  const userData: IUser | null = user ? JSON.parse(user) : null;
  const companyId = userData?.company_id || null;

  const statusStyles: Record<ISystemMessageConfig['sub_category_id'], string> = {
    ORDER_CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
    APPROVER_COMPLETED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    ORDER_RECEIVED: 'bg-green-100 text-green-800 border-green-300',
    APPROVAL_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ORDER_CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    ORDER_PARTIALLY_RECEIVED: 'bg-lime-100 text-lime-800 border-lime-300',
    ORDER_ISSUED: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  useEffect(() => {
    if (!companyId) return;

    const fetchStatusOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('system_message_config')
          .select('*')
          .eq('company_id', companyId)
          .eq("category_id", 'PURCHASE_ORDER');
        if (error) {
          console.error('Error fetching status options:', error);
          toast.error('Failed to fetch status options. Please try again.');
          return;
        }

        setStatusOptions(data);
        console.log('Fetched Status Options:', data);
      } catch (error) {
        console.error('Unexpected error fetching status options:', error);
        toast.error('An unexpected error occurred while fetching status options.');
      }
    };
    fetchStatusOptions();
  }, []);

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setIsLoading(true);

      // Get company_id from userData in localStorage
      const userDataString = localStorage.getItem('userData');
      let companyId = null;
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          companyId = userData.company_id;
        } catch (e) {
          toast.error('Invalid user data in local storage');
          setIsLoading(false);
          return;
        }
      }
      if (!companyId) {
        toast.error('Company ID not found in user data');
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('purchase_order')
          .select(
            `
              id,
              po_number,
              order_date,
              order_status,
              total_items,
              total_value,
              supplier_mgmt!purchase_order_supplier_id_fkey (
                supplier_name,
                email
              ),
              is_active
            `,
            { count: 'exact' }
          )
          .eq('is_active', true)
          .eq('company_id', companyId); // <-- Filter by company_id

        console.log('Filter Parameters:', {
          searchTerm,
          statusFilter,
          dateFromFilter,
          dateToFilter,
          sortConfig,
          currentPage,
          itemsPerPage,
        });

        if (searchTerm.trim()) {
          const sanitizedSearch = searchTerm.trim().replace(/[%_]/g, '\\$&');
          const { data: suppliers, error: supplierError } = await supabase
            .from('supplier_mgmt')
            .select('id')
            .eq('company_id', companyId)
            .ilike('supplier_name', `%${sanitizedSearch}%`);

          if (supplierError) {
            console.error('Error fetching supplier IDs:', supplierError);
            toast.error('Failed to fetch supplier matches. Please try again.');
            setIsLoading(false);
            return;
          }

          if (suppliers.length > 0) {
            const supplierIds = suppliers.map((s) => s.id).join(',');
            query = query.or(
              `po_number.ilike.%${sanitizedSearch}%,supplier_id.in.(${supplierIds})`
            );
          } else {
            query = query.ilike('po_number', `%${sanitizedSearch}%`);
          }
        }

        if (statusFilter !== 'all') {
          query = query.eq('order_status', statusFilter);
        }

        if (dateFromFilter && dateToFilter) {
          query = query
            .gte('order_date', dateFromFilter)
            .lte('order_date', dateToFilter);
        }

        const fieldMap: Record<SortField, string> = {
            poNumber: 'po_number',
            dateOfOrder: 'order_date',
            supplierName: 'supplier_mgmt.supplier_name',
            status: 'order_status',
            totalItems: 'total_items',
            totalAmount: 'total_value',
          };
        if (sortConfig.field && sortConfig.direction) {
          query = query.order(fieldMap[sortConfig.field], {
            ascending: sortConfig.direction === 'asc',
          })
            .order('id', { ascending: true });
        } else {
          query = query.order('id', { ascending: true });
        }

        query = query.range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching purchase orders:', error);
          toast.error('Failed to fetch purchase orders. Please try again.');
          setIsLoading(false);
          return;
        }

        const formattedOrders: PurchaseOrderDisplay[] = data?.map((order: any) => ({
          id: order.id,
          poNumber: order.po_number ?? 'N/A',
          dateOfOrder: order.order_date ?? 'Unknown',
          supplierName: order.supplier_mgmt?.supplier_name ?? 'Unknown',
          supplierEmail: order.supplier_mgmt?.email ?? 'N/A',
          status: order.order_status ?? 'Unknown',
          totalItems: order.total_items ?? 0,
          totalAmount: order.total_value ?? 0,
        })) || [];

        console.log('Raw Data:', data);
        console.log('Fetched Orders:', formattedOrders);
        console.log('Total Count:', count);

        setPurchaseOrders(formattedOrders);
        setTotalItems(count || 0);
      } catch (error) {
        console.error('Unexpected error fetching purchase orders:', error);
        toast.error('An unexpected error occurred while fetching purchase orders.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, [
    searchTerm,
    statusFilter,
    dateFromFilter,
    dateToFilter,
    sortConfig,
    currentPage,
    itemsPerPage,
  ]);

  // Export Purchase Orders data
  const exportPurchaseOrdersToCSV = async () => {

    await exportSupabaseTableToCSV<IPurchaseOrder>({
      reportTitle: 'Purchase Orders Data',
      headers: ['PO Number', 'Order Date', 'Supplier Name', 'Supplier Email', 'Order Status', 'Total Items Ordered', 'Total Cost'],
      rowMapper: (po: any) => [
        `"${po.po_number}"`,
        `"${format(new Date(po.order_date), 'dd MMM yyyy')}"`,
        `"${po.supplier.supplier_name}"`,
        `"${po.supplier.email}"`,
        `"${po.order_status.sub_category_id.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}"`,
        `"${po.total_items}"`,
        `"${po.total_value}"`,
      ],
      supabaseClient: supabase,
      fetcher: async (): Promise<IPurchaseOrder[]> => {
        let query = supabase
          .from('purchase_order')
          .select(`*,
            supplier:supplier_mgmt!purchase_order_supplier_id_fkey(supplier_name, email),
            order_status:system_message_config!purchase_order_order_status_fkey(sub_category_id)
            `)
          .eq('is_active', true)
          .eq('company_id', companyId || '');

        query = query.order('order_date', { ascending: true });

        if (searchTerm.trim()) {
          const sanitizedSearch = searchTerm.trim().replace(/[%_]/g, '\\$&');
          const { data: suppliers, error: supplierError } = await supabase
            .from('supplier_mgmt')
            .select('id')
            .eq('company_id', companyId || '')
            .ilike('supplier_name', `%${sanitizedSearch}%`);

          if (supplierError) {
            console.error('Error fetching supplier IDs:', supplierError);
            toast.error('Failed to fetch supplier matches. Please try again.');
            setIsLoading(false);
            return [];
          }

          if (suppliers.length > 0) {
            const supplierIds = suppliers.map((s) => s.id).join(',');
            query = query.or(
              `po_number.ilike.%${sanitizedSearch}%,supplier_id.in.(${supplierIds})`
            );
          } else {
            query = query.ilike('po_number', `%${sanitizedSearch}%`);
          }
        }

        if (statusFilter !== 'all') {
          query = query.eq('order_status', statusFilter);
        }

        if (dateFromFilter && dateToFilter) {
          query = query
            .gte('order_date', dateFromFilter)
            .lte('order_date', dateToFilter);
        }

        if (sortConfig.field && sortConfig.direction) {
          const fieldMap: Record<SortField, string> = {
            poNumber: 'po_number',
            dateOfOrder: 'order_date',
            supplierName: 'supplier_mgmt.supplier_name',
            status: 'order_status',
            totalItems: 'total_items',
            totalAmount: 'total_value',
          };
          query = query.order(fieldMap[sortConfig.field], {
            ascending: sortConfig.direction === 'asc',
          });
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as unknown as IPurchaseOrder[];
      },
      onError: (err: { message: any; }) => toast.error(`Failed to export purchase orders: ${err.message}`),
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedOrders = purchaseOrders;

  const handleSort = (field: SortField) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.field === field) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ field: direction ? field : null, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  const handleEdit = (orderId: string) => {
    navigate(`/dashboard/purchaseOrderForm?edit=${orderId}`);
  };

  const handleView = (orderId: string) => {
    navigate(`/dashboard/purchaseOrderView/${orderId}`);
  };

  const handleApprovalView = (orderId: string) => {
    navigate(`/dashboard/purchase-order-approvals-view/${orderId}`);
  };

  const handleDuplicate = (orderId: string) => {
    navigate(`/dashboard/purchaseOrderForm?duplicate=${orderId}`);
  };

  const handleDelete = (order: PurchaseOrderDisplay) => {
    setShowDeleteDialog(order);
  };

  const confirmDelete = async () => {
    if (showDeleteDialog) {
      try {
        const { error: poError } = await supabase
          .from('purchase_order')
          .update({ is_active: false, modified_at: new Date().toISOString() })
          .eq('id', showDeleteDialog.id);

        if (poError) {
          console.error('Error soft deleting purchase order:', poError);
          toast.error('Failed to soft delete purchase order. Please try again.');
          return;
        }

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .update({ is_active: false, modified_at: new Date().toISOString() })
          .eq('purchase_order_id', showDeleteDialog.id);

        if (itemsError) {
          console.error('Error soft deleting purchase order items:', itemsError);
          toast.error('Failed to soft delete purchase order items. Please try again.');
          return;
        }

        setPurchaseOrders(
          purchaseOrders.filter((order) => order.id !== showDeleteDialog.id)
        );
        setTotalItems(totalItems - 1);
        // Creating system log
        const systemLogs = {
          company_id: companyId,
          transaction_date: new Date().toISOString(),
          module: 'Purchase Management',
          scope: 'Delete',
          key: `${showDeleteDialog.poNumber}`,
          log: `Purchase Order ${showDeleteDialog.poNumber} deleted.`,
          action_by: userData?.id,
          created_at: new Date().toISOString(),
        }

        const { error: systemLogError } = await supabase
          .from('system_log')
          .insert(systemLogs);

        if (systemLogError) throw systemLogError;
        toast.success('Purchase order soft deleted successfully.');
      } catch (error) {
        console.error('Unexpected error soft deleting purchase order:', error);
        toast.error(
          'An unexpected error occurred while soft deleting the purchase order.'
        );
      }
      setShowDeleteDialog(undefined);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error: poError } = await supabase
        .from('purchase_order')
        .update({ is_active: false, modified_at: new Date().toISOString() })
        .in('id', selectedOrders);

      if (poError) {
        console.error('Error bulk soft deleting purchase orders:', poError);
        toast.error('Failed to soft delete selected purchase orders. Please try again.');
        return;
      }

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .update({ is_active: false, modified_at: new Date().toISOString() })
        .in('purchase_order_id', selectedOrders);

      if (itemsError) {
        console.error('Error bulk soft deleting purchase order items:', itemsError);
        toast.error('Failed to soft delete selected purchase order items. Please try again.');
        return;
      }

      setPurchaseOrders(
        purchaseOrders.filter((order) => !selectedOrders.includes(order.id))
      );
      setTotalItems(totalItems - selectedOrders.length);
      setSelectedOrders([]);
      toast.success('Selected purchase orders soft deleted successfully.');
    } catch (error) {
      console.error('Unexpected error bulk soft deleting purchase orders:', error);
      toast.error(
        'An unexpected error occurred while soft deleting purchase orders.'
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSortConfig({ field: 'dateOfOrder', direction: 'desc' });
    setCurrentPage(1);
  };

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

  const isEditDisabled = (status: PurchaseOrderDisplay['status']): boolean => {
    const statusOption = statusOptions.find(option => option.id === status);
    if (!statusOption) return false;

    const disabledStatuses = ['ORDER_RECEIVED', 'ORDER_CANCELLED'];
    return disabledStatuses.includes(statusOption.sub_category_id);
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Purchase Orders
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage your purchase orders and their details
                  </CardDescription>
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={exportPurchaseOrdersToCSV}
                  className="transition-colors me-2"
                  disabled={paginatedOrders.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export CSV</span>
                </Button>
                <Link to="/dashboard/purchaseOrderForm">
                  <Button className="transition-colors">
                    <Plus className="mr-2 h-4 w-4" />
                    Add PO
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full sm:w-1/3">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by PO Number or Supplier Name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.sub_category_id
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, c => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={dateFromFilter}
                    onChange={(e) => {
                      setDateFromFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Date From"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={dateToFilter}
                    onChange={(e) => {
                      setDateToFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Date To"
                  />
                </div>
                <Button
                  variant="outline"
                  className="transition-colors w-full sm:w-auto"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {selectedOrders.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    {selectedOrders.length} order(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrders([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg overflow-hidden border shadow-sm">
              <Table aria-label="Purchase Order Table">
                <TableHeader>
                  <TableRow className="hover:bg-gray-50 border-gray-200">
                    <TableHead className="font-semibold w-[150px]">
                      <button
                        type="button"
                        onClick={() => handleSort('poNumber')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto ps-2 hover:text-blue-600"
                        aria-label={`Sort by PO Number ${sortConfig.field === 'poNumber' ? sortConfig.direction : 'asc'}`}
                      >
                        PO Number
                        {getSortIcon('poNumber')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <button
                        type="button"
                        // onClick={() => handleSort('supplierName')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto ps-2 hover:text-blue-600"
                        aria-label={`Sort by Supplier ${sortConfig.field === 'supplierName' ? sortConfig.direction : 'asc'}`}
                      >
                        Supplier Name
                        {/* {getSortIcon('supplierName')} */}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSort('dateOfOrder')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                        aria-label={`Sort by Order Date ${sortConfig.field === 'dateOfOrder' ? sortConfig.direction : 'asc'}`}
                      >
                        Date of Order
                        {getSortIcon('dateOfOrder')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold flex justify-start items-center">
                      <button
                        type="button"
                        // onClick={() => handleSort('status')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto justify-center hover:text-blue-600"
                        aria-label={`Sort by Status ${sortConfig.field === 'status' ? sortConfig.direction : 'asc'}`}
                      >
                        Status
                        {/* {getSortIcon('status')} */}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('totalItems')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-full justify-end hover:text-blue-600"
                        aria-label={`Sort by Total Items ${sortConfig.field === 'totalItems' ? sortConfig.direction : 'asc'}`}
                      >
                        Total Items Ordered
                        {getSortIcon('totalItems')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('totalAmount')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-full justify-end hover:text-blue-600"
                        aria-label={`Sort by Total Cost ${sortConfig.field === 'totalAmount' ? sortConfig.direction : 'asc'}`}
                      >
                        Total Cost
                        {getSortIcon('totalAmount')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(itemsPerPage).fill(0).map((_, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-45 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-25 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-35 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell className="text-center"><div className="h-6 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium py-3">
                          <p className="ps-2">{order.poNumber}</p>
                        </TableCell>
                        <TableCell>
                          <p className="ps-2">{order.supplierName}</p>
                        </TableCell>
                        <TableCell>{formatDate(order.dateOfOrder)}</TableCell>
                        <TableCell className="text-left">
                          <Badge
                            variant="outline"
                            className={`font-medium capitalize ${statusStyles[statusOptions.find(status => order.status === status.id)!?.sub_category_id]}`}
                          >
                            {statusOptions.find(status => order.status === status.id)?.sub_category_id
                              .replace(/_/g, ' ')
                              .toLowerCase()
                              .replace(/\b\w/g, c => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{order.totalItems}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleView(order.id)}
                                    aria-label={`View purchase order ${order.poNumber}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  View Purchase Order Details
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleEdit(order.id)}
                                      disabled={isEditDisabled(order.status)}
                                      aria-label={`Edit purchase order ${order.poNumber}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isEditDisabled(order.status)
                                    ? "Editing is not allowed for Received or Cancelled Purchase Orders."
                                    : "Edit Purchase Order"
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleApprovalView(order.id)}
                                    aria-label={`View approval details for purchase order ${order.poNumber}`}
                                  >
                                    <FileCheck className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  View Purchase Order Approvals
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDuplicate(order.id)}
                                    aria-label={`Duplicate purchase order ${order.poNumber}`}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Duplicate this Purchase Order
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(order)}
                                    aria-label={`Delete purchase order ${order.poNumber}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Delete Purchase Order
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center py-6">
                          <Package className="h-12 w-12 text-gray-300 mb-2" />
                          <p className="text-base font-medium">
                            {searchTerm.trim()
                              ? 'No purchase orders found matching your search'
                              : 'No purchase orders available'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {searchTerm.trim()
                              ? 'Try adjusting your search terms or filters'
                              : 'Create a new purchase order to get started'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
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
                  {paginatedOrders.length > 0
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
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages || totalPages === 0}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(undefined)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Soft Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to soft delete this purchase order? This will mark the purchase order and its related items as inactive. This action can be reversed by an administrator.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                aria-label="Confirm soft delete purchase order"
              >
                Yes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PurchaseOrderList;