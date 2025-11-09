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
import { exportSupabaseTableToCSV } from "@/Utils/csvExport";
import { supabase } from "@/Utils/types/supabaseClient";

// Sort types
type SortField =
  | "transactionDate"
  | "scope"
  | "module"
  | "key"
  | "log"
  | "actionBy"
  | null;

type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Data type
interface AuditTrailRecord {
  id: string;
  transactionDate: Date;
  scope: string;
  module: string;
  key: string;
  log: string;
  actionBy: string;
}

const AuditTrail: React.FC = () => {
  // Set initial state to today's date for filters
  const today = new Date().toISOString().split("T")[0];
  const [dateFromFilter, setDateFromFilter] = useState(today);
  const [dateToFilter, setDateToFilter] = useState(today);


  const [records, setRecords] = useState<AuditTrailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    itemsPerPage: 10,
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: null,
  });
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Fetch the user's company_id on mount
useEffect(() => {
  const fetchUserCompanyId = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Error fetching auth user:", userError.message);
      return;
    }
    if (user) {
      // Assuming user_mgmt.id = auth.users.id
      const { data: profile, error: profileError } = await supabase
        .from("user_mgmt")
        .select("company_id")
        .eq("id", user.id)   // adjust if your FK column is different
        .single();

      if (profileError) {
        console.error("Error fetching company_id:", profileError.message);
      }
      setUserCompanyId(profile?.company_id ?? null);
    }
  };

  fetchUserCompanyId();
}, []);

  // Fetch data
  useEffect(() => {
    if (!userCompanyId) return; // Wait for company_id

    const fetchData = async () => {
      setLoading(true);

      const from = dateFromFilter ? `${dateFromFilter} 00:00:00` : undefined;
      const to = dateToFilter ? `${dateToFilter} 23:59:59` : undefined;

      let query = supabase
        .from("system_log")
        .select(
          `
          id,
          transaction_date,
          scope,
          module,
          key,
          log,
          user_mgmt:action_by(first_name, last_name)
        `,
          { count: "exact" }
        )
        .eq("company_id", userCompanyId); // <-- Filter by company_id

      // Apply sorting at database level if no search term
      if (sortConfig.field && sortConfig.direction && !searchTerm.trim()) {
        const dbField = sortConfig.field === "transactionDate" ? "transaction_date" : sortConfig.field;
        query = query.order(dbField, { ascending: sortConfig.direction === "asc" });
      } else {
        // Default sort by transaction_date descending
        query = query.order("transaction_date", { ascending: false });
      }

      // Date filter
      if (from) query = query.gte("transaction_date", from);
      if (to) query = query.lte("transaction_date", to);

      // Pagination
      const fromRow = (currentPage - 1) * itemsPerPage;
      const toRow = fromRow + itemsPerPage - 1;
      query = query.range(fromRow, toRow);

      // Search filter
      if (searchTerm.trim()) {
        const sanitized = searchTerm.replace(/[%_]/g, '');
        query = query.or(
          [
            `scope.ilike.%${sanitized}%`,
            `module.ilike.%${sanitized}%`,
            `key.ilike.%${sanitized}%`,
            `log.ilike.%${sanitized}%`
          ].join(',')
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Fetch error:", error.message);
        setLoading(false);
        return;
      }

      let mapped: AuditTrailRecord[] =
        data?.map((row: any) => {
          const first = row.user_mgmt?.first_name ?? "";
          const last = row.user_mgmt?.last_name ?? "";
          return {
            id: row.id,
            transactionDate: new Date(row.transaction_date),
            scope: row.scope,
            module: row.module,
            key: row.key,
            log: row.log,
            actionBy: (first + " " + last).trim() || "Unknown User",
          };
        }) ?? [];

      setRecords(mapped);

      setPagination({
        currentPage,
        totalPages: Math.ceil((count ?? 0) / itemsPerPage),
        total: count ?? 0,
        itemsPerPage,
      });

      setLoading(false);
    };

    fetchData();
  }, [userCompanyId, currentPage, itemsPerPage, dateFromFilter, dateToFilter, sortConfig, searchTerm]);

  // Sort icon helper
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field)
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    if (sortConfig.direction === "asc")
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    if (sortConfig.direction === "desc")
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    let dir: SortDirection = "asc";
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

  // Filter records based on search term
  const filteredRecords = records.filter(
    (r) =>
      r.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.actionBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.log.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // CSV export
  const exportToCSV = async () => {
    if(!userCompanyId) return;

    await exportSupabaseTableToCSV<AuditTrailRecord>({
      reportTitle: "Audit Trail Data",
      headers: ["Transaction Date", "Scope", "Module", "Key", "Log", "Action By",],
      supabaseClient: supabase,
      rowMapper: (r) => [
        `"${format(r.transactionDate, "yyyy-MM-dd HH:mm")}"`,
        `"${r.scope}"`,
        `"${r.module}"`,
        `"${r.key}"`,
        `"${r.log}"`,
        `"${r.actionBy}"`,
      ],
      fetcher: async () => {
        const from = dateFromFilter ? `${dateFromFilter} 00:00:00` : undefined;
        const to = dateToFilter ? `${dateToFilter} 23:59:59` : undefined;

        let query = supabase
          .from("system_log")
          .select(`id, transaction_date, scope, module, key, log,
          user_mgmt:action_by(first_name, last_name)`
          )
          .eq("company_id", userCompanyId);

        // Sorting
        if (sortConfig.field && sortConfig.direction && !searchTerm.trim()) {
          const dbField =
            sortConfig.field === "transactionDate"
              ? "transaction_date"
              : sortConfig.field;
          query = query.order(dbField, {
            ascending: sortConfig.direction === "asc",
          });
        } else {
          // Default sort
          query = query.order("transaction_date", { ascending: false });
        }

        // Date filter
        if (from) query = query.gte("transaction_date", from);
        if (to) query = query.lte("transaction_date", to);

        // Search filter
        if (searchTerm.trim()) {
          const sanitized = searchTerm.replace(/[%_]/g, '');
          query = query.or(
            [
              `scope.ilike.%${sanitized}%`,
              `module.ilike.%${sanitized}%`,
              `key.ilike.%${sanitized}%`,
              `log.ilike.%${sanitized}%`
            ].join(',')
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        let mapped: AuditTrailRecord[] =
          data?.map((row: any) => {
            const first = row.user_mgmt?.first_name ?? "";
            const last = row.user_mgmt?.last_name ?? "";
            return {
              id: row.id,
              transactionDate: new Date(row.transaction_date),
              scope: row.scope,
              module: row.module,
              key: row.key,
              log: row.log,
              actionBy: (first + " " + last).trim() || "Unknown User",
            };
          }) ?? [];

        return mapped;
      },
      onError: (err) => console.error("CSV Export failed", err),
    });
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
                        onClick={() => handleSort(field as SortField)}
                      >
                        <div className="flex items-center gap-1">
                          {label} {getSortIcon(field as SortField)}
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
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((r) => (
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
                  {filteredRecords.length > 0 
                    ? (currentPage - 1) * itemsPerPage + 1 
                    : 0}{" "}
                  to {(currentPage - 1) * itemsPerPage + filteredRecords.length} of{" "}
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
