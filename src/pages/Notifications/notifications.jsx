import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Bell,
  CheckCheck,
  Filter,
  Undo2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Data
const mockNotifications = [
  {
    id: "1",
    message: "Purchase Order #PO-2025-001 has been approved",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: "New",
    alert_type: "approval",
    priority: "High",
  },
  {
    id: "2",
    message: "Low stock alert: Item 'Laptop Stand' is below threshold",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "New",
    alert_type: "inventory",
    priority: "Medium",
  },
  {
    id: "3",
    message: "Your request for 50 units of USB-C cables was rejected",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "Read",
    alert_type: "rejected",
    priority: "High",
  },
  {
    id: "4",
    message: "New purchase order #PO-2025-002 created",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: "Read",
    alert_type: "purchase",
    priority: "Low",
  },
  {
    id: "5",
    message: "Invoice #INV-2025-001 is due in 3 days",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    status: "New",
    alert_type: "payment",
    priority: "Medium",
  },
];

// Utility: Format relative time
const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
};

// Normalize alert type
const normalizeAlertType = (type) => {
  const map = {
    approval: "approval",
    inventory: "inventory",
    rejected: "rejected",
    purchase: "purchase",
    payment: "payment",
  };
  return map[type] || type;
};

const Notifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize mock data
  useEffect(() => {
    const formatted = mockNotifications.map((n) => ({
      id: n.id,
      message: n.message,
      time: formatRelativeTime(n.created_at),
      read: n.status === "Read",
      type: normalizeAlertType(n.alert_type),
      priority: n.priority || "Medium",
    }));
    setNotifications(formatted);
  }, []);

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || n.type === selectedType;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "unread" && !n.read) ||
      (activeTab === "read" && n.read);
    return matchesSearch && matchesType && matchesTab;
  });

  // Get unique types for filter
  const notificationTypes = [
    "all",
    ...new Set(notifications.map((n) => n.type)),
  ];

  // Priority styles
  const getPriorityStyles = (priority, read) => {
    const base = "p-3 sm:p-4 rounded-lg border flex flex-col sm:flex-row sm:items-start sm:justify-between hover:shadow-md transition-all duration-200";
    if (read) return `${base} bg-gray-50 border-gray-200`;
    switch (priority.toLowerCase()) {
      case "high":
        return `${base} bg-red-50 border-red-300 border-l-4 border-l-red-500 shadow-sm`;
      case "medium":
        return `${base} bg-orange-50 border-orange-300 border-l-4 border-l-orange-500 shadow-sm`;
      case "low":
        return `${base} bg-blue-50 border-blue-300 border-l-4 border-l-blue-500 shadow-sm`;
      default:
        return `${base} bg-gray-50 border-gray-300 border-l-4 border-l-gray-500 shadow-sm`;
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority.toLowerCase()) {
      case "high":
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />;
      case "low":
        return <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />;
    }
  };

  const getPriorityBadgeStyles = (priority) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getNotificationIcon = (type, priority) => {
    const colorClass =
      priority.toLowerCase() === "high"
        ? "text-red-500"
        : priority.toLowerCase() === "medium"
        ? "text-orange-500"
        : "text-blue-500";

    switch (type) {
      case "approval":
        return <CheckCheck className={`h-4 w-4 sm:h-5 sm:w-5 ${colorClass}`} />;
      case "purchase":
        return <Bell className={`h-4 w-4 sm:h-5 sm:w-5 ${colorClass}`} />;
      case "rejected":
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      default:
        return getPriorityIcon(priority);
    }
  };

  // Actions
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAsUnread = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl space-y-4 sm:space-y-6">
        <Card className="min-h-[80vh] shadow-md border-0 rounded-lg overflow-hidden">
          <CardHeader className="border-b pb-4 sm:pb-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                    Notifications
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base text-gray-500">
                    Manage your inventory notifications
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-sm sm:text-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Create Notification
                </Button>
                <Button
                  onClick={markAllAsRead}
                  disabled={filteredNotifications.filter((n) => !n.read).length === 0}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-sm sm:text-sm disabled:opacity-50"
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Mark all as read
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 bg-white">
            <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search notifications..."
                    className="pl-8 sm:pl-10 border-gray-200 rounded-lg text-sm sm:text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                  <select
                    className="border border-gray-200 rounded-lg p-1.5 sm:p-2 text-sm bg-white w-full sm:w-auto"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {notificationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type === "all"
                          ? "All"
                          : type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 sm:mb-6 bg-gray-100 rounded-lg w-full">
                <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Read
                </TabsTrigger>
              </TabsList>

              {["all", "unread", "read"].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="space-y-3 sm:space-y-4 mt-2">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={getPriorityStyles(notification.priority, notification.read)}
                      >
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          <div className="mt-0.5 sm:mt-1">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start space-x-2">
                              <p
                                className={`text-sm sm:text-base font-semibold ${
                                  notification.read ? "text-gray-700" : "text-gray-900"
                                }`}
                              >
                                {notification.message}
                              </p>
                              {!notification.read && (
                                <div className="flex items-center space-x-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                  {getPriorityIcon(notification.priority)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
                              <p className="text-xs sm:text-sm text-gray-500">{notification.time}</p>
                              <Badge className={`text-xs border ${getPriorityBadgeStyles(notification.priority)}`}>
                                {notification.priority}
                              </Badge>
                              <Badge className="text-xs bg-gray-100 text-gray-800 border-gray-200">
                                {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-0 sm:ml-4">
                          {!notification.read ? (
                            <Button
                              onClick={() => markAsRead(notification.id)}
                              variant="ghost"
                              size="sm"
                              className={`text-xs sm:text-sm sm:w-auto ${
                                notification.priority.toLowerCase() === "high"
                                  ? "text-red-600 hover:text-red-800 hover:bg-red-50"
                                  : notification.priority.toLowerCase() === "medium"
                                  ? "text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                                  : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              }`}
                            >
                              Mark as read
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => markAsUnread(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 text-xs sm:text-sm sm:w-auto"
                              >
                                <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                                Mark as unread
                              </Button>
                              <Button
                                onClick={() => deleteNotification(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs sm:text-sm w-full sm:w-auto"
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Bell className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-2 sm:mb-3" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">
                        No notifications found
                      </h3>
                      <p className="text-gray-500 mt-1 text-sm sm:text-base">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : tabValue === "all"
                          ? "You don't have any notifications yet"
                          : `You don't have any ${tabValue} notifications`}
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;