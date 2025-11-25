import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, DollarSign, Package, CreditCard } from 'lucide-react';
import api from '../lib/api';

type Order = {
  orderId: number;
  orderNumber: string;
  date: string | null;      // ISO date
  medication: string;
  quantity: number;
  amount: number;           // numeric, not "$12.50"
  status: string;
  pickupDate: string | null;
};

interface OrdersResponse {
  orders: Order[];
}

interface StoredUser {
  id: number;
  name: string;
  email: string;
  role: 'Patient' | 'Pharmacist' | 'Tech' | 'Admin';
}

function getStoredUser(): StoredUser | null {
  const keys = ['pharma-user', 'user'];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.role) return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

export default function OrderHistory() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }
    if (u.role !== 'Patient') {
      setError('Order history is only available for patient accounts.');
      setLoading(false);
      setUser(u);
      return;
    }

    setUser(u);

    api
      .get<OrdersResponse>(`/api/patient/orders?patientId=${u.id}`)
      .then((res) => {
        if (res.ok && res.data && Array.isArray(res.data.orders)) {
          setOrders(res.data.orders);
        } else {
          setError('Unable to load order history.');
        }
      })
      .catch(() => setError('Unable to load order history.'))
      .finally(() => setLoading(false));
  }, []);

  const totalOrders = orders.length;

  const totalSpent = useMemo(
    () => orders.reduce((sum, o) => sum + (o.amount || 0), 0),
    [orders]
  );

  const lastOrderDate = useMemo(() => {
    if (orders.length === 0) return null;
    // orders are already sorted newest first in the backend
    return orders[0].date;
  }, [orders]);

  if (loading) return <p>Loading…</p>;
  if (!user || error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Order History</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="size-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="size-4" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              ${totalSpent.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="size-4" />
              Last Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">
              {lastOrderDate
                ? new Date(lastOrderDate).toLocaleDateString()
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any completed fills yet.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.orderId}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {order.medication}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.orderNumber}
                      </p>
                    </div>
                    <Badge className="bg-green-600 hover:bg-green-700">
                      {order.status || 'Completed'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>
                        Ordered:{' '}
                        {order.date
                          ? new Date(order.date).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="size-4" />
                      <span>{order.quantity} units</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="size-4" />
                      <span>${order.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>
                        Picked up:{' '}
                        {order.pickupDate
                          ? new Date(order.pickupDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" disabled>
                      View Receipt
                    </Button>
                    <Button size="sm" variant="outline" disabled>
                      Reorder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}