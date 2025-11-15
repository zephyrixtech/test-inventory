import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Static data instead of API calls
const staticAuditData = [
  {
    id: "1",
    transactionDate: new Date("2023-05-15T10:30:00"),
    scope: "User Management",
    module: "User Creation",
    key: "USER001",
    log: "Created new user account for John Doe",
    actionBy: "Admin User"
  },
  {
    id: "2",
    transactionDate: new Date("2023-05-15T11:45:00"),
    scope: "Inventory",
    module: "Item Update",
    key: "ITEM002",
    log: "Updated stock quantity for Widget B from 50 to 75",
    actionBy: "Inventory Manager"
  },
  {
    id: "3",
    transactionDate: new Date("2023-05-15T14:20:00"),
    scope: "Purchase Order",
    module: "PO Creation",
    key: "PO20230515001",
    log: "Created new purchase order for 100 units of Gadget X",
    actionBy: "Procurement Officer"
  },
  {
    id: "4",
    transactionDate: new Date("2023-05-16T09:15:00"),
    scope: "Sales",
    module: "Invoice Generation",
    key: "INV20230516001",
    log: "Generated invoice for customer ABC Corp",
    actionBy: "Sales Executive"
  },
  {
    id: "5",
    transactionDate: new Date("2023-05-16T13:30:00"),
    scope: "System",
    module: "Backup",
    key: "BACKUP001",
    log: "Daily backup completed successfully",
    actionBy: "System"
  },
  {
    id: "6",
    transactionDate: new Date("2023-05-16T16:45:00"),
    scope: "User Management",
    module: "Permission Change",
    key: "USER003",
    log: "Granted admin privileges to Jane Smith",
    actionBy: "Super Admin"
  },
  {
    id: "7",
    transactionDate: new Date("2023-05-17T10:00:00"),
    scope: "Inventory",
    module: "Stock Adjustment",
    key: "ITEM005",
    log: "Adjusted stock level for Tool Z due to physical count discrepancy",
    actionBy: "Warehouse Manager"
  },
  {
    id: "8",
    transactionDate: new Date("2023-05-17T14:15:00"),
    scope: "Purchase Order",
    module: "PO Approval",
    key: "PO20230515001",
    log: "Approved purchase order for Gadget X",
    actionBy: "Department Head"
  }
];

const AuditTrail = () => {
  // Set initial state to today's date for filters
  const today = new Date().toISOString().split("T")[0];
  const [dateFromFilter, setDateFromFilter] = useState(today);
  const [dateToFilter, setDateToFilter] = useState(today);

  const [records, setRecords] = useState(staticAuditData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: staticAuditData.length,
    itemsPerPage: 10,
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: null,
  });
  const [userCompanyId, setUserCompanyId] = useState("company123");

  // Simulate fetching user company ID
  useEffect(() => {
    // In a real app, this would fetch from auth
    setUserCompanyId("company123");
  }, []);

  // Filter and sort records based on current filters
  useEffect(() => {
    // In a real app, this would fetch from the database
    // For now, we'll just filter the static data
    let filtered = [...staticAuditData];
    
    // Apply date filters
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter(record => record.transactionDate >= fromDate);
    }
    
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(record => record.transactionDate <= toDate);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.module.toLowerCase().includes(term) ||
          r.key.toLowerCase().includes(term) ||
          r.actionBy.toLowerCase().includes(term) ||
          r.scope.toLowerCase().includes(term) ||
          r.log.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.field) {
          case "transactionDate":
            aValue = a.transactionDate;
            bValue = b.transactionDate;
            break;
          case "scope":
            aValue = a.scope;
            bValue = b.scope;
            break;
          case "module":
            aValue = a.module;
            bValue = b.module;
            break;
          case "key":
            aValue = a.key;
            bValue = b.key;
            break;
          case "log":
            aValue = a.log;
            bValue = b.log;
            break;
          case "actionBy":
            aValue = a.actionBy;
            bValue = b.actionBy;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by transaction_date descending
      filtered.sort((a, b) => b.transactionDate - a.transactionDate);
    }
    
    // Apply pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / itemsPerPage);
    const fromRow = (currentPage - 1) * itemsPerPage;
    const toRow = fromRow + itemsPerPage;
    const paginated = filtered.slice(fromRow, toRow);
    
    setRecords(paginated);
    setPagination({
      currentPage,
      totalPages,
      total,
      itemsPerPage,
    });
    
    setLoading(false);
  }, [currentPage, itemsPerPage, dateFromFilter, dateToFilter, sortConfig, searchTerm]);

  // Sort icon helper
  const getSortIcon = (field) => {
    if (sortConfig.field !== field)
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortConfig.direction === "asc")
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    if (sortConfig.direction === "desc")
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // Handle sorting
  const handleSort = (field) => {
    let dir = "asc";
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") dir = "desc";
      else if (sortConfig.direction === "desc") dir = null;
    }
    setSortConfig({ field: dir ? field : null, direction: dir });
    setCurrentPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setSortConfig({ field: null, direction: null });
    setSearchTerm("");
    setCurrentPage(1);
    setDateFromFilter(today);
    setDateToFilter(today);
  };

  // CSV export simulation
  const exportToCSV = () => {
    // In a real app, this would export the data
    alert("CSV export would download here with static data");
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="min-h-[85vh] shadow-sm">
          <CardHeader className="rounded-t-lg border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-100 shadow-sm">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    Audit Trail
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Track all system changes and activities
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={records.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Filters */}
            <div className="mb-6 flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1 w-full lg:w-1/3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Module, Key, Scope, or Log..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-[150px]"
                />
                <span className="text-gray-500">to</span>
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-[150px]"
                />
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg overflow-hidden border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50">
                    {[
                      ["transactionDate", "Transaction Date"],
                      ["scope", "Scope"],
                      ["module", "Module"],
                      ["key", "Key"],
                      ["log", "Log"],
                    ].map(([field, label]) => (
                      <TableHead
                        key={field}
                        className="font-semibold cursor-pointer hover:text-blue-600"
                        onClick={() => handleSort(field)}
                      >
                        <div className="flex items-center gap-1">
                          {label} {getSortIcon(field)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="font-semibold">
                      Action By
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton loader for 5 rows
                    Array.from({ length: itemsPerPage }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : records.length > 0 ? (
                    records.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50">
                        <TableCell>
                          {format(r.transactionDate, "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>{r.scope}</TableCell>
                        <TableCell>{r.module}</TableCell>
                        <TableCell>{r.key}</TableCell>
                        <TableCell className="break-words whitespace-pre-wrap">
                          {r.log}
                        </TableCell>
                        <TableCell>{r.actionBy}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-6 gap-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Show</p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
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
              
              <div className="flex items-center space-x-2">
                <p className="hidden sm:block text-sm text-muted-foreground">
                  Showing{" "}
                  {records.length > 0 
                    ? (currentPage - 1) * itemsPerPage + 1 
                    : 0}{" "}
                  to {(currentPage - 1) * itemsPerPage + records.length} of{" "}
                  {pagination.total} entries
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center justify-center text-sm font-medium bg-gray-100 px-3 py-1 rounded">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.totalPages}
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(p + 1, pagination.totalPages)
                    )
                  }
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditTrail;