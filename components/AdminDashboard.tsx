import { useEffect, useState } from "react";
import { toast } from "sonner";

import UserManagement from "./UserManagement";
import AdminInventory from "./AdminInventory";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import DashboardLayout, {
  Home,
  Users,
  Package,
  BarChart3,
  Settings,
} from "./DashboardLayout";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package as PackageIcon,
  PackageX,
} from "lucide-react";

import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

// ---- Types ----
interface InventoryItem {
  storeId?: number;
  drugId?: number;
  name?: string;
  ndc?: string;
  storeName?: string;
  stockQty?: number;
  expiresOn?: string | null;
  unitPrice?: number | null;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
}

interface Metrics {
  revenue: number;
  revenueGrowth: number;
  orders: number;
  ordersGrowth: number;
  users: number;
  newUsers: number;
  alerts: number;
}

interface PendingAction {
  id: number;
  type: "user" | "inventory" | "prescription";
  title: string;
  count: number;
  priority: "low" | "medium" | "high";
}

interface ActivityItem {
  id: number;
  type: "user" | "prescription" | "inventory" | "system";
  action: string;
  description: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const { user } = useAuth();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!user) return;
    void loadInventory();
    void loadUsers();
    void loadMetrics();
    void loadPendingActions();
    void loadRecentActivity();
  }, [user]);

const loadInventory = async () => {
  const res = await api.get<any[]>("/api/inventory");

  if (res.ok && Array.isArray(res.data)) {
    const normalized: InventoryItem[] = res.data.map((row: any) => {
      const rawPrice = row.unitPrice ?? row.UnitPrice;

      return {
        storeId: row.storeId ?? row.StoreID,
        drugId: row.drugId ?? row.DrugID,
        name: row.name ?? row.DrugName,
        ndc: row.ndc ?? row.NDC,
        storeName: row.storeName ?? row.StoreName,
        stockQty: row.stockQty ?? row.StockQty,
        expiresOn: row.expiresOn ?? row.ExpiresOn,
        unitPrice:
          rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : null,
      };
    });

    setInventory(normalized);
  } else {
    toast.error("Failed to load inventory");
  }
};

  const loadUsers = async () => {
    const res = await api.get<AdminUser[]>("/api/users");
    if (res.ok && Array.isArray(res.data)) {
      setUsersList(res.data);
    } else {
      toast.error("Failed to load users");
    }
  };

  const loadMetrics = async () => {
    const res = await api.get<Metrics>("/api/metrics");
    if (res.ok && res.data) {
      setMetrics(res.data);
    } else {
      toast.error("Failed to load metrics");
    }
  };

  const loadPendingActions = async () => {
    const res = await api.get<PendingAction[]>("/api/pending-actions");
    if (res.ok && Array.isArray(res.data)) {
      setPendingActions(res.data);
    } else {
      toast.error("Failed to load pending actions");
    }
  };

  const loadRecentActivity = async () => {
    const res = await api.get<ActivityItem[]>("/api/activity");
    if (res.ok && Array.isArray(res.data)) {
      setRecentActivity(res.data);
    } else {
      toast.error("Failed to load activity");
    }
  };

  // ---- Menu ----
  const menuGroups = [
    {
      label: "Main",
      items: [
        { title: "Dashboard", icon: Home, onClick: () => setActivePage("Dashboard") },
        { title: "User Management", icon: Users, onClick: () => setActivePage("User Management") },
        { title: "Inventory", icon: Package, onClick: () => setActivePage("Inventory") },
      ],
    },
    {
      label: "Analytics",
      items: [
        { title: "Reports", icon: BarChart3, onClick: () => setActivePage("Reports") },
        { title: "Settings", icon: Settings, onClick: () => setActivePage("Settings") },
      ],
    },
  ];

  // ---- Content switch ----
  const renderContent = () => {
    switch (activePage) {
      case "User Management":
        return <UserManagement />;
      case "Inventory":
        return <AdminInventory inventory={inventory} reload={loadInventory} />;
      case "Reports":
        return <AdminReports />;
      case "Settings":
        return <AdminSettings />;
      default:
        return renderDashboard();
    }
  };

  // ---- Dashboard ----
  const renderDashboard = () => {
    const lowStockItems = inventory.filter((item) => (item.stockQty ?? 0) < 50);
    const totalUsers = metrics?.users ?? usersList.length;

    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Complete system management and analytics</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="size-4" />
                Total Revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">
                {metrics ? `$${metrics.revenue.toLocaleString()}` : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="size-3 inline mr-1" />
                {metrics ? `${metrics.revenueGrowth}% from last month` : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <ShoppingCart className="size-4" />
                Total Orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{metrics ? metrics.orders : "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics ? `${metrics.ordersGrowth}% from last month` : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="size-4" />
                Total Users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{totalUsers || "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics ? `+${metrics.newUsers} new this month` : "—"}
              </p>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl text-destructive">
                {metrics ? metrics.alerts : lowStockItems.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Low stock items</p>
            </CardContent>
          </Card>
        </div>
        {/* Low stock + pending actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Low stock alerts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" />
                    Low Stock Alerts
                  </CardTitle>
                  <CardDescription>Medications requiring immediate attention</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActivePage("Inventory")}>
                  View All
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">No low-stock items.</p>
                )}
                {lowStockItems.map((item) => {
                  const stock = item.stockQty ?? 0;
                  const status =
                    stock === 0
                      ? { label: "Out of Stock", variant: "destructive" as const, color: "text-destructive" }
                      : stock < 20
                      ? { label: "Critical", variant: "destructive" as const, color: "text-destructive" }
                      : { label: "Low", variant: "secondary" as const, color: "text-orange-500" };

                  const key = `${item.storeId}-${item.drugId}`;

                  return (
                    <div key={key} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{item.name}</h3>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Stock Level</p>
                              <p className={`font-medium ${status.color}`}>
                                {stock === 0 ? "Out of Stock" : `${stock} units`}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Location</p>
                              <p className="font-medium">{item.storeName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">NDC</p>
                              <p className="font-medium">{item.ndc}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Pending Actions
              </CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingActions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending actions.</p>
                )}
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (action.type === "user") setActivePage("User Management");
                      if (action.type === "inventory") setActivePage("Inventory");
                      if (action.type === "prescription") setActivePage("Reports");
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {action.type === "prescription" && <CheckCircle2 className="size-4 text-blue-500" />}
                        {action.type === "user" && <Users className="size-4 text-purple-500" />}
                        {action.type === "inventory" && <PackageX className="size-4 text-orange-500" />}
                        <span className="text-sm font-medium">{action.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{action.count}</span>
                      <Badge variant={action.priority === "high" ? "destructive" : "secondary"}>
                        {action.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
              {recentActivity.map((activity, index) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={`mt-1 ${index !== recentActivity.length - 1 ? "border-l-2 border-border pb-4" : ""}`}>
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center -ml-4">
                      {activity.type === "user" && <Users className="size-4 text-primary" />}
                      {activity.type === "prescription" && <CheckCircle2 className="size-4 text-green-500" />}
                      {activity.type === "inventory" && <PackageIcon className="size-4 text-blue-500" />}
                      {activity.type === "system" && <Settings className="size-4 text-purple-500" />}
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">{activity.action}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <DashboardLayout menuGroups={menuGroups} title="Admin Portal">
      {renderContent()}
    </DashboardLayout>
  );
}
