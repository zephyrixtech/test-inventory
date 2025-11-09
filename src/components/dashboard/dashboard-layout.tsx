import { JSX, useEffect, useRef, useState, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Users, Package, Truck, LayoutTemplate, ChevronRight, Bell, LogOut, BadgeDollarSign, ChartNoAxesCombined, Store ,FileText, Workflow, ClipboardCheck, SquareChartGantt, Building2, Clock} from 'lucide-react';


import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/ChatWidget';
import ProfileImg from '@/assets/Images/ProfileImg.png';
import { supabase } from '@/Utils/types/supabaseClient';
import { formatAbsoluteTime, formatRelativeTime, isRecentNotification } from '@/Utils/notificationEvents';
import type { ModuleKey } from '@/constants/permissions';
import { fetchUserPermissions } from '@/constants/permissions';

// Define interfaces for type safety
interface UserData {
  id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  company_id: string;
}

interface Notification {
  id: string;
  message: string;
  time: string;
  absoluteTime: string;
  read: boolean;
  isRecent: boolean;
}

interface SystemNotification {
  id: string;
  message: string;
  created_at: string;
  status: string;
}

// Custom event constant for notification updates
const NOTIFICATION_UPDATE_EVENT = 'notificationUpdate';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const user: string | null = localStorage.getItem("userData");
  const userData: UserData | null = user ? JSON.parse(user) : null;
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationPaneRef = useRef<HTMLDivElement>(null);
  const [roleName, setRoleName] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<ModuleKey, boolean> | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>(ProfileImg);

  // Fetch user profile image
  useEffect(() => {
    const fetchUserImage = async () => {
      if (!userData?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_mgmt')
          .select('image')
          .eq('id', userData.id)
          .single();

        if (error) {
          console.error('Error fetching user image:', error);
          return;
        }

        if (data?.image) {
          const imageMetadata = data.image as any;
          if (imageMetadata.path) {
            const { data: publicUrl } = supabase.storage
              .from('profile-picture')
              .getPublicUrl(imageMetadata.path);
            
            if (publicUrl?.publicUrl) {
              setProfileImageUrl(publicUrl.publicUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile image:', error);
      }
    };

    fetchUserImage();
  }, [userData?.id]);

  // Fetch role name
  useEffect(() => {
    const fetchRoleName = async () => {
      if (!userData?.role_id) return;
      const { data } = await supabase
        .from('role_master')
        .select('name')
        .eq('id', userData.role_id)
        .single();

      if (data) {
        setRoleName(data.name!);
        try {
          localStorage.setItem('roleName', data.name!);
        } catch {}
      }
    };
    fetchRoleName();
  }, [userData?.role_id]);

  // Fetch permissions for logged-in user and cache them in state
  useEffect(() => {
    let mounted = true;
    const loadPermissions = async () => {
      if (!userData?.id || !userData?.company_id) {
        if (mounted) {
          setPermissions(null);
        }
        return;
      }

      try {
        const perms = await fetchUserPermissions(userData.id, userData.company_id);
        if (mounted) {
          setPermissions(perms?.permissions ?? null);
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
        if (mounted) setPermissions(null);
      } finally {
        if (mounted) {}
      }
    };

    loadPermissions();

    return () => { mounted = false; };
  }, [userData?.id, userData?.company_id]);

  // Fetch notifications for the logged-in user
  const fetchNotifications = useCallback(async () => {
    if (!userData?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch the latest 2 unseen notifications for the logged-in user
      const { data: notificationData, error } = await supabase
        .from('system_notification')
        .select('id, message, created_at, status, expiry_date')
        .eq('assign_to', userData.id)
        .eq('status', 'New')
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Fetch total count of unseen notifications
      const { count, error: countError } = await supabase
        .from('system_notification')
        .select('id', { count: 'exact' })
        .eq('assign_to', userData.id)
        .eq('status', 'New')
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gte.${today}`);

      if (countError) {
        console.error('Error fetching notification count:', countError);
        return;
      }

      // Format notifications with relative and absolute time
      const formattedNotifications: Notification[] = (notificationData as SystemNotification[]).map(notification => ({
        id: notification.id,
        message: notification.message,
        time: formatRelativeTime(notification.created_at),
        absoluteTime: formatAbsoluteTime(notification.created_at),
        read: notification.status !== 'New',
        isRecent: isRecentNotification(notification.created_at)
      }));

      setNotifications(formattedNotifications);
      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error);
    }
  }, [userData?.id]);

  // Initial fetch of notifications
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for notification update events
  useEffect(() => {
    const handleNotificationUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener(NOTIFICATION_UPDATE_EVENT, handleNotificationUpdate);
    
    return () => {
      window.removeEventListener(NOTIFICATION_UPDATE_EVENT, handleNotificationUpdate);
    };
  }, [fetchNotifications]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!userData?.id) return;

    // Subscribe to changes in system_notification table for the current user
    const subscription = supabase
      .channel('system_notification_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'system_notification',
          filter: `assign_to=eq.${userData.id}`,
        },
        (payload) => {
          console.log('Real-time notification change:', payload);
          // Refetch notifications when any change occurs
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userData?.id, fetchNotifications]);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationPaneRef.current && !notificationPaneRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigate to notifications page without updating status
  const handleSeeAllNotifications = () => {
    setShowNotifications(false);
    navigate('/dashboard/notifications');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      } else {
        localStorage.clear();
        localStorage.removeItem("token");
        sessionStorage.clear();
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate("/");
      }
    } catch (error) {
      console.error("Unexpected logout error:", error);
    }
  };

  // Helper function to check if a route is active
  const isActiveRoute = (path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Helper function to get menu item styles
  const getMenuItemStyles = (path: string): string => {
    const isActive = isActiveRoute(path);
    return cn(
      "w-full justify-start transition-all duration-200 ease-in-out relative py-2.5 text-sm font-medium",
      isActive 
        ? "bg-blue-50 text-blue-700 hover:bg-blue-100 pl-3 pr-8" 
        : "hover:bg-gray-50 hover:text-blue-600 text-gray-600 px-3"
    );
  };

  // Helper function to render active indicator
  const renderActiveIndicator = (path: string): JSX.Element | null => {
    if (isActiveRoute(path)) {
      return (
        <div className="absolute right-0 top-1 bottom-1 w-1.5 bg-blue-600 rounded-l-full"></div>
      );
    }
    return null;
  };
  // Menu items and visibility based on permissions (computed before render)
  const menuItems: Array<{ path: string; label: string; icon: JSX.Element; module?: ModuleKey }> = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Dashboard' },
    { path: '/dashboard/users', label: 'Users', icon: <Users className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Users' },
    { path: '/dashboard/category-master', label: 'Category Master', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Category Master' },
    { path: '/dashboard/customer-management', label: 'Customer Master', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Customer Master' },
    { path: '/dashboard/itemConfigurator', label: 'Item Configurator', icon: <LayoutTemplate className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Item Configurator' },
    { path: '/dashboard/item-master', label: 'Item Master', icon: <Package className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Item Master' },
    { path: '/dashboard/supplierManagement', label: 'Supplier Management', icon: <Truck className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Supplier Management' },
    { path: '/dashboard/storeManagement', label: 'Store Management', icon: <Store className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Store Management' },
    { path: '/dashboard/purchaseOrderManagement', label: 'PurchaseOrder Management', icon: <FileText className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Purchase Order Management' },
    { path: '/dashboard/inventoryManagement', label: 'Inventory Management', icon: <Package className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Inventory Management' },
    { path: '/dashboard/invoice', label: 'Sales Invoice', icon: <BadgeDollarSign className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Sales Invoice' },
    { path: '/dashboard/reports', label: 'Reports', icon: <ChartNoAxesCombined className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Reports' },
    { path: '/dashboard/workflow-config', label: 'Workflow Configuration', icon: <Workflow className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Workflow Configuration' },
    { path: '/dashboard/administration', label: 'Administration', icon: <Building2 className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Administration' },
    { path: '/dashboard/purchase-order-approvals', label: 'Purchase Order Approvals', icon: <ClipboardCheck className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Purchase Order Approvals' },
    { path: '/dashboard/return-request', label: 'Returns Management', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Returns Management' },
    { path: '/dashboard/purchase-order-return-approvals', label: 'Purchase Return Requests', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Purchase Order Approvals' },
    { path: '/dashboard/return-eligible-purchase-orders', label: 'Returns Eligible', icon: <SquareChartGantt className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Returns Eligible' },
    { path: '/dashboard/audit-trial', label: 'Audit Trial', icon: <Clock className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Audit Trail' },
    { path: '/dashboard/role-management', label: 'Role Management', icon: <Clock className="mr-3 h-4 w-4 flex-shrink-0" />, module: 'Role Management' },
  ];

  const visibleItems = (roleName === 'Super Admin' || !permissions) 
    ? menuItems 
    : menuItems.filter(item => !item.module || permissions[item.module]);
  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b h-16 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-6 h-full">
          {/* Left: Menu + Title */}
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
                  {`${roleName} Dashboard`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
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
                    {notificationCount > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {notificationCount} new
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${!notification.read ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                        >
                          <div className="flex justify-between items-start">
                            <p className={`text-sm ${!notification.read ? 'font-medium text-[13px] text-gray-800' : 'text-gray-600'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center ml-2">
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">{notification.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-12 text-center">
                        <div className="inline-block p-3 rounded-full bg-gray-100 mb-3">
                          <Bell className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No notifications</p>
                        <p className="text-xs text-gray-400 mt-1">We'll notify you when something arrives</p>
                      </div>
                    )}
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 z-20 w-72 bg-white border-r transition-transform duration-200 ease-in-out flex flex-col"
          , !isSidebarOpen && "-translate-x-full"
        )}
      >
        {/* Scrollable Menu Section */}
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

        {/* Fixed Profile Section at Bottom */}
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
                  // Fallback to default image if custom image fails to load
                  e.currentTarget.src = ProfileImg;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize truncate">
                  {userData?.first_name} {userData?.last_name}
                </p>
                <p className="text-xs opacity-75 capitalize truncate">{roleName}</p>
              </div>
              {renderActiveIndicator('/dashboard/userProfile')}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "pt-16 transition-all duration-200 ease-in-out",
          isSidebarOpen ? "ml-72" : "ml-0"
        )}
      >
        <Outlet />
      </main>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};