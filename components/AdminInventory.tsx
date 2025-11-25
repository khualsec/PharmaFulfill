import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Plus, Edit, Trash2, Search, Package, AlertTriangle } from 'lucide-react';

const mockInventory = [
  {
    id: 1,
    drug: 'Atorvastatin 10mg',
    ndc: '123456789012',
    stock: 250,
    reorderLevel: 100,
    expiryDate: '2026-12-31',
    store: 'Downtown',
    price: '$12.50'
  },
  {
    id: 2,
    drug: 'Lisinopril 20mg',
    ndc: '234567890123',
    stock: 180,
    reorderLevel: 100,
    expiryDate: '2026-11-30',
    store: 'Downtown',
    price: '$8.75'
  },
  {
    id: 3,
    drug: 'Metformin 500mg',
    ndc: '345678901234',
    stock: 25,
    reorderLevel: 100,
    expiryDate: '2026-10-31',
    store: 'Downtown',
    price: '$15.00'
  },
  {
    id: 4,
    drug: 'Omeprazole 20mg',
    ndc: '456789012345',
    stock: 120,
    reorderLevel: 80,
    expiryDate: '2026-09-30',
    store: 'West End',
    price: '$10.25'
  },
  {
    id: 5,
    drug: 'Amlodipine 5mg',
    ndc: '567890123456',
    stock: 18,
    reorderLevel: 50,
    expiryDate: '2026-08-31',
    store: 'Green Hills',
    price: '$9.50'
  }
];

export default function AdminInventory() {
  const lowStockItems = mockInventory.filter(item => item.stock < item.reorderLevel);
  const totalValue = mockInventory.reduce((acc, item) => 
    acc + (item.stock * parseFloat(item.price.replace('$', ''))), 0
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage medications across all store locations
          </p>
        </div>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Medication
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{mockInventory.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Store Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">4</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by medication name, NDC, or store..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {mockInventory.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{item.drug}</h3>
                    {item.stock < item.reorderLevel && (
                      <Badge variant="destructive">
                        <AlertTriangle className="size-3 mr-1" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">NDC</p>
                      <p className="font-medium">{item.ndc}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium">{item.stock} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reorder Level</p>
                      <p className="font-medium">{item.reorderLevel} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-medium">{item.expiryDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{item.store}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">{item.price}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline">
                    <Edit className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
