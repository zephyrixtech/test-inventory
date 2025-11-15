import { useCallback, useEffect, useState } from 'react';
import { Receipt, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { dailyExpenseService } from '@/services/dailyExpenseService';
import { inventoryService } from '@/services/inventoryService';
import toast from 'react-hot-toast';
import type { Item } from '@/types/backend';

export const DailyExpensesPage = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [formState, setFormState] = useState({
    productId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().substring(0, 10)
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dailyExpenseService.list({ limit: 100 });
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to load expenses', error);
      toast.error('Unable to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const response = await inventoryService.getItems({ limit: 100 });
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load items', error);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchItems();
  }, [fetchExpenses, fetchItems]);

  const handleCreateExpense = async () => {
    try {
      await dailyExpenseService.create({
        productId: formState.productId,
        description: formState.description,
        amount: Number(formState.amount),
        date: formState.date
      });
      toast.success('Expense recorded');
      setShowDialog(false);
      setFormState({
        productId: '',
        description: '',
        amount: '',
        date: new Date().toISOString().substring(0, 10)
      });
      fetchExpenses();
    } catch (error) {
      console.error('Failed to save expense', error);
      toast.error('Unable to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dailyExpenseService.delete(id);
      toast.success('Expense removed');
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expense', error);
      toast.error('Unable to delete expense');
    }
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Daily Operational Expenses
            </CardTitle>
            <CardDescription>Track loading, logistics, and ancillary costs against purchases.</CardDescription>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log Expense
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Entries</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {loading ? '...' : expenses.length}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                ₹{totalAmount.toFixed(2)}
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading expenses...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No expense entries recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{expense.product?.name ?? 'Unassigned'}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>₹{expense.amount?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) fetchExpenses(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Daily Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                type="date"
                value={formState.date}
                onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="productId">Product</Label>
              <select
                id="productId"
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={formState.productId}
                onChange={(event) => setFormState((prev) => ({ ...prev, productId: event.target.value }))}
              >
                <option value="">Select product</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Loading charges, warehousing, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={formState.amount}
                onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} disabled={!formState.productId || !formState.description || !formState.amount}>
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

