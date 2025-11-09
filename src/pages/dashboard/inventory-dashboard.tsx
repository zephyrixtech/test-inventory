import { useDashboardData } from '../../hooks/useDashboardData';
import { 
  DashboardHeader, 
  DashboardMetrics, 
  DashboardCharts, 
  DashboardAlerts 
} from '../../components/dashboard';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export const InventoryDashboard = () => {
  const { data, loading, error, refetch, lastUpdated } = useDashboardData();
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    // Get currency symbol from user data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currency = userData?.company_data?.currency || '$';
    console.log('User data:', userData);
    console.log('Currency from user data:', currency);
    setCurrencySymbol(currency);
  }, []);

  // Debug: Log current currency symbol
  console.log('Current currency symbol state:', currencySymbol);

  const handleRefresh = async () => {
    await refetch();
  };

  // Show loading state
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

  // Show error state
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

  // Use data or fallback to empty values
  const metrics = data?.metrics || { totalItems: 0, totalValue: 0, totalPurchaseOrders: 0, totalPurchaseOrderValue: 0 };
  const categoryData = data?.categoryData || [];
  const salesData = data?.salesData || [];
  const fastMovingItems = data?.fastMovingItems || [];
  const slowMovingItems = data?.slowMovingItems || [];
  const inventoryAlerts = data?.inventoryAlerts || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <DashboardHeader 
          onRefresh={handleRefresh}
          loading={loading}
          lastUpdated={lastUpdated}
        />

        {/* Total Inventory Section */}
        <DashboardMetrics 
          metrics={metrics}
          currencySymbol={currencySymbol}
        />

        {/* Charts Section */}
        <DashboardCharts 
          categoryData={categoryData}
          salesData={salesData}
          currencySymbol={currencySymbol}
        />

        {/* Alerts and Movement Items Section */}
        <DashboardAlerts 
          inventoryAlerts={inventoryAlerts}
          fastMovingItems={fastMovingItems}
          slowMovingItems={slowMovingItems}
        />
      </div>
    </div>
  );
}