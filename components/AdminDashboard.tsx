import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
} from "lucide-react";

import UserManagement from "./UserManagement";
import AdminInventory from "./AdminInventory";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";

import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Shape of an inventory item returned by the backend
interface InventoryItem {
  id?: number;
  drugId?: number;
  name?: string;
  ndc?: string;
  storeName?: string;
  stockQty: number;
  expiresOn?: string;
}

// Shape of a user in the admin user list
interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
}

export default function AdminDashboard() {
  // Current logged-in user (should be an admin)
  const { user } = useAuth();

  // Which section of the admin panel is active
  const [activePage, setActivePage] = useState<
    "Dashboard" | "User Management" | "Inventory" | "Reports" | "Settings"
  >("Dashboard");

  // Live inventory from backend
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Live user list from backend
  const [usersList, setUsersList] = useState<AdminUser[]>([]);

  // When an admin is present, load initial data
  useEffect(() => {
    if (!user) return;
    loadInventory();
    loadUsers();
  }, [user]);

  // Fetch inventory from backend
  const loadInventory = async () => {
    const res = await api.get<InventoryItem[]>("/api/inventory");
    if (res.ok && Array.isArray(res.data)) {
      setInventory(res.data);
    } else {
      console.warn("Failed to load inventory", res);
      toast.error("Failed to load inventory");
    }
  };

  // Fetch all users from backend (admin-only)
  const loadUsers = async () => {
    const res = await api.get<AdminUser[]>("/api/users");
    if (res.ok && Array.isArray(res.data)) {
      setUsersList(res.data);
    } else {
      console.warn("Failed to load users", res);
      toast.error("Failed to load users");
    }
  };

  // Sidebar menu groups used by DashboardLayout
  const menuGroups = [
    {
      label: "Main",
      items: [
        {
          title: "Dashboard",
          icon: Home,
          onClick: () => setActivePage("Dashboard"),
        },
        {
          title: "User Management",
          icon: Users,
          onClick: () => setActivePage("User Management"),
        },
        {
          title: "Inventory",
          icon: Package,
          onClick: () => setActivePage("Inventory"),
        },
      ],
    },
    {
      label: "Analytics",
      items: [
        {
          title: "Reports",
          icon: BarChart3,
          onClick: () => setActivePage("Reports"),
        },
        {
          title: "Settings",
          icon: Settings,
          onClick: () => setActivePage("Settings"),
        },
      ],
    },
  ];

  // Decide which view to show based on the selected menu item
  const renderContent = () => {
    switch (activePage) {
      case "User Management":
        return <UserManagement users={usersList} reload={loadUsers} />;

      case "Inventory":
        return <AdminInventory inventory={inventory} reload={loadInventory} />;

      case "Reports":
        return <AdminReports />;

      case "Settings":
        return <AdminSettings />;

      case "Dashboard":
      default:
        return renderDashboard();
    }
  };

  // Dashboard overview: KPIs + tabbed sections
  const renderDashboard = () => (
    <>
      {/* Header text */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Complete system management and analytics
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Revenue (placeholder values for now) */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">$45,231</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="size-3 inline mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        {/* Orders (placeholder) */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Total Orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">1,247</div>
            <p className="text-xs text-muted-foreground mt-1">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        {/* Total user accounts (uses real length) */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4" />
              Total Users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{usersList.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active accounts in system
            </p>
          </CardContent>
        </Card>

        {/* Low stock alerts derived from inventory data */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-destructive">
              {inventory.filter((item) => item.stockQty < 50).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Low-stock medications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed area for inventory, users, analytics, settings */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="size-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="size-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="size-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <AdminInventory inventory={inventory} reload={loadInventory} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement users={usersList} reload={loadUsers} />
        </TabsContent>

        <TabsContent value="analytics">
          <AdminReports />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <DashboardLayout menuGroups={menuGroups} title="Admin Portal">
      {renderContent()}
    </DashboardLayout>
  );
}