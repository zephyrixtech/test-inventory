import { Card, CardContent } from '@/components/ui/card';
import { Package, FileCheck } from 'lucide-react';

export const DashboardMetrics = ({ metrics, currencySymbol }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Total Inventory Card */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="px-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory Overview</p>
              <p className="text-2xl font-bold text-gray-900">Total Items & Value</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.totalItems.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-green-600">{currencySymbol}{metrics.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Card */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="px-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="rounded-full bg-orange-100 p-3">
              <FileCheck className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Purchase Orders</p>
              <p className="text-2xl font-bold text-gray-900">Orders & Value</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.totalPurchaseOrders}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">{currencySymbol}{metrics.totalPurchaseOrderValue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

