import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Package, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

type InventoryItem = {
  storeId: number;
  drugId: number;
  name: string;
  ndc: string;
  storeName: string;
  stockQty: number;
  expiresOn: string | null;
};

const LOW_STOCK_THRESHOLD = 50;

export default function TechInventoryCheck() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const res = await api.get<InventoryItem[]>('/api/inventory', {
          silent: true,
        });
        if (res.ok && Array.isArray(res.data)) {
          setItems(res.data);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
        toast.error('Failed to load inventory.');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.stockQty < LOW_STOCK_THRESHOLD).length,
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

  const keyFor = (item: InventoryItem) => `${item.storeId}-${item.drugId}`;

  const handleSubmitCount = async (item: InventoryItem) => {
    const key = keyFor(item);
    const value = counts[key];

    if (!value || value.trim() === '') {
      toast.error('Please enter the actual count.');
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Count must be a non-negative number.');
      return;
    }

    try {
      const res = await api.post<{
        storeId: number;
        drugId: number;
        stockQty: number;
      }>('/api/inventory/update-quantity', {
        storeId: item.storeId,
        drugId: item.drugId,
        newQuantity: parsed,
      });

      if (!res.ok || !res.data) {
        toast.error('Failed to update inventory.');
        return;
      }

      const updatedQty = res.data.stockQty;

      setItems((prev) =>
        prev.map((it) =>
          it.storeId === item.storeId && it.drugId === item.drugId
            ? { ...it, stockQty: updatedQty }
            : it
        )
      );

      const hadDiscrepancy = parsed !== item.stockQty;
      if (hadDiscrepancy) {
        toast.warning(
          `Count submitted with discrepancy: ${parsed} vs ${item.stockQty} (system).`
        );
      } else {
        toast.success('Count submitted and matches system count.');
      }

      setCounts((prev) => ({ ...prev, [key]: '' }));
      setNotes((prev) => ({ ...prev, [key]: '' }));
    } catch {
      toast.error('Network error while updating inventory.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Inventory Check</h1>
        <p className="text-muted-foreground">
          Perform physical counts and update inventory records
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Items to Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Checked Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-600">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Discrepancies Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-600">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-yellow-600">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search bar */}
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

      {/* Inventory list */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading inventory…</p>
      )}
      {!loading && filteredItems.length === 0 && (
        <p className="text-sm text-muted-foreground">No items found.</p>
      )}

      <div className="space-y-4">
        {filteredItems.map((item) => {
          const key = keyFor(item);
          return (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        {item.stockQty < LOW_STOCK_THRESHOLD && (
                          <Badge variant="destructive">
                            <AlertTriangle className="size-3 mr-1" />
                            Low Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        NDC: {item.ndc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">System Count</p>
                      <p className="font-medium">{item.stockQty} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Store</p>
                      <p className="font-medium">{item.storeName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires On</p>
                      <p className="font-medium">
                        {item.expiresOn ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded p-4">
                    <p className="text-sm font-semibold mb-3">
                      Physical Count Entry
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`count-${key}`}>Actual Count</Label>
                        <Input
                          id={`count-${key}`}
                          type="number"
                          placeholder="Enter count..."
                          value={counts[key] ?? ''}
                          onChange={(e) =>
                            setCounts((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`notes-${key}`}>
                          Notes (if discrepancy)
                        </Label>
                        <Input
                          id={`notes-${key}`}
                          placeholder="Optional notes..."
                          value={notes[key] ?? ''}
                          onChange={(e) =>
                            setNotes((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleSubmitCount(item)}
                    >
                      <CheckCircle2 className="size-4 mr-2" />
                      Submit Count
                    </Button>
                    <Button size="sm" variant="outline">
                      <Package className="size-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}