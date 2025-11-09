  import { useState, useEffect } from "react";
  import {
    Plus,
    Edit,
    Trash2,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter,
    SquareChartGantt,
    Eye,
    Download,
  } from "lucide-react";
  import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip";
  import toast from 'react-hot-toast';
  import { useNavigate } from "react-router-dom";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
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
  import { supabase } from "@/Utils/types/supabaseClient";
import { useSelector } from "react-redux";
import { selectUser } from "@/redux/features/userSlice";
import { Badge } from "@/components/ui/badge";
import { ISystemMessageConfig } from "@/Utils/constants";
import { exportSupabaseTableToCSV } from "@/Utils/csvExport";

  type SortField =
    | "supplier_name"
    | "return_date"
    | "created_by"
    | "total_items"
    | "po_number"
    | "purchase_return_number"
    | null;

  type SortDirection = "asc" | "desc" | null;

  interface SortConfig {
    field: SortField;
    direction: SortDirection;
  }

type PurchaseReturn = {
  returnStatus: string;
  id: string;
  rrNumber: string;
  poNumber: string;
  supplier: string;
  date: string;
  totalItems: number;
  totalValue: number;
  approvalStatus: string;
  createdAt: string;
  createdBy: string;
  remark: string;
  returnStatusId: string;
};

  const ReturnRequest: React.FC = () => {
    const userData = useSelector(selectUser);
    const companyId = userData?.company_id || null;
    const [statusFilter, setStatusFilter] = useState<string | null>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isFetching, setIsFetching] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; rrNumber: string } | null>(null);
    const [_, setIsDeleting] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({
      field: null,
      direction: null,
    });
    const [data, setData] = useState<PurchaseReturn[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const navigate = useNavigate();
    const [statusOptions, setStatusOptions] = useState<ISystemMessageConfig[]>([]);
    const statusStyles: Record<ISystemMessageConfig['sub_category_id'], string> = {
        ORDER_RETURN_CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
        APPROVER_COMPLETED: 'bg-green-100 text-green-800 border-green-300',
        APPROVAL_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        ORDER_RETURN_CANCELLED: 'bg-red-100 text-red-800 border-red-300',
      };

    useEffect(() => {
      const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
      return () => clearTimeout(id);
    }, [searchQuery]);

    // Fetch all status options for return requests
    useEffect(() => {
      if (!companyId) return;

      const fetchStatusOptions = async () => {
        try {
          const { data, error } = await supabase
            .from('system_message_config')
            .select('*')
            .eq('company_id', companyId)
            .eq("category_id", 'PURCHASE_ORDER_RETURN');
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

    // Fetch all return requests 
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase.rpc("get_all_purchase_returns", {
          p_company_id: companyId!,
          p_search_term: debouncedSearch.trim(),
          p_sort_field: sortConfig.field!,
          p_sort_direction: sortConfig.direction!,
          p_page_size: itemsPerPage,
          p_page_number: currentPage,
          p_status_filter: statusFilter ?? '',
        });

        if (error) throw error;

        if (!data || data.length === 0) {
          setData([]);
          setTotalItems(0);
          return;
        }

        const totalCount = data?.[0]?.total_count ?? 0;
        const formattedData: PurchaseReturn[] = data.map((item: any) => ({
          id: item.id,
          rrNumber: item.purchase_return_number,
          poNumber: item.po_number,
          supplier: item.supplier_name,
          date: item.return_date,
          totalItems: item.total_items,
          totalValue: item.total_value,
          approvalStatus: item.approval_status,
          createdAt: item.created_at,
          createdBy: item.created_by,
          remark: item.remark,
          returnStatusId: item.return_status_id,
          returnStatus: item.return_status_sub_category,
        }));

        setData(formattedData);

        setTotalItems(totalCount);
        setTotalPages(Math.ceil(totalCount / itemsPerPage));
      } catch (err) {
        console.error("Error fetching purchase returns:", err);
      } finally {
        setIsFetching(false);
      }
    };

    useEffect(() => {
      if (!companyId) return;

      fetchData();
    }, [statusFilter, debouncedSearch, sortConfig, currentPage, itemsPerPage, companyId]);

    useEffect(() => {
      setCurrentPage(1);
    }, [statusFilter, debouncedSearch]);

    const getSortIcon = (field: SortField) => {
      if (sortConfig.field !== field)
        return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
      if (sortConfig.direction === "asc")
        return <ArrowUp className="h-4 w-4 text-blue-600" />;
      if (sortConfig.direction === "desc")
        return <ArrowDown className="h-4 w-4 text-blue-600" />;
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    };

    const handleSort = (field: SortField) => {
      let dir: SortDirection = "asc";
      if (sortConfig.field === field) {
        if (sortConfig.direction === "asc") dir = "desc";
        else if (sortConfig.direction === "desc") dir = null;
      }
      setSortConfig({ field: dir ? field : null, direction: dir });
      setCurrentPage(1);
    };

    const clearFilters = () => {
      setStatusFilter("all");
      setSortConfig({ field: null, direction: null });
      setSearchQuery("");
      setCurrentPage(1);
    };

    const handleDelete = async (id: string, purchaseReturnNumber?: string) => {
      setIsDeleting(true);
      try {
        // Delete purchase return items
        const { error: childErr } = await supabase
          .from("purchase_return_items")
          .update({ is_active: false })
          .eq("purchase_return_id", id);
        if (childErr) throw childErr;

        // Delete purchase return
        const { error: parentErr } = await supabase
          .from("purchase_return")
          .update({ is_active: false })
          .eq("id", id);
        if (parentErr) throw parentErr;

        // Delete files from storage bucket
        if (purchaseReturnNumber?.trim()) {
          try {
            const { data: files, error: listErr } = await supabase.storage
              .from("return-files")
              .list(purchaseReturnNumber);

            if (!listErr && files?.length > 0) {
              const filePaths = files.map((f) => `${purchaseReturnNumber}/${f.name}`);
              await supabase.storage.from("return-files").remove(filePaths);
            }
          } catch (fileError) {
            console.warn("Failed to delete files from storage:", fileError);
          }
        }

        // Create system log
        const systemLog = {
          company_id: userData?.company_id,
          transaction_date: new Date().toISOString(),
          module: "Return Management",
          scope: "Delete",
          key: purchaseReturnNumber,
          log: `Purchase Return ${purchaseReturnNumber} deleted.`,
          action_by: userData?.id,
          created_at: new Date().toISOString(),
        };

        const { error: systemLogError } = await supabase
          .from("system_log")
          .insert(systemLog);
        if (systemLogError) throw systemLogError;

        // Success toast
        toast.success("Return request deleted successfully!");
      } catch (error: any) {
        console.error("Delete operation failed:", error);
        toast.error(`Failed to delete return request: ${error?.message || "Unknown error occurred"}`);
      } finally {
        setIsDeleting(false);
        setIsDialogOpen(false);
        setItemToDelete(null);
        fetchData();
      }
    };

    // format date
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


    // Export return request data
    const exportReturnRequestsToCsv = async () => {
      if (!companyId) return;

      await exportSupabaseTableToCSV({
        reportTitle: 'Return Requests Data',
        headers: ['Purchase Return Number', 'Linked PO Number', 'Supplier Name', 'Return Date', 'Status', 'Item Returned', 'Created By'],
        rowMapper: (returnReq: any) => [
          `"${returnReq.purchase_return_number}"`,
          `"${returnReq.po_number || ''}"`,
          `"${returnReq.supplier_name || ''}"`,
          `"${returnReq.return_date || ''}"`,
          `"${returnReq.return_status_sub_category
            ? returnReq.return_status_sub_category
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (c: any) => c.toUpperCase())
            : ''
          }"`,
          `"${returnReq.total_items || 0}"`,
          `"${returnReq.created_by || ''}"`,
        ],
        supabaseClient: supabase,
        fetcher: async () => {
          const { data, error } = await supabase.rpc('get_all_purchase_returns', {
            p_company_id: companyId,
            p_search_term: debouncedSearch.trim(),
            p_sort_field: sortConfig.field!,
            p_sort_direction: sortConfig.direction!,
            p_page_size: -1,
            p_page_number: 1,
            p_status_filter: statusFilter ?? '',
          });
          if (error) throw error;
          return data || [];
        }
      });
    };

    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6 bg-white rounded-lg">
          <Card className="min-h-[85vh] shadow-sm">
            {/* Header */}
            <CardHeader className="rounded-t-lg border-b pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                    <SquareChartGantt className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      Returns Management
                    </CardTitle>
                    <CardDescription>
                      Manage and track purchase returns.
                    </CardDescription>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={exportReturnRequestsToCsv}
                    className="transition-colors me-2"
                    disabled={data.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export CSV</span>
                  </Button>
                  <Button onClick={() => navigate("/dashboard/return-form/add")}>
                    <Plus className="mr-2 h-4 w-4" /> Create Return Request
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Content */}
            <CardContent>
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by Return Number"
                      className="pl-10"
                    />
                  </div>
                  {/* Status Filter */}
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-2 flex-1 lg:flex-none">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Select
                        value={statusFilter ?? undefined}
                        onValueChange={(value) => {
                          console.log(
                            "🔄 Status filter changed from",
                            statusFilter,
                            "to",
                            value
                          );
                          setStatusFilter(value as any);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full lg:w-[180px]">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.sub_category_id
                                .replace(/_/g, ' ')
                                .toLowerCase()
                                .replace(/\b\w/g, c => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                    
                  </div>
                </div>
              </div>
              {/* table */}
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50">
                      {[
                        ["purchase_return_number", "Purchase Return Number"],
                        ["po_number", "Linked PO Number"],
                        ["supplier_name", "Supplier Name"],
                        ["return_date", "Return Date"],
                      ].map(([field, label]) => (
                        <TableHead
                          key={field}
                          className="font-semibold cursor-pointer hover:text-blue-600"
                          onClick={() => handleSort(field as SortField)}
                        >
                          <div className="flex items-center gap-1">
                            {label} {getSortIcon(field as SortField)}
                          </div>
                        </TableHead>
                      ))}
                      
                      <TableHead className="font-semibold">
                        <p className="ms-1">Status</p>
                      </TableHead>

                      {[
                        ["total_items", "Items Returned"],
                        ["created_by", "Created By"],
                      ].map(([field, label]) => (
                        <TableHead
                          key={field}
                          className="font-semibold cursor-pointer hover:text-blue-600"
                          onClick={() => handleSort(field as SortField)}
                        >
                          <div className="flex items-center gap-1">
                            {label} {getSortIcon(field as SortField)}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-semibold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isFetching ? (
                      /* skeleton rows */
                      Array(itemsPerPage)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={i}>
                            {Array(8)
                              .fill(0)
                              .map((__, j) => (
                                <TableCell key={j}>
                                  <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                                </TableCell>
                              ))}
                          </TableRow>
                        ))
                    ) : data.length === 0 ? (
                      /* empty state */
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      /* data rows */
                      data.map((row) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{row.rrNumber}</TableCell>
                          <TableCell>{row.poNumber}</TableCell>
                          <TableCell>{row.supplier}</TableCell>
                          <TableCell>
                            {formatDate(row.date)}
                          </TableCell>
                          <TableCell className="font-medium capitalize">
                            <Badge
                              variant="outline"
                              className={`font-medium capitalize ${statusStyles[row.returnStatus]}`}
                            >
                              {row.returnStatus
                                ? row.returnStatus.replace(/_/g, ' ')
                                  .toLowerCase()
                                  .replace(/\b\w/g, c => c.toUpperCase())
                                : '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="pe-3">{row.totalItems}</span>
                          </TableCell>
                          <TableCell>
                            {row.createdBy}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        navigate(
                                          `/dashboard/return-form/view/${row.id}`,
                                          {
                                            state: {
                                              returnRequestNumber: row.rrNumber,
                                              linkedPONumber: row.poNumber,
                                            },
                                          }
                                        )
                                      }
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Return Request</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={row.returnStatus === "APPROVER_COMPLETED"}
                                        onClick={() =>
                                          navigate(
                                            `/dashboard/return-form/edit/${row.id}`,
                                            {
                                              state: {
                                                returnRequestNumber: row.rrNumber,
                                                linkedPONumber: row.poNumber,
                                              },
                                            }
                                          )
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {row.returnStatus === "APPROVER_COMPLETED" && (
                                    <TooltipContent>
                                      Editing is not allowed for closed return
                                      requests.
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>

                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setItemToDelete({ id: row.id, rrNumber: row.rrNumber ?? "" }); // Use rrNumber instead of po
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this item?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex justify-end gap-2">
      <DialogClose asChild>
        <Button
          variant="outline"
          onClick={() => setItemToDelete(null)} // cancel
        >
          No
        </Button>
      </DialogClose>
      <Button
        variant="destructive"
        onClick={() => {
          if (itemToDelete) {
            handleDelete(itemToDelete.id, itemToDelete.rrNumber);
          }
          setIsDialogOpen(false); // close dialog
          setItemToDelete(null);
        }}
      >
        Yes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

              </div>

              {/* pagination */}
              <div className="flex justify-between items-center mt-4">
                {/* show entries */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["5", "10", "20", "50"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">entries</span>
                </div>

                {/* controls */}
                <div className="flex items-center gap-4">
                  <span className="hidden sm:block text-sm text-muted-foreground">
                    Showing{" "}
                    {data.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}{" "}
                    to {(currentPage - 1) * itemsPerPage + data.length} of{" "}
                    {totalItems} entries
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  export default ReturnRequest;

