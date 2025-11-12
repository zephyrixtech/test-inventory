import { useCallback, useEffect, useState } from 'react';
import { Warehouse, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { storeStockService } from '@/services/storeStockService';
import type { StoreStock, PaginationMeta } from '@/types/backend';

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export const StoreStockPage = () => {
  const [records, setRecords] = useState<StoreStock[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [editingQuantity, setEditingQuantity] = useState<Record<string, number>>({});

  const fetchStock = useCallback(async (page?: number) => {
    setLoading(true);
    try {
      const response = await storeStockService.list({ page: page ?? pagination.page, limit: pagination.limit });
      setRecords(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error('Failed to load store stock', error);
      toast.error('Unable to load store stock');
      setRecords([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchStock(1);
  }, [fetchStock]);

  const handleAdjustQuantity = async (stock: StoreStock) => {
    const newQuantity = editingQuantity[stock.id];
    if (newQuantity == null || Number.isNaN(newQuantity)) {
      toast.error('Enter a valid quantity');
      return;
    }
    try {
      await storeStockService.adjustQuantity(stock.id, newQuantity);
      toast.success('Stock updated');
      setEditingQuantity((prev) => {
        const next = { ...prev };
        delete next[stock.id];
        return next;
      });
      fetchStock(pagination.page);
    } catch (error) {
      console.error('Failed to update quantity', error);
      toast.error('Unable to update quantity');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Store Stock
            </CardTitle>
            <CardDescription>Monitor approved products and apply margin adjustments before billing.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => fetchStock(pagination.page)} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Price After Margin</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Adjust Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading store stock...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No stock available. Approve items from quality control to populate store stock.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">{record.product?.name ?? 'Unnamed Item'}</div>
                        <div className="text-xs text-muted-foreground">Code: {record.product?.code}</div>
                      </TableCell>
                      <TableCell>{record.margin}%</TableCell>
                      <TableCell>{record.currency}</TableCell>
                      <TableCell>{record.priceAfterMargin.toFixed(2)}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Input
                          type="number"
                          min={0}
                          className="w-24 inline-flex"
                          value={editingQuantity[record.id] ?? record.quantity}
                          onChange={(event) => setEditingQuantity((prev) => ({ ...prev, [record.id]: Number(event.target.value) }))}
                        />
                        <Button size="sm" onClick={() => handleAdjustQuantity(record)}>
                          Update
                        </Button>
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
              <Button variant="outline" size="sm" onClick={() => fetchStock(pagination.page - 1)} disabled={!pagination.hasPrevPage}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchStock(pagination.page + 1)} disabled={!pagination.hasNextPage}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

