import { useEffect, useState } from 'react';
import { Coins, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currencyService } from '@/services/currencyService';
import toast from 'react-hot-toast';
import type { CurrencyRate } from '@/services/currencyService';

const CurrencyRatesPage = () => {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    fromCurrency: 'AED' as 'AED' | 'INR',
    toCurrency: 'INR' as 'AED' | 'INR',
    rate: ''
  });

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await currencyService.list();
      setRates(response.data);
    } catch (error) {
      console.error('Failed to load currency rates', error);
      toast.error('Unable to load currency rates');
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSave = async () => {
    try {
      await currencyService.upsert({
        fromCurrency: formState.fromCurrency,
        toCurrency: formState.toCurrency,
        rate: Number(formState.rate)
      });
      toast.success('Currency rate saved');
      setFormState((prev) => ({ ...prev, rate: '' }));
      fetchRates();
    } catch (error) {
      console.error('Failed to save currency rate', error);
      toast.error('Unable to save currency rate');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Currency Conversion
          </CardTitle>
          <CardDescription>Maintain manual AED ⇄ INR conversion rates for pricing and reporting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">From Currency</label>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background w-full"
                value={formState.fromCurrency}
                onChange={(event) => setFormState((prev) => ({ ...prev, fromCurrency: event.target.value as 'AED' | 'INR' }))}
              >
                <option value="AED">AED</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Currency</label>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background w-full"
                value={formState.toCurrency}
                onChange={(event) => setFormState((prev) => ({ ...prev, toCurrency: event.target.value as 'AED' | 'INR' }))}
              >
                <option value="AED">AED</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rate</label>
              <Input
                type="number"
                min={0}
                step={0.0001}
                value={formState.rate}
                onChange={(event) => setFormState((prev) => ({ ...prev, rate: event.target.value }))}
              />
            </div>
            <Button onClick={handleSave} disabled={!formState.rate}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>

          <div className="border rounded-lg divide-y">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Loading rates...</div>
            ) : rates.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No rates configured yet.</div>
            ) : (
              rates.map((rate) => (
                <div key={rate.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">
                      1 {rate.fromCurrency} = {rate.rate} {rate.toCurrency}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Effective {new Date(rate.effectiveDate).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(rate.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyRatesPage;