import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Store, Bell } from "lucide-react";

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: store + notifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="size-5" />
                Store Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" defaultValue="PharmaFulfill" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input id="taxRate" type="number" defaultValue="7.5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainAddress">Main Address</Label>
                <Input
                  id="mainAddress"
                  defaultValue="123 Main St, Nashville, TN 37201"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mainPhone">Main Phone</Label>
                  <Input id="mainPhone" defaultValue="(615) 555-0100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainEmail">Main Email</Label>
                  <Input
                    id="mainEmail"
                    type="email"
                    defaultValue="info@pharmafulfill.com"
                  />
                </div>
              </div>

              <Button>Save Store Settings</Button>
            </CardContent>
          </Card>

          {/* Notification settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify admins when inventory is low
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when new users register
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send daily summary reports via email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Maintenance Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify staff of scheduled maintenance
                  </p>
                </div>
                <Switch />
              </div>

              <Button>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right side: info + quick actions */}
        <div className="space-y-6">
          {/* System info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">System Version</p>
                <p className="font-semibold">PharmaFulfill v2.1.0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Database Status</p>
                <p className="font-semibold text-green-600">Connected</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Backup</p>
                <p className="font-semibold">2024-11-18 02:00 AM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Server Status</p>
                <p className="font-semibold text-green-600">Online</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                Clear Cache
              </Button>
              <Button variant="outline" className="w-full">
                View System Logs
              </Button>
              <Button variant="outline" className="w-full">
                Test Email Settings
              </Button>
              <Button variant="outline" className="w-full">
                Run Diagnostics
              </Button>
            </CardContent>
          </Card>

          {/* Maintenance mode */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enable maintenance mode to prevent user access during system
                updates
              </p>
              <div className="flex items-center justify-between">
                <Label>Maintenance Mode</Label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
