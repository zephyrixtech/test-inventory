import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Login } from '@/pages/auth/login';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { InventoryDashboard } from '@/pages/dashboard/inventory-dashboard';
import { UsersManagement } from '@/pages/user/list/users';
import { UserForm } from '@/pages/user/config/user-form';
import { Inventory } from '@/pages/inventory/list/inventory';
import { ItemConfigurator } from '@/pages/management/itemManagement/config/item-configurator';
import WarehouseManagement from '@/pages/management/WarehouseManagement';
import Notifications from '@/pages/Notifications/notifications';
import UserProfile from '@/pages/Profile/user-profile';
import SalesInvoiceList from '@/pages/invocie/list/InvoiceManagement';
import InvoiceView from '@/pages/invocie/config/InvoiceView';
import InvoiceEdit from '@/pages/invocie/config/InvoiceEdit';
import Reports from '@/pages/Reports/Reports';
import ItemManagement from '@/pages/management/itemManagement/list/ItemManagement';
import SupplierManagement from '@/pages/management/supplierManagement/list/SupplierManagement';
import ItemConfigForm from '@/pages/management/itemManagement/config/ItemConfigForm';
import AddStoreForm from '@/pages/management/storeManagement/config/AddStoreForm';
import SupplierForm from '@/pages/management/supplierManagement/config/SupplierForm';
import { StoreManagement } from '@/pages/management/storeManagement/list/StoreManagement';
import InventoryForm from '@/pages/inventory/config/inventory-form';
import PurchaseOrderForm from '@/pages/management/purchaseManagement/config/PurchaseOrderForm';
import PurchaseOrderList from '@/pages/management/purchaseManagement/list/PurchaseManagement';
import WorkflowConfiguration from '@/pages/workflow/WorkflowConfig';
import InventoryManagement from '@/pages/management/inventoryManagement/list/InventoryManagement';
import InventoryItemForm from '@/pages/management/inventoryManagement/config/InventoryItemForm';
import PurchaseOrderView from '@/pages/management/purchaseManagement/config/PurchaseOrderView';
import Approvals from '@/pages/Approval/Approvals';
import ApprovalsView from '@/pages/Approval/ApprovalsView';
import ReturnRequest from '@/pages/ReturnRequest/list/ReturnRequest';
import ReturnEligiblePOs from '@/pages/ReturnRequest/ReturnEligiblePOs';
import PrintPreview from '@/pages/Reports/PrintPreview';
import ReturnForm from '@/pages/ReturnRequest/config/ReturnForm';
import CompanyAdministration from '@/pages/administration/CompanyAdministration';
import NotificationForm from '@/pages/Notifications/config/NotificationForm';
import { CategoryManagement } from '@/pages/category/list/CategoryManagement';
import CategoryForm from '@/pages/category/config/CategoryForm';
import AuditTrial from '@/pages/Audit/auditTrial';
import CustomerForm from '@/pages/customer/config/CustomerForm';
import { CustomerManagement } from '@/pages/customer/list/CustomerManagement';
import CustomerView from '@/pages/customer/config/CustomerView';
import NotFoundPage from '@/pages/alert/NotFoundPage';
import { RoleManagement } from '@/pages/management/roleManagement/RoleManagement';
import AuthRedirectPage from '@/pages/auth/authRedirect';
import PurchaseReturnRequests from '@/pages/purchaseReturnRequest/PurchaseReturnRequests';
import PurchaseReturnView from '@/pages/purchaseReturnRequest/PurchaseReturnView';
import CurrencyRatesPage from '@/pages/administration/CurrencyRatesPage';

const protectedRoutes = [
  { path: '', element: <InventoryDashboard />, module: 'Dashboard' },
  { path: 'users', element: <UsersManagement />, module: 'Users' },
  { path: 'users/add', element: <UserForm />, module: 'Users' },
  { path: 'users/edit/:id', element: <UserForm />, module: 'Users' },
  { path: 'role-management', element: <RoleManagement />, module: 'Users' },
  { path: 'item-master', element: <Inventory />, module: 'Item Master' },
  { path: 'item-master/add', element: <InventoryForm />, module: 'Item Master' },
  { path: 'item-master/edit/:id', element: <InventoryForm />, module: 'Item Master' },
  { path: 'item-master/view/:id', element: <InventoryForm />, module: 'Item Master' },
  { path: 'supplierManagement', element: <SupplierManagement />, module: 'Supplier Management' },
  { path: 'supplier/add', element: <SupplierForm />, module: 'Supplier Management' },
  { path: 'supplier/edit/:id', element: <SupplierForm />, module: 'Supplier Management' },
  { path: 'supplier/view/:id', element: <SupplierForm />, module: 'Supplier Management' },
  { path: 'itemConfigurator', element: <ItemConfigurator />, module: 'Item Configurator' },
  { path: 'itemConfig/add', element: <ItemConfigForm />, module: 'Item Configurator' },
  { path: 'itemConfig/edit/:id', element: <ItemConfigForm />, module: 'Item Configurator' },
  { path: 'storeManagement', element: <StoreManagement />, module: 'Store Management' },
  { path: 'store/add', element: <AddStoreForm />, module: 'Store Management' },
  { path: 'store/edit/:id', element: <AddStoreForm />, module: 'Store Management' },
  { path: 'warehouseManagement', element: <WarehouseManagement />, module: 'Inventory Management' },
  { path: 'items', element: <ItemManagement />, module: 'Item Master' },
  { path: 'invoice', element: <SalesInvoiceList />, module: 'Sales Invoice' },
  { path: 'invoice/view/:id', element: <InvoiceView />, module: 'Sales Invoice' },
  { path: 'invoice/edit/:id', element: <InvoiceEdit />, module: 'Sales Invoice' },
  { path: 'invoice/add', element: <InvoiceEdit />, module: 'Sales Invoice' },
  { path: 'reports', element: <Reports />, module: 'Reports' },
  { path: 'report/preview', element: <PrintPreview />, module: 'Reports' },
  { path: 'purchaseOrderForm', element: <PurchaseOrderForm />, module: 'Purchase Order Management' },
  { path: 'purchaseOrderManagement', element: <PurchaseOrderList />, module: 'Purchase Order Management' },
  { path: 'purchaseOrderView/:id', element: <PurchaseOrderView />, module: 'Purchase Order Management' },
  { path: 'workflow-config', element: <WorkflowConfiguration />, module: 'Workflow Configuration' },
  { path: 'inventoryManagement', element: <InventoryManagement />, module: 'Inventory Management' },
  { path: 'inventory/add', element: <InventoryItemForm />, module: 'Inventory Management' },
  { path: 'inventory/edit/:id', element: <InventoryItemForm />, module: 'Inventory Management' },
  { path: 'purchase-order-approvals', element: <Approvals />, module: 'Purchase Order Approvals' },
  { path: 'purchase-order-return-approvals', element: <PurchaseReturnRequests />, module: 'Purchase Order Approvals' },
  { path: 'purchase-order-approvals-view/:id', element: <ApprovalsView />, module: 'Purchase Order Approvals' },
  { path: "purchase-return-view/:id", element: <PurchaseReturnView />, module: "Purchase Order Approvals" },
  { path: 'return-request', element: <ReturnRequest />, module: 'Returns Management' },
  { path: 'return-form/add', element: <ReturnForm />, module: 'Returns Management' },
  { path: 'return-form/edit/:id', element: <ReturnForm />, module: 'Returns Management' },
  { path: 'return-form/view/:id', element: <ReturnForm />, module: 'Item Master' },
  { path: 'return-eligible-purchase-orders', element: <ReturnEligiblePOs />, module: 'Returns Eligible' },
  { path: 'administration', element: <CompanyAdministration />, module: 'Administration' },
  { path: 'administration/currency', element: <CurrencyRatesPage />, module: 'Administration' },
  { path: 'category-master', element: <CategoryManagement />, module: 'Category Master' },
  { path: 'category-master/add', element: <CategoryForm />, module: 'Category Master' },
  { path: 'category-master/edit/:id', element: <CategoryForm />, module: 'Category Master' },
  { path: 'audit-trial', element: <AuditTrial />, module: 'Audit Trail' },
  { path: 'customer-management', element: <CustomerManagement />, module: 'Customer Master' },
  { path: 'customer-management/add', element: <CustomerForm />, module: 'Customer Master' },
  { path: 'customer-management/edit/:id', element: <CustomerForm />, module: 'Customer Master' },
  { path: 'customer-management/view/:id', element: <CustomerView />, module: 'Customer Master' },
];

const unprotectedRoutes = [
  { path: 'notifications', element: <Notifications /> },
  { path: 'notifications/create', element: <NotificationForm /> },
  { path: 'userProfile', element: <UserProfile /> },
  { path: 'auth-redirect', element: <AuthRedirectPage /> },
];

export const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      ...protectedRoutes.map(route => ({
        path: route.path,
        element: <ProtectedRoute module={route.module} />,
        children: [{ index: true, element: route.element }],
      })),
      ...unprotectedRoutes.map(route => ({
        path: route.path,
        element: route.element,
      })),
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);


