import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { BarChart3, Download, TrendingUp, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';

export default function AdminReports() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive system analytics and business insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="size-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">$45,231</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="size-3 inline mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">1,247</div>
            <p className="text-xs text-muted-foreground mt-1">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="size-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">487</div>
            <p className="text-xs text-muted-foreground mt-1">
              +23 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="size-4" />
              Avg. Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">$36.25</div>
            <p className="text-xs text-muted-foreground mt-1">
              +5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Downtown', revenue: 18500, percentage: 41 },
                { name: 'West End', revenue: 13200, percentage: 29 },
                { name: 'Green Hills', revenue: 8900, percentage: 20 },
                { name: 'East Nashville', revenue: 4631, percentage: 10 }
              ].map((store, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{store.name}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${store.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold">${store.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{store.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Atorvastatin 10mg', sales: 5625, count: 450 },
                { name: 'Lisinopril 20mg', sales: 3325, count: 380 },
                { name: 'Metformin 500mg', sales: 4800, count: 320 },
                { name: 'Omeprazole 20mg', sales: 2870, count: 280 },
                { name: 'Amlodipine 5mg', sales: 2280, count: 240 }
              ].map((med, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.count} prescriptions</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold">${med.sales.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Prescription Volume</span>
                  <span className="font-semibold text-green-600">↑ 12.5%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Customer Retention</span>
                  <span className="font-semibold text-green-600">↑ 8.3%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">New Patient Acquisition</span>
                  <span className="font-semibold text-green-600">↑ 15.7%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Staff Efficiency</span>
                  <span className="font-semibold text-green-600">↑ 6.2%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              Financial Summary Report
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              Sales Analytics Report
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              Inventory Status Report
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              User Activity Report
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              Performance Metrics Report
            </Button>
            <Button className="w-full" variant="outline">
              <Download className="size-4 mr-2" />
              Custom Report Builder
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
