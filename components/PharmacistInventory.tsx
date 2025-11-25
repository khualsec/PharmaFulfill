import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, AlertTriangle, TrendingDown, Package } from 'lucide-react';

type InventoryItem = {
  storeId: number;
  drugId: number;
  name: string;
  ndc: string;
  storeName: string;
  stockQty: number;
  expiresOn: string | null;
};

export default function PharmacistInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch inventory from backend
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/inventory');
        if (!res.ok) {
          console.error('Failed to load inventory');
          return;
        }
        const data: InventoryItem[] = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Error fetching inventory', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Low stock threshold
  const LOW_STOCK_THRESHOLD = 50;

  const lowStockItems = useMemo(
    () => items.filter((item) => item.stockQty < LOW_STOCK_THRESHOLD),
    [items]
  );

  const expiringSoonCount = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return items.filter((item) => {
      if (!item.expiresOn) return false;
      const exp = new Date(item.expiresOn);
      return exp >= now && exp <= in30Days;
    }).length;
  }, [items]);

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + (item.stockQty || 0), 0),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.ndc.toLowerCase().includes(term) ||
        item.storeName.toLowerCase().includes(term)
    );
  }, [items, search]);

  // Reorder handler with user-entered amount
  const handleReorder = async (item: InventoryItem) => {
    const input = window.prompt(
      `Enter reorder amount for ${item.name} at ${item.storeName}:`,
      '50'
    );

    if (input === null) return; // cancelled

    const amount = Number(input);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/inventory/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: item.storeId,
          drugId: item.drugId,
          amount,
        }),
      });

      if (!res.ok) {
        console.error('Failed to reorder stock');
        return;
      }

      const updated = await res.json();

      setItems((prev) =>
        prev.map((it) =>
          it.storeId === updated.storeId && it.drugId === updated.drugId
            ? { ...it, stockQty: updated.stockQty }
            : it
        )
      );
    } catch (err) {
      console.error('Error reordering stock', err);
    }
  };

  // Update quantity handler
  const handleUpdateQuantity = async (item: InventoryItem) => {
    const input = window.prompt(
      `Enter new quantity for ${item.name} at ${item.storeName}:`,
      String(item.stockQty)
    );
    if (input === null) return;

    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('Please enter a non-negative number.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/inventory/update-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: item.storeId,
          drugId: item.drugId,
          newQuantity: parsed,
        }),
      });

      if (!res.ok) {
        console.error('Failed to update quantity');
        return;
      }

      const updated = await res.json();

      setItems((prev) =>
        prev.map((it) =>
          it.storeId === updated.storeId && it.drugId === updated.drugId
            ? { ...it, stockQty: updated.stockQty }
            : it
        )
      );
    } catch (err) {
      console.error('Error updating quantity', err);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Inventory Management</h1>
        <p className="text-muted-foreground">
          Monitor stock levels and manage medication inventory
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{items.length}</div>
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
            <CardTitle className="text-sm">Total Units in Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{totalUnits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Expiring Soon (&lt; 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{expiringSoonCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by medication name, NDC, or store..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Low stock alerts */}
      <div className="mb-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertTriangle className="size-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No low stock items at the moment.
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={`${item.storeId}-${item.drugId}`}
                    className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-red-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          NDC: {item.ndc} · {item.storeName}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {item.stockQty} units left
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All inventory */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="size-5" />
          All Inventory
        </h2>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading inventory...</p>
        )}

        {!loading && filteredItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No items found.</p>
        )}

        {filteredItems.map((item) => (
          <Card key={`${item.storeId}-${item.drugId}`}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.stockQty < LOW_STOCK_THRESHOLD && (
                        <Badge variant="destructive">
                          <TrendingDown className="size-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      NDC: {item.ndc}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{item.stockQty} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Store</p>
                    <p className="font-medium">{item.storeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">{item.expiresOn ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{item.storeName}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => handleReorder(item)}>
                    <Package className="size-4 mr-2" />
                    Reorder Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item)}
                  >
                    Update Quantity
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