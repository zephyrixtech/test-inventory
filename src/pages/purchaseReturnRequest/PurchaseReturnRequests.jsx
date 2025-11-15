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
import { formatCurrency } from "@/Utils/formatters";

// Static Mock Data
const mockUser = {
  id: "user-123",
  role_id: "role-001",
  role_name: "Purchase Manager",
  company_id: "comp-001",
};

const mockPurchaseReturns = [
  {
    id: "pr-001",
    return_number: "RET-2025-001",
    supplier: "ABC Suppliers Ltd",
    returnDate: "2025-11-10T10:00:00Z",
    total_items: 5,
    value: 12500,
    status: "Level 1 Approved",
    remark: "Damaged goods",
    approval_status: [
      { status: "Created", trail: "Created", sequence_no: 0 },
      { status: "Level 1 Approved", trail: "Approved", sequence_no: 1, approvedBy: "user-123" },
      { status: "Level 2 Approval Pending", trail: "Pending", sequence_no: 2 },
    ],
    created_by: "user-456",
    created_at: "2025-11-08T09:00:00Z",
    purchase_order_id: "po-100",
    workflow_id: "wf-2",
    next_level_role_id: "role-002",
  },
  {
    id: "pr-002",
    return_number: "RET-2025-002",
    supplier: "XYZ Corp",
    returnDate: "2025-11-09T14:30:00Z",
    total_items: 3,
    value: 8900,
    status: "Created",
    remark: "Wrong item received",
    approval_status: [
      { status: "Created", trail: "Created", sequence_no: 0 },
    ],
    created_by: "user-789",
    created_at: "2025-11-09T08:00:00Z",
    purchase_order_id: "po-101",
    workflow_id: "wf-1",
    next_level_role_id: "role-001",
  },
  {
    id: "pr-003",
    return_number: "RET-2025-003",
    supplier: "Global Traders",
    returnDate: "2025-11-07T11:15:00Z",
    total_items: 8,
    value: 32000,
    status: "Completed",
    remark: "Quality issue",
    approval_status: [
      { status: "Created", trail: "Created", sequence_no: 0 },
      { status: "Level 1 Approved", trail: "Approved", sequence_no: 1, approvedBy: "user-123" },
      { status: "Level 2 Approved", trail: "Approved", sequence_no: 2, approvedBy: "user-124" },
      { status: "Level 3 Approved", trail: "Approved", sequence_no: 3, approvedBy: "user-125", isFinalized: true },
    ],
    created_by: "user-456",
    created_at: "2025-11-06T10:00:00Z",
    purchase_order_id: "po-102",
    workflow_id: null,
    next_level_role_id: null,
  },
  {
    id: "pr-004",
    return_number: "RET-2025-004",
    supplier: "Tech Supplies Inc",
    returnDate: "2025-11-11T09:45:00Z",
    total_items: 2,
    value: 5600,
    status: "Level 2 Approval Rejected",
    remark: "Insufficient proof",
    approval_status: [
      { status: "Created", trail: "Created", sequence_no: 0 },
      { status: "Level 1 Approved", trail: "Approved", sequence_no: 1, approvedBy: "user-123" },
      { status: "Level 2 Approval Rejected", trail: "Rejected", sequence_no: 2, rejectedBy: "user-124", comment: "Need invoice copy" },
    ],
    created_by: "user-789",
    created_at: "2025-11-10T07:30:00Z",
    purchase_order_id: "po-103",
    workflow_id: "wf-1",
    next_level_role_id: "role-001",
  },
];

// Format date
const formatDate = (dateString) => {
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

const PurchaseReturnRequests = () => {
  const [displayedPurchaseReturns, setDisplayedPurchaseReturns] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPR, setSelectedPR] = useState(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [filters, setFilters] = useState({ status: "all" });
  const [loading, setLoading] = useState(false);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [sortConfigPR, setSortConfigPR] = useState({
    field: "return_date",
    direction: "DESC",
  });

  const navigate = useNavigate();

  // Initialize with mock data
  useEffect(() => {
    const data = mockPurchaseReturns;
    setDisplayedPurchaseReturns(data);
    setTotalCount(data.length);
    setLoading(false);
  }, []);

  // Filter, search, sort, pagination
  useEffect(() => {
    let filtered = [...mockPurchaseReturns];

    // Search
    if (searchQuery) {
      filtered = filtered.filter(
        (pr) =>
          pr.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pr.supplier.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((pr) =>
        pr.status.toLowerCase().includes(filters.status.toLowerCase())
      );
    }

    // Sorting
    if (sortConfigPR.field) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfigPR.field === "purchase_return_number" ? "return_number" : sortConfigPR.field];
        let bVal = b[sortConfigPR.field === "purchase_return_number" ? "return_number" : sortConfigPR.field];

        if (sortConfigPR.field === "return_date") {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (aVal < bVal) return sortConfigPR.direction === "ASC" ? -1 : 1;
        if (aVal > bVal) return sortConfigPR.direction === "ASC" ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);

    setDisplayedPurchaseReturns(paginated);
    setTotalCount(filtered.length);
  }, [searchQuery, filters, currentPage, itemsPerPage, sortConfigPR]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => setCurrentPage(newPage);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setSearchQuery("");
    setFilters({ status: "all" });
    setCurrentPage(1);
  };

  const handleSortPR = (field) => {
    let direction = "ASC";
    if (sortConfigPR.field === field) {
      if (sortConfigPR.direction === "ASC") direction = "DESC";
      else if (sortConfigPR.direction === "DESC") direction = null;
      else direction = "ASC";
    }
    setSortConfigPR({ field: direction ? field : null, direction });
    setCurrentPage(1);
  };

  const getSortIconPR = (field) => {
    if (sortConfigPR.field !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortConfigPR.direction === "ASC") return <ArrowUp className="h-4 w-4 text-blue-600" />;
    if (sortConfigPR.direction === "DESC") return <ArrowDown className="h-4 w-4 text-blue-600" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // Simulate approval
  const handleApprove = (pr) => {
    if (!pr) return;
    setProcessingApproval(true);
    const toastId = toast.loading("Processing approval...");

    setTimeout(() => {
      toast.success(`Approved ${pr.return_number}`, { id: toastId });
      setIsApproveDialogOpen(false);
      setComment("");
      setSelectedPR(null);
      setProcessingApproval(false);
    }, 800);
  };

  // Simulate rejection
  const handleReject = (pr) => {
    if (!comment) {
      toast.error("Comment is required for rejection");
      return;
    }
    setProcessingApproval(true);
    const toastId = toast.loading("Processing rejection...");

    setTimeout(() => {
      toast.success(`${pr.return_number} rejected`, { id: toastId });
      setIsRejectDialogOpen(false);
      setComment("");
      setSelectedPR(null);
      setProcessingApproval(false);
    }, 800);
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
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleFilterReset} className="px-3 py-2 text-sm">
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
                    <TableHead className="font-semibold">Supplier</TableHead>
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
                        className="h-8 flex items-center justify-end gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
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
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Remark</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    Array(itemsPerPage).fill(0).map((_, i) => (
                      <TableRow key={`skeleton-row-${i}`}>
                        {Array(8).fill(0).map((_, j) => (
                          <TableCell key={`skeleton-cell-${i}-${j}`}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : displayedPurchaseReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Package className="h-12 w-12 text-gray-300 mb-2" />
                          <p className="text-base font-medium">No purchase returns found</p>
                          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedPurchaseReturns.map((pr) => (
                      <TableRow key={pr.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">{pr.return_number}</TableCell>
                        <TableCell>{pr.supplier}</TableCell>
                        <TableCell>{formatDate(pr.returnDate)}</TableCell>
                        <TableCell className="text-right">{pr.total_items}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pr.value)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pr.status.toLowerCase().includes("created")
                                ? "bg-yellow-100 text-yellow-800"
                                : pr.status.toLowerCase().includes("approved") || pr.status.toLowerCase().includes("completed")
                                ? "bg-green-100 text-green-800"
                                : pr.status.toLowerCase().includes("rejected")
                                ? "bg-red-100 text-red-800"
                                : pr.status.toLowerCase().includes("pending")
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
                              <TooltipContent><p>Approve</p></TooltipContent>
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
                              <TooltipContent><p>Reject</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/dashboard/purchase-return-view/${pr.id}`)}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>View Details</p></TooltipContent>
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
                <Select value={itemsPerPage.toString()} onValueChange={(v) => handleItemsPerPageChange(Number(v))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
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
                  Showing {totalCount > 0 ? startIndex : 0} to {endIndex} of {totalCount} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-700">Confirm Approval</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>You are approving as: <strong>{mockUser.role_name}</strong></p>
              {selectedPR && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p><strong>Return #:</strong> {selectedPR.return_number}</p>
                  <p><strong>Supplier:</strong> {selectedPR.supplier}</p>
                  <p><strong>Value:</strong> {formatCurrency(selectedPR.value)}</p>
                </div>
              )}
              <Input
                placeholder="Add remarks (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleApprove(selectedPR)} disabled={processingApproval}>
                  {processingApproval ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject_Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-700">Confirm Rejection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>You are rejecting as: <strong>{mockUser.role_name}</strong></p>
              {selectedPR && (
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  <p><strong>Return #:</strong> {selectedPR.return_number}</p>
                  <p><strong>Supplier:</strong> {selectedPR.supplier}</p>
                  <p><strong>Value:</strong> {formatCurrency(selectedPR.value)}</p>
                </div>
              )}
              <Input
                placeholder="Rejection reason (required)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPR)}
                  disabled={!comment || processingApproval}
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