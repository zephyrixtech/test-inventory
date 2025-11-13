import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
// Removed supabase import
import toast from 'react-hot-toast';
// Removed exportSupabaseTableToCSV import
import { Badge } from '@/components/ui/badge';
import { customerService, type Customer } from '@/services/customerService'; // Added customerService import

// Customer interface matching the database structure
// interface Customer {
//   id: string;
//   customer_id: string;
//   fullname: string;
//   phone: string;
//   email?: string;
//   address?: string;
//   type: 'Corporate' | 'Premium' | 'Regular';
//   notes?: string;
//   status: boolean; // true = Active, false = Inactive
//   notifications: boolean;
//   created_at: string;
//   created_by: string;
//   modified_by: string;
//   modified_at: string;
//   is_active: boolean; // true = not deleted, false = deleted
// }

type SortField = 'customerId' | 'name' | 'phone' | 'email' | 'billingAddress' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  column: SortField;
  order: SortOrder;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const SortIndicator = ({ column, sortConfig }: { column: SortField, sortConfig: SortConfig | null }) => {
  if (!sortConfig || sortConfig.column !== column) {
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  }
  if (sortConfig.order === 'asc') {
    return <ArrowUp className="h-4 w-4 text-gray-400" />;
  }
  return <ArrowDown className="h-4 w-4 text-gray-400" />;
};

export const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem("userData");
  const userData = user ? JSON.parse(user) : null;

  // State variables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'createdAt', order: 'desc' });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: 'Active' | 'Inactive'; label: string }>>([
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ]);

  // Refs to track previous values (same pattern as ItemConfigurator)
  const prevSearchTerm = useRef(searchTerm);
  const prevStatusFilter = useRef(statusFilter);
  const prevSortConfig = useRef(sortConfig);
  const isInitialLoad = useRef(true);

  const fetchCustomers = useCallback(async (page: number = currentPage) => {
    if (!userData) return;

    setLoading(true);
    setError(null);

    try {
      // Map frontend filters to backend parameters
      const params: any = {
        page,
        limit: itemsPerPage,
        sortBy: sortConfig.column,
        sortOrder: sortConfig.order
      };

      // Apply search filter
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await customerService.listCustomers(params);
      
      // Map backend response to frontend format
      const mappedCustomers = response.data.map(customer => ({
        ...customer,
        id: customer._id || '',
        fullname: customer.name,
        customer_id: customer.customerId,
        address: customer.billingAddress,
        created_at: customer.createdAt || '',
        modified_at: customer.updatedAt || '',
        is_active: customer.isActive
      }));

      setCustomers(mappedCustomers);

      const totalItems = response.meta?.total || 0;
      const totalPages = response.meta?.totalPages || Math.ceil(totalItems / itemsPerPage);

      setPagination({
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage
      });

    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      setCustomers([]);
      setPagination(prev => ({ ...prev, currentPage: page, totalPages: 0, totalItems: 0 }));
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [userData, itemsPerPage, searchTerm, statusFilter, sortConfig]);

  // Handle search and filter changes with debouncing (same pattern as ItemConfigurator)
  useEffect(() => {
    const searchChanged = prevSearchTerm.current !== searchTerm;
    const statusFilterChanged = prevStatusFilter.current !== statusFilter;
    const sortChanged = JSON.stringify(prevSortConfig.current) !== JSON.stringify(sortConfig);

    // Update refs
    prevSearchTerm.current = searchTerm;
    prevStatusFilter.current = statusFilter;
    prevSortConfig.current = sortConfig;

    // Skip initial load to prevent double fetching
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Reset to page 1 only if search/filter changed, not sort
    if (searchChanged || statusFilterChanged) {
      setCurrentPage(1);
      const handler = setTimeout(() => {
        fetchCustomers(1);
      }, 300); // Debounce search
      return () => clearTimeout(handler);
    }

    // For sort changes, use current page and fetch immediately
    if (sortChanged) {
      fetchCustomers(currentPage);
    }
  }, [searchTerm, statusFilter, sortConfig, fetchCustomers]);

  // Handle pagination changes
  useEffect(() => {
    if (!isInitialLoad.current) {
      fetchCustomers(currentPage);
    }
  }, [currentPage]);

  // Handle items per page changes
  useEffect(() => {
    if (!isInitialLoad.current) {
      setCurrentPage(1);
      fetchCustomers(1);
    }
  }, [itemsPerPage]);

  // Initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      fetchCustomers(1);
    }
  }, []);

  // Removed exportCustomersToCSV function

  const deleteCustomer = async () => {
    if (!customerToDelete || !customerToDelete._id) return;
    try {
      await customerService.deleteCustomer(customerToDelete._id);
      
      toast.success("Customer deleted successfully!");
      fetchCustomers(currentPage);
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);

    } catch (error: unknown) {
      console.error('Error deleting customer:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete customer';
      toast.error(message);
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleSort = (column: SortField) => {
    setSortConfig(prev => {
      if (prev && prev.column === column) {
        return { column, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { column, order: 'asc' };
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (newItemsPerPage !== itemsPerPage) {
      setItemsPerPage(newItemsPerPage);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleEditClick = (customer: Customer) => {
    navigate(`/dashboard/customer-management/edit/${customer._id}`);
  };

  const handleViewClick = (customer: Customer) => {
    navigate(`/dashboard/customer-management/view/${customer._id}`);
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-red-100 text-red-800 border-red-300';
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

  return (
    <TooltipProvider>
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="min-h-[85vh] shadow-sm">
            <CardHeader className="rounded-t-lg border-b pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      Customer Management
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage your customer information and relationships
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Removed Export CSV button */}
                  <Button
                    onClick={() => navigate('/dashboard/customer-management/add')}
                    className="transition-colors"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value)}
                      >
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearFilters}
                      className="text-gray-700 hover:bg-gray-50"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  <p>Error: {error}</p>
                </div>
              )}

              <div className="rounded-lg overflow-hidden border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('customerId')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 justify-start ps-2`}
                        >
                          Customer ID
                          <SortIndicator column="customerId" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('name')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 justify-start`}
                        >
                          Name
                          <SortIndicator column="name" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('phone')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 justify-start`}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Phone
                          <SortIndicator column="phone" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('email')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 justify-start`}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                          <SortIndicator column="email" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('billingAddress')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 justify-start`}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Address
                          <SortIndicator column="billingAddress" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('status')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 w-full justify-center`}
                        >
                          Status
                          <SortIndicator column="status" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('createdAt')}
                          className={`h-8 flex items-center gap-1 font-semibold cursor-pointer hover:text-blue-600 w-full justify-start`}
                        >
                          Date Added
                          <SortIndicator column="createdAt" sortConfig={sortConfig} />
                        </button>
                      </TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(itemsPerPage).fill(0).map((_, index) => (
                        <TableRow key={`loading-${index}`} className="hover:bg-gray-50">
                          {Array(8).fill(0).map((_, idx) => (
                            <TableCell key={`loading-cell-${idx}`} className="text-center py-3">
                              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : customers.length > 0 ? (
                      customers.map((customer) => (
                        <TableRow
                          key={customer._id}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium py-3">
                            <p className="ps-2">{customer.customerId}</p>
                          </TableCell>
                          <TableCell className="font-medium">
                            {customer.name}
                          </TableCell>
                          <TableCell className="text-left">
                            {customer.phone || '—'}
                          </TableCell>
                          <TableCell>
                            {customer.email ? (
                              <span className="truncate block max-w-[180px]">{customer.email}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.billingAddress ? (
                              <div className="truncate max-w-xs" title={customer.billingAddress}>
                                {customer.billingAddress}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <Badge
                              variant="outline"
                              className={`font-medium ${getStatusBadgeColor(customer.status)}`}
                            >
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left text-sm">
                            {formatDate(customer.createdAt || '')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleViewClick(customer)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditClick(customer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => openDeleteDialog(customer)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="hover:bg-gray-50">
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center py-6">
                            <Users className="h-12 w-12 text-gray-300 mb-2" />
                            <p className="text-base font-medium">
                              {searchTerm || statusFilter !== 'all' ? 'No matching customers found' : "No customers added yet"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {searchTerm || statusFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'Click "Add Customer" to get started.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Show</p>
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
                  <p className="text-sm text-muted-foreground">entries</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Showing {pagination.totalItems > 0 ? ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1 : 0} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} entries
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                      Page {pagination.currentPage} of {pagination.totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0 || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Dialog for Delete */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>Are you sure you want to delete the customer "{customerToDelete?.name}"?</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setCustomerToDelete(null)}>
                    No
                  </Button>
                </DialogClose>
                <Button variant="destructive" onClick={deleteCustomer}>
                  Yes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};