import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { packingListService } from '@/services/packingListService';
import { inventoryService } from '@/services/inventoryService';
import toast from 'react-hot-toast';
import type { Item, PaginationMeta } from '@/types/backend';

interface PackingListFormState {
  location: string;
  boxNumber: string;
  shipmentDate?: string;
  packingDate?: string;
  image?: string;
  items: { productId: string; quantity: number }[];
}

type SortOrder = 'asc' | 'desc' | null;

interface SortConfig {
  field: string | null;
  order: SortOrder;
}

const DEFAULT_FORM: PackingListFormState = {
  location: '',
  boxNumber: '',
  shipmentDate: '',
  packingDate: '',
  image: '',
  items: []
};

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export const PackingListsPage = () => {
  const [packingLists, setPackingLists] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, order: null });
  const [showDialog, setShowDialog] = useState(false);
  const [formState, setFormState] = useState<PackingListFormState>(DEFAULT_FORM);
  const [items, setItems] = useState<Item[]>([]);

  const loadPackingLists = useCallback(async (page?: number) => {
    setLoading(true);
    try {
      const response = await packingListService.list({
        page: page ?? pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        search: searchQuery || undefined
      });
      setPackingLists(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error('Failed to load packing lists', error);
      toast.error('Unable to load packing lists');
      setPackingLists([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter]);

  const loadItems = useCallback(async () => {
    try {
      const response = await inventoryService.getItems({ status: 'store_pending', limit: 100 });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load items for packing', error);
    }
  }, []);

  useEffect(() => {
    loadPackingLists(1);
    loadItems();
  }, [loadPackingLists, loadItems]);

  const handleSort = (field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        const nextOrder = prev.order === 'asc' ? 'desc' : prev.order === 'desc' ? null : 'asc';
        return { field: nextOrder ? field : null, order: nextOrder };
      }
      return { field, order: 'asc' };
    });
  };

  const sortedLists = useMemo(() => {
    if (!sortConfig.field || !sortConfig.order) return packingLists;
    const sorted = [...packingLists].sort((a, b) => {
      const valueA = (a as Record<string, unknown>)[sortConfig.field!];
      const valueB = (b as Record<string, unknown>)[sortConfig.field!];

      if (valueA === valueB) return 0;
      const comparator = valueA > valueB ? 1 : -1;
      return sortConfig.order === 'asc' ? comparator : -comparator;
    });
    return sorted;
  }, [packingLists, sortConfig]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    const targetPage = direction === 'next' ? pagination.page + 1 : pagination.page - 1;
    if (targetPage < 1 || targetPage > pagination.totalPages) return;
    loadPackingLists(targetPage);
  };

  const handleAddItemToForm = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };

  const handleUpdateItem = (index: number, key: 'productId' | 'quantity', value: string | number) => {
    setFormState((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, items: updated };
    });
  };

  const handleCreatePackingList = async () => {
    try {
      await packingListService.create({
        location: formState.location,
        boxNumber: formState.boxNumber,
        shipmentDate: formState.shipmentDate || undefined,
        packingDate: formState.packingDate || undefined,
        image: formState.image || undefined,
        items: formState.items.filter((item) => item.productId && item.quantity > 0)
      });
      toast.success('Packing list created');
      setShowDialog(false);
      setFormState(DEFAULT_FORM);
      loadPackingLists(pagination.page);
    } catch (error) {
      console.error('Failed to create packing list', error);
      toast.error('Unable to create packing list');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              Packing Lists
            </CardTitle>
            <CardDescription>Convert approved inventory into shipment-ready packing lists.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Packing List
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by box number or location"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    loadPackingLists(1);
                  }
                }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="shipped">Shipped</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('boxNumber')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Box
                      {sortConfig.field === 'boxNumber'
                        ? sortConfig.order === 'asc'
                          ? <ArrowUp className="h-4 w-4" />
                          : <ArrowDown className="h-4 w-4" />
                        : <ArrowUpDown className="h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Packing Date</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading packing lists...
                    </TableCell>
                  </TableRow>
                ) : sortedLists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No packing lists found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLists.map((packing) => (
                    <TableRow key={packing.id}>
                      <TableCell className="font-medium">{packing.boxNumber}</TableCell>
                      <TableCell>{packing.location}</TableCell>
                      <TableCell className="capitalize">{packing.status}</TableCell>
                      <TableCell>{packing.packingDate ? new Date(packing.packingDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        {packing.items?.map((item: any) => (
                          <div key={item.product} className="text-sm text-muted-foreground">
                            {item.product?.name ?? 'Unknown'} × {item.quantity}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing page {pagination.page} of {pagination.totalPages}
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

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setFormState(DEFAULT_FORM); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Packing List</DialogTitle>
            <DialogDescription>Bundle approved inventory into shipment-ready boxes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="boxNumber">Box Number</Label>
                <Input
                  id="boxNumber"
                  value={formState.boxNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, boxNumber: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="packingDate">Packing Date</Label>
                <Input
                  id="packingDate"
                  type="date"
                  value={formState.packingDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, packingDate: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipmentDate">Shipment Date</Label>
                <Input
                  id="shipmentDate"
                  type="date"
                  value={formState.shipmentDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, shipmentDate: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Reference Image URL (optional)</Label>
              <Input
                id="image"
                value={formState.image}
                onChange={(event) => setFormState((prev) => ({ ...prev, image: event.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={handleAddItemToForm}>
                  Add Item
                </Button>
              </div>
              {formState.items.length === 0 && (
                <p className="text-sm text-muted-foreground">Select products ready for packing.</p>
              )}
              {formState.items.map((item, index) => (
                <div key={index} className="grid md:grid-cols-2 gap-3 border rounded-md p-3">
                  <div className="grid gap-2">
                    <Label>Product</Label>
                    <select
                      className="border rounded-md px-3 py-2 text-sm bg-background"
                      value={item.productId}
                      onChange={(event) => handleUpdateItem(index, 'productId', event.target.value)}
                    >
                      <option value="">Select</option>
                      {items.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => handleUpdateItem(index, 'quantity', Number(event.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea rows={3} readOnly placeholder="Add packing instructions using the items section." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePackingList} disabled={!formState.boxNumber || !formState.location || formState.items.length === 0}>
              Save Packing List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

