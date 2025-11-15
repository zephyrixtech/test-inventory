import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Filter,
  UserRound,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supplierService } from "@/services/supplierService";

const SupplierManagement = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: null,
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uniqueContacts, setUniqueContacts] = useState([]);

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        contact: contactFilter !== "all" ? contactFilter : undefined,
      };

      const response = await supplierService.listSuppliers(params);
      console.log("API Response:", response); // For debugging
      
      // Access the data correctly based on the actual API response structure
      const { data, meta } = response;
      
      // Transform data to match existing structure
      const transformedData = data.map(supplier => ({
        id: supplier._id, // Use _id instead of id
        supplier_id: supplier.supplierId,
        supplier_name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        contact_person: supplier.contactPerson,
        status: supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1), // Capitalize first letter
      }));
      
      setSuppliers(transformedData);
      setTotalItems(meta.total);
      setTotalPages(meta.totalPages);
      
      // Extract unique contacts
      const contacts = Array.from(
        new Set(
          data
            .map((s) => s.contactPerson)
            .filter(Boolean)
        )
      );
      setUniqueContacts(contacts);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters/page change
  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery, statusFilter, contactFilter, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, contactFilter, itemsPerPage]);

  // Handle Sort
  const handleSort = (field) => {
    let direction = "asc";
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ field: direction ? field : null, direction });
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    } else if (sortConfig.direction === "desc") {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // Export to CSV
  const exportSuppliersToCSV = () => {
    // In a real implementation, this would call an API endpoint to generate the CSV
    toast.success("Suppliers exported successfully");
  };

  // Clear Filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setContactFilter("all");
    setSortConfig({ field: null, direction: null });
    setCurrentPage(1);
  };

  // Delete Supplier
  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      await supplierService.deleteSupplier(supplierToDelete.id);
      toast.success("Supplier deleted successfully");
      fetchSuppliers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    } finally {
      setIsDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  const openDeleteDialog = (supplier) => {
    setSupplierToDelete(supplier);
    setIsDialogOpen(true);
  };

  const handleEdit = (supplier) => {
    navigate(`/dashboard/supplier/edit/${supplier.id}`);
  };

  const handleView = (supplier) => {
    navigate(`/dashboard/supplier/view/${supplier.id}`);
  };

  const statusStyles = {
    Approved: "bg-green-100 text-green-800 border-green-300",
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Rejected: "bg-red-100 text-red-800 border-red-300",
  };

  // Calculate paginated suppliers for display
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return suppliers.slice(startIndex, startIndex + itemsPerPage);
  }, [suppliers, currentPage, itemsPerPage]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Supplier Management
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage your suppliers and their business information
                  </CardDescription>
                </div>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={exportSuppliersToCSV}
                  className="transition-colors me-2"
                  disabled={totalItems === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export CSV</span>
                </Button>
                <Button
                  onClick={() => navigate("/dashboard/supplier/add")}
                  className="transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="mb-6 space-y-4">
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by supplier name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="flex items-center gap-2 flex-1 lg:flex-none">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-1 lg:flex-none">
                    <UserRound className="h-4 w-4 text-gray-500" />
                    <Select
                      value={contactFilter}
                      onValueChange={(value) => setContactFilter(value)}
                    >
                      <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="All Contacts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contacts</SelectItem>
                        {uniqueContacts.map((contact) => (
                          <SelectItem key={contact} value={contact}>
                            {contact}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="px-3 py-2 text-sm"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border shadow-sm">
              <Table aria-label="Supplier Management Table">
                <TableHeader>
                  <TableRow className="hover:bg-gray-50 border-gray-200">
                    <TableHead className="font-semibold w-[120px]">
                      <button
                        type="button"
                        onClick={() => handleSort("supplier_id")}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto ps-2 hover:text-blue-600"
                      >
                        Supplier ID
                        {getSortIcon("supplier_id")}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold w-1/4">
                      <button
                        type="button"
                        onClick={() => handleSort("supplier_name")}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto ps-2 hover:text-blue-600"
                      >
                        Supplier Name
                        {getSortIcon("supplier_name")}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <button
                        type="button"
                        onClick={() => handleSort("email")}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Email
                        {getSortIcon("email")}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-left">
                      <button
                        type="button"
                        onClick={() => handleSort("phone")}
                        className="h-8 flex items-center justify-end me-auto gap-1 font-semibold cursor-pointer w-auto hover:text-blue-600"
                      >
                        Phone #
                        {getSortIcon("phone")}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      <button
                        type="button"
                        onClick={() => handleSort("contact_person")}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto justify-center hover:text-blue-600"
                      >
                        Contact Person
                        {getSortIcon("contact_person")}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-left">
                      <button
                        type="button"
                        onClick={() => handleSort("status")}
                        className="h-8 flex items-center gap-1 font-semibold cursor-pointer w-auto justify-center hover:text-blue-600"
                      >
                        Status
                        {getSortIcon("status")}
                      </button>
                    </TableHead>
                    <TableHead className="text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center h-24">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedSuppliers.length > 0 ? (
                    paginatedSuppliers.map((supplier) => {
                      // In a real implementation, this would check against actual purchase orders
                      const isUsedInPO = false;
                      return (
                        <TableRow key={supplier.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium py-3">
                            <p className="ps-2">{supplier.supplier_id}</p>
                          </TableCell>
                          <TableCell className="font-medium">
                            <p className="ps-2">{supplier.supplier_name}</p>
                          </TableCell>
                          <TableCell>{supplier.email}</TableCell>
                          <TableCell className="text-left">{supplier.phone}</TableCell>
                          <TableCell>{supplier.contact_person}</TableCell>
                          <TableCell className="text-left">
                            <Badge
                              variant="outline"
                              className={`font-medium capitalize ${
                                statusStyles[supplier.status] || "bg-gray-100 text-gray-800 border-gray-300"
                              }`}
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleView(supplier)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(supplier)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isUsedInPO ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10 opacity-50 cursor-not-allowed"
                                        disabled
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Cannot delete: Used in Purchase Orders</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => openDeleteDialog(supplier)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Building2 className="h-12 w-12 text-gray-300 mb-2" />
                          <p className="text-base font-medium">
                            {totalItems === 0 ? "No suppliers available" : "No suppliers found"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {totalItems === 0
                              ? "Add a new supplier to get started"
                              : "Try adjusting your search or filters"}
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
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this supplier?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete}>
                Yes, Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SupplierManagement;