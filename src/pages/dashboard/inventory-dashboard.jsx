import { 
  DashboardHeader, 
  DashboardMetrics, 
  DashboardCharts, 
  DashboardAlerts 
} from '../../components/dashboard';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import dashboardData from '@/data/dashboard.json';

export const InventoryDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(dashboardData.lastUpdated);
  const [data, setData] = useState(dashboardData);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currency = userData?.company_data?.currency || '$';
    setCurrencySymbol(currency);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 400));
      setLastUpdated(new Date().toISOString());
    } catch {
      setError('Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || { totalItems: 0, totalValue: 0, totalPurchaseOrders: 0, totalPurchaseOrderValue: 0 };
  const categoryData = data?.categoryData || [];
  const salesData = data?.salesData || [];
  const fastMovingItems = data?.fastMovingItems || [];
  const slowMovingItems = data?.slowMovingItems || [];
  const inventoryAlerts = data?.inventoryAlerts || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardHeader 
          onRefresh={handleRefresh}
          loading={loading}
          lastUpdated={lastUpdated}
        />

        <DashboardMetrics 
          metrics={metrics}
          currencySymbol={currencySymbol}
        />

        <DashboardCharts 
          categoryData={categoryData}
          salesData={salesData}
          currencySymbol={currencySymbol}
        />

        <DashboardAlerts 
          inventoryAlerts={inventoryAlerts}
          fastMovingItems={fastMovingItems}
          slowMovingItems={slowMovingItems}
        />
      </div>
    </div>
  );
}


