import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { vendorService } from '@/services/vendorService';
import toast from 'react-hot-toast';
import type { Vendor, PaginationMeta } from '@/types/backend';

type SortOrder = 'asc' | 'desc' | null;

interface SortConfig {
  field: keyof Vendor | null;
  order: SortOrder;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const vendorStatusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Inactive', value: 'inactive' }
];

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, order: null });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    creditReport: '',
    status: 'pending'
  });

  const fetchVendors = useCallback(
    async (page?: number) => {
      setLoading(true);
      try {
        const response = await vendorService.list({
          page: page ?? pagination.page,
          limit: pagination.limit,
          status: statusFilter,
          search: searchQuery || undefined
        });

        setVendors(response.data);
        setPagination(response.meta);
      } catch (error) {
        console.error('Failed to fetch vendors', error);
        toast.error('Unable to load vendors');
        setVendors([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, searchQuery, statusFilter]
  );

  useEffect(() => {
    fetchVendors(1);
  }, [fetchVendors]);

  const handleSort = (field: keyof Vendor) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        const nextOrder = prev.order === 'asc' ? 'desc' : prev.order === 'desc' ? null : 'asc';
        return { field: nextOrder ? field : null, order: nextOrder };
      }
      return { field, order: 'asc' };
    });
  };

  const sortedVendors = useMemo(() => {
    if (!sortConfig.field || !sortConfig.order) return vendors;
    const sorted = [...vendors].sort((a, b) => {
      const valueA = (a as Record<string, unknown>)[sortConfig.field!];
      const valueB = (b as Record<string, unknown>)[sortConfig.field!];

      if (valueA === valueB) return 0;
      const comparator = valueA > valueB ? 1 : -1;
      return sortConfig.order === 'asc' ? comparator : -comparator;
    });
    return sorted;
  }, [vendors, sortConfig]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    const targetPage = direction === 'next' ? pagination.page + 1 : pagination.page - 1;
    if (targetPage < 1 || targetPage > pagination.totalPages) return;
    fetchVendors(targetPage);
  };

  const resetForm = () => {
    setFormState({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      creditReport: '',
      status: 'pending'
    });
  };

  const handleCreateVendor = async () => {
    try {
      await vendorService.create(formState);
      toast.success('Vendor created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchVendors(pagination.page);
    } catch (error) {
      console.error('Failed to create vendor', error);
      toast.error('Unable to create vendor');
    }
  };

  const exportCSV = () => {
    if (vendors.length === 0) {
      toast.error('No vendors to export');
      return;
    }

    const headers = ['Vendor Name', 'Contact Person', 'Email', 'Phone', 'Status'];
    const rows = vendors.map((vendor) => [
      vendor.name,
      vendor.contactPerson ?? '',
      vendor.email ?? '',
      vendor.phone ?? '',
      vendor.status
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(','))
      .join('n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `vendors-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Vendor Directory
            </CardTitle>
            <CardDescription>Manage vendor onboarding, approvals, and contact records.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Vendor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or contact person"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    fetchVendors(1);
                  }
                }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {vendorStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Name
                      {sortConfig.field === 'name'
                        ? sortConfig.order === 'asc'
                          ? <ArrowUp className="h-4 w-4" />
                          : <ArrowDown className="h-4 w-4" />
                        : <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading vendors...
                    </TableCell>
                  </TableRow>
                ) : sortedVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.name}
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {vendor.address || 'No address provided'}
                        </div>
                      </TableCell>
                      <TableCell>{vendor.contactPerson || '-'}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {vendor.email || '-'}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {vendor.phone || '-'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {vendor.status}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} · Total {pagination.total} vendors
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={!pagination.hasPrevPage}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={!pagination.hasNextPage}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Vendor</DialogTitle>
            <DialogDescription>Capture vendor onboarding details for purchase workflows.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Acme Supplies LLC"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formState.contactPerson}
                onChange={(event) => setFormState((prev) => ({ ...prev, contactPerson: event.target.value }))}
                placeholder="John Smith" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contact@vendor.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+971 55 123 4567" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={formState.address}
                onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Warehouse 5, Al Quoz Industrial Area, Dubai" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditReport">Credit Notes / Attachments</Label>
              <Textarea
                id="creditReport"
                rows={3}
                value={formState.creditReport}
                onChange={(event) => setFormState((prev) => ({ ...prev, creditReport: event.target.value }))}
                placeholder="Enter credit references or paste attachment URLs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateVendor} disabled={!formState.name.trim()}>
              Save Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorsPage;

