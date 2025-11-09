import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Filter,
  BadgeDollarSign,
  Edit,
  Download
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/Utils/types/supabaseClient";
import { IUser } from "@/Utils/constants";
import generateInvoicePDF from "../config/InvoicePrintTemplate";
import { exportSupabaseTableToCSV } from "@/Utils/csvExport";
import { format } from "date-fns";
import { formatCurrency } from "@/Utils/formatters";

// Types based on your CSV structure
interface InvoiceItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  contact_number: string;
  invoice_date: string;
  net_amount: number;
  status: "paid" | "pending" | "overdue";
  items: InvoiceItem[];
  billing_address?: string;
  email?: string;
  total_items: number;
  invoice_amount: number;
  discount_amount: number;
  company: {
    id: string;
    name: string;
    address: string;
    contact_number: string;
  };
}

interface DataResponse {
  data: any[];
  pagination: any;
}

interface PaginationInfo {
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type SortOrder = 'asc' | 'desc' | null;
interface SortConfig {
  field: string | null;
  order: SortOrder;
}

export default function SalesInvoiceList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'invoice_date', order: 'desc' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState<[string, string]>(["", ""]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SalesInvoice[]>([]);

  // Get user data and company ID
  const user = localStorage.getItem('userData');
  const userData: IUser | null = user ? JSON.parse(user) : null;
  const companyId = userData?.company_id || null;

  // Format date to "MMM DD, YYYY"
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Fetch invoices from Supabase
  const fetchInvoices = async () => {
    if (!companyId) {
      toast.error('Company ID not found. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sales_invoices_paginated', {
        company_id_param: companyId, // <-- This filters by company_id
        search_query: searchQuery,
        status_filter: filterStatus,
        date_from: dateFilter[0] || undefined,
        date_to: dateFilter[1] || undefined,
        page: currentPage,
        limit_param: itemsPerPage,
        sort_field: sortConfig.field!,
        sort_order: sortConfig.order!
      });
      if (error) {
        toast.error(`Failed to fetch invoices: ${error.message || 'Unknown error'}`);
        console.error('Supabase error:', error);
        setInvoices([]);
        setPagination({
          total: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        });
        return;
      }

      if (data) {
        const invoicesData = (data as unknown as DataResponse).data || [];
        const paginationData = (data as unknown as DataResponse).pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        };

        setInvoices(invoicesData);
        setPagination(paginationData);
      } else {
        setInvoices([]);
        setPagination({
          total: 0,
          totalPages: 0,
          currentPage: 1,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
    } catch (err) {
      toast.error('Network error while fetching invoices');
      console.error('Network error:', err);
      setInvoices([]);
      setPagination({
        total: 0,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchInvoices();
  }, [searchQuery, filterStatus, dateFilter, currentPage, itemsPerPage, sortConfig, companyId]);

  // Export invoices data
  const exportInvoicesToCSV = async () => {
    await exportSupabaseTableToCSV<SalesInvoice>({
      reportTitle: 'Invoices Data',
      rpcName: 'get_sales_invoices_paginated',
      rpcParams: {
        company_id_param: companyId, // <-- This filters by company_id
        search_query: searchQuery,
        status_filter: filterStatus,
        date_from: dateFilter[0] || undefined,
        date_to: dateFilter[1] || undefined,
        page: 1,
        limit_param: -1,
        sort_field: sortConfig.field!,
        sort_order: sortConfig.order!
      },
      headers: ['Invoice Number', 'Customer Name', 'Invoice Date', 'Total Amount', 'Contact Number'],
      rowMapper: (invoice) => [
        `"${invoice.invoice_number}"`,
        `"${invoice.customer_name}"`,
        `"${format(new Date(invoice.invoice_date), 'dd MMM yyyy')}"`,
        `"${invoice.net_amount}"`,
        `"${invoice.contact_number}"`,
      ],
      supabaseClient: supabase,
      onError: (err: { message: any; }) => toast.error(`Failed to export invoices: ${err.message}`),
    });
  }

  const handleViewDetails = (invoice: SalesInvoice) => {
    navigate(`/dashboard/invoice/view/${invoice.id}`);
  };

  const handleEditInvoice = (invoice: SalesInvoice) => {
    navigate(`/dashboard/invoice/edit/${invoice.id}`);
  };


   const handlePrintInvoice = (invoice: SalesInvoice) => {
    if (!invoice) return;
console.log(invoice, '<--- invoice data for PDF generation');
    const invoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customer: {
        name: invoice.customer_name,
        contact: invoice.contact_number,
        address: invoice.billing_address,
      },
      store: {
        name: invoice.company.name,
        branch: "Main Branch",
        address: invoice.billing_address,
        contact: invoice.contact_number
      },
      vehicle: {
        plateNo: "N/A",
        kms: "N/A",
        brand: "N/A",
        model: "N/A",
        vinNo: "N/A",
        emirates: "N/A",
      },
      insurance: {
        provider: "N/A",
        claimNo: "N/A",
        lpoNo: "N/A",
      },
      paymentType: "Cash",
      items: invoice.items.map(item => ({
        id: item.id,
        itemNumber: item.item_id,
        name: item.item_name,
        description: "",
        quantity: item.quantity,
        unitPrice: item.unit_price,
        sellingPrice: item.unit_price,
        amount: item.quantity * item.unit_price,
        discount: (item.discount_percentage / 100) * (item.quantity * item.unit_price),
        grossAmount: item.quantity * item.unit_price,
        vat: (item.quantity * item.unit_price) * 0.05,
        netAmount: (item.quantity * item.unit_price) * 1.05,
      })),
      date: invoice.invoice_date,
      status: invoice.status,
      paymentDetails: {
        type: "Cash",
        terms: "Net 30"
      }
    };

    generateInvoicePDF(invoiceData as any);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);
    if (value.length < 3) {
      setSuggestions([]);
    }
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        if (prev.order === 'asc') {
          return { field, order: 'desc' };
        } else if (prev.order === 'desc') {
          return { field: null, order: null };
        } else {
          return { field, order: 'asc' };
        }
      } else {
        return { field, order: 'asc' };
      }
    });
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field || !sortConfig.order) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.order === 'asc') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Show error if no company ID
  if (!companyId) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <Card className="text-center p-8">
            <CardContent>
              <div className="text-red-600 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <CardTitle className="text-xl mb-2">Access Denied</CardTitle>
              <CardDescription>
                Company ID not found. Please login again to access sales invoices.
              </CardDescription>
              <Button
                onClick={() => navigate('/login')}
                className="mt-4"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render action buttons for an invoice row
  const renderActionButtons = (invoice: SalesInvoice) => {
    return (
      <div className="flex justify-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleViewDetails(invoice)}
                aria-label={`View invoice ${invoice.invoice_number}`}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              View Invoice Details
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEditInvoice(invoice)}
                aria-label={`Edit invoice ${invoice.invoice_number}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Edit Invoice
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePrintInvoice(invoice)}
                aria-label={`Print invoice ${invoice.invoice_number}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-6 0v4m0 0h4m-4 0H8" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Print Invoice
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <BadgeDollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Sales Invoices
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage your sales invoices and transactions
                  </CardDescription>
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={exportInvoicesToCSV}
                  className="transition-colors me-2"
                  disabled={invoices.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export CSV</span>
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/invoice/add')}
                  className="transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Invoice
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
                    placeholder="Search by invoice number, customer, or contact number..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={dateFilter[0]}
                    onChange={(e) => {
                      setDateFilter([e.target.value, dateFilter[1]]);
                      setCurrentPage(1);
                    }}
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={dateFilter[1]}
                    onChange={(e) => {
                      setDateFilter([dateFilter[0], e.target.value]);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                    setDateFilter(["", ""]);
                    setCurrentPage(1);
                  }}
                  className="transition-colors"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50 border-gray-200">
                    <TableHead className="font-semibold w-1/4">
                      <button
                        type="button"
                        onClick={() => handleSort('invoice_number')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto ps-2 hover:text-blue-600"
                        aria-label={`Sort by Invoice Number ${sortConfig.field === 'invoice_number' ? sortConfig.order : 'asc'}`}
                      >
                        Invoice #
                        {getSortIcon('invoice_number')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSort('customer_name')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                        aria-label={`Sort by Customer ${sortConfig.field === 'customer_name' ? sortConfig.order : 'asc'}`}
                      >
                        Customer
                        {getSortIcon('customer_name')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSort('invoice_date')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                        aria-label={`Sort by Date ${sortConfig.field === 'invoice_date' ? sortConfig.order : 'asc'}`}
                      >
                        Date
                        {getSortIcon('invoice_date')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('net_amount')}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-full justify-end hover:text-blue-600"
                        aria-label={`Sort by Total Amount ${sortConfig.field === 'net_amount' ? sortConfig.order : 'asc'}`}
                      >
                        Total Amount
                        {getSortIcon('net_amount')}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-left pr-2">Contact Number</TableHead>
                    <TableHead className="text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(itemsPerPage).fill(0).map((_, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="py-3">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                        <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ms-auto"></div></TableCell>
                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium py-3 ps-4">
                          <a
                            href="#"
                            onClick={e => {
                              e.preventDefault();
                              handleViewDetails(invoice);
                            }}
                            className="text-blue-600 underline hover:text-blue-800 transition-colors"
                            title="View Invoice Details"
                          >
                            {invoice.invoice_number}
                          </a>
                        </TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.net_amount)}</TableCell>
                        <TableCell className="text-left pr-2">{invoice.contact_number}</TableCell>
                        <TableCell className="text-center">
                          {renderActionButtons(invoice)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-gray-50">
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center py-6">
                          <FileText className="h-12 w-12 text-gray-300 mb-2" />
                          <p className="text-base font-medium">No invoices found for selected criteria.</p>
                          <p className="text-sm text-gray-500">Try adjusting your search or filter</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Show
                </p>
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
                <p className="text-sm text-muted-foreground">
                  entries
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Showing {pagination.total > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!pagination.hasPrevPage || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                    Page {currentPage} of {pagination.totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNextPage || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {searchQuery.length >= 3 && suggestions.length > 0 && (
              <div className="absolute z-10 bg-white border rounded shadow w-full mt-1">
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSearchQuery(s.invoice_number);
                      setSuggestions([]);
                    }}
                  >
                    {s.invoice_number} - {s.customer_name} - {s.contact_number}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}