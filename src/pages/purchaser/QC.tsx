import { useEffect, useMemo, useState } from 'react';
import { Check, XCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { inventoryService } from '@/services/inventoryService';
import { qualityCheckService } from '@/services/qualityCheckService';
import type { Item } from '@/types/backend';

export const QualityControlPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getItems({ status: 'pending_qc', limit: 50 });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load QC items', error);
      toast.error('Unable to load quality check queue');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (productId: string, status: 'approved' | 'rejected') => {
    try {
      await qualityCheckService.submit({
        productId,
        status,
        remarks: remarks[productId]
      });
      toast.success(`Item ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setRemarks((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to submit QC result', error);
      toast.error('Unable to submit quality check');
    }
  };

  const pendingCount = items.length;
  const criticalItems = useMemo(() => items.filter((item) => (item.quantity ?? 0) === 0).length, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Quality Control Queue
          </CardTitle>
          <CardDescription>Validate inbound products before they reach packing and store operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending QC Items</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Items Without Stock</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : criticalItems}
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading pending items...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      All caught up! No items awaiting quality check.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">Code: {item.code}</div>
                      </TableCell>
                      <TableCell>{item.vendor?.name ?? 'Unassigned'}</TableCell>
                      <TableCell>{item.quantity ?? 0}</TableCell>
                      <TableCell className="max-w-sm">
                        <Textarea
                          rows={2}
                          placeholder="QC remarks..."
                          value={remarks[item.id] ?? ''}
                          onChange={(event) => setRemarks((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" onClick={() => handleSubmit(item.id, 'rejected')}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" /> Reject
                        </Button>
                        <Button onClick={() => handleSubmit(item.id, 'approved')}>
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

