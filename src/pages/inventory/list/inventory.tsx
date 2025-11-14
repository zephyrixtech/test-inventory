import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  Filter,
  Download,
  Eye,
  Edit
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from 'react-hot-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { inventoryService } from '@/services/inventoryService';
import { categoryService } from '@/services/categoryService';
import type { Item, Category, PaginationMeta } from '@/types/backend';

interface PaginationState extends PaginationMeta {}

type SortOrder = 'asc' | 'desc' | null;
interface SortConfig {
  field: string | null;
  order: SortOrder;
}

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export const Inventory = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', order: 'asc' });
  const [inventory, setInventory] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.listCategories({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      setCategories(response.data ?? []);
    } catch (error) {
      console.error('Failed to load categories', error);
      toast.error('Unable to load categories');
    }
  }, []);

  const fetchInventory = useCallback(async (page?: number) => {
    setLoading(true);
    try {
      const response = await inventoryService.getItems({
        page: page ?? pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: sortConfig.field ?? undefined,
        sortOrder: sortConfig.order ?? undefined,
      });

      setInventory(response.data);
      setPagination({
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        totalPages: response.meta.totalPages,
        hasNextPage: response.meta.hasNextPage,
        hasPrevPage: response.meta.hasPrevPage,
      });
    } catch (error) {
      console.error('Error fetching inventory', error);
      toast.error('Failed to fetch inventory');
      setInventory([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, categoryFilter, statusFilter, sortConfig.field, sortConfig.order]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchInventory(1);
  }, [fetchInventory]);

  useEffect(() => {
    if (!searchQuery) {
      fetchInventory(1);
    }
  }, [searchQuery, fetchInventory]);

  const handleSort = (field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        const nextOrder = prev.order === 'asc' ? 'desc' : prev.order === 'desc' ? null : 'asc';
        return { field: nextOrder ? field : null, order: nextOrder };
      }
      return { field, order: 'asc' };
    });
  };

  useEffect(() => {
    fetchInventory(1);
  }, [sortConfig, categoryFilter, statusFilter]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    const targetPage = direction === 'next' ? pagination.page + 1 : pagination.page - 1;
    if (targetPage < 1 || targetPage > pagination.totalPages) return;
    fetchInventory(targetPage);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await inventoryService.deactivateItem(selectedItem.id);
      toast.success('Item deactivated successfully');
      setIsDialogOpen(false);
      fetchInventory(pagination.page);
    } catch (error) {
      console.error('Failed to delete item', error);
      toast.error('Failed to deactivate item');
    }
  };

  const exportItemsToCSV = useCallback(() => {
    if (inventory.length === 0) {
      toast.error('No items to export');
      return;
    }

    const headers = ['Item Code', 'Item Name', 'Category', 'Unit Price', 'Quantity', 'Available Stock', 'Currency', 'Status'];
    const rows = inventory.map((item) => [
      item.code,
      item.name,
      item.category?.name ?? 'Uncategorized',
      item.unitPrice ?? 0,
      item.quantity ?? 0,
      item.availableStock ?? 0,
      item.currency ?? 'INR',
      item.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `inventory-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [inventory]);

  const sortedInventory = useMemo(() => {
    if (!sortConfig.field || !sortConfig.order) return inventory;
    const sorted = [...inventory].sort((a, b) => {
      const valueA = (a as Record<string, unknown>)[sortConfig.field!];
      const valueB = (b as Record<string, unknown>)[sortConfig.field!];

      if (valueA === valueB) return 0;
      const comparator = valueA > valueB ? 1 : -1;
      return sortConfig.order === 'asc' ? comparator : -comparator;
    });
    return sorted;
  }, [inventory, sortConfig]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory Items
            </CardTitle>
            <CardDescription>Manage your product catalog and track stock levels.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportItemsToCSV}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={() => navigate('/dashboard/item-master/add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    fetchInventory(1);
                  }
                }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_qc">Pending QC</SelectItem>
                <SelectItem value="qc_passed">QC Passed</SelectItem>
                <SelectItem value="store_approved">Store Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('code')} className="cursor-pointer">
                    <div className="flex items-center gap-1">Item Code {sortConfig.field === 'code' ? (sortConfig.order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center gap-1">Item Name {sortConfig.field === 'name' ? (sortConfig.order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : sortedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category?.name ?? 'Uncategorized'}</TableCell>
                      <TableCell>{item.unitPrice ?? '-'}</TableCell>
                      <TableCell>{item.availableStock ?? 0}</TableCell>
                      <TableCell>{item.status.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/${item.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/${item.id}/edit`)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} · Total {pagination.total} items
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange('prev')} disabled={!pagination.hasPrevPage}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePageChange('next')} disabled={!pagination.hasNextPage}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              This will mark the item as inactive. You can re-enable it later from the edit screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};