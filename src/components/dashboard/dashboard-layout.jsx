import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, Package, Truck, LayoutTemplate, ChevronRight, Bell, LogOut, BadgeDollarSign, ChartNoAxesCombined, Store ,FileText, Workflow, ClipboardCheck, SquareChartGantt, Building2, Clock, Handshake, ShieldCheck, Boxes} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/ChatWidget';
import ProfileImg from '@/assets/Images/ProfileImg.png';

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const user = localStorage.getItem("userData");
  const userData = user ? JSON.parse(user) : null;
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationPaneRef = useRef(null);
  const [roleName, setRoleName] = useState(localStorage.getItem('roleName') || '');
  const [profileImageUrl, setProfileImageUrl] = useState(ProfileImg);

  useEffect(() => {
    setProfileImageUrl(ProfileImg);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifications([]);
    setNotificationCount(0);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationPaneRef.current && !notificationPaneRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSeeAllNotifications = () => {
    setShowNotifications(false);
    navigate('/dashboard/notifications');
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      navigate("/");
    } catch (error) {
      console.error("Unexpected logout error:", error);
    }
  };

  const isActiveRoute = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getMenuItemStyles = (path) => {
    const isActive = isActiveRoute(path);
    return cn(
      "w-full justify-start transition-all duration-200 ease-in-out relative py-2.5 text-sm font-medium",
      isActive 
        ? "bg-blue-50 text-blue-700 hover:bg-blue-100 pl-3 pr-8" 
        : "hover:bg-gray-50 hover:text-blue-600 text-gray-600 px-3"
    );
  };

  const renderActiveIndicator = (path) => {
    if (isActiveRoute(path)) {
      return (
        <div className="absolute right-0 top-1 bottom-1 w-1.5 bg-blue-600 rounded-l-full"></div>
      );
    }
    return null;
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/users', label: 'Users', icon: <Users className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/category-master', label: 'Category Master', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/customer-management', label: 'Customer Master', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/itemConfigurator', label: 'Item Configurator', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/item-master', label: 'Item Master', icon: <Package className="mr-3 h-4 w-4 flex-shrink-0" /> },
   { path: '/dashboard/purchaser/qc', label: 'Quality Control', icon: <ShieldCheck className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/purchaser/packing-lists', label: 'Packing Lists', icon: <Boxes className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/purchaser/expenses', label: 'Daily Expenses', icon: <BadgeDollarSign className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/supplierManagement', label: 'Supplier Management', icon: <Truck className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/storeManagement', label: 'Store Management', icon: <Store className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/store/stock', label: 'Store Stock', icon: <Store className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/purchaseOrderManagement', label: 'PurchaseOrder Management', icon: <FileText className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/inventoryManagement', label: 'Inventory Management', icon: <Package className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/invoice', label: 'Sales Invoice', icon: <BadgeDollarSign className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/reports', label: 'Reports', icon: <ChartNoAxesCombined className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/workflow-config', label: 'Workflow Configuration', icon: <Workflow className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/administration', label: 'Administration', icon: <Building2 className="mr-3 h-4 w-4 flex-shrink-0" /> },
    { path: '/dashboard/administration/currency', label: 'Currency Rates', icon: <Building2 className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/purchase-order-approvals', label: 'Purchase Order Approvals', icon: <ClipboardCheck className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/return-request', label: 'Returns Management', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/purchase-order-return-approvals', label: 'Purchase Return Requests', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/return-eligible-purchase-orders', label: 'Returns Eligible', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/audit-trial', label: 'Audit Trial', icon: <Clock className="mr-3 h-4 w-4 flex-shrink-0" /> },
    // { path: '/dashboard/role-management', label: 'Role Management', icon: <Clock className="mr-3 h-4 w-4 flex-shrink-0" /> },
  ];

  const visibleItems = menuItems; 
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b h-16 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                Pro<span className='text-blue-600'>Ventory</span>
              </h1>
              <div className="hidden md:flex ml-6 bg-gray-100 rounded-full px-3 py-1.5">
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                  {`${roleName || 'User'} Dashboard`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:inline-block">
              Welcome, <strong className="text-gray-800">{userData?.first_name} {userData?.last_name}</strong>
            </span>
            <div className="relative" ref={notificationPaneRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-gray-600 hover:text-blue-700 transition-colors duration-200"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-75 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 flex items-center">
                      <Bell className="h-4 w-4 mr-2 text-blue-600" />
                      Notifications
                    </h3>
                  </div>

                  <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="px-4 py-12 text-center">
                      <div className="inline-block p-3 rounded-full bg-gray-100 mb-3">
                        <Bell className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No notifications</p>
                      <p className="text-xs text-gray-400 mt-1">We'll notify you when something arrives</p>
                    </div>
                  </div>

                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={handleSeeAllNotifications}
                      className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 font-medium w-full py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      See all notifications
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-50 md:hidden"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="hidden md:block hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 z-20 w-72 bg-white border-r transition-transform duration-200 ease-in-out flex flex-col"
          , !isSidebarOpen && "-translate-x-full"
        )}
      >
        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 px-3 py-4 space-y-1"
             style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {visibleItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button variant="ghost" className={getMenuItemStyles(item.path)}>
                {item.icon}
                {item.label}
                {renderActiveIndicator(item.path)}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200">
          <Link to="/dashboard/userProfile">
            <div className={cn(
              "mx-3 my-2 rounded-lg cursor-pointer transition-all duration-200 ease-in-out relative flex items-center gap-2",
              isActiveRoute('/dashboard/userProfile') 
                ? "bg-blue-50 text-blue-700 p-2 pr-8" 
                : "hover:bg-gray-50 text-gray-600 p-2"
            )}>
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.src = ProfileImg;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize truncate">
                  {userData?.first_name} {userData?.last_name}
                </p>
                <p className="text-xs opacity-75 capitalize truncate">{roleName || 'User'}</p>
              </div>
              {renderActiveIndicator('/dashboard/userProfile')}
            </div>
          </Link>
        </div>
      </aside>

      <main
        className={cn(
          "pt-16 transition-all duration-200 ease-in-out",
          isSidebarOpen ? "ml-72" : "ml-0"
        )}
      >
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  );
};


